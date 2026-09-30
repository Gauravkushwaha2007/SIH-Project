# ForecastGuard System Architecture
### SIH Problem Statement SIH26079 · AI-Based Forecast Bust Detection for Medium-Range Weather Forecasts

This document details the system design, data contracts, and operational decoupling of the **ForecastGuard** platform.

---

## 1. High-Level Architecture

The platform follows a decoupled, service-oriented architecture designed to separate numerical meteorological data access, machine learning inference, and interactive visualization:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION LAYER                              │
│                                                                             │
│   ┌─────────────────────────────┐        ┌──────────────────────────────┐   │
│   │    DemoForecastProvider     │        │     ObservationProvider      │   │
│   │ (Simulated NWP 90 Runs D1-10│        │  (Ground Truth Verification  │   │
│   │   Seed 26079, Synoptic Reg) │        │   Stations & Satellite Grids)│   │
│   └──────────────┬──────────────┘        └──────────────┬───────────────┘   │
└──────────────────┼──────────────────────────────────────┼───────────────────┘
                   │                                      │
                   ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VERIFICATION & FEATURE ENGINE (Node)                    │
│                                                                             │
│   • Spatio-temporal matching: (Region, Variable, ValidTime)                 │
│   • Out-of-domain and duplicate rejection audit logging                      │
│   • Normalized error: |Forecast - Observed| / Variable_Tolerance            │
│   • Binary bust labeling: Normalized Error >= 1.0                           │
│   • Chronological anti-leakage prior tracking: histErrFreq                   │
│   • 10-feature standardization (Z-score scaling)                            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MACHINE LEARNING PIPELINE                          │
│                                                                             │
│   • Chronological Run Split (60% Train, 20% Validation, 20% Test)           │
│   • L2 Class-Weighted Logistic Regression (epochs=500, lr=0.3, l2=0.01)    │
│   • Optimal F1 decision threshold tuned on validation partition only        │
│   • Baseline model: Historical Frequency × Relative Ensemble Spread         │
│   • Calibration computation & Logit contribution feature attribution        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HTTP REST API (Express)                           │
│                                                                             │
│   • GET /api/weather/overview    • GET /api/weather/prediction              │
│   • GET /api/weather/historical  • GET /api/weather/model                   │
│   • GET /api/weather/runs        • GET /api/weather/health                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │  JSON over HTTP
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ATMOSPHERIC UI LAYER (React 19)                       │
│                                                                             │
│   • Subcontinent Geospatial Radar Map (Vector Coastlines, Isobars, Nodes)   │
│   • 10-Day Synchronized Lead Scrubber (D1 to D10)                           │
│   • "Why This Forecast May Bust" Feature Attribution & Impact Meters        │
│   • Analytical Weather Charts (Confidence Decay, Error Growth, Verification)│
│   • Model Transparency (Reliability Diagrams, Confusion Matrix, Weights)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```text
forecast-bust-intelligence/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AtmosphericMap.jsx      # Interactive Subcontinent Vector Radar Map
│   │   │   ├── WeatherCharts.jsx       # 6 SVG weather & ML analytical charts
│   │   │   ├── ExplainabilityPanel.jsx # Circular risk dial & feature attribution
│   │   │   ├── VisualPipeline.jsx      # 8-step interactive architecture walkthrough
│   │   │   └── Tooltip.jsx             # Meteorological glossary & inline popovers
│   │   ├── App.jsx                     # Core application shell & 8 primary views
│   │   ├── api.js                      # REST API client adapter
│   │   ├── style.css                   # Deep atmospheric styling & responsive theme
│   │   └── main.jsx                    # React 19 entry point
│   └── vite.config.js
│
├── server/                      # Express backend & weather ML engine
│   ├── src/
│   │   ├── weather/
│   │   │   ├── config.js               # Variables, 12 Regions, Synoptic Regimes, Bands
│   │   │   ├── demoData.js             # Deterministic synthetic weather generator
│   │   │   ├── verification.js         # Spatio-temporal matching & normalized error
│   │   │   ├── model.js                # L2 Logistic regression, baseline & metrics
│   │   │   ├── explanation.js          # Logit contribution decomposition
│   │   │   ├── engine.js               # Central orchestration pipeline
│   │   │   └── api.js                  # HTTP request formatters
│   │   └── index.js                    # Express application entry point
│   └── test/
│       └── weather.test.js             # 14 comprehensive unit & integration tests
│
└── docs/                        # Complete technical documentation
    ├── ARCHITECTURE.md
    ├── ML_APPROACH.md
    └── DEMO_WALKTHROUGH.md
```

---

## 3. Data Ingestion & Provider Contract

The engine abstracts meteorological data via the `DemoForecastProvider` interface:

```javascript
export class ForecastProvider {
  name = "CustomNWPProvider";
  status = "Connected";
  load(config) {
    // Ingests initialization runs, forecast points across Days 1-10,
    // and matched ground truth verification observations.
    return { runs, forecasts, observations, meta };
  }
}
```

In an operational deployment at NCMRWF:
1. `NCUMForecastProvider` ingests GRIB2/NetCDF files from the 12 km unified model.
2. `IMDObservationProvider` ingests automated weather station (AWS) observational records and INSAT-3D precipitation products.
3. The core verification, error labeling, and ML inference modules remain **100% unchanged**.
