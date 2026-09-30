// Local, dependency-free ML: L2 logistic regression (class-weighted) + deterministic baseline + metrics.
import { FEATURES } from "./config.js";
const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
const vec = (f) => FEATURES.map((k) => Number(f[k]));
export function fitScaler(rows) {
  const X = rows.map((r) => vec(r.features));
  const mean = FEATURES.map((_, j) => X.reduce((s, x) => s + x[j], 0) / X.length);
  const sd = FEATURES.map((_, j) => Math.sqrt(X.reduce((s, x) => s + (x[j] - mean[j]) ** 2, 0) / X.length) || 1);
  return { mean, sd };
}
export const standardize = (f, sc) => vec(f).map((v, j) => (v - sc.mean[j]) / sc.sd[j]);
export function trainLogistic(rows, { epochs = 500, lr = 0.3, l2 = 0.01 } = {}) {
  if (!rows.length) throw new Error("No training rows");
  const scaler = fitScaler(rows), X = rows.map((r) => standardize(r.features, scaler)), y = rows.map((r) => r.bustLabel);
  const pos = y.reduce((a, b) => a + b, 0), neg = y.length - pos;
  if (!pos || !neg) throw new Error("Training data contains a single class");
  const wPos = y.length / (2 * pos), wNeg = y.length / (2 * neg); // balanced class weights
  let w = new Array(FEATURES.length).fill(0), b = 0;
  for (let e = 0; e < epochs; e++) {
    const g = new Array(w.length).fill(0); let gb = 0;
    for (let i = 0; i < X.length; i++) {
      const p = sigmoid(b + X[i].reduce((s, v, j) => s + v * w[j], 0)), c = (y[i] ? wPos : wNeg) * (p - y[i]);
      for (let j = 0; j < w.length; j++) g[j] += c * X[i][j];
      gb += c;
    }
    for (let j = 0; j < w.length; j++) w[j] -= lr * (g[j] / X.length + l2 * w[j]);
    b -= lr * (gb / X.length);
  }
  // Balanced weighting inflates probabilities; correct the intercept by the prior log-odds shift so outputs stay calibrated to the base rate.
  const shift = Math.log((pos / neg) / (wPos * pos / (wNeg * neg)));
  return { type: "logistic-regression", scaler, weights: w, bias: b + shift, trainBustRate: pos / y.length };
}
export function predictLogistic(model, features) {
  const z = standardize(features, model.scaler);
  const contribs = z.map((v, j) => v * model.weights[j]);
  const logit = model.bias + contribs.reduce((a, c) => a + c, 0);
  return { probability: sigmoid(logit), logit, contributions: FEATURES.map((k, j) => ({ feature: k, z: z[j], contribution: contribs[j] })) };
}
/** Deterministic baseline: historical error frequency scaled by ensemble spread relative to the training median. */
export function makeBaseline(rows) {
  const s = rows.map((r) => r.features.ensembleSpread).sort((a, b) => a - b), med = s[Math.floor(s.length / 2)] || 1;
  return { type: "historical-frequency x ensemble-spread", medianSpread: med, predict: (f) => Math.min(0.99, Math.max(0.001, f.histErrFreq * (0.5 + f.ensembleSpread / med))) };
}
// ---- metrics ----
export function rocAuc(y, s) {
  const idx = s.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const ranks = new Array(s.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) ranks[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  const n1 = y.reduce((a, b) => a + b, 0), n0 = y.length - n1;
  if (!n1 || !n0) return null;
  return (y.reduce((sum, v, i) => sum + (v ? ranks[i] : 0), 0) - (n1 * (n1 + 1)) / 2) / (n1 * n0);
}
export function prAuc(y, s) { // average precision
  const order = s.map((v, i) => i).sort((a, b) => s[b] - s[a]), n1 = y.reduce((a, b) => a + b, 0);
  if (!n1) return null; let tp = 0, ap = 0;
  order.forEach((i, k) => { if (y[i]) { tp++; ap += tp / (k + 1); } });
  return ap / n1;
}
export function prf(y, s, t) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  y.forEach((v, i) => { const p = s[i] >= t; if (p && v) tp++; else if (p) fp++; else if (v) fn++; else tn++; });
  const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0;
  return { threshold: t, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, tp, fp, fn, tn };
}
export const brier = (y, p) => y.reduce((s, v, i) => s + (p[i] - v) ** 2, 0) / y.length;
export function calibration(y, p, bins = 10) {
  const out = Array.from({ length: bins }, (_, i) => ({ lo: i / bins, hi: (i + 1) / bins, n: 0, meanPredicted: 0, observedRate: 0 }));
  y.forEach((v, i) => { const b = out[Math.min(bins - 1, Math.floor(p[i] * bins))]; b.n++; b.meanPredicted += p[i]; b.observedRate += v; });
  return out.filter((b) => b.n).map((b) => ({ ...b, meanPredicted: b.meanPredicted / b.n, observedRate: b.observedRate / b.n }));
}
export function bestF1Threshold(y, s) {
  let best = { f1: -1, threshold: 0.5 };
  for (let t = 0.05; t <= 0.95; t += 0.01) { const m = prf(y, s, t); if (m.f1 > best.f1) best = m; }
  return best.threshold;
}
export function evaluate(y, p, threshold) {
  return { rocAuc: rocAuc(y, p), prAuc: prAuc(y, p), brier: brier(y, p), ...prf(y, p, threshold), baseRate: y.reduce((a, b) => a + b, 0) / y.length, n: y.length };
}
/** Chronological split by forecast run (no shuffling) so test runs are strictly later than training runs. */
export function splitByRun(rows, fr = [0.6, 0.2]) {
  const runs = [...new Set(rows.map((r) => r.runId))].sort(), a = Math.floor(runs.length * fr[0]), b = Math.floor(runs.length * (fr[0] + fr[1]));
  const sets = { train: new Set(runs.slice(0, a)), validation: new Set(runs.slice(a, b)), test: new Set(runs.slice(b)) };
  return Object.fromEntries(Object.entries(sets).map(([k, s]) => [k, rows.filter((r) => s.has(r.runId))]));
}
