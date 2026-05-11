/**
 * TruthLens — app.js
 * Handles all UI interactions, API calls to Claude, and result rendering.
 *
 * Dependencies: styles.css, index.html
 * API: Anthropic /v1/messages (Claude Sonnet 4)
 */

// ── Example articles ──────────────────────────────────────────────────────────
const EXAMPLES = [
  {
    label: "Clickbait",
    text: "SHOCKING SECRET the government doesn't want you to know: Scientists have PROVEN that chemtrails contain mind-control chemicals!! Thousands of whistleblowers coming forward with UNDENIABLE evidence. Share before this gets taken down!!!"
  },
  {
    label: "Health misinformation",
    text: "BREAKING: A miracle cure discovered deep in the Amazon rainforest can cure ALL cancers in just 3 days. Big Pharma is desperately trying to suppress this information. Doctors HATE him for revealing this one weird trick that cures terminal illness overnight."
  },
  {
    label: "Science news",
    text: "NASA's Perseverance rover has collected its 23rd rock sample on Mars, with scientists at JPL confirming the sample shows signs of ancient organic material. The findings, published in the journal Nature, suggest Mars may have had conditions suitable for microbial life approximately 3.5 billion years ago."
  },
  {
    label: "Political claim",
    text: "The president signed an executive order yesterday requiring all Americans to surrender their privately owned vehicles by 2026 as part of a new environmental initiative. The order, which bypasses Congress entirely, has already been challenged in federal court by 28 states."
  },
  {
    label: "Credible reporting",
    text: "The Federal Reserve raised interest rates by 25 basis points on Wednesday, bringing the federal funds rate to its highest level in 22 years. Fed Chair Jerome Powell said in a press conference that officials will continue to monitor inflation data before deciding on future rate adjustments. Markets responded with modest gains."
  }
];

// ── State ─────────────────────────────────────────────────────────────────────
let analysisMode = 'standard';
let historyData  = [];
let totalAnalyzed = 0;

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Load an example article into the textarea.
 * @param {number} idx - Index into EXAMPLES array
 */
function loadExample(idx) {
  const ta = document.getElementById('news-input');
  ta.value = EXAMPLES[idx].text;
  ta.classList.remove('error');
  ta.focus();
  ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Set analysis depth mode and update button UI.
 * @param {HTMLElement} el - The clicked mode button
 */
function setMode(el) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  analysisMode = el.dataset.mode;
}

/**
 * Populate textarea with a URL reference (full fetch not supported client-side).
 */
function handleUrlNote() {
  const url = document.getElementById('url-input').value.trim();
  if (url) {
    document.getElementById('news-input').value =
      `[Article URL: ${url}]\n\nPlease analyze the credibility of the news article at this URL.`;
    document.getElementById('url-input').value = '';
  }
}

// ── Core Analysis ─────────────────────────────────────────────────────────────

/**
 * Main entry point: validates input, calls Claude API, renders result.
 */
async function analyzeNews() {
  const input = document.getElementById('news-input');
  const text  = input.value.trim();

  if (!text || text.length < 15) {
    input.classList.add('error');
    input.focus();
    return;
  }

  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Analyzing…';

  const depthInstructions = {
    quick:    'Provide a concise 1-2 sentence summary for the analysis.',
    standard: 'Provide a thorough 3-sentence analysis with clear reasoning.',
    deep:     'Provide a comprehensive, detailed analysis covering linguistic patterns, specific evidence, and a critical breakdown of credibility.'
  };

  const prompt = buildPrompt(text, depthInstructions[analysisMode]);

  try {
    const result = await callClaudeAPI(prompt);
    totalAnalyzed++;
    document.getElementById('live-count').textContent = totalAnalyzed;
    addToHistory(text, result);
    renderResult(result);
  } catch (err) {
    renderError(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-shield-search"></i> Analyze credibility';
  }
}

/**
 * Build the structured prompt for Claude.
 * @param {string} text - News text to analyze
 * @param {string} depthInstruction - Depth-specific instruction string
 * @returns {string} Full prompt string
 */
function buildPrompt(text, depthInstruction) {
  return `You are TruthLens, an expert fake news detection AI trained in NLP, media literacy, and computational journalism. Analyze the following news text for credibility.

TEXT TO ANALYZE:
"""
${text}
"""

ANALYSIS DEPTH: ${analysisMode.toUpperCase()}
${depthInstruction}

Respond ONLY with a valid JSON object — no markdown, no backticks, no preamble. Exact structure:
{
  "verdict": "REAL" | "FAKE" | "UNCERTAIN",
  "confidence": <integer 0-100>,
  "summary": "<plain-language explanation>",
  "signals": {
    "emotional_language": <0-100>,
    "source_credibility": <0-100>,
    "factual_consistency": <0-100>,
    "clickbait_score": <0-100>,
    "logical_coherence": <0-100>,
    "bias_indicators": <0-100>
  },
  "red_flags": ["<flag1>", "<flag2>"],
  "positive_signals": ["<signal1>", "<signal2>"],
  "recommendation": "<one actionable sentence>"
}`;
}

/**
 * Call the Anthropic Claude API.
 * @param {string} prompt - Prompt to send
 * @returns {Promise<Object>} Parsed JSON result from Claude
 */
async function callClaudeAPI(prompt) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!resp.ok) throw new Error(`API error: ${resp.status}`);

  const data     = await resp.json();
  const rawText  = data.content.map(b => b.text || '').join('');
  const cleaned  = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

/** Verdict theme configuration */
const THEMES = {
  REAL: {
    headerBg: '#E1F5EE', iconBg: '#9FE1CB', iconColor: '#085041',
    eyebrowColor: '#1D9E75', textColor: '#04342C',
    title: 'Credible News', pillBg: '#9FE1CB', pillColor: '#085041',
    icon: 'ti-circle-check'
  },
  FAKE: {
    headerBg: '#FCEBEB', iconBg: '#F7C1C1', iconColor: '#791F1F',
    eyebrowColor: '#E24B4A', textColor: '#501313',
    title: 'Likely Fake News', pillBg: '#F7C1C1', pillColor: '#791F1F',
    icon: 'ti-circle-x'
  },
  UNCERTAIN: {
    headerBg: '#FAEEDA', iconBg: '#FAC775', iconColor: '#633806',
    eyebrowColor: '#BA7517', textColor: '#412402',
    title: 'Uncertain — Verify', pillBg: '#FAC775', pillColor: '#633806',
    icon: 'ti-circle-question'
  }
};

/** NLP signal display definitions */
const SIGNAL_DEFS = [
  { key: 'emotional_language',  label: 'Emotional language',  invert: true  },
  { key: 'source_credibility',  label: 'Source credibility',  invert: false },
  { key: 'factual_consistency', label: 'Factual consistency', invert: false },
  { key: 'clickbait_score',     label: 'Clickbait score',     invert: true  },
  { key: 'logical_coherence',   label: 'Logical coherence',   invert: false },
  { key: 'bias_indicators',     label: 'Bias indicators',     invert: true  }
];

/**
 * Determine bar color based on value and inversion flag.
 * @param {number} v - Raw signal value (0-100)
 * @param {boolean} inv - Whether to invert interpretation
 * @returns {string} CSS hex color
 */
function barColor(v, inv) {
  const s = inv ? 100 - v : v;
  return s >= 68 ? '#1D9E75' : s >= 40 ? '#BA7517' : '#E24B4A';
}

/**
 * Render the full analysis result into #result-area.
 * @param {Object} r - Parsed result object from Claude
 */
function renderResult(r) {
  const area = document.getElementById('result-area');
  const t    = THEMES[r.verdict] || THEMES.UNCERTAIN;

  const signalsHTML = SIGNAL_DEFS.map(s => {
    const raw  = r.signals?.[s.key] ?? 50;
    const disp = s.invert ? 100 - raw : raw;
    const col  = barColor(raw, s.invert);
    return `<div class="signal-card">
      <div class="signal-label">${s.label}</div>
      <div class="signal-bar-track"><div class="signal-bar-fill" style="width:0%;background:${col}" data-target="${disp}"></div></div>
      <div class="signal-value" style="color:${col}">${disp}<span style="font-size:10px;opacity:0.6">/100</span></div>
    </div>`;
  }).join('');

  const redHTML = (r.red_flags || []).map(f =>
    `<span class="tag" style="background:#FCEBEB;color:#791F1F;border-color:#F0959580"><i class="ti ti-alert-triangle"></i>${f}</span>`
  ).join('');

  const posHTML = (r.positive_signals || []).map(s =>
    `<span class="tag" style="background:#E1F5EE;color:#085041;border-color:#5DCAA580"><i class="ti ti-check"></i>${s}</span>`
  ).join('');

  area.innerHTML = `
    <div class="result-wrap fade-in">
      <div class="verdict-header" style="background:${t.headerBg};border:0.5px solid ${t.iconBg};border-radius:var(--radius-lg) var(--radius-lg) 0 0">
        <div class="verdict-icon-wrap" style="background:${t.iconBg}">
          <i class="ti ${t.icon}" style="font-size:26px;color:${t.iconColor}"></i>
        </div>
        <div class="verdict-text">
          <div class="verdict-eyebrow" style="color:${t.eyebrowColor}">Verdict</div>
          <div class="verdict-heading" style="color:${t.textColor}">${t.title}</div>
        </div>
        <div class="verdict-confidence" style="background:${t.pillBg};color:${t.pillColor}">${r.confidence}% confidence</div>
      </div>
      <div class="result-body">
        <p class="summary-text">${r.summary || ''}</p>
        <div class="signals-section-title">NLP signal breakdown</div>
        <div class="signals-grid">${signalsHTML}</div>
        ${redHTML ? `<div class="tags-section"><div class="tags-title"><i class="ti ti-alert-triangle" style="font-size:13px;color:#E24B4A"></i>Red flags</div><div class="tags-row">${redHTML}</div></div>` : ''}
        ${posHTML ? `<div class="tags-section" style="margin-top:10px"><div class="tags-title"><i class="ti ti-circle-check" style="font-size:13px;color:#1D9E75"></i>Positive signals</div><div class="tags-row">${posHTML}</div></div>` : ''}
        ${r.recommendation ? `<div class="recommendation"><i class="ti ti-bulb"></i><span>${r.recommendation}</span></div>` : ''}
      </div>
    </div>`;

  // Animate signal bars after DOM paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('.signal-bar-fill').forEach(b => {
        b.style.width = b.getAttribute('data-target') + '%';
      });
    }, 80);
  });

  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Render an error message into #result-area.
 * @param {string} msg - Error message string
 */
function renderError(msg) {
  document.getElementById('result-area').innerHTML = `
    <div class="error-box fade-in">
      <i class="ti ti-wifi-off"></i>
      <span><strong>Analysis failed.</strong> Unable to reach the AI engine. Check your API key and try again.
      ${msg ? `<br><small style="opacity:0.7;font-family:var(--font-mono)">${msg}</small>` : ''}</span>
    </div>`;
}

// ── History ───────────────────────────────────────────────────────────────────

/**
 * Add a completed analysis to the local history and re-render.
 * @param {string} text   - Original article text
 * @param {Object} result - Claude result object
 */
function addToHistory(text, result) {
  const short = text.replace(/\s+/g, ' ').trim().slice(0, 70) + (text.length > 70 ? '…' : '');
  historyData.unshift({ short, verdict: result.verdict, confidence: result.confidence });
  if (historyData.length > 6) historyData.pop();
  renderHistory();
}

/** Re-render the history sidebar list. */
function renderHistory() {
  const list = document.getElementById('history-list');
  if (!historyData.length) {
    list.innerHTML = '<div class="history-empty">No analyses yet.</div>';
    return;
  }

  const DOT   = { REAL: '#1D9E75', FAKE: '#E24B4A', UNCERTAIN: '#BA7517' };
  const BADGE = {
    REAL:      'background:#E1F5EE;color:#085041',
    FAKE:      'background:#FCEBEB;color:#791F1F',
    UNCERTAIN: 'background:#FAEEDA;color:#633806'
  };

  list.innerHTML = historyData.map((h, i) =>
    `<div class="hist-item" onclick="reloadHistory(${i})">
      <div class="hist-dot" style="background:${DOT[h.verdict] || '#888'}"></div>
      <div class="hist-text">${h.short}</div>
      <div class="hist-badge" style="${BADGE[h.verdict]}">${h.verdict}</div>
      <div class="hist-pct">${h.confidence}%</div>
    </div>`
  ).join('');
}

/**
 * Scroll back to input when a history item is clicked.
 * @param {number} idx - History index (unused currently, reserved for expansion)
 */
function reloadHistory(idx) {
  document.getElementById('news-input').scrollIntoView({ behavior: 'smooth' });
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderHistory();

// Keyboard shortcut: Ctrl/Cmd + Enter to analyze
document.getElementById('news-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyzeNews();
});
