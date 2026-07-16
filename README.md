# Dmaz Alyxers

Asisten AI multi-model gratis berbasis web. Dibangun dengan HTML, CSS, dan
JavaScript murni — tanpa build step. Powered by [LexCode API](https://api.lexcode.biz.id).

![status](https://img.shields.io/badge/status-ready-success)
![type](https://img.shields.io/badge/type-static--site-blue)
![deploy](https://img.shields.io/badge/deploy-netlify-success)

## Fitur

- **5 model AI** yang sudah diuji:
  - Gemini 2.5 Flash — multimodal (Google)
  - GPT-4o Mini — multimodal (OpenAI)
  - Claude 4.5 Haiku — Anthropic
  - Claude 3 Haiku — Anthropic
  - Perplexity — AI search dengan referensi web
- **Upload file apa pun**:
  - Gambar (jpg/png/webp/gif/...) → otomatis dianalisa model vision
  - File teks (txt, md, csv, json, kode-kode populer) → isinya dibaca lokal lalu di-inject ke prompt
  - File lain (pdf, zip, dll) → diunggah, URL publik diberikan ke model
- **Drag & drop** ke mana saja di jendela, **paste gambar** dari clipboard, atau klik tombol lampiran
- **Auto-switch model** ke vision saat ada gambar
- **Stop generation** kapan saja (AbortController)
- Tampilan modern: animated gradient orbs, glassmorphism, dark theme
- Markdown rendering + syntax highlighting (highlight.js) + sanitasi DOMPurify
- Tampilan referensi web + saran pertanyaan untuk Perplexity
- Tombol salin per balasan, prompt suggestions, toast feedback
- Responsif penuh, mobile-first, sidebar slide-in
- Pure static — tanpa Node, tanpa backend, tanpa API key

## Struktur

```
.
├── index.html       # Halaman utama
├── style.css        # Tema, animasi, layout
├── app.js           # Logika app, integrasi API, upload
├── netlify.toml     # Konfigurasi Netlify (cache + security headers)
└── README.md
```

## Deploy ke Netlify

### 1. Lewat Git (paling mudah)

1. Pastikan repo ini sudah di GitHub kamu.
2. Login ke [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Pilih GitHub → repo ini.
4. Pengaturan build:
   - **Build command**: *(kosongkan)*
   - **Publish directory**: `.`
5. Klik **Deploy site**. Selesai.

`netlify.toml` di repo ini sudah mengatur publish dir, cache, dan security headers, jadi kamu tidak perlu mengubah apa-apa.

### 2. Drag & drop

1. Download/zip seluruh folder ini.
2. Buka [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag folder hasil ekstrak ke browser. Selesai.

### 3. Netlify CLI

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=.
```

## Jalankan Lokal

```bash
# Python 3
python3 -m http.server 8080

# Node
npx serve .
```

Lalu buka `http://localhost:8080`.

## API yang Dipakai

Semua endpoint berasal dari **LexCode API** (`https://api.lexcode.biz.id`)
dan mendukung CORS, sehingga aman dipanggil langsung dari browser.

| Fungsi      | Endpoint                                  | Multimodal |
| ----------- | ----------------------------------------- | ---------- |
| Gemini 2.5  | `/api/ai/gemini-2-5-flash`                | ✅          |
| GPT-4o Mini | `/api/ai/gpt/4o-mini`                     | ✅          |
| Claude 4.5  | `/api/ai/claude/4-5-haiku`                | ❌          |
| Claude 3    | `/api/ai/claude-3-haiku`                  | ❌          |
| Perplexity  | `/api/ai/perplexity`                      | ❌          |
| Upload file | `/api/tools/upload/tmplink` (POST)        | -          |

Mau menambah model lain? Cukup tambahkan entri ke array `MODELS` di
`app.js` dengan `endpoint`, `textParam`, dan `parseAnswer`.

## Tentang Persona

Setiap pesan ke API diawali dengan instruksi singkat agar model
memperkenalkan diri sebagai **Dmaz Alyxers** dan menjawab dalam bahasa
pengguna. Ini cukup tanpa modifikasi backend.

## Lisensi

MIT — silakan pakai, modifikasi, dan deploy bebas.

## Credits

- API: [LexCode API](https://api.lexcode.biz.id)
- Icons: [Font Awesome](https://fontawesome.com)
- Fonts: Inter & Space Grotesk via Google Fonts
- Markdown: [marked](https://github.com/markedjs/marked)
- Sanitization: [DOMPurify](https://github.com/cure53/DOMPurify)
- Highlight: [highlight.js](https://highlightjs.org)
