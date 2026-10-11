"use strict";

var DATA = "https://cdn.emulatorjs.org/stable/data/";
var DB_NAME = "zelda-player";
var DB_STORE = "cart";
var KEY = "current";
var MAX_BYTES = 12 * 1024 * 1024;
var started = false;

var gate = document.getElementById("gate");
var stage = document.getElementById("stage");
var statusEl = document.getElementById("status");
var nameEl = document.getElementById("file-name");
var continueBtn = document.getElementById("continue");
var forgetBtn = document.getElementById("forget");
var fileInput = document.getElementById("file");
var drop = document.getElementById("drop");
var onscreen = document.getElementById("onscreen");
var padsEl = document.getElementById("pads");

function setStatus(text) {
  statusEl.textContent = text || "";
}

function openDb() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function idbGet() {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(DB_STORE, "readonly");
      var rq = tx.objectStore(DB_STORE).get(KEY);
      rq.onsuccess = function () { resolve(rq.result || null); };
      rq.onerror = function () { reject(rq.error); };
    });
  });
}

function idbSet(value) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, KEY);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function idbDel() {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(KEY);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function gameId(name) {
  var h = 2166136261;
  var s = String(name || "cart");
  var i;
  for (i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;
  return h === 0 ? 1 : h;
}

function validate(file) {
  if (!file) return "Choose a cartridge file.";
  if (file.size < 1024) return "That file is too small to be a SNES cartridge.";
  if (file.size > MAX_BYTES) return "That file is too large for this player (12 MB max).";
  if (!/\.(sfc|smc|fig|swc|zip|7z)$/i.test(file.name)) {
    return "Use a .sfc, .smc, .fig, .swc, .zip, or .7z file.";
  }
  return "";
}

function fileFromRecord(rec) {
  return new File([rec.buf], rec.name, {
    type: rec.type || "application/octet-stream"
  });
}

function showRecord(rec) {
  if (!rec || !rec.name) {
    nameEl.textContent = "";
    continueBtn.hidden = true;
    forgetBtn.hidden = true;
    return;
  }
  nameEl.textContent = rec.name;
  continueBtn.hidden = false;
  forgetBtn.hidden = false;
}

function boot(file) {
  if (started) return;
  started = true;
  try {
    localStorage.setItem("zelda-onscreen", onscreen.checked ? "1" : "0");
  } catch (e) { /* private mode */ }

  window.EJS_player = "#game";
  window.EJS_core = "snes";
  window.EJS_gameUrl = file;
  window.EJS_gameName = file.name.replace(/\.[^.]+$/, "") || "cartridge";
  window.EJS_gameID = gameId(file.name);
  window.EJS_pathtodata = DATA;
  window.EJS_startOnLoaded = true;
  window.EJS_color = "#c6a15a";
  window.EJS_backgroundColor = "#0e1110";
  window.EJS_alignStartButton = "center";
  window.EJS_volume = 0.8;
  window.EJS_disableAutoLang = true;
  window.EJS_language = "en-US";
  window.EJS_controlScheme = "snes";
  window.EJS_browserMode = onscreen.checked ? "mobile" : "desktop";
  window.EJS_threads = false;
  window.EJS_fixedSaveInterval = 8000;
  window.EJS_Buttons = {
    cheat: false,
    cacheManager: false,
    screenRecord: false
  };
  window.EJS_defaultOptions = {
    "save-state-location": "browser"
  };
  window.EJS_onExit = function () { location.reload(); };

  document.body.classList.add("is-playing");
  gate.hidden = true;
  stage.hidden = false;

  var script = document.createElement("script");
  script.src = DATA + "loader.js";
  script.async = false;
  script.onerror = function () {
    started = false;
    document.body.classList.remove("is-playing");
    gate.hidden = false;
    stage.hidden = true;
    setStatus("The emulator did not load. Check the network and try again.");
  };
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.appendChild(script);
    });
  });
}

function startFromFile(file) {
  var problem = validate(file);
  if (problem) {
    setStatus(problem);
    return;
  }
  setStatus("Keeping the cartridge in this browser...");
  file.arrayBuffer().then(function (buf) {
    var copy = buf.slice(0);
    var rec = {
      name: file.name,
      type: file.type || "application/octet-stream",
      savedAt: Date.now(),
      buf: copy
    };
    return idbSet(rec).then(function () {
      showRecord(rec);
      boot(new File([buf], file.name, { type: rec.type }));
    });
  }).catch(function () {
    setStatus("Could not store the cartridge. Playing this visit only.");
    boot(file);
  });
}

function renderPads() {
  var pads = navigator.getGamepads ? navigator.getGamepads() : [];
  var names = [];
  var i;
  for (i = 0; i < pads.length; i++) {
    if (pads[i]) names.push(pads[i].id);
  }
  if (names.length) {
    padsEl.textContent = "Controller connected: " + names.join(", ");
  } else {
    padsEl.textContent = "No controller yet. Press a button on it, or use the keyboard.";
  }
}

continueBtn.addEventListener("click", function () {
  setStatus("Opening the saved cartridge...");
  idbGet().then(function (rec) {
    if (!rec || !rec.buf) {
      setStatus("No cartridge is saved in this browser.");
      showRecord(null);
      return;
    }
    boot(fileFromRecord(rec));
  }).catch(function () {
    setStatus("Could not read the saved cartridge.");
  });
});

forgetBtn.addEventListener("click", function () {
  idbDel().then(function () {
    showRecord(null);
    setStatus("Removed from this browser. The file on your device is unchanged.");
  }).catch(function () {
    setStatus("Could not remove the saved cartridge.");
  });
});

fileInput.addEventListener("change", function () {
  var file = fileInput.files && fileInput.files[0];
  if (file) startFromFile(file);
  fileInput.value = "";
});

drop.addEventListener("dragover", function (event) {
  event.preventDefault();
  drop.classList.add("hot");
});
drop.addEventListener("dragleave", function () {
  drop.classList.remove("hot");
});
drop.addEventListener("drop", function (event) {
  event.preventDefault();
  drop.classList.remove("hot");
  var file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) startFromFile(file);
});

window.addEventListener("gamepadconnected", renderPads);
window.addEventListener("gamepaddisconnected", renderPads);

try {
  if (localStorage.getItem("zelda-onscreen") === "0") onscreen.checked = false;
} catch (e) { /* private mode */ }

idbGet().then(function (rec) {
  showRecord(rec);
  if (rec && rec.name) {
    setStatus("Ready. Continue uses the cartridge already in this browser.");
  }
}).catch(function () {
  setStatus("This browser will not remember the cartridge. You can still play after you choose a file.");
});

renderPads();
