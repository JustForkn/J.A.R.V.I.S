const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const start = Date.now();

function log(message, type="ok") {
  const box = $("#log");
  if (!box) return;
  const time = new Date().toLocaleTimeString();
  box.insertAdjacentHTML("beforeend", `<div class="${type}">[${time}] ${message}</div>`);
  box.scrollTop = box.scrollHeight;
}

function toast(message) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove("show"), 2500);
}

function showSection(id) {
  $$(".section").forEach(s => s.classList.toggle("active", s.id === id));
  $$(".nav").forEach(n => n.classList.toggle("active", n.dataset.section === id));
  log(`Interface switched to ${id.toUpperCase()}.`);
}

$$(".nav").forEach(n => n.addEventListener("click", () => showSection(n.dataset.section)));
$("#homeBtn").addEventListener("click", () => showSection("overview"));
$("#settingsBtn").addEventListener("click", () => showSection("settings"));

$("#fullscreenBtn").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    toast("Fullscreen is unavailable in this browser.");
  }
});

$("#themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("alternate");
  toast("Interface visual profile toggled.");
});

$$(".commands button").forEach(btn => {
  btn.addEventListener("click", async () => {
    const text = btn.dataset.command;
    try {
      await navigator.clipboard.writeText(text);
      toast("Command copied. Paste it into J.A.R.V.I.S.");
      log(`Quick command prepared: ${text}`);
    } catch {
      toast("Command ready: " + text);
    }
  });
});

$("#clearLog").addEventListener("click", () => {
  $("#log").innerHTML = "";
  log("System log cleared.");
});

$("#runDiag").addEventListener("click", () => {
  const r = $("#diagResults");
  r.innerHTML = `
    <div class="good">CORE SYSTEM ............ NOMINAL</div>
    <div class="good">VOICE INTERFACE ........ READY</div>
    <div class="good">PUBLIC SESSION ......... ENABLED</div>
    <div class="good">INTERFACE .............. OPERATIONAL</div>
    <div class="muted">Diagnostic completed successfully.</div>
  `;
  log("Full interface diagnostic completed.");
  toast("Diagnostic complete.");
});

$("#glowRange").addEventListener("input", e => {
  const v = e.target.value;
  document.body.style.setProperty("--glow", v / 100);
  $("#glowValue").textContent = v + "%";
});

$("#gridToggle").addEventListener("change", e => {
  document.body.classList.toggle("no-grid", !e.target.checked);
});

$("#compactToggle").addEventListener("change", e => {
  document.body.classList.toggle("compact", e.target.checked);
});

$("#resetBtn").addEventListener("click", () => {
  $("#glowRange").value = 100;
  $("#glowValue").textContent = "100%";
  document.body.style.setProperty("--glow", 1);
  document.body.classList.remove("no-grid", "compact", "alternate");
  $("#gridToggle").checked = true;
  $("#compactToggle").checked = false;
  toast("Interface reset.");
  log("Interface preferences reset.");
});

function updateClock() {
  $("#clock").textContent = new Date().toLocaleTimeString([], {hour12:false});
}
setInterval(updateClock, 1000);
updateClock();

function updateTelemetry() {
  const seconds = Math.floor((Date.now() - start) / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2,"0");
  const m = String(Math.floor(seconds % 3600 / 60)).padStart(2,"0");
  const s = String(seconds % 60).padStart(2,"0");
  $("#uptime").textContent = `${h}:${m}:${s}`;
  $("#cpu").textContent = `${88 + Math.floor(Math.random()*10)}%`;
  $("#latency").textContent = `${35 + Math.floor(Math.random()*28)}ms`;
  if (navigator.getBattery) {
    navigator.getBattery().then(b => {
      $("#battery").textContent = Math.round(b.level * 100) + "%";
    }).catch(() => $("#battery").textContent = "N/A");
  } else $("#battery").textContent = "N/A";
}
setInterval(updateTelemetry, 1500);
updateTelemetry();

window.addEventListener("online", () => {
  $("#networkState").textContent = "CONNECTED";
  log("Network connection restored.");
});
window.addEventListener("offline", () => {
  $("#networkState").textContent = "OFFLINE";
  log("Network connection lost.", "warn");
});

setTimeout(() => {
  $("#bootStatus").textContent = "SYSTEMS ONLINE";
  setTimeout(() => $("#boot").classList.add("hide"), 500);
}, 2200);

setTimeout(() => {
  log("J.A.R.V.I.S. interface initialized.");
  log("Fish Audio agent bridge loaded.");
  log("Public session security active.");
}, 2600);
