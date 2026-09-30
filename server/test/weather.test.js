import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoDataset } from "../src/weather/demoData.js";
import { align, errorOf, buildBustDataset, validatePoint, compositeError } from "../src/weather/verification.js";
import { buildEngine, summarize, timeline, predictOne } from "../src/weather/engine.js";
import { getConfig, riskLevel, confidenceCategory, VARIABLES } from "../src/weather/config.js";
import { rocAuc, prAuc, splitByRun } from "../src/weather/model.js";
import { historicalSummary, runsList } from "../src/weather/api.js";

const engine = buildEngine();
const pt = (o = {}) => ({ forecastId: "f1", leadDay: 5, variable: "rainfall", forecastValue: 30, latitude: 22, longitude: 78, validTime: "2026-09-10T00:00:00Z", region: "central", ...o });

test("demo dataset is deterministic and labelled simulated", () => {
  const a = buildDemoDataset({ historicalRuns: 5 }), b = buildDemoDataset({ historicalRuns: 5 });
  assert.deepEqual(a.forecasts.slice(0, 20), b.forecasts.slice(0, 20));
  assert.equal(a.meta.simulated, true);
  assert.ok(a.observations.every((o) => /Simulated/.test(o.source)));
});
test("forecast/observation alignment and rejection reporting", () => {
  const obs = [{ region: "central", variable: "rainfall", observationTime: "2026-09-10T00:00:00Z", observedValue: 5 }];
  const { pairs, rejected } = align([pt(), pt({ forecastId: "f1" }), pt({ forecastId: "f2", validTime: "2026-09-11T00:00:00Z" }), pt({ forecastId: "f3", leadDay: 11 }), pt({ forecastId: "f4", latitude: 80 }), pt({ forecastId: "f5", forecastValue: NaN })], obs);
  assert.equal(pairs.length, 1);
  assert.deepEqual(rejected.map((r) => r.reason).sort(), ["coordinates outside India-focused domain", "duplicate forecastId", "forecastValue missing or non-numeric", "leadDay must be an integer 1-10", "no matching observation"]);
});
test("error calculation and bust threshold handling", () => {
  const p = { variable: "rainfall", forecastValue: 45, observedValue: 20 }; // |25| / tolerance 20 = 1.25
  assert.equal(errorOf(p, { bustThreshold: 1 }).bustLabel, 1);
  assert.equal(errorOf(p, { bustThreshold: 1.5 }).bustLabel, 0);
  const expectedWeight = VARIABLES.rainfall.weight / (VARIABLES.rainfall.weight + VARIABLES.wind.weight);
  assert.ok(Math.abs(compositeError([{ variable: "rainfall", normalizedError: 1 }, { variable: "wind", normalizedError: 0 }]) - expectedWeight) < 1e-9);
  assert.equal(getConfig({ BUST_THRESHOLD: "abc" }).bustThreshold, 1);
  assert.equal(getConfig({ BUST_THRESHOLD: "99" }).bustThreshold, 3);
  assert.equal(validatePoint(pt({ variable: "snow" })), "unknown variable");
});
test("histErrFreq uses only earlier runs (no label leakage)", () => {
  const d = buildDemoDataset({ historicalRuns: 6 }), { rows } = buildBustDataset(d.forecasts, d.observations);
  const first = rows.filter((r) => r.runId === d.runs[0].id);
  assert.ok(first.every((r) => Math.abs(r.historicalFrequency - 0.5 / 5) < 1e-9));
});
test("chronological split: test runs are strictly later than train", () => {
  const s = engine.split, max = (rs) => rs.map((r) => r.runId).sort().at(-1), min = (rs) => rs.map((r) => r.runId).sort()[0];
  assert.ok(max(s.train) < min(s.validation) && max(s.validation) < min(s.test));
  assert.ok(!engine.rows.some((r) => r.runId === engine.current.id), "current run must be unverified");
});
test("probabilities and confidence are in range and complementary", () => {
  assert.equal(engine.predictions.length, 12 * 10 * Object.keys(VARIABLES).length);
  for (const p of engine.predictions) {
    assert.ok(p.bustProbability >= 0 && p.bustProbability <= 1);
    assert.ok(Math.abs(p.bustProbability + p.confidence - 1) < 1e-2);
  }
});
test("risk categorisation is configurable", () => {
  assert.equal(riskLevel(0.05), "Low"); assert.equal(riskLevel(0.3), "High"); assert.equal(riskLevel(0.6), "Very high");
  assert.equal(riskLevel(0.3, { moderate: 0.5, high: 0.7, veryHigh: 0.9 }), "Low");
  assert.equal(confidenceCategory(0.1), "Very low confidence");
});
test("metrics are computed on held-out data and are not fabricated", () => {
  const m = engine.metrics;
  assert.match(m.label, /demo dataset/);
  assert.equal(m.samples.train + m.samples.validation + m.samples.test, engine.rows.length);
  assert.ok(m.ml.rocAuc > 0.5 && m.ml.brier < m.ml.baseRate * (1 - m.ml.baseRate), "ML should beat a constant base-rate predictor on Brier");
  assert.equal(rocAuc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]), 0.75);
  assert.equal(prAuc([1, 0], [0.9, 0.1]), 1);
  assert.equal(rocAuc([0, 0], [0.1, 0.2]), null);
});
test("timeline shows reliability degrading with lead time", () => {
  const t = timeline(engine);
  assert.equal(t.length, 10);
  assert.ok(t[9].confidence < t[0].confidence);
  assert.ok(t.every((x) => x.majorReason && typeof x.riskRegionCount === "number"));
});
test("summaries filter by variable and predictions are deterministic", () => {
  const rain = summarize(engine, { variable: "rainfall" });
  assert.equal(rain.length, 120);
  const a = predictOne(engine, { leadDay: 5, region: "central", variable: "rainfall" }), b = predictOne(buildEngine(), { leadDay: 5, region: "central", variable: "rainfall" });
  assert.equal(a.bustProbability, b.bustProbability);
  assert.equal(predictOne(engine, { leadDay: 5, region: "atlantis", variable: "rainfall" }), null);
});
test("explanations come from model features and keep interpretation separate", () => {
  const p = predictOne(engine, { leadDay: 5, region: "central", variable: "rainfall" }), ex = p.explanation;
  assert.ok(ex.modelDerived.length > 0);
  const feats = new Set(engine.model.weights.length && ["ensembleSpread","precipGradient","pressureTendency","instability","tempAnomaly","windAnomaly","humidityAnomaly","histErrFreq","leadDay","regimeRisk"]);
  assert.ok(ex.modelDerived.every((f) => feats.has(f.feature) && f.contributionLogit > 0));
  assert.ok(ex.meteorologicalInterpretation.every((m) => ex.modelDerived.some((f) => f.feature === m.feature)), "interpretation only for model-supported factors");
  assert.match(ex.note, /not causal/);
  // contributions + bias reproduce the logit exactly
  const sum = engine.predictions[0]._pr.contributions.reduce((s, c) => s + c.contribution, engine.model.bias);
  assert.ok(Math.abs(sum - engine.predictions[0]._pr.logit) < 1e-9);
});
test("providers other than demo are marked not connected", () => {
  assert.deepEqual(engine.providers.filter((p) => p.status === "Not connected").map((p) => p.name), ["HistoricalForecastProvider", "ObservationProvider"]);
});
test("historicalSummary provides regimes, regions, and regional series", () => {
  const summary = historicalSummary(engine, { region: "central", variable: "rainfall", leadDay: 5 });
  assert.ok(Array.isArray(summary.byLead) && summary.byLead.length === 10);
  assert.ok(Array.isArray(summary.byRegime) && summary.byRegime.length > 0);
  assert.ok(Array.isArray(summary.byRegion) && summary.byRegion.length === 12);
  assert.ok(Array.isArray(summary.series) && summary.series.length > 0);
  assert.ok(summary.series.every((s) => typeof s.forecastValue === "number" && typeof s.observedValue === "number"));
});
test("runsList returns available historical forecast runs", () => {
  const list = runsList(engine);
  assert.ok(Array.isArray(list.runs) && list.runs.length > 0);
  assert.equal(list.currentRunId, engine.current.id);
});
