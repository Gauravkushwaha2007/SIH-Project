// Central, configurable prototype settings. Nothing here is an official NCMRWF definition.
export const VARIABLES = {
  rainfall: { label: "Rainfall", unit: "mm/day", tolerance: 20, weight: 0.4 },
  temperature: { label: "2 m temperature", unit: "°C", tolerance: 3, weight: 0.25 },
  wind: { label: "10 m wind speed", unit: "m/s", tolerance: 5, weight: 0.2 },
  pressure: { label: "Surface pressure", unit: "hPa", tolerance: 4, weight: 0.15 },
};
// name, lat/lon box centre. Regular-grid cells, not political boundaries.
export const REGIONS = [
  ["northwest", "North-West India", 29, 75, 0],
  ["himalaya", "Western Himalaya", 32, 77, 1],
  ["northeast", "North-East India", 26, 93, 2],
  ["gangetic", "Gangetic Plains", 26, 82, 3],
  ["central", "Central India", 22, 78, 4],
  ["eastcoast", "East Coast", 19, 84, 5],
  ["westcoast", "Konkan & Coastal Karnataka", 16, 74, 6],
  ["gujarat", "Gujarat & Kachchh", 23, 71, 7],
  ["peninsula", "Interior Peninsula", 15, 77, 8],
  ["tamilnadu", "Tamil Nadu & Kerala", 10, 77, 9],
  ["bayofbengal", "Head Bay of Bengal", 21, 89, 10],
  ["arabiansea", "Eastern Arabian Sea", 17, 70, 11],
].map(([id, name, lat, lon, order]) => ({ id, name, lat, lon, order }));
export const REGIMES = [
  "Normal", "Monsoon Depression", "Heavy Rainfall", "Cyclonic System",
  "Western Disturbance", "Heat Wave", "Active Monsoon", "Break Monsoon", "Other / Unknown",
];
export const LEAD_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const FEATURES = [
  "ensembleSpread", "precipGradient", "pressureTendency", "instability", "tempAnomaly",
  "windAnomaly", "humidityAnomaly", "histErrFreq", "leadDay", "regimeRisk",
];
const num = (v, d) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : d);
export function getConfig(env = process.env) {
  return {
    dataMode: "demo",
    demoSeed: 26079,
    // A point is a "bust" when |forecast - observed| >= bustThreshold * variable tolerance.
    bustThreshold: Math.min(3, Math.max(0.25, num(env.BUST_THRESHOLD, 1))),
    // Risk bands on bust probability; configurable, not official.
    riskBands: { moderate: 0.1, high: 0.25, veryHigh: 0.5 }, // scaled to the ~5% demo base rate; not official,
    label: "Prototype threshold (uncalibrated; to be set with NCMRWF domain experts)",
  };
}
export function riskLevel(p, bands = getConfig().riskBands) {
  return p >= bands.veryHigh ? "Very high" : p >= bands.high ? "High" : p >= bands.moderate ? "Moderate" : "Low";
}
export function confidenceCategory(conf) {
  return conf >= 0.75 ? "High confidence" : conf >= 0.5 ? "Moderate confidence" : conf >= 0.25 ? "Low confidence" : "Very low confidence";
}
