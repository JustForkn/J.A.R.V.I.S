# J.A.R.V.I.S

A cinematic, Iron Man-inspired J.A.R.V.I.S. chat interface built with plain HTML, CSS, and JavaScript.

## Published website

The browser interface is deployed through GitHub Pages at `https://justforkn.github.io/J.A.R.V.I.S/` after the Pages workflow completes. The published version includes the HUD, microphone input, browser speech, and optional Groq key field. GitHub Pages cannot run the Python backend, so local weather/Wikipedia lookups and Ollama require `python3 server.py` instead.

## Run locally

Run the integrated server:

```bash
python3 server.py
```

Then visit `http://localhost:4173`. The microphone button uses the browser's Web Speech API when available, and replies use local speech synthesis with an original, J.A.R.V.I.S.-inspired delivery. Allow microphone access when prompted.

The Python backend provides no-key answers for arithmetic, time, weather by city through `wttr.in`, and knowledge lookups through Wikipedia. It also supports an optional local Ollama model for open-ended questions:

```bash
ollama pull llama3.2
OLLAMA_MODEL=llama3.2 python3 server.py
```

The supplied Fish Audio page is linked in the interface as a voice reference; it is not a direct audio API, so it cannot be used as live TTS without Fish Audio API access or an exported audio file.

## Groq text mode

Paste a Groq API key into the `GROQ NEURAL LINK` field in the right rail and press the arrow button. New questions will use Groq's `llama-3.3-70b-versatile` model with a J.A.R.V.I.S.-inspired system prompt, conversation context, and the existing spoken browser reply. The key is cleared from the field and kept only in memory for the current page session; do not use this client-side field for a public production deployment.