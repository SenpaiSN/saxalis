let worker: any = null;

// Scoring configuration (weights normalized roughly to importance). Modify as needed.
export const scoringConfig = {
  thresholds: {
    autoApply: 80, // >= autoApply → apply silently
    confirm: 50    // >= confirm → ask confirmation
  },
  amount: {
    // weights are integers matching the spec (they are additive and clamped to 0..100)
    weights: {
      keyword: 30,
      position: 20,
      size: 15,
      currency: 15,
      format: 10,
      unique: 10
    },
    multiplePenalty: -20
  },
  date: {
    weights: {
      keyword: 25,
      format: 20,
      plausible: 20,
      position: 15,
      unique: 20
    }
  },
  type: {
    // placeholder for future weights
    weights: {
      keyword: 35,
      history: 25,
      classifier: 25,
      structure: 15
    }
  }
};

// Simple mutex to ensure we don't run multiple recognize jobs concurrently on the same worker
const workerMutex = new (class {
  private _p: Promise<void> = Promise.resolve();
  lock(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>(res => { release = res; });
    const cur = this._p;
    this._p = cur.then(() => next);
    return cur.then(() => release);
  }
})();

async function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

function createCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Basic preprocessing: resize, grayscale, optional binarize and contrast tweak
async function preprocessImage(dataUrl: string, opts: { maxWidth?: number, binarize?: boolean, enhanceContrast?: boolean } = {}) {
  const img = await loadImageFromDataUrl(dataUrl);
  let width = img.width;
  let height = img.height;
  const maxWidth = opts.maxWidth || 1400;
  if (width > maxWidth) {
    const scale = maxWidth / width;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = width * height;
  const lum = new Float32Array(len);

  let sum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[j] = L;
    sum += L;
  }
  const mean = sum / len;

  // Optionally enhance contrast (simple linear stretch around mean)
  if (opts.enhanceContrast) {
    // compute min/max
    let min = 255, max = 0;
    for (let i = 0; i < len; i++) {
      const v = lum[i]; if (v < min) min = v; if (v > max) max = v;
    }
    const range = Math.max(1, max - min);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      let v = (lum[j] - min) * 255 / range;
      v = Math.max(0, Math.min(255, v));
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  } else if (opts.binarize) {
    // simple global threshold around mean with slight bias towards darker
    const threshold = mean * 0.93;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const v = lum[j] < threshold ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  } else {
    // keep grayscale
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const v = lum[j];
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function cropImage(dataUrl: string, bbox: { left: number, top: number, width: number, height: number }, padding = 10) {
  const img = await loadImageFromDataUrl(dataUrl);
  const sx = Math.max(0, bbox.left - padding);
  const sy = Math.max(0, bbox.top - padding);
  const sw = Math.min(img.width - sx, bbox.width + padding * 2);
  const sh = Math.min(img.height - sy, bbox.height + padding * 2);
  const canvas = createCanvas(sw, sh);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/jpeg', 0.95);
}

async function getWorker() {
  if (worker) return worker;
  const mod: any = await import('tesseract.js');
  // Some bundlers put exports on `default` — handle both shapes defensively
  const createWorker = mod.createWorker ?? mod.default?.createWorker ?? mod.default;
  if (typeof createWorker !== 'function') throw new Error('Unsupported tesseract.js import shape: createWorker function not found');

  // createWorker returns a Promise that resolves to the worker API — await it so we get the
  // actual worker object (which exposes methods like `loadLanguage`, `initialize`, `recognize`, etc.)
  worker = await createWorker({ logger: (m: any) => console.debug('[tesseract]', m) });
  // `load` is deprecated in newer tesseract.js versions and workers are pre-loaded; no need to call it
  // try to initialize french, but fallback to english if unavailable
  try {
    await worker.loadLanguage('fra');
    await worker.initialize('fra');
  } catch (e) {
    console.warn('Failed to initialize FRA language, falling back to ENG', e);
    try { await worker.loadLanguage('eng'); await worker.initialize('eng'); } catch (ee) { console.warn('Failed to init ENG', ee); }
  }
  return worker;
}

function findNumbers(text: string) {
  // Find numeric tokens with decimal or grouped separators. Return raw and numeric value
  const regex = /[+-]?\d{1,3}(?:[ ,\u00A0]\d{3})*(?:[.,]\d{1,2})?/g;
  const matches = Array.from(text.matchAll(regex)).map(m => m[0]);
  // Normalize to float
  const normalized = matches.map(raw => {
    const cleaned = raw.replace(/\u00A0/g, '').replace(/ /g, '').replace(/,/g, '.');
    const value = parseFloat(cleaned);
    return { raw, value: isFinite(value) ? value : NaN };
  }).filter(v => !isNaN(v.value));
  return normalized;
}

function scoreAmountCandidate(raw: string, value: number, fullText: string) {
  let score = 0;
  const lower = fullText.toLowerCase();
  const rawLower = raw.toLowerCase();

  // If the candidate includes a currency symbol, boost score
  if (/[€$£]|fcfa|xof/i.test(rawLower)) score += 30;

  // If the word 'total' or variants appear nearby, strong signal
  const idx = lower.indexOf(rawLower);
  if (idx >= 0) {
    const windowStart = Math.max(0, idx - 50);
    const window = lower.slice(windowStart, Math.min(lower.length, idx + rawLower.length + 50));
    if (/total|montant|net a payer|a payer|ttc|total à payer|total payable|somme due/.test(window)) score += 50;
    if (/subtotal|sous-total|sub total/.test(window)) score -= 10;
  }

  // Prefer numbers with 2 decimals
  if (/\d+[.,]\d{2}$/.test(raw)) score += 10;

  // Prefer larger absolute values (heuristic) — scale down by log to avoid dominating
  score += Math.log(Math.abs(value) + 1) * 2;

  // Bonus for numbers with a decimal point
  if (/[.,]\d{2}$/.test(raw)) score += 5;

  return score;
}

function guessMerchant(fullText: string) {
  // Merchant often at top — take the first non-empty line longer than 2 chars and not numeric
  const lines = fullText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    if (!/^[0-9\s,.€$£FCFAXOF-]{2,}$/.test(line) && line.length > 2) return line;
  }
  return '';
}

function parseDateAndTime(fullText: string) {
  // Return { dateISO?: 'YYYY-MM-DD', timeHHMM?: 'HH:mm', rawDate?: string }
  let dateISO: string | undefined;
  let timeHHMM: string | undefined;
  let rawDate: string | undefined;

  // Time regex: 24h formats like 17:29, 17h29, 17.29, also HH:MM with optional seconds
  const timeRegex = /\b([01]?\d|2[0-3])[\:h\.]{1}([0-5]\d)(?:[:h\.][0-5]\d)?\b/;
  const timeMatch = fullText.match(timeRegex);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2].padStart(2, '0');
    timeHHMM = `${hh}:${mm}`;
  }

  // Date regexes — try to capture components
  // YYYY-MM-DD
  let m = fullText.match(/\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (m) {
    const y = m[1]; const mo = m[2].padStart(2, '0'); const d = m[3].padStart(2, '0');
    dateISO = `${y}-${mo}-${d}`;
    rawDate = m[0];
    return { dateISO, timeHHMM, rawDate };
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  m = fullText.match(/\b(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})\b/);
  if (m) {
    const d = m[1].padStart(2, '0'); const mo = m[2].padStart(2, '0'); const y = m[3];
    dateISO = `${y}-${mo}-${d}`;
    rawDate = m[0];
    return { dateISO, timeHHMM, rawDate };
  }

  // DD/MM/YY or DD-MM-YY
  m = fullText.match(/\b(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2})\b/);
  if (m) {
    const d = m[1].padStart(2, '0'); const mo = m[2].padStart(2, '0'); const yy = m[3];
    const y = Number(yy) > 70 ? `19${yy}` : `20${yy}`;
    dateISO = `${y}-${mo}-${d}`;
    rawDate = m[0];
    return { dateISO, timeHHMM, rawDate };
  }

  // If none matched, try to find a loose pattern like '11 Jan 2026' (day monthname year)
  const monthNames = '(janv(?:ier)?|févr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|août|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|déc(?:embre)?)';
  m = fullText.match(new RegExp(`\b(\d{1,2})\s+${monthNames}\s+(\d{4})\b`, 'i'));
  if (m) {
    const d = m[1].padStart(2, '0');
    const moStr = m[2].toLowerCase();
    const monthsMap: any = { janv: '01', janvier: '01', févr: '02', fevr: '02', février: '02', mars: '03', avr: '04', avril: '04', mai: '05', juin: '06', juil: '07', juillet: '07', août: '08', aout: '08', sept: '09', septembre: '09', oct: '10', octobre: '10', nov: '11', novembre: '11', déc: '12', dec: '12', décembre: '12' };
    let mo = monthsMap[moStr.substring(0,4)] || monthsMap[moStr] || '01';
    const y = m[3];
    dateISO = `${y}-${mo}-${d}`;
    rawDate = m[0];
    return { dateISO, timeHHMM, rawDate };
  }

  return { dateISO, timeHHMM, rawDate };
}

export async function analyzeReceipt(dataUrl: string) {
  // Serialize OCR jobs to avoid concurrent recognizes on the same worker
  const release = await workerMutex.lock();
  try {
    const w = await getWorker();

    // 1) Low-res preprocess + recognize with TSV to get layout info
    const low = await preprocessImage(dataUrl, { maxWidth: 1000, binarize: false, enhanceContrast: true });
    const lowRes = await w.recognize(low, {}, { text: true, tsv: true });
    const fullText = String(lowRes.data?.text || '').trim();
    const tsv = String(lowRes.data?.tsv || '');

    // Parse tsv to extract word tokens with bounding boxes
    const rows = tsv.split('\n').slice(1).map(l => l.trim()).filter(Boolean).map(line => {
      const cols = line.split('\t');
      const text = cols.slice(11).join('\t');
      return {
        text: text || '',
        left: parseInt(cols[6] || '0', 10),
        top: parseInt(cols[7] || '0', 10),
        width: parseInt(cols[8] || '0', 10),
        height: parseInt(cols[9] || '0', 10),
        conf: parseFloat(cols[10] || '0')
      };
    });

    // helper: compute median line height for size signal
    const heights = rows.map(r => r.height).filter(h => h > 0);
    const medianHeight = heights.length ? heights.sort((a, b) => a - b)[Math.floor(heights.length / 2)] : 12;

    async function computeAmountSignalsForRow(r: any, allCount: number, imageHeight: number) {
      const raw = r.text;
      const cleaned = raw.replace(/\u00A0/g, '').replace(/ /g, '').replace(/,/g, '.');
      const value = parseFloat(cleaned.replace(/[^0-9.\-]/g, ''));

      // signal: keyword nearby
      const lower = fullText.toLowerCase();
      const rawLower = raw.toLowerCase();
      const idx = lower.indexOf(rawLower);
      let keyword = 0;
      if (idx >= 0) {
        const windowStart = Math.max(0, idx - 50);
        const window = lower.slice(windowStart, Math.min(lower.length, idx + rawLower.length + 50));
        keyword = /total|montant|net a payer|a payer|ttc|total à payer|total payable|somme due/.test(window) ? 1 : 0;
      }

      // position: normalized by image height (1 = bottom)
      const centerY = (r.top + (r.height || 0) / 2) || 0;
      const pos = imageHeight ? Math.max(0, Math.min(1, centerY / imageHeight)) : 0.5;
      const position = pos; // higher => closer to bottom

      // size: compare to median line height
      const sizeRatio = r.height ? r.height / Math.max(1, medianHeight) : 0.5;
      const size = Math.min(1, sizeRatio / 1.5);

      // currency / symbol
      const currency = /[€$£]|fcfa|xof/i.test(raw) ? 1 : 0;

      // format valid
      const format = /\d+[.,]\d{2}$/.test(raw) ? 1 : 0;

      // unique
      const unique = allCount === 1 ? 1 : 0;

      // compute weighted score from config
      const w = scoringConfig.amount.weights;
      // raw score is additive using integer weights (some signals are 0..1 multipliers)
      let rawScore = (keyword * w.keyword) + (position * w.position) + (size * w.size) + (currency * w.currency) + (format * w.format) + (unique * w.unique);
      if (allCount > 1) rawScore += scoringConfig.amount.multiplePenalty;
      // clamp to 0..100
      const score100 = Math.max(0, Math.min(100, Math.round(rawScore)));

      return {
        raw,
        value: isFinite(value) ? value : NaN,
        signals: { keyword, position, size, currency, format, unique },
        score100,
        bbox: { left: r.left, top: r.top, width: r.width, height: r.height },
        conf: r.conf
      };
    }

    const numberRegex = /[+-]?\d{1,3}(?:[ ,\u00A0]\d{3})*(?:[.,]\d{1,2})?/;

    let rawCandidates: Array<any> = rows.filter(r => numberRegex.test(r.text));
    const imgElement = await loadImageFromDataUrl(low);
    const imageHeight = imgElement.height || 1;

    // compute signals & scores for each row candidate
    let candidates: Array<any> = [];
    for (const r of rawCandidates) {
      const c = await computeAmountSignalsForRow(r, rawCandidates.length, imageHeight);
      if (!isNaN(c.value)) candidates.push(c);
    }

    // Fallback to text-only extraction if TSV produced nothing
    if (candidates.length === 0) {
      const numCandidates = findNumbers(fullText);
      candidates = numCandidates.map((n: any) => ({ raw: n.raw, value: n.value, signals: {}, score100: Math.round(scoreAmountCandidate(n.raw, n.value, fullText)), bbox:null }));
    }

    // Sort by score100
    candidates.sort((a: any, b: any) => (b.score100 || b.score || 0) - (a.score100 || a.score || 0));

    // 2) High-res pass on top candidate to confirm and refine
    if (candidates.length > 0 && candidates[0].bbox) {
      const top = candidates[0];
      try {
        const crop = await cropImage(low, top.bbox, 20);
        const highPre = await preprocessImage(crop, { maxWidth: 1200, binarize: true, enhanceContrast: true });

        try {
          // Narrow recognition to digits and symbols to reduce errors
          await w.setParameters?.({ tessedit_char_whitelist: '0123456789.,€$£' });
        } catch (e) {
          // setParameters may not be supported in some versions — ignore safely
        }

        const highRes = await w.recognize(highPre, {}, { text: true });
        const highText = String(highRes.data?.text || '').trim();
        const highNums = findNumbers(highText);
        if (highNums.length > 0) {
          const n = highNums.sort((a, b) => b.value - a.value)[0];
          top.raw = n.raw;
          top.value = n.value;
          // recompute signals for top using its text
          const recomputed = await computeAmountSignalsForRow({ text: n.raw, left: 0, top: 0, width: 0, height: 0 }, 1, (await loadImageFromDataUrl(highPre)).height);
          top.signals = recomputed.signals;
          top.score100 = recomputed.score100;
        }
      } catch (e) {
        console.warn('High-res refinement failed', e);
      }
    }

    candidates.sort((a: any, b: any) => (b.score100 || 0) - (a.score100 || 0));
    const best = candidates[0] || null;

    // Compute date score
    const parsedDate = parseDateAndTime(fullText);
    let dateScore100 = 0;
    if (parsedDate.dateISO) {
      const dSignals: any = {};
      dSignals.keyword = /date|facture du|payé le/i.test(fullText) ? 1 : 0;
      dSignals.format = /\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b|\b(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})\b/.test(parsedDate.rawDate || '') ? 1 : 0;
      try {
        const parsed = new Date(parsedDate.dateISO + 'T00:00:00');
        dSignals.plausible = parsed <= new Date() ? 1 : 0;
      } catch (e) { dSignals.plausible = 0; }
      dSignals.position = 0; // optional: could analyze row position if TSV available
      dSignals.unique = 1; // simple heuristic for now
      const wD = scoringConfig.date.weights;
      let rawD = (dSignals.keyword * wD.keyword) + (dSignals.format * wD.format) + (dSignals.plausible * wD.plausible) + (dSignals.position * wD.position) + (dSignals.unique * wD.unique);
      dateScore100 = Math.max(0, Math.min(100, Math.round(rawD)));
    }

    const merchantGuess = guessMerchant(fullText);

    const result = {
      text: fullText,
      merchant: merchantGuess,
      date: parsedDate.dateISO || null,
      time: parsedDate.timeHHMM || null,
      rawDate: parsedDate.rawDate || null,
      dateScore100,
      candidates,
      best
    };

    return result;
  } finally {
    release();
  }
}

// Suggest category & subcategory candidates using simple signals + transaction history
export async function suggestCategoryCandidates(fullText: string, merchant: string, categories: Array<{ id_category: number; name: string }>, subcategories: Array<{ id_subcategory: number; category_id: number; name: string }> = [], transactions: Array<any> = []) {
  // Normalize helper
  const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const merchantNorm = norm(merchant || fullText || '');

  // Map transactions frequency for merchant
  const merchantTx = transactions.filter(t => {
    const m = norm(t.merchant || t.note || t.categorie || '');
    return merchantNorm && m && (m.includes(merchantNorm) || merchantNorm.includes(m));
  });
  const freq: Record<number, number> = {};
  for (const tx of merchantTx) {
    const catName = String(tx.category || tx.categorie || tx.category_name || tx.catego || '').trim();
    // try to find matching category id from provided categories
    const found = categories.find(c => norm(c.name) === norm(catName) || norm(c.name).includes(norm(catName)) || norm(catName).includes(norm(c.name)));
    if (found) {
      freq[found.id_category] = (freq[found.id_category] || 0) + 1;
    }
  }

  const totalMatched = Object.values(freq).reduce((a, b) => a + b, 0) || merchantTx.length || 1;

  const candidates: Array<any> = [];
  const textNorm = norm(fullText || '');

  for (const c of categories) {
    const cname = String(c.name || '');
    const cnameNorm = norm(cname);

    // Signals
    const keyword = (cnameNorm && (textNorm.includes(cnameNorm) || merchantNorm.includes(cnameNorm))) ? 1 : 0;

    // history frequency normalized
    const histCount = freq[c.id_category] || 0;
    const history = histCount > 0 ? Math.min(1, histCount / totalMatched) : 0;

    // simple token overlap classifier
    const merchantTokens = merchantNorm.split(/\s+/).filter(Boolean);
    const cnameTokens = cnameNorm.split(/\s+/).filter(Boolean);
    const overlap = merchantTokens.filter(t => cnameTokens.includes(t)).length;
    const classifier = cnameTokens.length ? Math.min(1, overlap / cnameTokens.length) : 0;

    // structure signal: presence of any subcategory matching text (bonus)
    const relatedSubs = subcategories.filter(s => s.category_id === c.id_category);
    let structure = 0;
    for (const s of relatedSubs) {
      const sn = norm(s.name || '');
      if (textNorm.includes(sn) || merchantNorm.includes(sn)) { structure = 1; break; }
    }

    const w = scoringConfig.type.weights;
    let raw = (keyword * w.keyword) + (history * w.history) + (classifier * w.classifier) + (structure * w.structure);
    const score100 = Math.max(0, Math.min(100, Math.round(raw)));

    candidates.push({ id_category: c.id_category, name: cname, signals: { keyword, history, classifier, structure }, score100 });
  }

  candidates.sort((a, b) => b.score100 - a.score100);

  // For the top category, suggest subcategories using similar signals
  const top = candidates[0];
  let subCandidates: Array<any> = [];
  if (top) {
    const relSubs = subcategories.filter(s => s.category_id === top.id_category);
    for (const s of relSubs) {
      const sname = String(s.name || '');
      const sn = norm(sname);
      const keyword = (textNorm.includes(sn) || merchantNorm.includes(sn)) ? 1 : 0;
      const classifier = merchantNorm.split(/\s+/).filter(Boolean).filter(t => sn.split(/\s+/).includes(t)).length > 0 ? 1 : 0;
      const raw = (keyword * 0.7 + classifier * 0.3) * 100; // simple mix
      subCandidates.push({ id_subcategory: s.id_subcategory, name: sname, score100: Math.round(Math.max(0, Math.min(100, raw))), signals: { keyword, classifier } });
    }
    subCandidates.sort((a, b) => b.score100 - a.score100);
  }

  return { categoryCandidates: candidates, bestCategory: top || null, subCandidates, bestSubcategory: subCandidates[0] || null };
}
