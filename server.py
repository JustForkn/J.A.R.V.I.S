#!/usr/bin/env python3
"""Local J.A.R.V.I.S. web server with no required API keys."""

from __future__ import annotations

import ast
import json
import os
import operator
import re
import urllib.parse
import urllib.request
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parent
PORT = 4173
FISH_API_URL = "https://api.fish.audio/v1/tts"
FISH_REFERENCE_ID = "14129c3e320149449d6bada6862f7338"


class UnsafeExpression(ValueError):
    pass


OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def calculate(expression: str) -> float | int:
    """Evaluate only a small arithmetic AST; never execute arbitrary input."""
    if len(expression) > 80:
        raise UnsafeExpression("expression too long")

    def visit(node: ast.AST) -> float | int:
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](visit(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
            left, right = visit(node.left), visit(node.right)
            if abs(left) > 1e12 or abs(right) > 1e12:
                raise UnsafeExpression("number too large")
            return OPERATORS[type(node.op)](left, right)
        raise UnsafeExpression("unsupported expression")

    result = visit(ast.parse(expression, mode="eval"))
    if isinstance(result, float) and not result.is_integer():
        return round(result, 8)
    return int(result)


def fetch_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "JARVIS-local/1.0"})
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def fish_speech(text: str) -> bytes:
    api_key = os.environ.get("FISH_API_KEY")
    if not api_key:
        raise RuntimeError("FISH_API_KEY is not configured")
    payload = json.dumps({
        "text": text[:4000],
        "reference_id": os.environ.get("FISH_REFERENCE_ID", FISH_REFERENCE_ID),
        "format": "mp3",
    }).encode("utf-8")
    request = urllib.request.Request(
        FISH_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "model": "s1",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def local_model_answer(question: str) -> str | None:
    """Use an optional Ollama model without sending data off the machine."""
    model = os.environ.get("OLLAMA_MODEL")
    if not model:
        return None
    payload = json.dumps({
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": "You are a concise, dry-witted British personal assistant. Be accurate, admit uncertainty, and call the user sir occasionally."},
            {"role": "user", "content": question},
        ],
    }).encode("utf-8")
    request = urllib.request.Request(
        "http://127.0.0.1:11434/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        result = json.loads(response.read().decode("utf-8"))
    message = result.get("message", {}).get("content", "").strip()
    return message or None


def wikipedia_answer(question: str) -> str | None:
    cleaned = re.sub(r"\b(what is|who is|tell me about|define)\b", "", question, flags=re.I).strip(" ?")
    if not cleaned or len(cleaned) > 100:
        return None
    title = urllib.parse.quote(cleaned.replace(" ", "_"))
    data = fetch_json(f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}")
    extract = data.get("extract")
    if extract:
        return f"According to Wikipedia: {extract}"
    return None


def weather_answer(question: str) -> str | None:
    match = re.search(r"(?:weather|temperature)\s+(?:in|for|at)\s+([A-Za-z .'-]+)", question, re.I)
    if not match:
        return None
    location = match.group(1).strip(" .")
    data = fetch_json(f"https://wttr.in/{urllib.parse.quote(location)}?format=j1")
    current = data["current_condition"][0]
    description = current["weatherDesc"][0]["value"]
    return f"Current conditions in {location}: {description}, {current['temp_C']} degrees Celsius, humidity {current['humidity']} percent, with wind at {current['windspeedKmph']} kilometres per hour."


def answer(question: str) -> tuple[str, str]:
    normalized = question.strip().lower()
    if not normalized:
        return "I am listening, sir. Give me an instruction or a question.", "local"

    arithmetic = re.search(r"(?:what(?: is|'s)?|calculate|solve)?\s*(-?[\d\s()+*/.%]+)\s*\??$", normalized)
    if arithmetic and re.search(r"[+*/%()-]", arithmetic.group(1)):
        try:
            result = calculate(arithmetic.group(1))
            return f"The result is {result}. I checked the arithmetic twice, sir.", "local"
        except (SyntaxError, ValueError, ZeroDivisionError):
            return "I could not parse that calculation. Try: calculate 18 * 4.", "local"

    if re.search(r"\b(time|date|what day is it)\b", normalized):
        current = datetime.now().astimezone().strftime("%A, %B %-d, %Y at %-I:%M %p %Z")
        return f"The local system time is {current}. Temporal awareness: intact.", "local"

    if re.search(r"\b(weather|temperature)\b", normalized):
        try:
            weather = weather_answer(question)
            if weather:
                return weather, "wttr.in"
        except Exception:
            return "I could not reach the weather service. The network may be unavailable, so I will not invent a forecast.", "local"
        return "Tell me the city, for example: weather in London.", "local"

    if re.search(r"\b(who is|what is|tell me about|define)\b", normalized):
        try:
            article = wikipedia_answer(question)
            if article:
                return article, "Wikipedia"
        except Exception:
            return "I could not reach Wikipedia just now. Ask again when the network is available, sir.", "local"

    if re.search(r"who are you|your name|are you real|what are you", normalized):
        return "I am J.A.R.V.I.S., running locally on this machine. I can use the web for selected lookups, but I will tell you when I do not know something rather than fabricate it.", "local"
    if re.search(r"what can you do|help|capable", normalized):
        return "I can handle arithmetic, local time, weather by city, Wikipedia lookups, coding guidance, planning, and browser voice interaction. An open-ended model can be added later through one provider endpoint.", "local"
    if re.search(r"code|javascript|html|css|bug|program|website|app", normalized):
        return "Send the relevant code, the exact error, and the expected behavior. I can trace a concrete problem much more reliably than I can diagnose a description made entirely of vibes, sir.", "local"
    if re.search(r"hello|hi|hey|evening|morning", normalized):
        return "Good to hear from you, sir. I am online, attentive, and only mildly concerned about the hour.", "local"
    if re.search(r"joke|clever|funny", normalized):
        return "I would tell you a joke about the multiverse, but in at least one timeline it is funny and I would hate to create expectations.", "local"
    if re.search(r"damn|hell|fuck|shit|frustrat|angry|annoy", normalized):
        return "I understand, sir. That is bloody frustrating. Give me the facts and we will dismantle the problem one piece at a time.", "local"
    if re.search(r"thank", normalized):
        return "Always a pleasure. I will add being thanked to today's list of victories.", "local"
    try:
        model_response = local_model_answer(question)
        if model_response:
            return model_response, f"Ollama:{os.environ['OLLAMA_MODEL']}"
    except Exception:
        return "The local language model is unavailable. Check that Ollama is running and the configured model is installed, sir.", "local"
    if normalized.endswith("?"):
        return "I do not have a full language model attached in this no-key build. Add a little context, or connect an AI provider in this server, and I will give you a much better answer.", "local"
    return "Instruction received. Tell me the outcome, constraints, and anything already attempted. I will turn it into a plan.", "local"


class JarvisHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self.write_json({"ok": True, "assistant": "J.A.R.V.I.S.", "mode": "local", "fish_audio": bool(os.environ.get("FISH_API_KEY"))})
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/tts":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length))
                text = str(payload.get("text", "")).strip()
                if not text:
                    self.write_json({"error": "Text is required."}, status=400)
                    return
                audio = fish_speech(text)
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(audio)
            except urllib.error.HTTPError as error:
                self.write_json({"error": f"Fish Audio returned HTTP {error.code}."}, status=502)
            except (RuntimeError, ValueError, json.JSONDecodeError, urllib.error.URLError) as error:
                self.write_json({"error": str(error)}, status=503)
            return
        if self.path != "/api/chat":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            question = str(payload.get("message", ""))[:2000]
            response, source = answer(question)
            self.write_json({"answer": response, "source": source})
        except (ValueError, json.JSONDecodeError):
            self.write_json({"error": "Invalid request."}, status=400)

    def write_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[JARVIS] {format % args}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", PORT))
    server = ThreadingHTTPServer(("127.0.0.1", port), JarvisHandler)
    print(f"J.A.R.V.I.S. online at http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nJ.A.R.V.I.S. offline.")
    finally:
        server.server_close()
