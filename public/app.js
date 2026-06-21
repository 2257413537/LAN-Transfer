"use strict";

// 鈹€鈹€鈹€ State 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
let ws = null;
let kicked = false;
let myToken = localStorage.getItem("lan-transfer-token") || "";
let myDeviceId = null;
let devices = {};
let allHistory = [];
let selectedDeviceId = "all";
let selectedDate = null;
let searchQuery = "";
let calendarView = "day";
let calendarDate = new Date();
let fileFilter = "all";
let fileSortBy = "time";
let fileSortDir = "desc";
let selectMode = false;
let selectedMessages = new Set();

// 鈹€鈹€鈹€ DOM 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const $ = (s) => document.querySelector(s);
const deviceTabsEl   = $("#deviceTabs");
const sidebarEl      = $("#sidebar");
const sidebarToggle  = $("#sidebarToggle");
const sidebarShow    = $("#sidebarShow");
const searchInput    = $("#searchInput");
const calendarEl     = $("#calendarContainer");
const fileOrgEl      = $("#fileOrganizer");
const chatMessages   = $("#chatMessages");
const msgInput       = $("#msgInput");
const sendBtn        = $("#sendBtn");
const fileInput      = $("#fileInput");
const emojiBtn       = $("#emojiBtn");
const emojiPicker    = $("#emojiPicker");
const toastEl        = $("#toast");
const selectBtn          = $("#selectBtn");
const selectActionBar    = $("#selectActionBar");
const selectCountEl      = $("#selectCount");
const selectAllBtn       = $("#selectAllBtn");
const copySelectedBtn    = $("#copySelectedBtn");
const downloadSelectedBtn = $("#downloadSelectedBtn");
const deleteSelectedBtn  = $("#deleteSelectedBtn");
const chatInputBar       = document.querySelector(".chat-input-bar");

// 鈹€鈹€鈹€ Helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function showToast(text, ms) {
  ms = ms || 2500;
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function() { toastEl.classList.add("hidden"); }, ms);
}
function escHtml(s) { var el = document.createElement("span"); el.textContent = s || ""; return el.innerHTML; }
function formatSize(b) { if (!b) return ""; if (b < 1024) return b + " B"; if (b < 1048576) return (b / 1024).toFixed(1) + " KB"; if (b < 1073741824) return (b / 1048576).toFixed(1) + " MB"; return (b / 1073741824).toFixed(2) + " GB"; }
function formatTime(iso) { var d = new Date(iso); var h = String(d.getHours()).padStart(2, "0"), m = String(d.getMinutes()).padStart(2, "0"); var now = new Date(); if (d.toDateString() === now.toDateString()) return h + ":" + m; return (d.getMonth() + 1) + "/" + d.getDate() + " " + h + ":" + m; }
function formatTimeShort(iso) { if (!iso) return ""; var d = new Date(iso); var h = String(d.getHours()).padStart(2, "0"), m = String(d.getMinutes()).padStart(2, "0"); if (d.toDateString() === new Date().toDateString()) return h + ":" + m; return (d.getMonth() + 1) + "/" + d.getDate(); }
function isMobile() { return window.innerWidth <= 768; }
function dateKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }


// --- File type helpers ---
var FILE_EXT_MAP = {
  pdf: "doc", doc: "doc", docx: "doc", xls: "doc", xlsx: "doc", ppt: "doc", pptx: "doc",
  txt: "doc", rtf: "doc", csv: "doc", md: "doc", epub: "doc",
  jpg: "img", jpeg: "img", png: "img", gif: "img", bmp: "img", svg: "img",
  webp: "img", ico: "img", tiff: "img", heic: "img",
  mp4: "video", avi: "video", mkv: "video", mov: "video", wmv: "video",
  flv: "video", webm: "video", m4v: "video",
  mp3: "music", wav: "music", flac: "music", aac: "music", ogg: "music",
  wma: "music", m4a: "music",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive",
  gz: "archive", bz2: "archive", xz: "archive",
  exe: "installer", msi: "installer", dmg: "installer", apk: "installer",
  deb: "installer", rpm: "installer", pkg: "installer"
};
var FILE_CAT_ORDER = ["all", "doc", "img", "video", "music", "archive", "installer", "other"];
var FILE_CAT_LABELS = { all: "\u5168\u90E8", doc: "\u6587\u6863", img: "\u56FE\u7247", video: "\u89C6\u9891", music: "\u97F3\u4E50", archive: "\u538B\u7F29\u5305", installer: "\u5B89\u88C5\u5305", other: "\u5176\u4ED6" };
var FILE_CAT_ICONS = { doc: "description", img: "image", video: "movie", music: "music_note", archive: "folder_zip", installer: "rocket_launch", other: "insert_drive_file" };
var FILE_SORT_LABELS = { time: "\u65F6\u95F4", name: "\u6587\u4EF6\u540D", size: "\u5927\u5C0F" };

function getFileType(filename) {
  if (!filename) return "other";
  var ext = filename.split(".").pop().toLowerCase();
  return FILE_EXT_MAP[ext] || "other";
}

// 鈹€鈹€鈹€ Emoji list 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
var EMOJIS = [
  "\u{1F600}","\u{1F603}","\u{1F604}","\u{1F601}","\u{1F606}","\u{1F605}","\u{1F923}","\u{1F602}","\u{1F642}","\u{1F643}",
  "\u{1F609}","\u{1F60A}","\u{1F607}","\u{1F970}","\u{1F60D}","\u{1F929}","\u{1F618}","\u{1F617}","\u{1F61A}","\u{1F619}",
  "\u{1F972}","\u{1F60B}","\u{1F61B}","\u{1F61C}","\u{1F92A}","\u{1F911}","\u{1F917}","\u{1F92D}","\u{1F92B}","\u{1F914}",
  "\u{1F910}","\u{1F928}","\u{1F610}","\u{1F611}","\u{1F636}","\u{1F60F}","\u{1F612}","\u{1F644}","\u{1F62C}","\u{1F925}",
  "\u{1F60C}","\u{1F614}","\u{1F62A}","\u{1F924}","\u{1F634}","\u{1F637}","\u{1F912}","\u{1F915}","\u{1F922}","\u{1F92E}",
  "\u{1F927}","\u{1F975}","\u{1F976}","\u{1F973}","\u{1F635}","\u{1F92F}","\u{1F920}","\u{1F978}","\u{1F60E}","\u{1F913}",
  "\u{1F9D0}","\u{1F615}","\u{2639}","\u{1F62F}","\u{1F626}","\u{1F627}","\u{1F628}","\u{1F630}","\u{1F625}","\u{1F622}",
  "\u{1F62D}","\u{1F631}","\u{1F616}","\u{1F623}","\u{1F61E}","\u{1F624}","\u{1F62B}","\u{1F971}","\u{1F621}","\u{1F620}",
  "\u{1F92C}","\u{1F44D}","\u{1F44E}","\u{1F44A}","\u{270A}","\u{1F91B}","\u{1F91C}","\u{1F91F}","\u{270C}","\u{1F918}",
  "\u{1F90F}","\u{1F90C}","\u{1F9BE}","\u{1F448}","\u{1F449}","\u{1F446}","\u{1F447}","\u{261D}","\u{270B}","\u{1F91A}",
  "\u{1F590}","\u{1F44B}","\u{1F919}","\u{1F4AA}","\u{1F64F}","\u{2764}","\u{1F9E1}","\u{1F49B}","\u{1F499}","\u{1F49C}",
  "\u{1F5A4}","\u{1F90D}","\u{1F498}","\u{1F49D}","\u{1F496}","\u{1F497}","\u{1F493}","\u{1F49E}","\u{1F495}","\u{1F49F}",
  "\u{1F525}","\u{2B50}","\u{1F31F}","\u{2728}","\u{1F4AB}","\u{1F389}","\u{1F38A}","\u{1F388}","\u{1F3C6}","\u{1F3AF}",
  "\u{1F3AE}","\u{1F3B5}","\u{1F3B6}","\u{1F4F7}","\u{2708}","\u{1F680}","\u{1F3E0}","\u{1F4BB}","\u{1F4F1}","\u{231A}",
  "\u{2615}","\u{1F355}","\u{1F354}","\u{1F382}","\u{1F370}","\u{1F369}","\u{1F36A}","\u{1F36B}","\u{1F36C}","\u{1F36D}",
  "\u{1F37F}","\u{1F37B}","\u{1F377}","\u{1F490}","\u{1F338}","\u{1F33B}","\u{1F337}","\u{1F339}","\u{1F331}","\u{1F33F}",
  "\u{1F342}","\u{1F341}","\u{1F334}","\u{1F335}","\u{1F33E}","\u{1F436}","\u{1F431}","\u{1F42D}","\u{1F439}","\u{1F430}",
  "\u{1F98A}","\u{1F43B}","\u{1F428}","\u{1F42F}","\u{1F981}","\u{1F42E}","\u{1F437}","\u{1F438}","\u{1F435}","\u{1F412}",
  "\u{1F648}","\u{1F649}","\u{1F64A}","\u{1F43C}","\u{1F414}","\u{1F427}","\u{1F985}","\u{1F41D}","\u{1F98B}","\u{1F422}",
  "\u{1F40D}","\u{1F997}","\u{1F41F}","\u{1F42C}","\u{1F433}","\u{1F40B}","\u{1F988}","\u{2600}","\u{1F319}","\u{26A1}",
  "\u{1F308}","\u{1F30A}","\u{1F4A4}","\u{1F4A2}","\u{1F4AC}"
];

// 鈹€鈹€鈹€ Connect 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

// --- Lightbox ---
function openLightbox(src) {
  if (selectMode) return;
  var overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.id = "lightbox";
  overlay.innerHTML = '<img src="' + src + '" />';
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeLightbox();
  });
  document.body.appendChild(overlay);
  document.addEventListener("keydown", lightboxEsc);
}
function closeLightbox() {
  var el = document.getElementById("lightbox");
  if (el) el.remove();
  document.removeEventListener("keydown", lightboxEsc);
}
function lightboxEsc(e) { if (e.key === "Escape") closeLightbox(); }

function connect() {
  kicked = false;
  var proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(proto + "//" + location.host + "/ws");
  ws.onopen = function() {
    ws.send(JSON.stringify({ action: "register", token: myToken, ua: navigator.userAgent }));
  };
  ws.onmessage = function(ev) {
    try { handleServerMessage(JSON.parse(ev.data)); } catch (err) { console.error("WS message error:", err); }
  };
  ws.onclose = function() { if (!kicked) setTimeout(connect, 2000); };
  ws.onerror = function() {};
}

// 鈹€鈹€鈹€ Handle server messages 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function handleServerMessage(data) {
  switch (data.action) {
    case "registered":
      myToken = data.token;
      myDeviceId = data.device_id;
      localStorage.setItem("lan-transfer-token", data.token);
      devices = {};
      data.devices.forEach(function(d) { devices[d.id] = d; });
      allHistory = data.history || [];
      renderDeviceTabs();
      renderCalendar();
      renderFileOrganizer();
      renderChat();
      break;
    case "device_update":
      devices[data.device.id] = data.device;
      renderDeviceTabs();
      break;
    case "new_message":
      allHistory.push(data.message);
      renderDeviceTabs();
      renderCalendar();
      renderFileOrganizer();
      if (!searchQuery) renderChat();
      break;
    case "kicked":
      kicked = true;
      showToast("This device connected elsewhere");
      break;
    case "device_deleted":
      delete devices[data.device_id];
      if (selectedDeviceId === data.device_id) { selectedDeviceId = "all"; renderChat(); }
      renderDeviceTabs();
      break;
    case "messages_deleted":
      var delIds = new Set(data.ids || []);
      allHistory = allHistory.filter(function(m) { return !delIds.has(m.id); });
      delIds.forEach(function(id) { selectedMessages.delete(id); });
      renderChat();
      renderFileOrganizer();
      renderCalendar();
      renderSelectBar();
      break;
  }
}

// 鈹€鈹€鈹€ Device tabs 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function renderDeviceTabs() {
  var online = [], offline = [];
  Object.values(devices).forEach(function(d) {
    if (d.id === myDeviceId) return;
    (d.online ? online : offline).push(d);
  });

  var html = '<div class="tab' + (selectedDeviceId === "all" ? " active" : "") + '" data-id="all"><span class="material-icons-round">devices_all</span> All</div>';
  online.forEach(function(d) {
    html += '<div class="tab' + (selectedDeviceId === d.id ? " active" : "") + '" data-id="' + d.id + '"><span class="material-icons-round">' + (d.icon || "devices") + '</span> ' + escHtml(d.name) + ' <span class="tab-dot online"></span></div>';
  });
  offline.forEach(function(d) {
    html += '<div class="tab' + (selectedDeviceId === d.id ? " active" : "") + '" data-id="' + d.id + '"><span class="material-icons-round">' + (d.icon || "devices") + '</span> ' + escHtml(d.name) + ' <span class="tab-dot offline"></span><span class="tab-delete" data-delid="' + d.id + '" title="Remove"><span class="material-icons-round">close</span></span></div>';
  });
  deviceTabsEl.innerHTML = html;

  // event delegation is bound once in init; no per-element listeners needed
}

// 鈹€鈹€鈹€ Chat rendering 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function getFilteredMessages() {
  var msgs;
  if (selectedDeviceId === "all") {
    msgs = allHistory.slice();
  } else {
    msgs = allHistory.filter(function(m) { return m.from_id === selectedDeviceId; });
  }
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    msgs = msgs.filter(function(m) {
      return (m.content || "").toLowerCase().indexOf(q) >= 0 || (m.filename || "").toLowerCase().indexOf(q) >= 0;
    });
  }
  if (selectedDate) {
    msgs = msgs.filter(function(m) { return sameDay(new Date(m.timestamp), selectedDate); });
  }
  return msgs;
}

function renderChat() {
  var msgs = getFilteredMessages();
  var html = "";

  if (searchQuery) {
    html += '<div class="search-banner">Found ' + msgs.length + ' results for "' + escHtml(searchQuery) + '" <button onclick="clearSearch()">Clear</button></div>';
  }
  if (selectedDate) {
    html += '<div class="search-banner">Showing: ' + dateKey(selectedDate) + ' <button onclick="clearDateFilter()">Show all</button></div>';
  }

  var lastDate = "";
  msgs.forEach(function(m) {
    var d = new Date(m.timestamp);
    var ds = d.toLocaleDateString("zh-CN");
    if (ds !== lastDate) { html += '<div class="date-sep">' + ds + '</div>'; lastDate = ds; }

    var isSelf = m.from_id === myDeviceId;
    var cls = isSelf ? "self" : "other";
    var sender = isSelf ? "You" : (devices[m.from_id] ? devices[m.from_id].name : (m.from_name || "Device"));
    var icon = isSelf ? "person" : (devices[m.from_id] ? devices[m.from_id].icon : "devices");
    var checkHtml = selectMode ? '<div class="msg-checkbox"><input type="checkbox" class="msg-check-input" data-id="' + m.id + '"' + (selectedMessages.has(m.id) ? " checked" : "") + ' /></div>' : '';
    var rowOpen = '<div class="msg-row ' + cls + '" data-msg-id="' + m.id + '">' + checkHtml;

    if (m.type === "file") {
      var cat = getFileType(m.filename);
      if (cat === "img") {
        html += rowOpen + '<div class="msg-avatar-sm"><span class="material-icons-round">' + icon + '</span></div><div><div class="image-bubble" onclick="openLightbox(\'/api/file/' + m.content + '\')"><img src="/api/file/' + m.content + '" alt="' + escHtml(m.filename) + '" loading="lazy" /></div><div class="msg-time">' + sender + ' \u00B7 ' + formatTime(m.timestamp) + '</div></div></div>';
      } else {
        var fileIcon = FILE_CAT_ICONS[cat] || "insert_drive_file";
        html += rowOpen + '<div class="msg-avatar-sm"><span class="material-icons-round">' + icon + '</span></div><div><div class="file-card" onclick="window.open(\'/api/download/' + m.content + '\')"><span class="material-icons-round file-icon">' + fileIcon + '</span><div class="file-meta"><div class="file-name">' + escHtml(m.filename) + '</div><div class="file-size">' + formatSize(m.size) + '</div></div><span class="material-icons-round file-download">download</span></div><div class="msg-time">' + sender + ' \u00B7 ' + formatTime(m.timestamp) + '</div></div></div>';
      }
    } else {
      html += rowOpen + '<div class="msg-avatar-sm"><span class="material-icons-round">' + icon + '</span></div><div><div class="msg-bubble">' + escHtml(m.content) + '</div><div class="msg-time">' + sender + ' \u00B7 ' + formatTime(m.timestamp) + '</div></div></div>';
    }
  });

  if (!msgs.length && !searchQuery && !selectedDate) {
    html = '<div class="empty-state" style="flex:1"><span class="material-icons-round">chat_bubble_outline</span><p>No messages yet</p></div>';
  }

  chatMessages.innerHTML = html;
  if (selectMode) {
    chatMessages.classList.add("select-mode");
  } else {
    chatMessages.classList.remove("select-mode");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  renderSelectBar();
}

// 鈹€鈹€鈹€ Calendar 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function getMessageDates() {
  var set = {};
  allHistory.forEach(function(m) { set[dateKey(new Date(m.timestamp))] = true; });
  return set;
}

function renderCalendar() {
  var msgDates = getMessageDates();
  if (calendarView === "day") renderCalDays(msgDates);
  else if (calendarView === "month") renderCalMonths();
  else renderCalYears();
}

function renderCalDays(msgDates) {
  var year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  var last = new Date(year, month + 1, 0);
  var startDay = new Date(year, month, 1).getDay();
  var today = new Date();
  var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var html = '<div class="cal-header"><div class="cal-nav"><button onclick="calPrev()"><span class="material-icons-round">chevron_left</span></button></div><span class="cal-title" onclick="calendarView=\'month\';renderCalendar()">' + monthNames[month] + " " + year + '</span><div class="cal-nav"><button onclick="calNext()"><span class="material-icons-round">chevron_right</span></button></div></div>';

  html += '<div class="cal-weekdays">';
  ["Su","Mo","Tu","We","Th","Fr","Sa"].forEach(function(d) { html += '<span>' + d + '</span>'; });
  html += '</div><div class="cal-days">';

  for (var i = 0; i < startDay; i++) html += '<div class="cal-day other"></div>';
  for (var d = 1; d <= last.getDate(); d++) {
    var dt = new Date(year, month, d);
    var dk = dateKey(dt);
    var cls = "cal-day";
    if (sameDay(dt, today)) cls += " today";
    if (selectedDate && sameDay(dt, selectedDate)) cls += " selected";
    html += '<div class="' + cls + '" data-date="' + dk + '" onclick="selectCalDate(\'' + dk + '\')">' + d + (msgDates[dk] ? '<span class="dot"></span>' : '') + '</div>';
  }
  html += '</div>';
  calendarEl.innerHTML = html;
}

function renderCalMonths() {
  var year = calendarDate.getFullYear();
  var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var now = new Date();

  var html = '<div class="cal-header"><div class="cal-nav"><button onclick="calPrev()"><span class="material-icons-round">chevron_left</span></button></div><span class="cal-title" onclick="calendarView=\'year\';renderCalendar()">' + year + '</span><div class="cal-nav"><button onclick="calNext()"><span class="material-icons-round">chevron_right</span></button></div></div>';
  html += '<div class="cal-grid">';
  monthNames.forEach(function(m, i) {
    var cls = "cal-grid-item";
    if (year === now.getFullYear() && i === now.getMonth()) cls += " current";
    html += '<div class="' + cls + '" onclick="calendarDate.setMonth(' + i + ');calendarView=\'day\';renderCalendar()">' + m + '</div>';
  });
  html += '</div>';
  calendarEl.innerHTML = html;
}

function renderCalYears() {
  var year = calendarDate.getFullYear();
  var start = year - 5;
  var now = new Date();

  var html = '<div class="cal-header"><div class="cal-nav"><button onclick="calPrev()"><span class="material-icons-round">chevron_left</span></button></div><span class="cal-title">' + start + ' - ' + (start + 11) + '</span><div class="cal-nav"><button onclick="calNext()"><span class="material-icons-round">chevron_right</span></button></div></div>';
  html += '<div class="cal-grid">';
  for (var y = start; y < start + 12; y++) {
    var cls = "cal-grid-item";
    if (y === now.getFullYear()) cls += " current";
    html += '<div class="' + cls + '" onclick="calendarDate.setFullYear(' + y + ');calendarView=\'month\';renderCalendar()">' + y + '</div>';
  }
  html += '</div>';
  calendarEl.innerHTML = html;
}

window.calPrev = function() {
  if (calendarView === "day") calendarDate.setMonth(calendarDate.getMonth() - 1);
  else if (calendarView === "month") calendarDate.setFullYear(calendarDate.getFullYear() - 1);
  else calendarDate.setFullYear(calendarDate.getFullYear() - 12);
  renderCalendar();
};
window.calNext = function() {
  if (calendarView === "day") calendarDate.setMonth(calendarDate.getMonth() + 1);
  else if (calendarView === "month") calendarDate.setFullYear(calendarDate.getFullYear() + 1);
  else calendarDate.setFullYear(calendarDate.getFullYear() + 12);
  renderCalendar();
};
window.selectCalDate = function(dk) {
  var parts = dk.split("-");
  selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  renderCalendar();
  renderChat();
};
window.clearSearch = function() { searchQuery = ""; searchInput.value = ""; renderChat(); };
window.clearDateFilter = function() { selectedDate = null; renderCalendar(); renderChat(); };

// --- File Organizer ---
function renderFileOrganizer() {
  var files = allHistory.filter(function(m) { return m.type === "file"; });

  // Count per category
  var counts = { all: files.length };
  FILE_CAT_ORDER.forEach(function(c) { if (c !== "all") counts[c] = 0; });
  files.forEach(function(m) { var c = getFileType(m.filename); counts[c] = (counts[c] || 0) + 1; });

  // Filter
  if (fileFilter !== "all") {
    files = files.filter(function(m) { return getFileType(m.filename) === fileFilter; });
  }

  // Sort
  files.sort(function(a, b) {
    var va, vb;
    if (fileSortBy === "name") {
      va = (a.filename || "").toLowerCase();
      vb = (b.filename || "").toLowerCase();
      return fileSortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    } else if (fileSortBy === "size") {
      va = a.size || 0; vb = b.size || 0;
    } else {
      va = new Date(a.timestamp).getTime(); vb = new Date(b.timestamp).getTime();
    }
    return fileSortDir === "asc" ? va - vb : vb - va;
  });

  // Build HTML
  var LT = String.fromCharCode(60);
  var h = "";
  h += LT + "div class='fo-header'>" + LT + "span class='material-icons-round'>folder_open" + LT + "/span>" + LT + "span class='fo-title'>\u6587\u4EF6\u6574\u7406" + LT + "/span>" + LT + "/div>";

  // Filter chips
  h += LT + "div class='fo-filters'>";
  FILE_CAT_ORDER.forEach(function(cat) {
    var active = fileFilter === cat ? " active" : "";
    h += LT + "button class='fo-chip" + active + "' data-cat='" + cat + "'>" + FILE_CAT_LABELS[cat] + (counts[cat] ? " " + LT + "span class='fo-badge'>" + counts[cat] + LT + "/span>" : "") + LT + "/button>";
  });
  h += LT + "/div>";

  // Sort controls
  h += LT + "div class='fo-sort'>";
  ["time","name","size"].forEach(function(s) {
    var active = fileSortBy === s ? " active" : "";
    h += LT + "button class='fo-sort-btn" + active + "' data-sort='" + s + "'>" + FILE_SORT_LABELS[s] + LT + "/button>";
  });
  h += LT + "button class='fo-dir-btn' data-dir-toggle title='\u6392\u5E8F\u65B9\u5411'>" + LT + "span class='material-icons-round'>" + (fileSortDir === "asc" ? "arrow_upward" : "arrow_downward") + LT + "/span>" + LT + "/button>";
  h += LT + "/div>";

  // File list
  h += LT + "div class='fo-list'>";
  if (!files.length) {
    h += LT + "div class='fo-empty'>\u6682\u65E0\u6587\u4EF6" + LT + "/div>";
  } else {
    files.forEach(function(m) {
      var cat = getFileType(m.filename);
      var icon = FILE_CAT_ICONS[cat] || "insert_drive_file";
      h += LT + "div class='fo-item' data-download='" + m.content + "'>";
      h += LT + "span class='material-icons-round fo-item-icon " + cat + "'>" + icon + LT + "/span>";
      h += LT + "div class='fo-item-meta'>" + LT + "div class='fo-item-name' title='" + escHtml(m.filename) + "'>" + escHtml(m.filename) + LT + "/div>";
      h += LT + "div class='fo-item-info'>" + formatSize(m.size) + (m.from_name ? " \u00B7 " + escHtml(m.from_name) : "") + " \u00B7 " + formatTimeShort(m.timestamp) + LT + "/div>" + LT + "/div>";
      h += LT + "span class='material-icons-round fo-item-dl'>download" + LT + "/span>";
      h += LT + "/div>";
    });
  }
  h += LT + "/div>";

  fileOrgEl.innerHTML = h;
}

// 鈹€鈹€鈹€ Send message 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

// --- Select mode functions ---
function renderSelectBar() {
  if (!selectMode) {
    selectActionBar.classList.add("hidden");
    if (chatInputBar) chatInputBar.style.display = "";
    return;
  }
  selectActionBar.classList.remove("hidden");
  if (chatInputBar) chatInputBar.style.display = "none";
  selectCountEl.textContent = "\u5df2\u9009 " + selectedMessages.size + " \u9879";
}

function toggleSelectMode() {
  selectMode = !selectMode;
  if (!selectMode) {
    selectedMessages.clear();
    selectBtn.classList.remove("active");
  } else {
    selectBtn.classList.add("active");
  }
  renderChat();
}

function selectAllVisible() {
  var msgs = getFilteredMessages();
  var allSelected = msgs.every(function(m) { return selectedMessages.has(m.id); });
  if (allSelected) {
    msgs.forEach(function(m) { selectedMessages.delete(m.id); });
  } else {
    msgs.forEach(function(m) { selectedMessages.add(m.id); });
  }
  renderChat();
}

function copySelected() {
  var texts = [];
  allHistory.forEach(function(m) {
    if (!selectedMessages.has(m.id)) return;
    if (m.type === "file") {
      texts.push(m.filename || "");
    } else {
      texts.push(m.content || "");
    }
  });
  if (!texts.length) { showToast("\u672a\u9009\u4e2b\u4efb\u4f55\u5185\u5bb9"); return; }
  var joined = texts.join("\n");
  if (navigator.clipboard) {
    navigator.clipboard.writeText(joined).then(function() {
      showToast("\u5df2\u590d\u5236 " + texts.length + " \u9879\u5185\u5bb9");
    }).catch(function() {
      showToast("\u590d\u5236\u5931\u8d25");
    });
  } else {
    showToast("\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u590d\u5236");
  }
}

function downloadSelected() {
  var count = 0;
  allHistory.forEach(function(m) {
    if (!selectedMessages.has(m.id)) return;
    if (m.type === "file") {
      window.open("/api/download/" + m.content);
      count++;
    }
  });
  if (count) {
    showToast("\u6b63\u5728\u4e0b\u8f7d " + count + " \u4e2a\u6587\u4ef6");
  } else {
    showToast("\u672a\u9009\u4e2b\u4efb\u4f55\u6587\u4ef6");
  }
}

function deleteSelected() {
  var ids = Array.from(selectedMessages);
  if (!ids.length) { showToast("\u672a\u9009\u4e2b\u4efb\u4f55\u5185\u5bb9"); return; }
  if (!confirm("\u786e\u5b9a\u5220\u9664\u5df2\u9009\u7684 " + ids.length + " \u9879\u5185\u5bb9\uff1f")) return;
  var idSet = new Set(ids);
  allHistory = allHistory.filter(function(m) { return !idSet.has(m.id); });
  selectedMessages.clear();
  selectMode = false;
  selectBtn.classList.remove("active");
  renderChat();
  renderFileOrganizer();
  renderCalendar();
  showToast("\u5df2\u5220\u9664 " + ids.length + " \u9879");
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "delete_messages", ids: ids }));
  }
}

function sendMessage() {
  var text = msgInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ action: "send_message", to: selectedDeviceId, content: text }));
  msgInput.value = "";
}

// 鈹€鈹€鈹€ File upload 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function uploadFiles(files) {
  if (!files.length) return;
  var i = 0;
  function next() {
    if (i >= files.length) { fileInput.value = ""; return; }
    var file = files[i++];
    var prog = showUploadProgress(file.name);
    var form = new FormData();
    form.append("file", file);
    fetch("/api/upload?token=" + myToken + "&to=" + selectedDeviceId, { method: "POST", body: form })
      .then(function(resp) {
        if (!resp.ok) throw new Error("fail");
        return resp.json();
      })
      .then(function() { showToast(file.name + " sent"); })
      .catch(function() { showToast("Failed: " + file.name); })
      .finally(function() { prog.remove(); next(); });
  }
  next();
}

function showUploadProgress(name) {
  var div = document.createElement("div");
  div.className = "upload-progress";
  div.innerHTML = '<span class="material-icons-round">sync</span><span>Uploading: ' + escHtml(name) + '</span>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// 鈹€鈹€鈹€ Emoji picker 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function initEmojiPicker() {
  var html = "";
  EMOJIS.forEach(function(e) { html += '<button data-e="' + e + '">' + e + '</button>'; });
  emojiPicker.innerHTML = html;
  emojiPicker.addEventListener("click", function(ev) {
    var btn = ev.target.closest("button[data-e]");
    if (!btn) return;
    var pos = msgInput.selectionStart || msgInput.value.length;
    msgInput.value = msgInput.value.slice(0, pos) + btn.dataset.e + msgInput.value.slice(pos);
    msgInput.focus();
    msgInput.setSelectionRange(pos + btn.dataset.e.length, pos + btn.dataset.e.length);
  });
}

// 鈹€鈹€鈹€ Sidebar toggle 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
sidebarToggle.addEventListener("click", function() {
  sidebarEl.classList.add("collapsed");
  sidebarShow.classList.remove("hidden");
});
sidebarShow.addEventListener("click", function() {
  sidebarEl.classList.remove("collapsed");
  sidebarShow.classList.add("hidden");
});

// 鈹€鈹€鈹€ Search 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
var searchTimer = null;
searchInput.addEventListener("input", function() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() {
    searchQuery = searchInput.value.trim();
    selectedDate = null;
    renderCalendar();
    renderChat();
  }, 300);
});

// 鈹€鈹€鈹€ Event listeners 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
fileInput.addEventListener("change", function() { uploadFiles(Array.from(fileInput.files)); });
emojiBtn.addEventListener("click", function(e) { e.stopPropagation(); emojiPicker.classList.toggle("hidden"); });
document.addEventListener("click", function(e) { if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) emojiPicker.classList.add("hidden"); });

// 鈹€鈹€鈹€ Init 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
initEmojiPicker();

// Event delegation for device tabs (bound once, survives DOM rebuilds)
deviceTabsEl.addEventListener("click", function(e) {
  // Check if delete button (or its child) was clicked
  var delEl = e.target.closest(".tab-delete");
  if (delEl) {
    e.stopPropagation();
    var did = delEl.dataset.delid;
    if (did && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "delete_device", device_id: did }));
    }
    return;
  }
  // Otherwise treat as tab selection
  var tabEl = e.target.closest(".tab");
  if (tabEl) {
    selectedDeviceId = tabEl.dataset.id;
    selectedDate = null;
    searchQuery = "";
    searchInput.value = "";
    renderDeviceTabs();
    renderChat();
  }
});

// Event delegation for file organizer
fileOrgEl.addEventListener("click", function(e) {
  var chip = e.target.closest(".fo-chip");
  if (chip) {
    fileFilter = chip.dataset.cat;
    renderFileOrganizer();
    return;
  }
  var sortBtn = e.target.closest(".fo-sort-btn");
  if (sortBtn) {
    fileSortBy = sortBtn.dataset.sort;
    renderFileOrganizer();
    return;
  }
  var dirBtn = e.target.closest("[data-dir-toggle]");
  if (dirBtn) {
    fileSortDir = fileSortDir === "asc" ? "desc" : "asc";
    renderFileOrganizer();
    return;
  }
  var item = e.target.closest(".fo-item[data-download]");
  if (item) {
    window.open("/api/download/" + item.dataset.download);
  }
});

// --- QR code dialog ---
var qrBtn = document.getElementById("qrBtn");
if (qrBtn) {
  qrBtn.addEventListener("click", function() {
    var existing = document.querySelector(".qr-overlay");
    if (existing) { existing.remove(); return; }
    var overlay = document.createElement("div");
    overlay.className = "qr-overlay";
    var dialog = document.createElement("div");
    dialog.className = "qr-dialog";
    dialog.innerHTML = '<span class="material-icons-round">qr_code_scanner</span>' +
      '<h3>\u626b\u7801\u8fde\u63a5</h3>' +
      '<p style="margin:16px 0">\u6b63\u5728\u83b7\u53d6\u5730\u5740\u2026</p>';
    overlay.appendChild(dialog);
    overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", esc); } });
    document.body.appendChild(overlay);
    fetch("/api/lan-info").then(function(r) { return r.json(); }).then(function(info) {
      var qrUrl = "/api/qrcode?url=" + encodeURIComponent(info.url);
      dialog.innerHTML = '<span class="material-icons-round">qr_code_scanner</span>' +
        '<h3>\u626b\u7801\u8fde\u63a5</h3>' +
        '<img src="' + qrUrl + '" alt="QR Code" />' +
        '<p>\u6253\u5f00\u624b\u673a\u626b\u4e00\u626b\uff0c\u5373\u53ef\u8fde\u63a5</p>' +
        '<p style="font-size:12px;margin-top:8px;opacity:.6">' + info.url + '</p>';
    }).catch(function() {
      var fallbackUrl = "/api/qrcode?url=" + encodeURIComponent(location.href);
      dialog.innerHTML = '<span class="material-icons-round">qr_code_scanner</span>' +
        '<h3>\u626b\u7801\u8fde\u63a5</h3>' +
        '<img src="' + fallbackUrl + '" alt="QR Code" />' +
        '<p>\u6253\u5f00\u624b\u673a\u626b\u4e00\u626b\uff0c\u5373\u53ef\u8fde\u63a5</p>';
    });
  });
}

// --- Select mode event handlers ---
selectBtn.addEventListener("click", toggleSelectMode);
selectAllBtn.addEventListener("click", selectAllVisible);
copySelectedBtn.addEventListener("click", copySelected);
downloadSelectedBtn.addEventListener("click", downloadSelected);
deleteSelectedBtn.addEventListener("click", deleteSelected);

// Event delegation for message checkboxes
chatMessages.addEventListener("click", function(e) {
  if (!selectMode) return;
  var checkInput = e.target.closest(".msg-check-input");
  if (checkInput) {
    var msgId = checkInput.dataset.id;
    if (checkInput.checked) {
      selectedMessages.add(msgId);
    } else {
      selectedMessages.delete(msgId);
    }
    renderSelectBar();
    return;
  }
  // Click on row (not on checkbox itself) toggles selection
  var msgRow = e.target.closest(".msg-row[data-msg-id]");
  if (msgRow) {
    var id = msgRow.dataset.msgId;
    if (selectedMessages.has(id)) {
      selectedMessages.delete(id);
    } else {
      selectedMessages.add(id);
    }
    var cb = msgRow.querySelector(".msg-check-input");
    if (cb) cb.checked = selectedMessages.has(id);
    if (selectedMessages.has(id)) {
      msgRow.classList.add("row-selected");
    } else {
      msgRow.classList.remove("row-selected");
    }
    renderSelectBar();
  }
});

connect();
if (isMobile()) { sidebarEl.classList.add("collapsed"); sidebarShow.classList.remove("hidden"); }
