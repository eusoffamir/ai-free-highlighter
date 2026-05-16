import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import fs from 'fs'
import os from 'os'

export const config = {
  api: { bodyParser: false },
}

async function parseForm(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      uploadDir: os.tmpdir(),
      keepExtensions: true,
    })
    form.parse(req, (err, _fields, files) => {
      if (err) return reject(err)
      const raw = files.pdf
      const pdfFile: File | undefined = Array.isArray(raw) ? raw[0] : raw
      if (!pdfFile) return reject(new Error('No PDF file uploaded.'))
      resolve(pdfFile.filepath)
    })
  })
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)
  return data.text
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)
}

interface HFResult {
  labels: string[]
  scores: number[]
}

async function queryHF(sentence: string, hfToken: string, retried = false): Promise<HFResult | null> {
  const HF_API = 'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli'

  const res = await fetch(HF_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: sentence,
      parameters: { candidate_labels: ['key point', 'unimportant detail'] },
    }),
  })

  if (!res.ok) {
    if (res.status === 503 && !retried) {
      await new Promise((r) => setTimeout(r, 10000))
      return queryHF(sentence, hfToken, true)
    }
    const txt = await res.text()
    throw new Error(`HF API ${res.status}: ${txt}`)
  }

  // HF may return an object OR an array wrapping the object
  const json = await res.json()
  const result: HFResult = Array.isArray(json) ? json[0] : json

  if (!result || !Array.isArray(result.labels) || !Array.isArray(result.scores)) {
    console.error('Unexpected HF shape:', JSON.stringify(json))
    return null
  }

  return result
}

async function getImportantSentences(sentences: string[], hfToken: string): Promise<string[]> {
  const toAnalyze = sentences.slice(0, 60)
  const scored: { sentence: string; score: number }[] = []

  const BATCH = 5
  for (let i = 0; i < toAnalyze.length; i += BATCH) {
    const batch = toAnalyze.slice(i, i + BATCH)
    const results = await Promise.all(batch.map((s) => queryHF(s, hfToken)))
    for (let j = 0; j < batch.length; j++) {
      const r = results[j]
      if (!r) {
        scored.push({ sentence: batch[j], score: 0 })
        continue
      }
      const idx = r.labels.indexOf('key point')
      scored.push({ sentence: batch[j], score: idx >= 0 ? r.scores[idx] : 0 })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const topN = Math.max(3, Math.ceil(scored.length * 0.28))
  const topSet = new Set(scored.slice(0, topN).map((s) => s.sentence))
  return toAnalyze.filter((s) => topSet.has(s))
}

async function generateHighlightedPDF(originalPath: string, highlighted: string[]): Promise<Buffer> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')

  const pdfDoc = await PDFDocument.load(fs.readFileSync(originalPath))
  const pages = pdfDoc.getPages()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const summaryPage = pdfDoc.insertPage(0)
  const { width, height } = summaryPage.getSize()

  summaryPage.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.96, 0.91) })
  summaryPage.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.78, 0.25, 0.04) })
  summaryPage.drawText('KEY HIGHLIGHTS', { x: 48, y: height - 50, size: 22, font: boldFont, color: rgb(1, 1, 1) })
  summaryPage.drawText('AI PDF Highlighter — Most Important Sentences', { x: 48, y: height - 70, size: 10, font: regularFont, color: rgb(1, 0.9, 0.85) })
  summaryPage.drawText(`${highlighted.length} key sentences identified`, { x: 48, y: height - 106, size: 11, font: boldFont, color: rgb(0.4, 0.3, 0.2) })

  let y = height - 134
  const LINE_H = 14
  const MAX_W = width - 96
  const FS = 9

  for (const sentence of highlighted) {
    if (y < 60) break
    summaryPage.drawRectangle({ x: 48, y: y - 10, width: 8, height: 10, color: rgb(1.0, 0.82, 0.4) })
    const words = sentence.split(' ')
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (regularFont.widthOfTextAtSize(test, FS) > MAX_W - 20 && line) {
        if (y < 60) break
        summaryPage.drawText(line, { x: 62, y, size: FS, font: regularFont, color: rgb(0.15, 0.12, 0.1) })
        y -= LINE_H
        line = word
      } else {
        line = test
      }
    }
    if (line && y > 60) {
      summaryPage.drawText(line, { x: 62, y, size: FS, font: regularFont, color: rgb(0.15, 0.12, 0.1) })
    }
    y -= LINE_H + 4
  }

  summaryPage.drawText('Generated by AI PDF Highlighter', { x: 48, y: 32, size: 8, font: regularFont, color: rgb(0.6, 0.55, 0.5) })

  for (const page of pages) {
    const pw = page.getWidth()
    const ph = page.getHeight()
    page.drawRectangle({ x: pw - 130, y: ph - 28, width: 122, height: 20, color: rgb(1.0, 0.87, 0.34), opacity: 0.8 })
    page.drawText('See Key Points on page 1', { x: pw - 127, y: ph - 20, size: 7, font: regularFont, color: rgb(0.2, 0.1, 0.0) })
  }

  return Buffer.from(await pdfDoc.save())
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const hfToken = process.env.HF_TOKEN
  if (!hfToken) {
    return res.status(500).json({ error: 'HF_TOKEN not configured.' })
  }

  let filePath: string | null = null

  try {
    const start = Date.now()
    filePath = await parseForm(req)

    const fullText = await extractTextFromPDF(filePath)
    if (!fullText.trim()) {
      return res.status(400).json({ error: 'Could not extract text. PDF may be scanned or image-based.' })
    }

    const sentences = splitSentences(fullText)
    if (sentences.length < 3) {
      return res.status(400).json({ error: 'Not enough text found in the PDF.' })
    }

    const importantSentences = await getImportantSentences(sentences, hfToken)
    const pdfBuffer = await generateHighlightedPDF(filePath, importantSentences)

    return res.status(200).json({
      highlightedSentences: importantSentences,
      totalSentences: sentences.length,
      previewText: fullText.slice(0, 2500),
      downloadUrl: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
      processingTime: Date.now() - start,
    })
  } catch (err: unknown) {
    console.error('Highlight API error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Processing failed.',
    })
  } finally {
    if (filePath) {
      try { fs.unlinkSync(filePath) } catch { /* ignore */ }
    }
  }
}
