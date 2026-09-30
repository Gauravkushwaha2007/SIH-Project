// Deterministic SIMULATED dataset. Structure mirrors real NWP verification data; values are synthetic.
import { REGIONS, VARIABLES, REGIMES, LEAD_DAYS } from "./config.js";
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
const regimeRisk = {
  Normal: 0, "Monsoon Depression": 0.8, "Heavy Rainfall": 0.9, "Cyclonic System": 1,
  "Western Disturbance": 0.6, "Heat Wave": 0.5, "Active Monsoon": 0.4, "Break Monsoon": 0.3, "Other / Unknown": 0.35,
};
/** Scripted scenario for the CURRENT demo run only: an active system over central/eastern India. Not real weather. */
const CURRENT_SCENARIO = {
  central: ["Monsoon Depression", 1.25], bayofbengal: ["Cyclonic System", 1.4], eastcoast: ["Monsoon Depression", 1.05],
  gangetic: ["Active Monsoon", 0.75], himalaya: ["Western Disturbance", 0.7], northwest: ["Normal", 0.1], tamilnadu: ["Normal", 0.15], peninsula: ["Normal", 0.2],
};
export const regimeRiskOf = (g) => regimeRisk[g] ?? 0.35;
function pickRegime(r, region, month) {
  const monsoon = month >= 6 && month <= 9, x = r();
  if (region.id === "himalaya" || region.id === "northwest") return x < (monsoon ? 0.08 : 0.3) ? "Western Disturbance" : x < 0.4 ? "Heat Wave" : "Normal";
  if (region.id === "bayofbengal" || region.id === "eastcoast") return x < (monsoon ? 0.25 : 0.1) ? "Monsoon Depression" : x < 0.33 ? "Cyclonic System" : x < 0.55 ? "Active Monsoon" : "Normal";
  if (region.id === "westcoast" || region.id === "arabiansea") return x < 0.22 ? "Heavy Rainfall" : x < 0.4 ? "Active Monsoon" : x < 0.47 ? "Cyclonic System" : "Normal";
  return x < 0.16 ? "Monsoon Depression" : x < 0.3 ? "Active Monsoon" : x < 0.4 ? "Break Monsoon" : x < 0.5 ? "Heavy Rainfall" : x < 0.53 ? "Other / Unknown" : "Normal";
}
/** Builds runs (00 UTC, daily) and per-region/lead/variable forecast+observation pairs. The last run is the "current" run. */
export function buildDemoDataset({ seed = 26079, historicalRuns = 90, end = "2026-09-28" } = {}) {
  const truth = new Map(), r = rng(seed), endDate = new Date(end + "T00:00:00Z"), runs = [], points = [];
  for (let i = 0; i <= historicalRuns; i++) {
    const init = new Date(endDate.getTime() - (historicalRuns - i) * 86400000);
    const id = `run-${init.toISOString().slice(0, 10)}T00`;
    runs.push({ id, initialization: init.toISOString(), current: i === historicalRuns, demo: true });
    // Slowly varying synoptic state shared across nearby regions -> realistic autocorrelation.
    for (const region of REGIONS) {
      let regime = pickRegime(r, region, init.getUTCMonth() + 1), rr = regimeRisk[regime];
      let stress = Math.max(0, 0.5 * rr + 0.35 * r() + 0.25 * gauss(r));
      const sc = i === historicalRuns && CURRENT_SCENARIO[region.id]; // scripted, clearly-labelled demo scenario
      if (sc) { regime = sc[0]; rr = regimeRisk[regime]; stress = sc[1] + 0.05 * gauss(r); }
      for (const lead of LEAD_DAYS) {
        const spread = Math.max(0.02, (0.06 * lead + 0.18) * (0.8 + 0.9 * stress) * Math.exp(0.15 * gauss(r)));
        const f = {
          ensembleSpread: +spread.toFixed(3),
          precipGradient: +Math.max(0, 0.25 + 0.7 * stress + 0.02 * lead + 0.15 * gauss(r)).toFixed(3),
          pressureTendency: +Math.abs(0.8 * stress + 0.1 * lead * r() + 0.2 * gauss(r)).toFixed(3),
          instability: +Math.max(0, 0.3 + 0.6 * stress + 0.2 * gauss(r)).toFixed(3),
          tempAnomaly: +(gauss(r) * (0.6 + 0.4 * rr)).toFixed(3),
          windAnomaly: +(gauss(r) * (0.5 + 0.6 * stress)).toFixed(3),
          humidityAnomaly: +(gauss(r) * 0.8).toFixed(3),
        };
        // Latent error scale: grows with lead time, spread, gradients and instability.
        const scale = 0.08 + 0.015 * lead + 0.55 * f.ensembleSpread + 0.3 * f.precipGradient + 0.25 * f.instability + 0.2 * f.pressureTendency;
        for (const [variable, v] of Object.entries(VARIABLES)) {
          const validTime = new Date(init.getTime() + lead * 86400000).toISOString();
          const key = `${region.id}|${variable}|${validTime}`;
          if (!truth.has(key)) {
            const t = variable === "rainfall" ? Math.max(0, 6 + 12 * Math.abs(gauss(r)) * (0.5 + rr))
                    : variable === "temperature" ? 30 + 4 * gauss(r)
                    : variable === "wind" ? Math.max(0.3, 4 + 2 * Math.abs(gauss(r)))
                    : +(1010 - 8 * rr + 3 * gauss(r)).toFixed(2);
            truth.set(key, { observationTime: validTime, latitude: region.lat, longitude: region.lon, region: region.id, variable, observedValue: +t.toFixed(2), source: "Simulated verification data" });
          }
          const shock = gauss(r) * (r() < 0.03 + 0.04 * stress ? 1.6 : 1);
          const err = shock * scale * v.tolerance * 0.55, obs = truth.get(key).observedValue;
          const fv = (variable === "temperature" || variable === "pressure") ? obs + err : Math.max(0, obs + err);
          points.push({
            forecastId: `${id}:${region.id}:d${lead}:${variable}`, runId: id, initialization: init.toISOString(),
            validTime, leadDay: lead, region: region.id, latitude: region.lat, longitude: region.lon, variable,
            forecastValue: +fv.toFixed(2), weatherRegime: regime, features: f,
          });
        }
      }
    }
  }
  return { runs, forecasts: points, observations: [...truth.values()], meta: { seed, simulated: true, source: "Simulated / Demo Data" } };
}
