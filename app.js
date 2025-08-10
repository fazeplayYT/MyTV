// app.js - PWA demo (client-only). 2025
"use strict";

/* --- utilitaires --- */
// simple SHA-256 wrapper using SubtleCrypto -> hex
async function sha256Hex(str){
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

const el = id => document.getElementById(id);
const saveJSON = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const loadJSON = (k, fallback) => {
  const t = localStorage.getItem(k);
  return t ? JSON.parse(t) : fallback;
};

/* --- stockage demo --- */
const USERS_KEY = "demo_users_v1";        // {username: hashedPassword}
const SESSION_KEY = "demo_session_v1";    // username
const HISTORY_KEY = "demo_history_v1";    // {username: [entries]}
const IPTV_KEY = "demo_iptv_v1";          // {username: [ {title,url} ]}

/* --- DOM refs --- */
const loginScreen = el("login-screen");
const mainScreen = el("main-screen");
const loginForm = el("login-form");
const registerBtn = el("register-btn");
const welcome = el("welcome");
const logoutBtn = el("logout-btn");

const streamTitle = el("stream-title");
const streamUrl = el("stream-url");
const playBtn = el("play-stream");
const saveStreamBtn = el("save-stream");
const iptvList = el("iptv-list");
const video = el("video");
const playerInfo = el("player-info");

const historyList = el("history-list");
const addHistoryForm = el("add-history-form");
const historyTitle = el("history-title");
const historyNote = el("history-note");
const clearHistory = el("clear-history");

/* --- helpers --- */
function currentUser(){ return localStorage.getItem(SESSION_KEY); }
function requireLogin() {
  const u = currentUser();
  if(!u) showLogin();
  return u;
}

/* --- login/register --- */
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const username = el("username").value.trim();
  const password = el("password").value;
  if(!username || !password){ alert("Remplis tous les champs"); return; }

  const users = loadJSON(USERS_KEY, {});
  const hash = await sha256Hex(password + username); // simple salting by username (demo)
  if(users[username] && users[username] === hash){
    localStorage.setItem(SESSION_KEY, username);
    showMain();
  } else {
    alert("Utilisateur / mot de passe invalide. Tu peux créer un compte (bouton Créer).");
  }
});

registerBtn.addEventListener("click", async () => {
  const username = el("username").value.trim();
  const password = el("password").value;
  if(!username || !password){ alert("Choisis un nom d'utilisateur et un mot de passe"); return; }
  const users = loadJSON(USERS_KEY,{});
  if(users[username]){ alert("Nom d'utilisateur déjà pris (démo)."); return; }
  const hash = await sha256Hex(password + username);
  users[username] = hash;
  saveJSON(USERS_KEY, users);
  localStorage.setItem(SESSION_KEY, username);
  alert("Compte créé (démo).");
  showMain();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
});

/* --- UI state --- */
function showLogin(){
  loginScreen.classList.remove("hidden");
  mainScreen.classList.add("hidden");
}
function showMain(){
  const u = currentUser();
  loginScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  welcome.textContent = `Bonjour, ${u}`;
  refreshHistory();
  refreshIPTV();
}

/* --- History --- */
addHistoryForm.addEventListener("submit", e => {
  e.preventDefault();
  const u = requireLogin();
  if(!u) return;
  const t = historyTitle.value.trim();
  if(!t) return;
  const note = historyNote.value.trim();
  const all = loadJSON(HISTORY_KEY, {});
  all[u] = all[u] || [];
  all[u].unshift({ title: t, note, date: new Date().toISOString() });
  saveJSON(HISTORY_KEY, all);
  historyTitle.value = ""; historyNote.value = "";
  refreshHistory();
});

clearHistory.addEventListener("click", () => {
  const u = requireLogin();
  if(!u) return;
  if(confirm("Effacer tout l'historique local ?")){
    const all = loadJSON(HISTORY_KEY, {});
    all[u] = [];
    saveJSON(HISTORY_KEY, all);
    refreshHistory();
  }
});

function refreshHistory(){
  const u = currentUser();
  historyList.innerHTML = "";
  if(!u) return;
  const all = loadJSON(HISTORY_KEY, {});
  const items = all[u] || [];
  if(items.length === 0){
    historyList.innerHTML = "<li class='muted'>Aucun historique.</li>";
    return;
  }
  for(const it of items){
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${escapeHtml(it.title)}</strong><div class="muted">${escapeHtml(it.note || "")}</div></div>
                    <div class="muted">${new Date(it.date).toLocaleString()}</div>`;
    historyList.appendChild(li);
  }
}

/* --- IPTV / player --- */
playBtn.addEventListener("click", async () => {
  const url = streamUrl.value.trim();
  const title = streamTitle.value.trim() || "Flux";
  if(!url){ alert("Ajoute une URL de flux"); return; }
  playStream(url, title);
  // ajoute automatiquement à l'historique de visionnage
  addToHistory(title, `Flux: ${url}`);
});

saveStreamBtn.addEventListener("click", () => {
  const url = streamUrl.value.trim();
  const title = streamTitle.value.trim() || url;
  if(!url){ alert("Ajoute une URL avant de sauvegarder"); return; }
  const u = requireLogin();
  if(!u) return;
  const all = loadJSON(IPTV_KEY, {});
  all[u] = all[u] || [];
  all[u].push({title, url});
  saveJSON(IPTV_KEY, all);
  streamTitle.value = ""; streamUrl.value = "";
  refreshIPTV();
});

function refreshIPTV(){
  const u = currentUser();
  iptvList.innerHTML = "";
  if(!u) return;
  const all = loadJSON(IPTV_KEY, {});
  const arr = all[u] || [];
  if(arr.length === 0){ iptvList.innerHTML = "<li class='muted'>Aucun favori.</li>"; return; }
  arr.slice().reverse().forEach((item, idx) => {
    const li = document.createElement("li");
    const t = escapeHtml(item.title);
    const url = escapeHtml(item.url);
    li.innerHTML = `<div>${t}<div class="muted small">${url}</div></div>
                    <div class="row">
                      <button data-url="${url}" class="play-fav">Lire</button>
                      <button data-idx="${idx}" class="del-fav ghost">Suppr</button>
                    </div>`;
    iptvList.appendChild(li);
  });

  iptvList.querySelectorAll(".play-fav").forEach(btn=>{
    btn.addEventListener("click", e=>{
      playStream(btn.dataset.url, "Favori");
    });
  });
  iptvList.querySelectorAll(".del-fav").forEach(btn=>{
    btn.addEventListener("click", e=>{
      if(!confirm("Supprimer ce favori ?")) return;
      const all = loadJSON(IPTV_KEY,{});
      const arr = all[currentUser()] || [];
      // supprimer par URL (première occurrence)
      const idx = arr.findIndex(x => x.url === btn.previousElementSibling?.dataset?.url || arr[btn.dataset.idx]);
      // fallback: remove by index from end
      arr.splice(arr.length - 1 - Number(btn.dataset.idx), 1);
      all[currentUser()] = arr;
      saveJSON(IPTV_KEY, all);
      refreshIPTV();
    });
  });
}

function playStream(url, title){
  playerInfo.textContent = `Lecture : ${title} — ${url}`;
  // si le navigateur ne lit pas nativement HLS, utilise hls.js
  if(video.canPlayType('application/vnd.apple.mpegurl')){
    video.src = url;
    video.play().catch(()=>{});
  } else if(window.Hls && Hls.isSupported()){
    if(window._hls) { window._hls.destroy(); window._hls = null; }
    const hls = new Hls();
    window._hls = hls;
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
  } else {
    alert("Lecture HLS non supportée par ce navigateur (pas de hls.js).");
  }
}

/* --- small helpers --- */
function addToHistory(title, note){
  const u = requireLogin();
  if(!u) return;
  const all = loadJSON(HISTORY_KEY, {});
  all[u] = all[u] || [];
  all[u].unshift({title, note, date: new Date().toISOString()});
  saveJSON(HISTORY_KEY, all);
  refreshHistory();
}
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* --- startup --- */
window.addEventListener("load", () => {
  if(currentUser()) showMain();
  else showLogin();

  // register SW (PWA)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').then(()=> console.log('sw registered')).catch(()=>{});
  }
});
