const STORAGE_KEY = "ni_ledger_v2";
const MENU_URL = "https://newidealism.com"; // Carrd menu (change if needed)

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

function getStepIdFromUrl(){
  const u = new URL(window.location.href);
  return u.searchParams.get("step") || "1";
}

function setUrlStep(step){
  const u = new URL(window.location.href);
  u.searchParams.set("step", step);
  window.history.pushState({}, "", u.toString());
}

function loadLedger(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  }catch(e){
    return {};
  }
}

function saveLedger(ledger){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadSteps(){
  const res = await fetch("steps.json", {cache:"no-store"});
  if(!res.ok) throw new Error("Could not load steps.json");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.steps || []);
}

function ytEmbedUrl(url){
  try{
    if(!url) return "";
    const u = new URL(url);
    if(u.hostname.includes("youtu.be")){
      const id = u.pathname.replace("/","");
      return `https://www.youtube.com/embed/${id}`;
    }
    if(u.hostname.includes("youtube.com")){
      if(u.pathname.startsWith("/embed/")) return url;
      if(u.pathname.startsWith("/shorts/")){
        const id = u.pathname.split("/")[2];
        if(id) return `https://www.youtube.com/embed/${id}`;
      }
      const id = u.searchParams.get("v");
      if(id) return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  }catch(e){
    return url || "";
  }
}

function compileArtifact(steps, ledger){
  const lines = [];
  lines.push("THE IDEALISM TEACHING PROFILE (DRAFT)");
  lines.push("");
  lines.push("This is your proof-of-work - your raw material.");
  lines.push("Keep it. Edit it. Paste it into ChatGPT later for an analysis if you want.");
  lines.push("");
  lines.push("----");
  lines.push("");

  for(const step of steps){
    const ans = ledger[step.id];
    if(!ans || !ans.trim()) continue;
    lines.push(`# ${step.title}`);
    if(step.question) lines.push(step.question);
    lines.push("");
    lines.push(ans.trim());
    lines.push("");
    lines.push("----");
    lines.push("");
  }

  return lines.join("\n");
}

function showStatus(msg){
  const el = qs("#status");
  el.textContent = msg || "";
}

function renderStep(step, steps, ledger){
  qs("#title").textContent = step.title || "";
  qs("#subtitle").textContent = step.subtitle || "One question. One honest answer. Then move forward.";
  qs("#question").textContent = step.question || "";
  qs("#hint").textContent = step.prompt_hint || "";

  const ctxText = qs("#context");
  if(ctxText) ctxText.textContent = step.context || "";

  const menuLink = qs("#menuLink");
  if(menuLink){ menuLink.href = step.menu_url || MENU_URL; }

  // Video
  const iframe = qs("#videoFrame");
  const videoEl = qs("#videoFile");
  const videoWrap = qs("#videoWrap");

  if(step.video_url){
    if(videoWrap) videoWrap.style.display = "";

    const isFile = /\.(mp4|webm|ogg)(\?|#|$)/i.test(step.video_url);

    if(isFile){
      // Local/hosted video file
      if(iframe){ iframe.src = ""; iframe.style.display = "none"; }
      if(videoEl){
        videoEl.style.display = "block";
        videoEl.src = step.video_url;
      }
    }else{
      // YouTube (or other iframe-friendly URL)
      if(videoEl){
        try{ videoEl.pause(); }catch(e){}
        videoEl.removeAttribute("src");
        videoEl.load();
        videoEl.style.display = "none";
      }
      if(iframe){
        iframe.style.display = "block";
        iframe.src = ytEmbedUrl(step.video_url);
      }
    }
  }else{
    if(videoWrap) videoWrap.style.display = "none";
    if(iframe) iframe.src = "";
    if(videoEl){
      try{ videoEl.pause(); }catch(e){}
      videoEl.removeAttribute("src");
      videoEl.load();
    }
  }

  // Transcript
  qs("#transcriptText").textContent = step.transcript || "";

  // Answer box
  const ta = qs("#answer");
  ta.value = ledger[step.id] || "";
  ta.focus();

  // Save button
  qs("#saveBtn").onclick = () => {
    ledger[step.id] = ta.value || "";
    saveLedger(ledger);
    showStatus("Saved.");
    setTimeout(()=>showStatus(""), 900);
  };

  // Next
  qs("#nextBtn").onclick = () => {
    ledger[step.id] = ta.value || "";
    saveLedger(ledger);

    const next = step.next || "complete";
    if(next === "complete"){
      const artifact = compileArtifact(steps, ledger);
      qs("#artifactText").textContent = artifact;
      qs("#downloadBtn").onclick = () => downloadText("idealism-teaching-profile.txt", artifact);

      qs("#completeCard").classList.remove("hidden");
      qs(".card").classList.add("hidden");
      setUrlStep("complete");
      window.scrollTo({top:0, behavior:"smooth"});
      return;
    }

    setUrlStep(next);
    boot();
  };

  // Ctrl+Enter to continue
  ta.onkeydown = (e) => {
    if(e.key === "Enter" && (e.ctrlKey || e.metaKey)){
      e.preventDefault();
      qs("#nextBtn").click();
    }
  };
}

async function boot(){
  try{
    const steps = await loadSteps();
    const stepId = getStepIdFromUrl();

    const ledger = loadLedger();

    // Handle complete
    if(stepId === "complete"){
      const artifact = compileArtifact(steps, ledger);
      qs("#artifactText").textContent = artifact;
      qs("#downloadBtn").onclick = () => downloadText("idealism-teaching-profile.txt", artifact);
      qs("#completeCard").classList.remove("hidden");
      qs(".card").classList.add("hidden");
      return;
    }

    const step = steps.find(s => s.id === stepId) || steps[0];

    qs("#completeCard").classList.add("hidden");
    qs(".card").classList.remove("hidden");

    renderStep(step, steps, ledger);

  }catch(err){
    console.error(err);
    showStatus("Error loading steps. Check steps.json and your GitHub Pages build.");
  }
}

window.addEventListener("popstate", boot);
boot();
