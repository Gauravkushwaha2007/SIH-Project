// Two explicitly separate layers: (1) model-derived contributions, (2) static meteorological interpretation.
export const FEATURE_INFO = {
  ensembleSpread: { label: "High ensemble spread", meteo: "Ensemble members disagree, which usually signals sensitivity to initial conditions." },
  precipGradient: { label: "Strong precipitation gradient", meteo: "Sharp horizontal rainfall contrasts are hard to place accurately at longer leads." },
  pressureTendency: { label: "Rapid pressure-field evolution", meteo: "Fast-changing pressure suggests a rapidly evolving synoptic system." },
  instability: { label: "Elevated vertical instability indicator", meteo: "Convective instability makes timing and location of rainfall less predictable." },
  tempAnomaly: { label: "Large temperature anomaly", meteo: "Strong temperature departures from climatology can accompany heat-wave or cold-air regimes." },
  windAnomaly: { label: "Large wind anomaly", meteo: "Unusual low-level winds can indicate a developing or shifting circulation." },
  humidityAnomaly: { label: "Large humidity anomaly", meteo: "Moisture departures affect rainfall amount and convective initiation." },
  histErrFreq: { label: "Similar past cases had frequent large errors", meteo: "This region/lead/variable has a history of large forecast errors in earlier runs." },
  leadDay: { label: "Longer forecast lead time", meteo: "Forecast error growth with lead time is a general property of NWP." },
  regimeRisk: { label: "Error-prone weather regime", meteo: "This regime type is associated with lower predictability in the historical data." },
};
const LOW = { ensembleSpread: "Low ensemble spread", precipGradient: "Weak precipitation gradient", pressureTendency: "Slowly evolving pressure field", instability: "Low instability indicator",
  tempAnomaly: "Near-normal temperature", windAnomaly: "Near-normal winds", humidityAnomaly: "Near-normal humidity", histErrFreq: "Few large errors in similar past cases", leadDay: "Short lead time", regimeRisk: "Regime with good historical predictability" };
export function explain(prediction, { top = 4, regime } = {}) {
  const ranked = [...prediction.contributions].sort((a, b) => b.contribution - a.contribution);
  const positive = ranked.filter((c) => c.contribution > 0.05).slice(0, top);
  const total = positive.reduce((s, c) => s + c.contribution, 0) || 1;
  const strength = (c) => (c.contribution >= 0.5 ? "high" : c.contribution >= 0.2 ? "medium" : "low"); // absolute logit contribution
  void total;
  return {
    modelDerived: positive.map((c) => ({ feature: c.feature, label: FEATURE_INFO[c.feature].label, contributionLogit: +c.contribution.toFixed(3), standardizedValue: +c.z.toFixed(2), impact: strength(c) })),
    protective: ranked.filter((c) => c.contribution < -0.05).slice(-2).reverse().map((c) => ({ feature: c.feature, label: LOW[c.feature], contributionLogit: +c.contribution.toFixed(3) })),
    meteorologicalInterpretation: positive.filter((c) => c.z > 0.3 || c.feature === "leadDay").map((c) => ({ feature: c.feature, text: FEATURE_INFO[c.feature].meteo })),
    regime: regime ?? null,
    note: "Contributions are predictive associations from the model, not causal attribution. Interpretation text is a fixed mapping from features, not generated.",
  };
}
