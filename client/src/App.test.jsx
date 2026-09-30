
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, test, expect, vi } from 'vitest';
import App from './App';

const overview = {
  currentRun: { id: 'demo-current', initialization: '2026-09-29T00:00:00Z' },
  kpis: { overallConfidence: 0.72, highRiskRegions: 4, maxBustProbability: 0.61, mostUncertainLeadDay: 8 },
  timeline: Array.from({ length: 10 }, (_, i) => ({ leadDay: i + 1, confidence: 0.9 - i * 0.03, bustProbability: 0.1 + i * 0.03 })),
  regions: [{ region: 'central', regionName: 'Central India', leadDay: 5, bustProbability: 0.3, confidence: 0.7, riskLevel: 'High', dominantVariable: 'rainfall', weatherRegime: 'Active Monsoon', historicalErrorFrequency: 0.2, lat: 22, lon: 78 }],
  providers: [], variables: [{ id: 'rainfall', label: 'Rainfall', unit: 'mm/day' }], leadDays: [1,2,3,4,5,6,7,8,9,10], dataset: { simulated: true }
};
const historical = { byLead: Array.from({length:10},(_,i)=>({leadDay:i+1,meanNormalizedError:.4+i*.03,bustRate:.1})) };
const model = { ml: { f1: .65 }, baseline: { f1: .42 }, samples: { test: 20 } };
const detail = { regionName:'Central India',leadDay:5,variable:'rainfall',weatherRegime:'Active Monsoon',bustProbability:.3,confidence:.7,riskLevel:'High',historicalErrorFrequency:.2,forecastValue:25,explanation:{meteorologicalInterpretation:[{text:'Ensemble members are disagreeing, so the forecast is less stable.'}]}};

beforeEach(() => vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
  const s = String(url);
  const body = s.includes('/weather/overview') ? overview : s.includes('/weather/historical') ? historical : s.includes('/weather/model') ? model : s.includes('/ai/health') ? {configured:true} : detail;
  return new Response(JSON.stringify(body), { status: 200, headers: {'content-type':'application/json'} });
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('renders the landing page with AI Copilot and bilingual switch', async () => {
  render(<App />);
  expect(await screen.findByText('Forecast')).toBeTruthy();
  expect(screen.getByText('Guard')).toBeTruthy();
  expect(screen.getByText(/ForecastGuard AI Assistant/i)).toBeTruthy();
  expect(screen.getByText(/Explore Live Dashboard/i)).toBeTruthy();

  // Test Hindi switch
  const hiBtn = screen.getByTitle('Toggle English / हिंदी');
  fireEvent.click(hiBtn);
  expect(screen.getByText(/लाइव डैशबोर्ड देखें/i)).toBeTruthy();
});

test('navigates to dashboard and shows forecast days and risk areas', async () => {
  render(<App />);
  const launchBtn = await screen.findByText(/Explore Live Dashboard/i);
  fireEvent.click(launchBtn);

  expect(screen.getByPlaceholderText(/Search any city/i)).toBeTruthy();
  const days = await screen.findAllByText(/Day 5/i);
  expect(days.length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Central India/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/High Risk Regions/i)).toBeTruthy();
});

