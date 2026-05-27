/* =========================================================
 * LexAI - Multi-Model AI Web App
 * Powered by LexCode API (https://api.lexcode.biz.id)
 * ========================================================= */

const API_BASE = "https://api.lexcode.biz.id";

/* ---------- Models config ---------- */
const MODELS = [
  {
    id: "gemini25flash",
    name: "Gemini 2.5 Flash",
    desc: "Cepat, multimodal (Google)",
    icon: "fa-solid fa-gem",
    tag: "vision",
    multimodal: true,
    endpoint: "/api/ai/gemini-2-5-flash",
    textParam: "text",
    imageParam: "imgUrl",
    parseAnswer: (d) => {
      // result can be a string or an object with .response
      if (!d || !d.result) return null;
      if (typeof d.result === "string") return d.result;
      if (typeof d.result.response === "string") return d.result.response;
      if (typeof d.result.answer === "string") return d.result.answer;
      return null;
    },
  },
  {
    id: "gpt4omini",
    name: "GPT-4o Mini",
    desc: "Multimodal cepat (OpenAI)",
    icon: "fa-solid fa-robot",
    tag: "vision",
    multimodal: true,
    endpoint: "/api/ai/gpt/4o-mini",
    textParam: "text",
    imageParam: "imgUrl",
    parseAnswer: (d) => {
      if (!d || !d.result) return null;
      if (typeof d.result === "string") return d.result;
      if (typeof d.result.answer === "string") return d.result.answer;
      if (typeof d.result.response === "string") return d.result.response;
      return null;
    },
  },
  {
    id: "claude45haiku",
    name: "Claude 4.5 Haiku",
    desc: "Cerdas & elegan (Anthropic)",
    icon: "fa-solid fa-feather",
    tag: "text",
    multimodal: false,
    endpoint: "/api/ai/claude/4-5-haiku",
    textParam: "text",
    parseAnswer: (d) => {
      if (!d || !d.result) return null;
      if (typeof d.result === "string") return d.result;
      if (typeof d.result.answer === "string") return d.result.answer;
      return null;
    },
  },
  {
    id: "claude3haiku",
    name: "Claude 3 Haiku",
    desc: "Ringan & cepat (Anthropic)",
    icon: "fa-solid fa-wind",
    tag: "text",
    multimodal: false,
    endpoint: "/api/ai/claude-3-haiku",
    textParam: "text",
    parseAnswer: (d) => {
      if (!d || d.success === false) return null;
      let r = d.result;
      if (typeof r === "string") {
        // Sometimes wrapped in extra quotes
        const trimmed = r.trim();
        if (
          trimmed.length >= 2 &&
          ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'")))
        ) {
          return trimmed.slice(1, -1);
        }
        return r;
      }
      if (r && typeof r.answer === "string") return r.answer;
      return null;
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    desc: "AI search dengan referensi web",
    icon: "fa-solid fa-magnifying-glass",
    tag: "search",
    multimodal: false,
    endpoint: "/api/ai/perplexity",
    textParam: "text",
    parseAnswer: (d) => {
      if (!d || !d.result) return null;
      const r = d.result;
      if (typeof r === "string") return r;
      if (typeof r.answer === "string")
        return {
          text: r.answer,
          references: Array.isArray(r.references) ? r.references : [],
          related: Array.isArray(r.related) ? r.related : [],
        };
      return null;
    },
  },
];

/* ---------- State ---------- */
const state = {
  modelId: localStorage.getItem("lexai.model") || MODELS[0].id,
  imageUrl: null,
  messages: [],
  pending: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- Markdown setup ---------- */
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });
}

function renderMarkdown(text) {
  const raw = window.marked ? marked.parse(text) : escapeHtml(text);
  return window.DOMPurify
    ? DOMPurify.sanitize(raw, { ADD_ATTR: ["target", "rel"] })
    : raw;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightCode(scope) {
  if (!window.hljs) return;
  scope.querySelectorAll("pre code").forEach((el) => {
    try {
      hljs.highlightElement(el);
    } catch {}
  });
}

/* ---------- Sidebar / Models ---------- */
function renderModelList() {
  const list = $("#modelList");
  list.innerHTML = "";
  MODELS.forEach((m) => {
    const item = document.createElement("button");
    item.className = "model-item" + (m.id === state.modelId ? " active" : "");
    item.dataset.id = m.id;
    item.innerHTML = `
      <span class="m-icon"><i class="${m.icon}"></i></span>
      <span class="m-text">
        <span class="m-name">${m.name}</span>
        <span class="m-desc">${m.desc}</span>
      </span>
      <span class="m-tag">${m.tag}</span>
    `;
    item.addEventListener("click", () => {
      setModel(m.id);
      closeSidebarMobile();
    });
    list.appendChild(item);
  });
}

function setModel(id) {
  const m = MODELS.find((x) => x.id === id);
  if (!m) return;
  state.modelId = id;
  localStorage.setItem("lexai.model", id);

  // Update topbar
  $("#currentModelName").textContent = m.name;
  const badge = $("#currentModelBadge");
  badge.textContent = m.tag;

  // Update list selection
  $$(".model-item").forEach((el) =>
    el.classList.toggle("active", el.dataset.id === id)
  );

  // Reset image if model is not multimodal
  if (!m.multimodal && state.imageUrl) {
    state.imageUrl = null;
    updateImagePreview();
  }
  // Disable image button for non-multimodal
  const imgBtn = $("#addImageBtn");
  imgBtn.classList.toggle("disabled", !m.multimodal);
  imgBtn.title = m.multimodal
    ? "Tambahkan URL gambar (vision)"
    : "Model ini tidak mendukung gambar";
}

function getCurrentModel() {
  return MODELS.find((m) => m.id === state.modelId) || MODELS[0];
}

/* ---------- Chat rendering ---------- */
function ensureWelcomeHidden() {
  const w = $("#welcome");
  if (w) w.remove();
}

function appendUserMessage({ text, imageUrl }) {
  ensureWelcomeHidden();
  const wrap = document.createElement("div");
  wrap.className = "message-wrap";
  const imgHtml = imageUrl
    ? `<div class="bubble-img"><img src="${escapeHtml(
        imageUrl
      )}" alt="Image attachment" onerror="this.parentElement.style.display='none'" /></div>`
    : "";
  wrap.innerHTML = `
    <div class="message">
      <div class="avatar user"><i class="fa-solid fa-user"></i></div>
      <div class="bubble">
        <div class="bubble-head"><span class="bubble-name">Kamu</span></div>
        <div class="bubble-content">${renderMarkdown(text)}</div>
        ${imgHtml}
      </div>
    </div>
  `;
  $("#chat").appendChild(wrap);
  scrollToBottom();
}

function appendBotPlaceholder(modelName) {
  const wrap = document.createElement("div");
  wrap.className = "message-wrap";
  wrap.dataset.role = "bot-pending";
  wrap.innerHTML = `
    <div class="message">
      <div class="avatar bot"><i class="fa-solid fa-bolt"></i></div>
      <div class="bubble">
        <div class="bubble-head">
          <span class="bubble-name">${escapeHtml(modelName)}</span>
          <span>sedang berpikir…</span>
        </div>
        <div class="bubble-content">
          <div class="typing"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>
  `;
  $("#chat").appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function fillBotMessage(wrap, { modelName, text, references, related, error }) {
  const head = wrap.querySelector(".bubble-head");
  const content = wrap.querySelector(".bubble-content");

  if (error) {
    head.innerHTML = `<span class="bubble-name">${escapeHtml(modelName)}</span><span style="color:var(--danger)">terjadi kesalahan</span>`;
    content.innerHTML = `<div class="error-bubble"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(
      error
    )}</div>`;
    return;
  }

  head.innerHTML = `<span class="bubble-name">${escapeHtml(modelName)}</span>`;

  let html = renderMarkdown(text || "");

  if (Array.isArray(references) && references.length) {
    html += `
      <div class="references">
        <div class="references-title"><i class="fa-solid fa-link"></i> Sumber</div>
        <div class="ref-list">
          ${references
            .map(
              (r, i) => `
              <a class="ref-item" href="${escapeHtml(r.url || "#")}" target="_blank" rel="noopener">
                <span class="ref-num">[${i + 1}]</span>
                <span class="ref-title">${escapeHtml(r.title || r.url || "Source")}</span>
              </a>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (Array.isArray(related) && related.length) {
    html += `
      <div class="related">
        ${related
          .map(
            (q) =>
              `<button class="related-chip" data-q="${escapeHtml(
                q
              )}">${escapeHtml(q)}</button>`
          )
          .join("")}
      </div>
    `;
  }

  content.innerHTML = html;
  highlightCode(content);

  // Add actions: copy
  const actions = document.createElement("div");
  actions.className = "bubble-actions";
  actions.innerHTML = `
    <button class="action-btn" data-act="copy"><i class="fa-regular fa-copy"></i> Salin</button>
  `;
  wrap.querySelector(".bubble").appendChild(actions);

  actions.querySelector('[data-act="copy"]').addEventListener("click", () => {
    navigator.clipboard
      .writeText(text || "")
      .then(() => showToast("Tersalin"))
      .catch(() => showToast("Gagal menyalin", true));
  });

  // Related chips fill input
  content.querySelectorAll(".related-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      $("#input").value = q;
      autoGrow();
      $("#input").focus();
    });
  });
}

function scrollToBottom() {
  const c = $("#chat");
  c.scrollTop = c.scrollHeight;
}

/* ---------- API ---------- */
async function callApi(model, text, imageUrl) {
  const url = new URL(API_BASE + model.endpoint);
  url.searchParams.set(model.textParam, text);
  if (model.multimodal && imageUrl && model.imageParam) {
    url.searchParams.set(model.imageParam, imageUrl);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let data = null;
  const raw = await res.text();
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Respons API tidak valid (bukan JSON).");
  }

  if (!res.ok || data.success === false || data.status === false) {
    const msg =
      (data && (data.message || (data.error && (data.error.message || data.error)))) ||
      `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const parsed = model.parseAnswer(data);
  if (parsed == null) {
    throw new Error("Respons kosong atau tidak dikenali dari model.");
  }
  return parsed;
}

/* ---------- Send flow ---------- */
async function sendMessage() {
  if (state.pending) return;
  const inputEl = $("#input");
  const text = inputEl.value.trim();
  if (!text) return;

  const model = getCurrentModel();
  const imageUrl = model.multimodal ? state.imageUrl : null;

  // Append user
  appendUserMessage({ text, imageUrl });
  inputEl.value = "";
  autoGrow();
  // Clear image after sending
  state.imageUrl = null;
  updateImagePreview();

  // Append placeholder
  const wrap = appendBotPlaceholder(model.name);
  state.pending = true;
  setComposerEnabled(false);

  try {
    const result = await callApi(model, text, imageUrl);
    if (typeof result === "string") {
      fillBotMessage(wrap, { modelName: model.name, text: result });
    } else if (result && typeof result.text === "string") {
      fillBotMessage(wrap, {
        modelName: model.name,
        text: result.text,
        references: result.references,
        related: result.related,
      });
    } else {
      fillBotMessage(wrap, {
        modelName: model.name,
        text: String(result),
      });
    }
  } catch (err) {
    fillBotMessage(wrap, {
      modelName: model.name,
      error: err.message || "Tidak dapat menghubungi server AI.",
    });
  } finally {
    state.pending = false;
    setComposerEnabled(true);
    scrollToBottom();
    inputEl.focus();
  }
}

function setComposerEnabled(enabled) {
  $("#sendBtn").disabled = !enabled;
  $("#input").disabled = !enabled;
}

/* ---------- Composer ---------- */
function autoGrow() {
  const ta = $("#input");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
}

/* ---------- Image modal ---------- */
function openImageModal() {
  const model = getCurrentModel();
  if (!model.multimodal) {
    showToast("Model ini tidak mendukung gambar", true);
    return;
  }
  $("#imageUrlInput").value = state.imageUrl || "";
  $("#imageModal").hidden = false;
  setTimeout(() => $("#imageUrlInput").focus(), 50);
}

function closeImageModal() {
  $("#imageModal").hidden = true;
}

function applyImageUrl() {
  const v = $("#imageUrlInput").value.trim();
  if (!v) {
    state.imageUrl = null;
  } else {
    try {
      // Basic URL validation
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol)) throw 0;
      state.imageUrl = v;
    } catch {
      showToast("URL tidak valid", true);
      return;
    }
  }
  updateImagePreview();
  closeImageModal();
}

function updateImagePreview() {
  const bar = $("#imagePreview");
  const img = $("#imagePreviewImg");
  const btn = $("#addImageBtn");
  if (state.imageUrl) {
    img.src = state.imageUrl;
    bar.hidden = false;
    btn.classList.add("has-image");
  } else {
    bar.hidden = true;
    img.removeAttribute("src");
    btn.classList.remove("has-image");
  }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("error", !!isError);
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.hidden = true;
  }, 2500);
}

/* ---------- New chat ---------- */
function newChat() {
  state.messages = [];
  state.imageUrl = null;
  updateImagePreview();
  $("#chat").innerHTML = "";
  // Re-render welcome
  const welcome = document.createElement("div");
  welcome.className = "welcome";
  welcome.id = "welcome";
  welcome.innerHTML = `
    <div class="welcome-logo"><i class="fa-solid fa-bolt"></i></div>
    <h1>Selamat datang di <span class="grad">LexAI</span></h1>
    <p>Asisten AI gratis dengan banyak model. Pilih model di sidebar lalu mulai mengobrol.</p>
    <div class="prompt-suggestions">
      <button class="suggest" data-prompt="Jelaskan konsep machine learning dengan analogi sederhana">
        <i class="fa-solid fa-lightbulb"></i><span>Jelaskan machine learning</span>
      </button>
      <button class="suggest" data-prompt="Tuliskan fungsi JavaScript untuk mengurutkan array bilangan secara ascending">
        <i class="fa-solid fa-code"></i><span>Sort array di JavaScript</span>
      </button>
      <button class="suggest" data-prompt="Buatkan rencana belajar Python untuk pemula selama 30 hari">
        <i class="fa-solid fa-graduation-cap"></i><span>Rencana belajar Python</span>
      </button>
      <button class="suggest" data-prompt="Apa berita teknologi terbaru hari ini?">
        <i class="fa-solid fa-newspaper"></i><span>Berita teknologi terbaru</span>
      </button>
    </div>
  `;
  $("#chat").appendChild(welcome);
  bindSuggestions();
}

function bindSuggestions() {
  $$(".suggest").forEach((el) => {
    el.addEventListener("click", () => {
      $("#input").value = el.dataset.prompt;
      autoGrow();
      $("#input").focus();
    });
  });
}

/* ---------- Mobile sidebar ---------- */
function openSidebarMobile() {
  $("#sidebar").classList.add("open");
  $("#backdrop").classList.add("show");
}
function closeSidebarMobile() {
  $("#sidebar").classList.remove("open");
  $("#backdrop").classList.remove("show");
}

/* ---------- Init ---------- */
function init() {
  renderModelList();
  setModel(state.modelId);

  // Composer
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  const ta = $("#input");
  ta.addEventListener("input", autoGrow);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  $("#newChatBtn").addEventListener("click", newChat);
  $("#clearBtn").addEventListener("click", newChat);

  // Image modal
  $("#addImageBtn").addEventListener("click", openImageModal);
  $("#imageModalClose").addEventListener("click", closeImageModal);
  $("#imageCancelBtn").addEventListener("click", closeImageModal);
  $("#imageOkBtn").addEventListener("click", applyImageUrl);
  $("#imageUrlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyImageUrl();
    }
  });
  $("#imageModal").addEventListener("click", (e) => {
    if (e.target.id === "imageModal") closeImageModal();
  });
  $("#removeImageBtn").addEventListener("click", () => {
    state.imageUrl = null;
    updateImagePreview();
  });

  // Sidebar mobile
  $("#sidebarToggle").addEventListener("click", openSidebarMobile);
  $("#sidebarClose").addEventListener("click", closeSidebarMobile);
  $("#backdrop").addEventListener("click", closeSidebarMobile);

  // Suggestions
  bindSuggestions();
}

document.addEventListener("DOMContentLoaded", init);
