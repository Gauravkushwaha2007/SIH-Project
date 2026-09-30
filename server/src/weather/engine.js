// Forecast reliability engine: demo provider -> verification -> features -> model -> predictions -> explanations.
import { FEATURES, REGIONS, VARIABLES, LEAD_DAYS, getConfig, riskLevel, confidenceCategory } from "./config.js";
import { buildDemoDataset, regimeRiskOf } from "./demoData.js";
import { buildBustDataset } from "./verification.js";
import { trainLogistic, predictLogistic, makeBaseline, evaluate, bestF1Threshold, splitByRun, calibration } from "./model.js";
import { explain } from "./explanation.js";

/** Provider contract. Only DemoForecastProvider is connected in this prototype. */
export class DemoForecastProvider {
  name = "DemoForecastProvider"; status = "Connected — simulated data";
  load(cfg) { return buildDemoDataset({ seed: cfg.demoSeed }); }
}
export const PROVIDERS = [
  { name: "DemoForecastProvider", status: "Connected — simulated data" },
  { name: "HistoricalForecastProvider", status: "Not connected" },
  { name: "ObservationProvider", status: "Not connected" },
];
const round = (x, d = 3) => +x.toFixed(d);
const regionName = Object.fromEntries(REGIONS.map((r) => [r.id, r.name]));

export function buildEngine(cfg = getConfig(), provider = new DemoForecastProvider()) {
  const data = provider.load(cfg), current = data.runs.find((r) => r.current);
  const pastRuns = new Set(data.runs.filter((r) => !r.current).map((r) => r.id));
  const { rows: allRows, rejected } = buildBustDataset(data.forecasts.filter((f) => pastRuns.has(f.runId)), data.observations, cfg);
  // The current run is treated as UNVERIFIED: never used for training or evaluation.
  const split = splitByRun(allRows), model = trainLogistic(split.train), baseline = makeBaseline(split.train);
  const score = (rs, f) => rs.map((r) => f(r.features)), y = (rs) => rs.map((r) => r.bustLabel);
  const mlVal = score(split.validation, (f) => predictLogistic(model, f).probability), blVal = score(split.validation, baseline.predict);
  const mlT = bestF1Threshold(y(split.validation), mlVal), blT = bestF1Threshold(y(split.validation), blVal);
  const mlTest = score(split.test, (f) => predictLogistic(model, f).probability), blTest = score(split.test, baseline.predict);
  const metrics = {
    label: "Prototype evaluation on demo dataset (simulated data; not operational skill)",
    samples: { train: split.train.length, validation: split.validation.length, test: split.test.length },
    classDistribution: Object.fromEntries(Object.entries(split).map(([k, rs]) => { const b = rs.reduce((s, r) => s + r.bustLabel, 0); return [k, { bust: b, nonBust: rs.length - b, rate: round(b / rs.length, 4) }]; })),
    split: "Chronological by forecast run (60/20/20); decision threshold tuned on validation only",
    baseline: { name: baseline.type, ...evaluate(y(split.test), blTest, blT) },
    ml: { name: "Logistic regression (L2, balanced class weights)", ...evaluate(y(split.test), mlTest, mlT) },
    calibration: calibration(y(split.test), mlTest),
    weights: Object.fromEntries(FEATURES.map((k, j) => [k, round(model.weights[j])])),
  };
  // Current-run features: histErrFreq from ALL verified history.
  const hist = new Map();
  for (const r of allRows) { const k = `${r.region}|${r.leadDay}|${r.variable}`, h = hist.get(k) || { n: 0, b: 0 }; hist.set(k, { n: h.n + 1, b: h.b + r.bustLabel }); }
  const predict = (p, run) => {
    const h = hist.get(`${p.region}|${p.leadDay}|${p.variable}`) || { n: 0, b: 0 };
    const features = { ...p.features, histErrFreq: (h.b + 0.5) / (h.n + 5), leadDay: p.leadDay, regimeRisk: regimeRiskOf(p.weatherRegime) };
    const pr = predictLogistic(model, features), prob = pr.probability, bl = baseline.predict(features);
    return { runId: run.id, region: p.region, regionName: regionName[p.region], leadDay: p.leadDay, variable: p.variable, weatherRegime: p.weatherRegime,
      bustProbability: round(prob), confidence: round(1 - prob), riskLevel: riskLevel(prob, cfg.riskBands), confidenceCategory: confidenceCategory(1 - prob),
      baselineProbability: round(bl), historicalErrorFrequency: round(features.histErrFreq), forecastValue: p.forecastValue, _pr: pr, _features: features };
  };
  const predictions = data.forecasts.filter((f) => f.runId === current.id).map((p) => predict(p, current));
  // Expected normalized error: mean historical normalized error for the same cell (context only).
  const cellErr = new Map();
  for (const r of allRows) { const k = `${r.region}|${r.leadDay}|${r.variable}`, c = cellErr.get(k) || { s: 0, n: 0 }; cellErr.set(k, { s: c.s + r.normalizedError, n: c.n + 1 }); }
  for (const p of predictions) { const c = cellErr.get(`${p.region}|${p.leadDay}|${p.variable}`); p.expectedNormalizedError = c ? round(c.s / c.n) : null; }
  return { cfg, data, current, rows: allRows, rejected, split, model, baseline, metrics, predictions, predictFn: predict, providers: PROVIDERS, explain };
}

const strip = ({ _pr, _features, ...p }) => p;
/** Region x lead summary for a variable (or all variables, averaging probabilities). */
export function summarize(engine, { variable = null } = {}) {
  const ps = engine.predictions.filter((p) => !variable || p.variable === variable), cells = [];
  for (const region of REGIONS) for (const leadDay of LEAD_DAYS) {
    const g = ps.filter((p) => p.region === region.id && p.leadDay === leadDay); if (!g.length) continue;
    const prob = Math.max(...g.map((p) => p.bustProbability)), mean = g.reduce((s, p) => s + p.bustProbability, 0) / g.length;
    const top = g.reduce((a, b) => (b.bustProbability > a.bustProbability ? b : a));
    cells.push({ region: region.id, regionName: region.name, lat: region.lat, lon: region.lon, leadDay, bustProbability: round(prob), meanBustProbability: round(mean), confidence: round(1 - prob),
      riskLevel: riskLevel(prob, engine.cfg.riskBands), confidenceCategory: confidenceCategory(1 - prob), weatherRegime: g[0].weatherRegime, dominantVariable: top.variable, historicalErrorFrequency: top.historicalErrorFrequency });
  }
  return cells;
}
export function timeline(engine, opts) {
  const cells = summarize(engine, opts);
  return LEAD_DAYS.map((d) => {
    const c = cells.filter((x) => x.leadDay === d), meanProb = c.reduce((s, x) => s + x.bustProbability, 0) / c.length;
    const worst = c.reduce((a, b) => (b.bustProbability > a.bustProbability ? b : a));
    const cat = riskLevel(meanProb, engine.cfg.riskBands);
    return { leadDay: d, confidence: round(1 - meanProb), bustProbability: round(meanProb), expectedErrorCategory: cat, riskRegionCount: c.filter((x) => x.riskLevel === "High" || x.riskLevel === "Very high").length, majorReason: worst ? `${worst.regionName}: ${worst.weatherRegime}` : "" };
  });
}
export function predictOne(engine, { leadDay, region, variable }) {
  const p = engine.predictions.find((x) => x.leadDay === leadDay && x.region === region && x.variable === variable);
  if (!p) return null;
  const ex = engine.explain(p._pr, { regime: p.weatherRegime });
  return { ...strip(p), topFactors: ex.modelDerived.map((f) => ({ feature: f.feature, impact: f.impact })), explanation: ex, thresholdNote: engine.cfg.label };
}
export const publicPredictions = (engine) => engine.predictions.map(strip);
export { VARIABLES };
