import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { basename, dirname, join } from 'node:path'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from 'playwright'

const base = 'http://127.0.0.1:4173'
const output = new URL('../lighthouse-reports/', import.meta.url)
const playwrightChrome = chromium.executablePath()
const browserRoot = dirname(dirname(playwrightChrome))
const revision = basename(browserRoot).replace('chromium-', '')
const chromePath = process.platform === 'win32'
  ? join(dirname(browserRoot), `chromium_headless_shell-${revision}`, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe')
  : playwrightChrome
await mkdir(output, { recursive: true })

const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1'], { shell: true, stdio: 'inherit' })
const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(base)).ok) return } catch { /* O preview ainda está iniciando. */ }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Vite preview did not start in time.')
}
const median = (values) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)]
const summary = []

try {
  await waitForServer()
  for (const profile of ['desktop', 'mobile']) {
    for (const route of ['home', 'detail']) {
      const runs = []
      for (let iteration = 1; iteration <= 3; iteration++) {
        const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] })
        const url = route === 'home' ? `${base}/` : `${base}/nft/nft-1`
        const result = await lighthouse(url, {
          port: chrome.port,
          output: ['html', 'json'],
          logLevel: 'error',
          formFactor: profile,
          screenEmulation: profile === 'desktop'
            ? { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false }
            : { mobile: true, width: 390, height: 844, deviceScaleFactor: 2.75, disabled: false },
          throttlingMethod: 'simulate',
          throttling: profile === 'desktop'
            ? { rttMs: 40, throughputKbps: 10_240, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 1 }
            : undefined,
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        })
        await chrome.kill()
        if (!result) throw new Error(`Lighthouse returned no result for ${route}/${profile}`)
        const [html, json] = result.report
        await writeFile(new URL(`${route}-${profile}-${iteration}.html`, output), html)
        await writeFile(new URL(`${route}-${profile}-${iteration}.json`, output), json)
        const lhr = result.lhr
        runs.push({
          performance: Math.round((lhr.categories.performance.score ?? 0) * 100),
          accessibility: Math.round((lhr.categories.accessibility.score ?? 0) * 100),
          bestPractices: Math.round((lhr.categories['best-practices'].score ?? 0) * 100),
          seo: Math.round((lhr.categories.seo.score ?? 0) * 100),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        })
      }
      summary.push({ route, profile, ...Object.fromEntries(Object.keys(runs[0]).map((key) => [key, median(runs.map((run) => run[key]))])) })
    }
  }
  await writeFile(new URL('summary.json', output), JSON.stringify({ generatedAt: new Date().toISOString(), lighthouse: '12.8.2', runs: 3, results: summary }, null, 2))
  console.table(summary)
} finally {
  preview.kill()
}
