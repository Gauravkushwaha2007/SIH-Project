// HTTP-facing helpers for the SIH26079 forecast reliability prototype.
import { LEAD_DAYS, REGIONS, VARIABLES, REGIMES } from './config.js';
import { publicPredictions, summarize, timeline, predictOne } from './engine.js';

export function weatherOverview(engine) {
  const cells = summarize(engine);
  const tl = timeline(engine);
  const highRisk = cells.filter(c => c.riskLevel === 'High' || c.riskLevel === 'Very high');
  const worst = [...cells].sort((a,b) => b.bustProbability - a.bustProbability)[0];
  const uncertainDay = [...tl].sort((a,b) => a.confidence - b.confidence)[0];
  const avgConfidence = tl.reduce((s, x) => s + x.confidence, 0) / tl.length;
  return {
    currentRun: engine.current,
    meta: engine.data.meta,
    kpis: {
      overallConfidence: +avgConfidence.toFixed(3),
      highRiskRegions: highRisk.length,
      maxBustProbability: worst?.bustProbability ?? 0,
      mostUncertainLeadDay: uncertainDay?.leadDay ?? null,
    },
    timeline: tl,
    regions: cells,
    providers: engine.providers,
    variables: Object.entries(VARIABLES).map(([id, v]) => ({ id, ...v })),
    leadDays: LEAD_DAYS,
    regimes: REGIMES,
    dataset: engine.data.meta,
  };
}

export function predictionDetail(engine, query) {
  const leadDay = Number(query.leadDay);
  const region = String(query.region || '');
  const variable = String(query.variable || 'rainfall');
  if (!Number.isInteger(leadDay) || !LEAD_DAYS.includes(leadDay)) return null;
  if (!REGIONS.some(r => r.id === region)) return null;
  if (!VARIABLES[variable]) return null;
  return predictOne(engine, { leadDay, region, variable });
}

export function historicalSummary(engine, query = {}) {
  const rows = engine.rows;
  const total = rows.length;
  const busts = rows.filter(r => r.bustLabel === 1).length;
  const avgError = rows.reduce((s,r) => s + r.normalizedError, 0) / total;
  const byLead = LEAD_DAYS.map(leadDay => {
    const rs = rows.filter(r => r.leadDay === leadDay);
    const b = rs.filter(r => r.bustLabel).length;
    return { leadDay, samples: rs.length, bustRate: +(b / rs.length).toFixed(3), meanNormalizedError: +(rs.reduce((s,r) => s+r.normalizedError,0)/rs.length).toFixed(3) };
  });

  const byRegime = REGIMES.map(regime => {
    const rs = rows.filter(r => r.weatherRegime === regime);
    if (!rs.length) return null;
    const b = rs.filter(r => r.bustLabel).length;
    return {
      regime,
      samples: rs.length,
      busts: b,
      bustRate: +(b / rs.length).toFixed(3),
      meanNormalizedError: +(rs.reduce((s,r) => s + r.normalizedError, 0) / rs.length).toFixed(3),
    };
  }).filter(Boolean);

  const byRegion = REGIONS.map(reg => {
    const rs = rows.filter(r => r.region === reg.id);
    if (!rs.length) return null;
    const b = rs.filter(r => r.bustLabel).length;
    const err = rs.reduce((s,r) => s + r.normalizedError, 0) / rs.length;
    const varBusts = Object.keys(VARIABLES).map(v => {
      const vrs = rs.filter(r => r.variable === v);
      const vb = vrs.filter(r => r.bustLabel).length;
      return { variable: v, bustRate: vrs.length ? vb / vrs.length : 0 };
    }).sort((a,b) => b.bustRate - a.bustRate)[0];
    const worstLead = LEAD_DAYS.map(d => {
      const drs = rs.filter(r => r.leadDay === d);
      const db = drs.filter(r => r.bustLabel).length;
      return { leadDay: d, bustRate: drs.length ? db / drs.length : 0 };
    }).sort((a,b) => b.bustRate - a.bustRate)[0];

    return {
      region: reg.id,
      regionName: reg.name,
      lat: reg.lat,
      lon: reg.lon,
      samples: rs.length,
      busts: b,
      bustRate: +(b / rs.length).toFixed(3),
      meanNormalizedError: +err.toFixed(3),
      dominantVariable: varBusts?.variable || 'rainfall',
      worstLeadDay: worstLead?.leadDay || 10,
    };
  }).filter(Boolean).sort((a,b) => b.bustRate - a.bustRate);

  const filterRegion = String(query.region || 'central');
  const filterVariable = String(query.variable || 'rainfall');
  const filterLead = Number(query.leadDay) || 5;

  const series = rows
    .filter(r => r.region === filterRegion && r.variable === filterVariable && r.leadDay === filterLead)
    .slice(-30)
    .map(r => ({
      runId: r.runId,
      initialization: r.initialization,
      forecastValue: r.forecastValue,
      observedValue: r.observedValue,
      absoluteError: r.absoluteError,
      normalizedError: r.normalizedError,
      bustLabel: r.bustLabel,
      weatherRegime: r.weatherRegime,
    }));

  return {
    samples: total,
    busts,
    bustRate: +(busts/total).toFixed(3),
    meanNormalizedError: +avgError.toFixed(3),
    byLead,
    byRegime,
    byRegion,
    series,
    query: { region: filterRegion, variable: filterVariable, leadDay: filterLead },
    rejectedHistoricalPoints: engine.rejected.length,
  };
}

export function runsList(engine) {
  return {
    runs: engine.data.runs.map(r => ({
      id: r.id,
      initialization: r.initialization,
      current: !!r.current,
      demo: !!r.demo,
    })),
    currentRunId: engine.current.id,
    totalRuns: engine.data.runs.length,
  };
}
