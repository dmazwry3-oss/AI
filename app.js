/* =========================================================
 * Dmaz Alyxers — Multi-Model AI Web App
 * Powered by LexCode API (https://api.lexcode.biz.id)
 * ========================================================= */

const API_BASE = "https://api.lexcode.biz.id";
const UPLOAD_ENDPOINT = "/api/tools/upload/tmplink"; // accepts any file, returns public URL
const AI_NAME = "Dmaz Alyxers";

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
        const t = r.trim();
        if (
          t.length >= 2 &&
          ((t.startsWith('"') && t.endsWith('"')) ||
            (t.startsWith("'") && t.endsWith("'")))
        ) {
          return t.slice(1, -1);
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
      if (typeof r.answer === "string") {
        return {
          text: r.answer,
          references: Array.isArray(r.references) ? r.references : [],
          related: Array.isArray(r.related) ? r.related : [],
        };
      }
      return null;
    },
  },
];

/* ---------- Persona prefix injected into every text prompt ----------
 * Subtle: tells the model to identify as Dmaz Alyxers when asked, in
 * the same language as the user. Most LexCode AI endpoints accept just
 * `text` so this is the cleanest place to inject persona.
 */
const PERSONA_PREFIX = `[Identitas asisten: Kamu adalah ${AI_NAME}, asisten AI yang ramah, akurat, dan membantu. Jawab dalam bahasa pengguna. Jangan menyebut nama model lain seperti Gemini/Claude/GPT kecuali ditanya secara teknis.]\n\n`;

/* ---------- State ---------- */
const state = {
  modelId: localStorage.getItem("dmaz.model") || MODELS[0].id,
  attachments: [], // { id, file, name, size, type, kind, status, url, textContent }
  pending: false,
  abortCtrl: null,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ---------- Markdown ---------- */
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
    try { hljs.highlightElement(el); } catch {}
  });
}

/* ---------- Sidebar / Models ---------- */
function renderModelList() {
  const list = $("#modelList");
  list.innerHTML = "";
  MODELS.forEach((m) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "model-item" + (m.id === state.modelId ? " active" : "");
    item.dataset.id = m.id;
    item.innerHTML = `
      <span class="m-icon"><i class="${m.icon}"></i></span>
      <span class="m-text">
        <span class="m-name">${escapeHtml(m.name)}</span>
        <span class="m-desc">${escapeHtml(m.desc)}</span>
      </span>
      <span class="m-tag">${escapeHtml(m.tag)}</span>
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
  localStorage.setItem("dmaz.model", id);

  $("#currentModelName").textContent = m.name;
  $("#currentModelDesc").textContent = m.desc;
  $("#currentModelBadge").textContent = m.tag;

  $$(".model-item").forEach((el) =>
    el.classList.toggle("active", el.dataset.id === id)
  );
}

function getCurrentModel() {
  return MODELS.find((m) => m.id === state.modelId) || MODELS[0];
}

/** Auto-pick a vision-capable model when an image is attached
 * but the current model isn't multimodal. */
function ensureMultimodalIfImage() {
  const hasImage = state.attachments.some((a) => a.kind === "image");
  if (!hasImage) return;
  const m = getCurrentModel();
  if (m.multimodal) return;
  // Pick first multimodal model
  const mm = MODELS.find((x) => x.multimodal);
  if (mm) {
    setModel(mm.id);
    showToast(`Model dialihkan ke ${mm.name} untuk membaca gambar`, "success");
  }
}

/* ---------- Chat rendering ---------- */
function ensureWelcomeHidden() {
  const w = $("#welcome");
  if (w) w.remove();
}

function attachmentBubbleHtml(att) {
  if (att.kind === "image" && att.url) {
    return `<div class="bubble-img"><img src="${escapeHtml(att.url)}" alt="${escapeHtml(att.name)}" /></div>`;
  }
  const icon = fileIconClass(att);
  return `
    <div class="bubble-att">
      <span class="ai"><i class="${icon}"></i></span>
      <div>
        <div class="at-name">${escapeHtml(att.name)}</div>
        <div class="at-meta">${escapeHtml(att.kind)} · ${formatSize(att.size)}</div>
      </div>
    </div>`;
}

function appendUserMessage({ text, attachments }) {
  ensureWelcomeHidden();
  const wrap = document.createElement("div");
  wrap.className = "message-wrap";

  const attHtml = (attachments && attachments.length)
    ? `<div class="bubble-attachments">${attachments.map(attachmentBubbleHtml).join("")}</div>`
    : "";

  wrap.innerHTML = `
    <div class="message">
      <div class="avatar user"><i class="fa-solid fa-user"></i></div>
      <div class="bubble">
        <div class="bubble-head"><span class="bubble-name">Kamu</span></div>
        <div class="bubble-content">${renderMarkdown(text || "")}</div>
        ${attHtml}
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
      <div class="avatar bot">D</div>
      <div class="bubble">
        <div class="bubble-head">
          <span class="bubble-name">${escapeHtml(AI_NAME)}</span>
          <span>· via ${escapeHtml(modelName)} · sedang berpikir</span>
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
    head.innerHTML = `<span class="bubble-name">${escapeHtml(AI_NAME)}</span><span style="color:var(--danger)">· terjadi kesalahan</span>`;
    content.innerHTML = `
      <div class="error-bubble">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>${escapeHtml(error)}</span>
      </div>`;
    return;
  }

  head.innerHTML = `<span class="bubble-name">${escapeHtml(AI_NAME)}</span><span>· via ${escapeHtml(modelName)}</span>`;

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
              `<button type="button" class="related-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
          )
          .join("")}
      </div>
    `;
  }

  content.innerHTML = html;
  highlightCode(content);

  // Add copy action
  const actions = document.createElement("div");
  actions.className = "bubble-actions";
  actions.innerHTML = `
    <button type="button" class="action-btn" data-act="copy"><i class="fa-regular fa-copy"></i> Salin</button>
  `;
  wrap.querySelector(".bubble").appendChild(actions);

  actions.querySelector('[data-act="copy"]').addEventListener("click", () => {
    navigator.clipboard
      .writeText(text || "")
      .then(() => showToast("Tersalin ke clipboard", "success"))
      .catch(() => showToast("Gagal menyalin", "error"));
  });

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

/* ---------- File handling ---------- */
const TEXT_EXTS = [
  "txt","md","markdown","csv","tsv","json","yaml","yml","xml","html","htm",
  "css","scss","sass","less","js","mjs","cjs","ts","tsx","jsx","py","rb","go",
  "rs","java","kt","swift","c","h","cpp","cc","hpp","cs","php","sh","bash",
  "zsh","sql","ini","cfg","conf","toml","env","log","srt","vtt","gitignore","dockerfile"
];
const MAX_TEXT_BYTES = 200 * 1024; // 200 KB cap embedded into prompt
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB safe limit

function fileExt(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function classifyFile(file) {
  if (file.type && file.type.startsWith("image/")) return "image";
  const ext = fileExt(file.name);
  if (file.type === "text/plain" || file.type === "text/markdown" ||
      file.type === "application/json" || file.type === "text/csv" ||
      file.type === "application/xml" || (file.type || "").startsWith("text/") ||
      TEXT_EXTS.includes(ext)) return "text";
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  return "file";
}

function fileIconClass(att) {
  switch (att.kind) {
    case "image": return "fa-regular fa-image";
    case "text":  return "fa-solid fa-file-lines";
    case "pdf":   return "fa-regular fa-file-pdf";
    default:      return "fa-regular fa-file";
  }
}

function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Gagal membaca file"));
    r.onload = () => resolve(r.result || "");
    r.readAsText(file);
  });
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(API_BASE + UPLOAD_ENDPOINT, { method: "POST", body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.success === false) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Upload gagal");
  }
  const url =
    (data.result && (data.result.url || data.result.download_url)) ||
    null;
  if (!url) throw new Error("Upload sukses tapi URL tidak ditemukan");
  return url;
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`${file.name} terlalu besar (maks 25 MB)`, "error");
      continue;
    }
    const id = "att_" + Math.random().toString(36).slice(2, 9);
    const kind = classifyFile(file);
    const att = {
      id,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      kind,
      status: "pending",
      url: null,
      textContent: null,
    };
    state.attachments.push(att);
    renderAttachments();

    try {
      if (kind === "text") {
        // Read locally; only upload if oversized for embed (then keep URL).
        let text = "";
        try {
          text = await readFileAsText(file);
        } catch {
          text = "";
        }
        if (text && new Blob([text]).size <= MAX_TEXT_BYTES) {
          att.textContent = text;
        } else {
          att.textContent = text ? text.slice(0, 8000) + "\n\n…(dipotong)" : "";
        }
        // Also upload so a public URL is available (best-effort, non-blocking)
        try {
          att.status = "uploading";
          renderAttachments();
          att.url = await uploadFile(file);
        } catch { /* ignore */ }
        att.status = "done";
      } else {
        // image / pdf / others → upload to get public URL
        att.status = "uploading";
        renderAttachments();
        att.url = await uploadFile(file);
        att.status = "done";
      }
    } catch (err) {
      att.status = "error";
      att.error = err.message || "Gagal upload";
      showToast(`Gagal upload ${att.name}: ${att.error}`, "error");
    }
    renderAttachments();
  }

  ensureMultimodalIfImage();
}

function removeAttachment(id) {
  state.attachments = state.attachments.filter((a) => a.id !== id);
  renderAttachments();
}

function renderAttachments() {
  const bar = $("#attachments");
  if (!state.attachments.length) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  bar.hidden = false;
  bar.innerHTML = state.attachments
    .map((a) => {
      const cls = "att-chip" +
        (a.status === "uploading" ? " uploading" : "") +
        (a.status === "error" ? " error" : "");
      const thumb =
        a.kind === "image" && a.url
          ? `<span class="att-thumb"><img src="${escapeHtml(a.url)}" alt="" /></span>`
          : a.kind === "image" && a.file
          ? `<span class="att-thumb"><img src="${escapeHtml(URL.createObjectURL(a.file))}" alt="" /></span>`
          : `<span class="att-thumb"><i class="${fileIconClass(a)}"></i></span>`;
      const meta =
        a.status === "uploading"
          ? `<span class="spinner"></span> Mengunggah…`
          : a.status === "error"
          ? `Gagal upload`
          : `${a.kind} · ${formatSize(a.size)}`;
      return `
        <div class="att-chip ${cls.replace("att-chip ", "")}" data-id="${a.id}">
          ${thumb}
          <div class="att-info">
            <div class="att-name">${escapeHtml(a.name)}</div>
            <div class="att-meta">${meta}</div>
          </div>
          <button type="button" class="att-remove" data-rm="${a.id}" title="Hapus" aria-label="Hapus">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>`;
    })
    .join("");

  bar.querySelectorAll("[data-rm]").forEach((b) => {
    b.addEventListener("click", () => removeAttachment(b.dataset.rm));
  });
}

/* ---------- Build composite prompt with attachments ---------- */
function buildPrompt(userText) {
  const blocks = [];
  const ready = state.attachments.filter((a) => a.status !== "uploading");
  const textFiles = ready.filter((a) => a.kind === "text" && a.textContent);
  const otherFiles = ready.filter(
    (a) => a.kind !== "text" && a.kind !== "image" && a.url
  );

  if (textFiles.length) {
    for (const a of textFiles) {
      const lang = fileExt(a.name) || "";
      blocks.push(
        `Berikut isi file "${a.name}" (${formatSize(a.size)}):\n\`\`\`${lang}\n${a.textContent}\n\`\`\``
      );
    }
  }

  if (otherFiles.length) {
    const list = otherFiles
      .map((a) => `- ${a.name} (${a.kind}, ${formatSize(a.size)}): ${a.url}`)
      .join("\n");
    blocks.push(`File lampiran (URL publik):\n${list}`);
  }

  // Mention images (model multimodal akan menerima imgUrl, tapi kalau >1 image
  // kita tetap menyebutkannya dalam prompt sehingga model sadar)
  const images = ready.filter((a) => a.kind === "image" && a.url);
  if (images.length > 1) {
    const list = images.map((a, i) => `- Gambar ${i + 1}: ${a.url}`).join("\n");
    blocks.push(`Beberapa gambar dilampirkan:\n${list}`);
  }

  const userPart = userText.trim()
    ? `Pertanyaan/instruksi pengguna:\n${userText.trim()}`
    : `Pengguna mengirim lampiran tanpa pesan. Tolong analisa & jelaskan isinya.`;

  return PERSONA_PREFIX + [userPart, ...blocks].join("\n\n");
}

/* ---------- API ---------- */
async function callApi(model, text, primaryImageUrl, signal) {
  const url = new URL(API_BASE + model.endpoint);
  url.searchParams.set(model.textParam, text);
  if (model.multimodal && primaryImageUrl && model.imageParam) {
    url.searchParams.set(model.imageParam, primaryImageUrl);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  const raw = await res.text();
  let data = null;
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
  if (parsed == null) throw new Error("Respons kosong atau tidak dikenali dari model.");
  return parsed;
}

/* ---------- Send flow ---------- */
async function sendMessage() {
  if (state.pending) return;

  const inputEl = $("#input");
  const userText = inputEl.value.trim();
  const hasAttachments = state.attachments.some((a) => a.status !== "error");

  if (!userText && !hasAttachments) return;

  // Wait if any attachment is still uploading
  const uploading = state.attachments.some((a) => a.status === "uploading");
  if (uploading) {
    showToast("Tunggu sebentar, masih mengunggah file…", "error");
    return;
  }

  ensureMultimodalIfImage();
  const model = getCurrentModel();

  // Snapshot attachments for this message
  const attachmentsSnapshot = state.attachments.filter((a) => a.status !== "error");
  const firstImage = attachmentsSnapshot.find((a) => a.kind === "image" && a.url);
  const primaryImageUrl = model.multimodal && firstImage ? firstImage.url : null;

  // Append user message bubble
  appendUserMessage({
    text: userText || "(lampiran tanpa pesan)",
    attachments: attachmentsSnapshot,
  });

  inputEl.value = "";
  autoGrow();
  state.attachments = [];
  renderAttachments();

  const wrap = appendBotPlaceholder(model.name);
  state.pending = true;
  state.abortCtrl = new AbortController();
  setComposerBusy(true);

  try {
    const prompt = buildPrompt(userText);
    const result = await callApi(model, prompt, primaryImageUrl, state.abortCtrl.signal);
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
      fillBotMessage(wrap, { modelName: model.name, text: String(result) });
    }
  } catch (err) {
    if (err && err.name === "AbortError") {
      fillBotMessage(wrap, {
        modelName: model.name,
        error: "Dihentikan oleh pengguna.",
      });
    } else {
      fillBotMessage(wrap, {
        modelName: model.name,
        error: err.message || "Tidak dapat menghubungi server AI.",
      });
    }
  } finally {
    state.pending = false;
    state.abortCtrl = null;
    setComposerBusy(false);
    scrollToBottom();
    inputEl.focus();
  }
}

function setComposerBusy(busy) {
  $("#sendBtn").hidden = busy;
  $("#stopBtn").hidden = !busy;
  $("#input").disabled = busy;
  $("#attachBtn").disabled = busy;
}

function stopGeneration() {
  if (state.abortCtrl) {
    try { state.abortCtrl.abort(); } catch {}
  }
}

/* ---------- Composer ---------- */
function autoGrow() {
  const ta = $("#input");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg, type = "") {
  const t = $("#toast");
  t.textContent = "";
  const icon = document.createElement("i");
  icon.className =
    type === "error" ? "fa-solid fa-circle-exclamation" :
    type === "success" ? "fa-solid fa-circle-check" :
    "fa-solid fa-circle-info";
  const span = document.createElement("span");
  span.textContent = msg;
  t.appendChild(icon);
  t.appendChild(span);
  t.className = "toast" + (type ? " " + type : "");
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ---------- New chat ---------- */
function newChat() {
  if (state.pending) stopGeneration();
  state.attachments = [];
  renderAttachments();
  $("#chat").innerHTML = "";

  const welcome = document.createElement("div");
  welcome.className = "welcome";
  welcome.id = "welcome";
  welcome.innerHTML = `
    <div class="welcome-logo"><span>D</span></div>
    <h1>Halo, saya <span class="grad">${escapeHtml(AI_NAME)}</span></h1>
    <p>Asisten AI multi-model. Tanya apapun, kirim gambar, atau lampirkan file — saya bantu jawab.</p>

    <div class="capabilities">
      <div class="cap"><i class="fa-solid fa-comments"></i><span>Chat cerdas</span></div>
      <div class="cap"><i class="fa-solid fa-image"></i><span>Analisa gambar</span></div>
      <div class="cap"><i class="fa-solid fa-file-lines"></i><span>Baca file teks</span></div>
      <div class="cap"><i class="fa-solid fa-globe"></i><span>Cari di web</span></div>
      <div class="cap"><i class="fa-solid fa-code"></i><span>Bantu coding</span></div>
    </div>

    <div class="prompt-suggestions">
      <button class="suggest" data-prompt="Jelaskan konsep machine learning dengan analogi sederhana">
        <i class="fa-solid fa-lightbulb"></i>
        <div><div class="s-title">Jelaskan ML</div><div class="s-sub">dengan analogi sederhana</div></div>
      </button>
      <button class="suggest" data-prompt="Tuliskan fungsi JavaScript untuk mengurutkan array bilangan secara ascending dengan beberapa varian (bubble, quick, built-in).">
        <i class="fa-solid fa-code"></i>
        <div><div class="s-title">Sort di JavaScript</div><div class="s-sub">dengan beberapa varian</div></div>
      </button>
      <button class="suggest" data-prompt="Buatkan rencana belajar Python untuk pemula selama 30 hari, lengkap dengan target harian.">
        <i class="fa-solid fa-graduation-cap"></i>
        <div><div class="s-title">Belajar Python 30 hari</div><div class="s-sub">jadwal harian lengkap</div></div>
      </button>
      <button class="suggest" data-prompt="Apa berita teknologi terbaru hari ini? Sertakan sumber.">
        <i class="fa-solid fa-newspaper"></i>
        <div><div class="s-title">Berita teknologi</div><div class="s-sub">cari di web (Perplexity)</div></div>
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

/* ---------- Drag & drop overlay ---------- */
let dragDepth = 0;
function setupDragDrop() {
  const overlay = $("#dropOverlay");

  // Stop browser from opening files dropped outside drop zones
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      if (evt === "dragover" || evt === "drop") e.preventDefault();
    });
  });

  window.addEventListener("dragenter", (e) => {
    if (!hasFiles(e.dataTransfer)) return;
    dragDepth++;
    overlay.hidden = false;
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) overlay.hidden = true;
  });
  window.addEventListener("drop", (e) => {
    dragDepth = 0;
    overlay.hidden = true;
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });
}

function hasFiles(dt) {
  if (!dt) return false;
  if (dt.types) {
    for (const t of dt.types) {
      if (t === "Files" || t === "application/x-moz-file") return true;
    }
  }
  return false;
}

/* ---------- Paste image from clipboard ---------- */
function setupPaste() {
  window.addEventListener("paste", (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const files = [];
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  });
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

  // Attach button + file input
  $("#attachBtn").addEventListener("click", () => $("#fileInput").click());
  $("#fileInput").addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = ""; // reset so same file can be picked again
  });

  // Stop button
  $("#stopBtn").addEventListener("click", stopGeneration);

  // Sidebar mobile
  $("#sidebarToggle").addEventListener("click", openSidebarMobile);
  $("#sidebarClose").addEventListener("click", closeSidebarMobile);
  $("#backdrop").addEventListener("click", closeSidebarMobile);

  // Drag/drop + paste
  setupDragDrop();
  setupPaste();

  // Suggestions
  bindSuggestions();
}

document.addEventListener("DOMContentLoaded", init);
