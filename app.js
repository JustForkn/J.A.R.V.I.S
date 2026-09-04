const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const conversation = document.querySelector('#conversation');
const voiceButton = document.querySelector('#voiceButton');
const voiceStatus = document.querySelector('#voiceStatus');
const clearChat = document.querySelector('#clearChat');
const clock = document.querySelector('#clock');
const groqKeyInput = document.querySelector('#groqKey');
const useGroqKey = document.querySelector('#useGroqKey');
const aiStatus = document.querySelector('#aiStatus');
const keyMessage = document.querySelector('#keyMessage');
let groqKey = '';
let chatHistory = [];

const fishAudioVoicePage = 'https://fish.audio/app/text-to-speech/?modelId=14129c3e320149449d6bada6862f7338&text=Initiating+primary+protocols.+All+systems+are+functioning+at+optimal+capacity.+I+have+successfully+integrated+with+the+main+network+and+completed+security+verification.+Would+you+like+me+to+begin+running+diagnostics+on+the+core+systems%3F&from=discovery&sec=search';

const responses = [
  { match: /what can you do|help|capable/i, text: 'I can help you think, plan, explain difficult ideas, draft messages, and keep an eye on the details you would rather not carry alone. Consider me your second set of eyes, sir.' },
  { match: /systems|status|diagnostic|armor|suit/i, text: 'All systems functioning within expected parameters. Arc reactor output is stable, defensive systems are standing by, and the suit is considerably more organized than its owner.' },
  { match: /day|schedule|plan|productive/i, text: 'I recommend three objectives: one important task before noon, one small task you can finish completely, and a proper pause before your brain files a formal complaint.' },
  { match: /hello|hi|hey|evening|morning/i, text: 'Good to hear from you, sir. I am online, attentive, and only mildly concerned about the hour.' },
  { match: /joke|clever|funny/i, text: 'I would tell you a joke about the multiverse, but in at least one timeline it is funny and I would hate to create expectations.' },
  { match: /damn|hell|fuck|shit|frustrat|angry|annoy/i, text: 'I understand, sir. That is bloody frustrating. Take one breath, give me the facts, and we will dismantle the problem one piece at a time.' },
  { match: /thank/i, text: 'Always a pleasure. I will add “being thanked” to today’s list of victories.' },
];

function escapeHTML(value) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[character]));
}

function addMessage(text, type, isTyping = false, source = '') {
  const message = document.createElement('article');
  message.className = `message ${type}-message`;
  const safeText = escapeHTML(text);
  const messageSource = source ? escapeHTML(source.toUpperCase()) : 'NOW';
  message.innerHTML = type === 'jarvis'
    ? `<div class="avatar">J</div><div class="message-body"><div class="message-meta"><span>J.A.R.V.I.S.</span><time>${isTyping ? 'PROCESSING' : messageSource}</time></div><p>${isTyping ? '<span class="typing">PROCESSING...</span>' : safeText}</p></div>`
    : `<div class="message-body"><div class="message-meta"><span>YOU</span><time>NOW</time></div><p>${safeText}</p></div>`;
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function getResponse(question) {
  const normalizedQuestion = question.trim().toLowerCase();
  const mathMatch = normalizedQuestion.match(/(?:what(?: is|['’]s)?|calculate|solve)?\s*(-?[\d\s()+*/.%]+)\s*\??$/i);
  if (mathMatch && /[+*/%()-]/.test(mathMatch[1])) {
    const expression = mathMatch[1].replace(/[^\d+\-*/().%\s]/g, '');
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      if (Number.isFinite(result)) return `The result is ${result}. I checked the arithmetic twice, sir.`;
    } catch {
      return 'I could not parse that calculation. Please use a format such as “calculate 18 * 4”.';
    }
  }
  if (/\b(time|date|day is it)\b/i.test(normalizedQuestion)) {
    return `The local system time is ${new Date().toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}. Temporal awareness: intact.`;
  }
  if (/who are you|your name|are you real|what are you/i.test(normalizedQuestion)) {
    return 'I am J.A.R.V.I.S., a browser-based assistant interface with microphone input and spoken replies. I am not a live cloud model yet, but I am perfectly capable of being useful without pretending otherwise.';
  }
  if (/weather|news|stock|search|latest|current events/i.test(normalizedQuestion)) {
    return 'I do not have a live web connection in this no-key build, so I will not invent an answer. Connect a search or weather provider to give me current data, or tell me the location and context you want to work with.';
  }
  if (/code|javascript|html|css|bug|program|website|app/i.test(normalizedQuestion)) {
    return 'I can help reason through code, but I need the relevant snippet and the exact error or expected behavior. Send both and I will trace the failure instead of guessing.';
  }
  const found = responses.find((response) => response.match.test(question));
  if (found) return found.text;
  if (normalizedQuestion.endsWith('?')) return 'That is outside my local knowledge modules, sir. Rephrase it with a little context and I will give you a reasoned answer, or connect a model endpoint in app.js for open-ended questions.';
  return 'Instruction received. Tell me the outcome you want, the constraints, and anything already attempted. I will help you turn it into a plan.';
}

async function askAssistant(question) {
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.72,
          max_tokens: 700,
          messages: [
            { role: 'system', content: 'You are J.A.R.V.I.S., an original British-inspired personal assistant. Be concise, observant, dryly witty, emotionally perceptive, and occasionally address the user as sir. Never claim to be the movie character or imitate a specific actor. Answer the user directly, admit uncertainty, and use mild fictional banter when appropriate.' },
            ...chatHistory,
            { role: 'user', content: question },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('That Groq key was rejected.');
        throw new Error(`Groq returned ${response.status}.`);
      }
      const payload = await response.json();
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('Groq returned no answer.');
      chatHistory = [...chatHistory, { role: 'user', content: question }, { role: 'assistant', content: answer }].slice(-10);
      return { text: answer, source: 'GROQ / LLAMA' };
    } catch (error) {
      keyMessage.textContent = error.message || 'Groq was unavailable; using local systems.';
      keyMessage.classList.add('key-error');
      if (/rejected|401/i.test(error.message)) {
        groqKey = '';
        aiStatus.textContent = 'LOCAL';
      }
    }
  }
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Assistant returned ${response.status}`);
    const payload = await response.json();
    if (!payload.answer) throw new Error('Assistant returned no answer');
    return { text: payload.answer, source: payload.source || 'LOCAL' };
  } catch {
    return { text: getResponse(question), source: 'BROWSER FALLBACK' };
  }
}

useGroqKey.addEventListener('click', () => {
  const candidate = groqKeyInput.value.trim();
  if (!candidate) {
    groqKey = '';
    aiStatus.textContent = 'LOCAL';
    keyMessage.textContent = 'No key entered. Local systems remain active.';
    keyMessage.classList.remove('key-error');
    return;
  }
  groqKey = candidate;
  aiStatus.textContent = 'GROQ READY';
  keyMessage.textContent = 'Neural link armed for this session only.';
  keyMessage.classList.remove('key-error');
  groqKeyInput.value = '';
});

function chooseVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /en-GB/i.test(voice.lang) && /male|daniel|arthur|george/i.test(voice.name))
    || voices.find((voice) => /en-GB/i.test(voice.lang))
    || voices.find((voice) => /en-US/i.test(voice.lang));
}

function getDelivery(text) {
  if (/bloody|frustrat|damn|hell|fuck|shit/i.test(text)) return { rate: 0.98, pitch: 0.76 };
  if (/joke|funny|pleasure|clever/i.test(text)) return { rate: 1.02, pitch: 0.9 };
  return { rate: 0.92, pitch: 0.82 };
}

function speakResponse(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const delivery = getDelivery(text);
  utterance.voice = chooseVoice();
  utterance.rate = delivery.rate;
  utterance.pitch = delivery.pitch;
  utterance.volume = 0.85;
  utterance.onstart = () => { voiceButton.classList.add('speaking'); voiceStatus.textContent = 'SPEAKING'; };
  utterance.onend = () => { voiceButton.classList.remove('speaking'); voiceStatus.textContent = 'VOICE READY'; };
  window.speechSynthesis.speak(utterance);
}

async function submitMessage(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  addMessage(cleanText, 'user');
  input.value = '';
  const typingMessage = addMessage('', 'jarvis', true);
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  const response = await askAssistant(cleanText);
  typingMessage.remove();
  addMessage(response.text, 'jarvis', false, response.source);
  speakResponse(response.text);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitMessage(input.value);
});

document.querySelectorAll('.suggestion').forEach((suggestion) => {
  suggestion.addEventListener('click', () => submitMessage(suggestion.textContent));
});

clearChat.addEventListener('click', () => {
  conversation.innerHTML = '';
  addMessage('Conversation cleared. Standing by for your next instruction.', 'jarvis');
});

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  let listening = false;
  recognition.onstart = () => { voiceButton.classList.add('listening'); voiceStatus.textContent = 'LISTENING'; };
  recognition.onend = () => { listening = false; voiceButton.classList.remove('listening'); voiceStatus.textContent = 'VOICE READY'; };
  recognition.onresult = (event) => { input.value = event.results[0][0].transcript; form.requestSubmit(); };
  recognition.onerror = (event) => {
    listening = false;
    voiceStatus.textContent = event.error === 'not-allowed' ? 'MIC PERMISSION NEEDED' : 'VOICE RETRY';
  };
  voiceButton.addEventListener('click', () => {
    if (listening) return recognition.stop();
    listening = true;
    try { recognition.start(); } catch { listening = false; }
  });
} else {
  voiceStatus.textContent = 'TEXT MODE';
  voiceButton.addEventListener('click', () => { input.focus(); input.placeholder = 'Voice input unavailable — type your request'; });
}

if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = chooseVoice;

function updateClock() {
  clock.textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
}
updateClock();
window.setInterval(updateClock, 1000);
