/*
New Idealism Journey Engine (v2)
- Single reusable page
- Steps defined in steps.json
- Saves writing locally (localStorage)
- Outputs a compiled artifact at the end
*/

const STORAGE_KEY = "ni_ledger_v2";

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function ytEmbedUrl(url){
  // Supports standard watch URLs, youtu.be, and already-embedded URLs
  try{
    const u = new URL(url);
    if(u.hostname.includes("youtu.be")){
      const id = u.pathname.replace("/","").trim();
      return `https://www.youtube.com/embed/${id}`;
    }
    if(u.hostname.includes("youtube.com")){
      if(u.pathname.startsWith("/embed/")) return url;
      const id = u.searchParams.get("v");
      if(id) return `https://www.youtube.com/embed/${id}`;
    }
  }catch(e){}
  return url;
}

function loadState(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  }catch(e){
    return {};
  }
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentStepId(){
  const p = new URLSearchParams(location.search);
  return p.get("step") || "1";
}

function setStepId(stepId){
  const p = new URLSearchParams(location.search);
  p.set("step", stepId);
  history.pushState({}, "", `${location.pathname}?${p.toString()}`);
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

function escapeText(s){
  return (s || "").replaceAll("\r\n","\n").trim();
}

function compileArtifact(steps, state){
  const created = new Date().toISOString().slice(0,10);
  const lines = [];
  lines.push("THE IDEALISM LEDGER");
  lines.push(`Created: ${created}`);
  lines.push("");
  lines.push("This is your proof-of-work - your personal record of what shifted.");
  lines.push("Keep it. Edit it. Return to it when the old spell tries to reassert itself.");
  lines.push("");
  lines.push("----");
  for(const step of steps){
    const key = `step:${step.id}`;
    const entry = (state.entries && state.entries[key]) || {};
    const text = escapeText(entry.text || "");
    lines.push(`STEP ${step.id}: ${step.title}`);
    lines.push(step.question ? `Prompt: ${step.question}` : "");
    lines.push("");
    lines.push(text ? text : "[no text entered]");
    lines.push("");
    lines.push("----");
  }
  return lines.join("\n");
}

async function boot(){
  const res = await fetch("./steps.json", {cache:"no-store"});
  const steps = await res.json();
  const stepId = currentStepId();

  if(stepId === "complete"){
    renderComplete(steps);
    return;
  }

  const step = steps.find(s => s.id === stepId) || steps[0];
  renderStep(step, steps);
}

function renderStep(step, steps){
  const state = loadState();
  state.entries = state.entries || {};

  qs("#title").textContent = step.title || "New Idealism";
  qs("#subtitle").textContent = "One question. One honest answer. Then move forward.";
  qs("#question").textContent = step.question || "Write what comes up.";
  qs("#hint").textContent = step.prompt_hint || "";

  // Video
  const iframe = qs("#videoFrame");
  iframe.src = ytEmbedUrl(step.video_url || "");

  // Transcript
  qs("#transcriptText").textContent = step.transcript || "";

  // Load saved entry
  const entryKey = `step:${step.id}`;
  const entry = state.entries[entryKey] || {mode:"type", text:"", ink:""};
  state.entries[entryKey] = entry;
  saveState(state);

  const editor = qs("#editor");
  editor.innerText = entry.text || "";

  // Canvas setup
  const canvas = qs("#inkCanvas");
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let last = null;

  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(244,241,232,0.95)";
    // redraw existing ink
    if(entry.ink){
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0,0,rect.width,rect.height);
        ctx.drawImage(img, 0,0, rect.width, rect.height);
      };
      img.src = entry.ink;
    }else{
      ctx.clearRect(0,0,rect.width,rect.height);
    }
  }

  // Wait for layout
  setTimeout(resizeCanvas, 0);
  window.addEventListener("resize", () => setTimeout(resizeCanvas, 0), {passive:true});

  function posFromEvent(ev){
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left);
    const y = (ev.clientY - rect.top);
    return {x,y};
  }

  function pointerDown(ev){
    drawing = true;
    last = posFromEvent(ev);
    canvas.setPointerCapture(ev.pointerId);
  }

  function pointerMove(ev){
    if(!drawing) return;
    const p = posFromEvent(ev);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  }

  function pointerUp(ev){
    drawing = false;
    last = null;
    // save
    const rect = canvas.getBoundingClientRect();
    entry.ink = canvas.toDataURL("image/png");
    const state2 = loadState();
    state2.entries = state2.entries || {};
    state2.entries[entryKey] = entry;
    saveState(state2);
  }

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);

  // Mode toggle
  const modeBtn = qs("#modeBtn");
  const clearInkBtn = qs("#clearInkBtn");
  const canvasWrap = qs("#canvasWrap");

  function setMode(mode){
    entry.mode = mode;
    const state2 = loadState();
    state2.entries = state2.entries || {};
    state2.entries[entryKey] = entry;
    saveState(state2);

    if(mode === "ink"){
      editor.style.display = "none";
      canvasWrap.style.display = "block";
      modeBtn.textContent = "Switch to typing";
      clearInkBtn.style.display = "inline-flex";
      setTimeout(resizeCanvas, 0);
    }else{
      editor.style.display = "block";
      canvasWrap.style.display = "none";
      modeBtn.textContent = "Switch to ink";
      clearInkBtn.style.display = "none";
    }
  }

  modeBtn.addEventListener("click", () => {
    setMode(entry.mode === "ink" ? "type" : "ink");
  });

  clearInkBtn.addEventListener("click", () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0,0,rect.width,rect.height);
    entry.ink = "";
    const state2 = loadState();
    state2.entries = state2.entries || {};
    state2.entries[entryKey] = entry;
    saveState(state2);
  });

  setMode(entry.mode || "type");

  // Save typing continuously (debounced)
  let t;
  editor.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      entry.text = editor.innerText || "";
      const state2 = loadState();
      state2.entries = state2.entries || {};
      state2.entries[entryKey] = entry;
      saveState(state2);
      qs("#saved").textContent = "Saved locally.";
    }, 250);
  });

  // Keyboard: Ctrl+Enter = Next
  editor.addEventListener("keydown", (ev) => {
    if((ev.ctrlKey || ev.metaKey) && ev.key === "Enter"){
      ev.preventDefault();
      qs("#nextBtn").click();
    }
  });

  // Next button
  qs("#nextBtn").addEventListener("click", () => {
    // final save for typing
    if(entry.mode !== "ink"){
      entry.text = editor.innerText || "";
    }
    const state2 = loadState();
    state2.entries = state2.entries || {};
    state2.entries[entryKey] = entry;
    saveState(state2);

    const next = step.next || "complete";
    setStepId(next);
    location.reload();
  });
}

function renderComplete(steps){
  qs("#mainStep").style.display = "none";
  qs("#complete").style.display = "block";

  const state = loadState();
  const artifact = compileArtifact(steps, state);

  qs("#artifact").textContent = artifact;

  qs("#downloadBtn").addEventListener("click", () => {
    downloadText("idealism-ledger.txt", artifact);
  });

  qs("#copyBtn").addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(artifact);
      qs("#copyStatus").textContent = "Copied.";
    }catch(e){
      qs("#copyStatus").textContent = "Copy failed - select and copy manually.";
    }
  });

  qs("#restartBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    setStepId("1");
    location.reload();
  });
}

boot();
