import { useState, useCallback, useRef } from 'react'
import Head from 'next/head'

interface HighlightResult {
  highlightedSentences: string[]
  totalSentences: number
  previewText: string
  downloadUrl: string
  processingTime: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState('')
  const [result, setResult] = useState<HighlightResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const simulate = (pct: number, step: string, delay: number) =>
    new Promise<void>(res => setTimeout(() => {
      setProgress(pct)
      setProgressStep(step)
      res()
    }, delay))

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setProgress(0)

    try {
      await simulate(15, 'Extracting text from PDF…', 300)
      await simulate(35, 'Identifying sentences…', 400)

      const formData = new FormData()
      formData.append('pdf', file)

      await simulate(50, 'Sending to AI for analysis…', 200)

      const res = await fetch('/api/highlight', {
        method: 'POST',
        body: formData,
      })

      await simulate(80, 'Generating highlighted PDF…', 300)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${res.status}`)
      }

      const data: HighlightResult = await res.json()
      await simulate(100, 'Done!', 200)
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress(0)
    setProgressStep('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const renderPreview = (text: string, highlights: string[]) => {
    // Escape regex special chars
    const escaped = highlights.map(s =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    const pattern = escaped.length > 0
      ? new RegExp(`(${escaped.join('|')})`, 'gi')
      : null

    if (!pattern) return <span>{text}</span>

    const parts = text.split(pattern)
    return (
      <>
        {parts.map((part, i) => {
          const isHighlight = highlights.some(
            h => h.toLowerCase() === part.toLowerCase()
          )
          return isHighlight
            ? <mark key={i} className="highlighted-sentence">{part}</mark>
            : <span key={i}>{part}</span>
        })}
      </>
    )
  }

  return (
    <div className="page-wrapper">
      <Head>
        <title>AI PDF Highlighter — Smart Study Tool</title>
        <meta name="description" content="Upload a PDF and AI automatically highlights the most important sentences to help you study faster." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="site-header">
        <div className="container">
          <div className="header-inner">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5H10V5h8v2zm0 4H10V9h8v2zm-3 4h-5v-2h5v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/>
              </svg>
            </div>
            <span className="site-title">PDF Highlighter</span>
            <span className="site-tagline">Powered by Claude AI</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="hero">
            <h1 className="hero-headline">
              Study smarter,<br />
              not <em>harder</em>.
            </h1>
            <p className="hero-sub">
              Upload any PDF essay or document. Claude AI reads it and highlights only the sentences that truly matter — thesis statements, key arguments, and conclusions.
            </p>
            <div className="feature-pills">
              <span className="pill"><span className="dot" />Thesis detection</span>
              <span className="pill"><span className="dot" />Key arguments</span>
              <span className="pill"><span className="dot" />Conclusions</span>
              <span className="pill"><span className="dot" />Free to use</span>
            </div>
          </div>

          {/* Upload zone */}
          {!result && (
            <div
              className={`upload-card${dragOver ? ' drag-over' : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              {!file ? (
                <div
                  className="upload-zone"
                  onClick={() => inputRef.current?.click()}
                >
                  <div className="upload-icon">
                    <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <div className="upload-title">Drop your PDF here</div>
                    <div className="upload-hint">
                      or <strong>click to browse</strong> — PDF only, max 10 MB
                    </div>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="file-input"
                    onChange={onInputChange}
                  />
                </div>
              ) : (
                <div className="file-selected">
                  <div className="file-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5H10V5h8v2zm0 4H10V9h8v2zm-3 4h-5v-2h5v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/>
                    </svg>
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{formatBytes(file.size)}</div>
                  </div>
                  <button className="btn-remove" onClick={reset}>Remove</button>
                </div>
              )}
            </div>
          )}

          {file && !result && (
            <button
              className="btn-analyze"
              disabled={loading}
              onClick={analyze}
            >
              {loading ? 'Analyzing…' : '✦ Highlight Important Sentences'}
            </button>
          )}

          {/* Progress */}
          {loading && (
            <div className="progress-block">
              <div className="progress-label">
                <div className="spinner" />
                Processing
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-step">{progressStep}</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-block">
              <svg viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="results-block">
              <div className="results-header">
                <h2 className="results-title">Analysis complete</h2>
                <span className="results-meta">
                  {result.processingTime}ms
                </span>
              </div>

              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-val">{result.highlightedSentences.length}</div>
                  <div className="stat-label">Highlighted</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">{result.totalSentences}</div>
                  <div className="stat-label">Total sentences</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">
                    {result.totalSentences > 0
                      ? Math.round((result.highlightedSentences.length / result.totalSentences) * 100)
                      : 0}%
                  </div>
                  <div className="stat-label">Signal ratio</div>
                </div>
              </div>

              <div className="preview-section">
                <div className="preview-header">
                  <div className="preview-dot" />
                  Text preview with highlights
                </div>
                <div className="preview-body">
                  {renderPreview(result.previewText, result.highlightedSentences)}
                </div>
              </div>

              <a href={result.downloadUrl} download="highlighted.pdf" className="btn-download">
                <svg viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Download Highlighted PDF
              </a>

              <button className="btn-reset" onClick={reset}>
                ← Analyze another document
              </button>
            </div>
          )}

          {/* How it works */}
          {!result && !loading && (
            <div className="how-it-works">
              <div className="section-label">How it works</div>
              <div className="steps-row">
                <div className="step">
                  <div className="step-num">01</div>
                  <div className="step-title">Upload your PDF</div>
                  <div className="step-desc">Drop any essay, paper, or document up to 10 MB.</div>
                </div>
                <div className="step">
                  <div className="step-num">02</div>
                  <div className="step-title">AI reads it</div>
                  <div className="step-desc">Claude analyzes every sentence for importance and relevance.</div>
                </div>
                <div className="step">
                  <div className="step-num">03</div>
                  <div className="step-title">Download highlights</div>
                  <div className="step-desc">Get a clean PDF with only the key ideas highlighted in yellow.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          AI PDF Highlighter — open source on <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a> · deployable on <a href="https://vercel.com" target="_blank" rel="noreferrer">Vercel</a> for free
        </div>
      </footer>
    </div>
  )
}
