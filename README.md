# AI PDF Highlighter (https://ai-pdf-highlighter.vercel.app)

Upload any PDF essay or document and Claude AI automatically highlights the most important sentences — thesis statements, key arguments, conclusions, and critical facts — to help students study faster.

![AI PDF Highlighter](https://img.shields.io/badge/Built%20with-Claude%20AI-orange) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-blue)

## Features

- 📄 **Upload any PDF** — essays, papers, textbooks, articles (up to 10 MB)
- 🤖 **AI-powered analysis** — Claude reads every sentence and selects the most important ones
- 🟡 **Smart highlighting** — targets thesis statements, key arguments, evidence, conclusions
- 📥 **Download highlighted PDF** — get a clean PDF with a Key Points summary page
- ⚡ **Fast** — results in under 15 seconds
- 🆓 **Free to deploy** — runs on Vercel's free tier

## What gets highlighted

✅ Highlighted:
- Thesis statements and central claims
- Key arguments and supporting evidence
- Important conclusions and implications
- Critical facts, statistics, or research findings
- Topic sentences that introduce major ideas
- Definitions of key concepts

❌ Not highlighted:
- Filler phrases and transitions
- Repetitive or redundant sentences
- Weak supporting examples
- Introductory boilerplate

---

## Local Development

### Prerequisites

- Node.js 18+
- A **free** [Hugging Face account](https://huggingface.co) (no credit card)

### Get your free HF token (30 seconds)

1. Sign up at [huggingface.co](https://huggingface.co)
2. Go to **Settings → Access Tokens**
3. Click **New token** → Role: **Read** → Create
4. Copy the token (starts with `hf_...`)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ai-pdf-highlighter
cd ai-pdf-highlighter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and paste your HF_TOKEN

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Vercel (Free)

### Option 1: One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-pdf-highlighter)

### Option 2: Manual deploy

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. In **Environment Variables**, add:
   - `HF_TOKEN` = your free token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
4. Click **Deploy** ✓

**100% free** — Hugging Face free tier + Vercel free tier. No credit card anywhere.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (Pages Router) |
| AI | Anthropic Claude (claude-sonnet-4) |
| PDF parsing | pdfjs-dist (text extraction) |
| PDF generation | pdf-lib (create highlighted output) |
| File upload | formidable |
| Deployment | Vercel (serverless) |
| Styling | Pure CSS (no Tailwind, no component libs) |

---

## How It Works

```
User uploads PDF
       ↓
formidable saves to /tmp
       ↓
pdfjs-dist extracts full text
       ↓
Text is split into sentences
       ↓
Claude AI receives numbered sentences
Claude returns JSON array of important sentence indices
       ↓
pdf-lib creates new PDF:
  • Page 1: Key Points summary (yellow highlights)
  • Rest: Original pages with header annotation
       ↓
PDF sent back as base64 data URL
User downloads it
```

---

## Cost Estimate

Using Claude claude-sonnet-4 at typical academic paper length (~5,000 words):
- Input tokens: ~1,800 (sentences list)
- Output tokens: ~100 (JSON array)
- Cost per analysis: ~**$0.003** (less than half a cent)

For 100 analyses/month: ~**$0.30**

---

## Limitations

- Text-based PDFs only (scanned/image PDFs are not supported)
- Maximum 120 sentences analyzed per document (first ~8–10 pages of dense text)
- Maximum file size: 10 MB
- Vercel free tier: 30-second function timeout (sufficient for most documents)

---

## Contributing

PRs welcome! Ideas for improvement:

- [ ] Inline text highlighting using pdfminer/pymupdf (requires Python backend)
- [ ] Support for scanned PDFs via OCR
- [ ] Multiple highlight colors by category (thesis vs evidence vs conclusion)
- [ ] Save history in localStorage
- [ ] Batch PDF processing

---

## License

MIT — free to use, modify, and deploy.
