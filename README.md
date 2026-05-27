# ⚡ LexAI

Web AI multi-model gratis yang dibangun dengan HTML, CSS, dan JavaScript murni.
Powered by [LexCode API](https://api.lexcode.biz.id) — siap deploy ke **Netlify** tanpa build step.

![status](https://img.shields.io/badge/status-ready-success)
![type](https://img.shields.io/badge/type-static--site-blue)
![deploy](https://img.shields.io/badge/deploy-netlify-success)

## ✨ Fitur

- **5 model AI** yang sudah teruji bekerja:
  - 🟣 **Gemini 2.5 Flash** — cepat, mendukung gambar (vision)
  - 🟢 **GPT-4o Mini** — multimodal (vision)
  - 🪶 **Claude 4.5 Haiku** — cerdas & elegan
  - 🌬️ **Claude 3 Haiku** — ringan & cepat
  - 🔎 **Perplexity** — AI search dengan referensi web
- 💬 Antarmuka chat modern (mirip ChatGPT) dengan sidebar pilih model
- 🌗 Tema gelap dengan aksen gradient
- 📱 Responsif penuh (mobile-first)
- 🖼️ Vision (URL gambar) untuk model multimodal
- 📝 Markdown rendering + syntax highlighting (highlight.js)
- 🔗 Tampilan referensi & saran pertanyaan untuk Perplexity
- 📋 Tombol salin, chat baru, prompt suggestions
- 🔒 Sanitasi HTML via DOMPurify
- 🚀 Pure static — tidak perlu Node, build, atau backend

## 📁 Struktur

```
.
├── index.html       # Halaman utama
├── style.css        # Tema & layout
├── app.js           # Logika app + integrasi API
├── netlify.toml     # Konfigurasi Netlify (cache + security headers)
└── README.md
```

## 🚀 Deploy ke Netlify

### Cara 1 — Lewat Git (paling mudah)

1. Push repo ini ke GitHub (sudah otomatis bila kamu menggunakan PR ini).
2. Login ke [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Pilih provider GitHub, lalu pilih repo ini.
4. Pengaturan build:
   - **Build command**: *(kosongkan)*
   - **Publish directory**: `.`
5. Klik **Deploy site**. Selesai 🎉

`netlify.toml` di repo ini sudah mengatur publish dir, cache, dan security headers, jadi kamu tidak perlu mengubah apa-apa.

### Cara 2 — Drag & drop

1. Download/zip seluruh folder ini.
2. Buka [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag folder hasil ekstrak ke browser. Selesai.

### Cara 3 — Netlify CLI

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=.
```

## 🧪 Jalankan Lokal

Karena ini static site dan API mengizinkan CORS, cukup buka file langsung di browser **atau** jalankan server kecil:

```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Lalu buka `http://localhost:8080`.

## 🔌 API yang Dipakai

Semua endpoint berasal dari **LexCode API** (`https://api.lexcode.biz.id`) dan
mendukung `Access-Control-Allow-Origin: *`, sehingga aman dipanggil langsung
dari browser.

| Model              | Endpoint                          | Multimodal |
| ------------------ | --------------------------------- | ---------- |
| Gemini 2.5 Flash   | `/api/ai/gemini-2-5-flash`        | ✅          |
| GPT-4o Mini        | `/api/ai/gpt/4o-mini`             | ✅          |
| Claude 4.5 Haiku   | `/api/ai/claude/4-5-haiku`        | ❌          |
| Claude 3 Haiku     | `/api/ai/claude-3-haiku`          | ❌          |
| Perplexity         | `/api/ai/perplexity`              | ❌          |

> Mau menambah model lain dari LexCode? Cukup tambahkan entri ke array
> `MODELS` di `app.js` dengan `endpoint`, `textParam`, dan `parseAnswer`.

## ⚙️ Konfigurasi Singkat

Tidak ada API key yang dibutuhkan — LexCode API gratis & tanpa autentikasi
untuk endpoint dasar. Jika kamu ingin menambah quota / produksi, hubungi
penyedia API.

## 📜 Lisensi

MIT — silakan pakai, modifikasi, dan deploy bebas.

## 🙏 Credit

- API: [LexCode API](https://api.lexcode.biz.id)
- Icons: [Font Awesome](https://fontawesome.com)
- Markdown: [marked](https://github.com/markedjs/marked) + [DOMPurify](https://github.com/cure53/DOMPurify)
- Highlight: [highlight.js](https://highlightjs.org)
