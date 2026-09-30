// Forecast/observation alignment, error calculation and bust labelling.
import { VARIABLES, getConfig } from "./config.js";
import { regimeRiskOf } from "./demoData.js";
export const obsKey = (region, variable, time) => `${region}|${variable}|${new Date(time).toISOString()}`;
/** Validate raw forecast point; returns error string or null. */
export function validatePoint(p) {
  if (!p || typeof p !== "object") return "not an object";
  if (!Number.isInteger(p.leadDay) || p.leadDay < 1 || p.leadDay > 10) return "leadDay must be an integer 1-10";
  if (!(p.variable in VARIABLES)) return "unknown variable";
  if (!Number.isFinite(p.forecastValue)) return "forecastValue missing or non-numeric";
  if (!(p.latitude >= 5 && p.latitude <= 40 && p.longitude >= 65 && p.longitude <= 100)) return "coordinates outside India-focused domain";
  if (Number.isNaN(Date.parse(p.validTime))) return "invalid validTime";
  return null;
}
/** Align forecasts to observations by region + variable + valid time. Unmatched/invalid points are reported, never silently dropped. */
export function align(forecasts, observations) {
  const idx = new Map(observations.map((o) => [obsKey(o.region, o.variable, o.observationTime), o]));
  const seen = new Set(), pairs = [], rejected = [];
  for (const f of forecasts) {
    const bad = validatePoint(f);
    if (bad) { rejected.push({ forecastId: f?.forecastId, reason: bad }); continue; }
    if (seen.has(f.forecastId)) { rejected.push({ forecastId: f.forecastId, reason: "duplicate forecastId" }); continue; }
    seen.add(f.forecastId);
    const o = idx.get(obsKey(f.region, f.variable, f.validTime));
    if (!o || !Number.isFinite(o.observedValue)) { rejected.push({ forecastId: f.forecastId, reason: "no matching observation" }); continue; }
    pairs.push({ ...f, observedValue: o.observedValue });
  }
  return { pairs, rejected };
}
/** Error metrics for one aligned pair. normalizedError is relative to the variable tolerance. */
export function errorOf(pair, cfg = getConfig()) {
  const v = VARIABLES[pair.variable], absoluteError = Math.abs(pair.forecastValue - pair.observedValue);
  const normalizedError = absoluteError / v.tolerance;
  return { absoluteError: +absoluteError.toFixed(3), normalizedError: +normalizedError.toFixed(3), bustLabel: normalizedError >= cfg.bustThreshold ? 1 : 0 };
}
/** Composite error over variables for one region/lead/run (weighted mean of normalized errors). */
export function compositeError(errs) {
  const w = errs.reduce((s, e) => s + VARIABLES[e.variable].weight, 0);
  return w ? errs.reduce((s, e) => s + VARIABLES[e.variable].weight * e.normalizedError, 0) / w : 0;
}
/**
 * Builds the historical bust dataset in run order. histErrFreq uses ONLY earlier runs
 * (same region, lead, variable) so the label never leaks into its own feature.
 */
export function buildBustDataset(forecasts, observations, cfg = getConfig()) {
  const { pairs, rejected } = align(forecasts, observations);
  pairs.sort((a, b) => a.initialization.localeCompare(b.initialization));
  const hist = new Map(), rows = [];
  for (const p of pairs) {
    const k = `${p.region}|${p.leadDay}|${p.variable}`, h = hist.get(k) || { n: 0, b: 0 };
    const e = errorOf(p, cfg);
    rows.push({
      ...e, forecastId: p.forecastId, runId: p.runId, initialization: p.initialization, leadDay: p.leadDay, region: p.region,
      variable: p.variable, weatherRegime: p.weatherRegime, forecastValue: p.forecastValue, observedValue: p.observedValue,
      historicalFrequency: +((h.b + 0.5) / (h.n + 5)).toFixed(4), // smoothed prior, past runs only
      features: { ...p.features, histErrFreq: (h.b + 0.5) / (h.n + 5), leadDay: p.leadDay, regimeRisk: regimeRiskOf(p.weatherRegime) },
    });
    hist.set(k, { n: h.n + 1, b: h.b + e.bustLabel });
  }
  return { rows, rejected };
}
