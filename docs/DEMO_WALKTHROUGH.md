# ForecastGuard SIH Presentation & Demonstration Walkthrough
### SIH Problem Statement SIH26079 · AI-Based Forecast Bust Detection

This document provides a structured walkthrough script designed for demonstrations to Smart India Hackathon (SIH) judges and meteorological evaluators.

---

## 1. Quick Startup

```bash
# Terminal 1: Root directory
npm ci
npm run dev
```

Open your browser to: **http://127.0.0.1:5173**

---

## 2. Demonstration Flow

### Scene 1: Executive Overview & The Problem Statement (0:00 – 0:45)
- **Presenter**: *"Smart India Hackathon Problem Statement SIH26079 focuses on Medium-Range Numerical Weather Forecasts. When a forecast fails significantly—a forecast bust—disaster management, agriculture, and power grids suffer catastrophic disruptions. ForecastGuard answers one fundamental question: Where and when is the current medium-range forecast likely to have a large error, and why?"*
- **Visuals to Highlight**:
  - The atmospheric header: *"Know where the forecast may break down"*.
  - Active forecast cycle: `00 UTC Run`.
  - Top 4 Operational KPIs:
    - **Overall Confidence**: Calibrated reliability index across Day 1–10.
    - **Highest Bust Probability**: Immediate alert for vulnerable cells.
    - **Most Uncertain Lead Day**: Identifies when predictability collapses.
    - **Detected Synoptic Weather Regime**: (e.g. *Monsoon Depression*).

---

### Scene 2: The 10-Day Forecast Horizon Scrubber (0:45 – 1:30)
- **Action**: Click through the 10-day timeline scrubber:
  - Click **Day 1**: Confidence is high (~92%), bust risk is minimal (<10%).
  - Click **Day 4**: Uncertainty emerges; Konkan and East Coast show elevated variance.
  - Click **Day 7–8**: Severe degradation occurs as chaos error compounds.
- **Presenter**: *"Notice how ForecastGuard visualizes the natural predictability horizon. Rather than a static prediction, operators see the exact tipping point where model skill degrades."*
- **Visuals to Highlight**:
  - The **Confidence Decay Curve** (Chart 1) and **Bust Probability Escalation** (Chart 2) updating in real time.

---

### Scene 3: Geospatial Subcontinent Confidence Map (1:30 – 2:30)
- **Action**: Navigate to **Confidence Map** in the sidebar.
- **Presenter**: *"We built an India-focused geospatial grid covering 12 meteorological regions across Northern, Central, Western, Coastal, and offshore Bay of Bengal / Arabian Sea basins."*
- **Action**:
  - Toggle between **Rainfall**, **Temperature**, **Wind**, and **Surface Pressure**.
  - Hover over **Central India**: Show the live diagnostics card displaying lat/lon (22.0°N, 78.0°E), bust probability, confidence %, and regime.
  - Notice the pulsating radar halos (green = reliable, amber = moderate uncertainty, crimson = high bust risk).
- **Action**: Click on **Central India** node to jump directly into deep-dive analysis.

---

### Scene 4: "Why This Forecast May Bust" Explainability (2:30 – 3:30)
- **Presenter**: *"A black-box prediction is useless to an operational meteorologist. ForecastGuard provides transparent, model-derived feature attribution for every single prediction."*
- **Visuals to Highlight**:
  - **Circular Risk Dial**: Showing the 48.2% bust probability.
  - **Why did the model mark this forecast as risky?**:
    - **#1 Ensemble Spread**: High divergence among ensemble members (+0.52 logit).
    - **#2 Precipitation Gradient**: Sharp convective boundaries difficult to place (+0.41 logit).
    - **#3 Pressure Tendency**: Fast barometric drops indicating rapid system evolution.
  - **Protective Factors**: Explains what atmospheric components are stabilizing the region.
  - **Chart 4 (Forecast vs Observed Verification Series)**: Historical time series showing past verified forecasts against ground truth, highlighting actual historical bust events.

---

### Scene 5: Ground Truth Verification & Model Intelligence (3:30 – 4:30)
- **Action**: Open **Historical Verification** and **Model Intelligence**.
- **Presenter**: *"Our ML pipeline is built on rigorous scientific integrity."*
- **Key Technical Facts to Present**:
  - **No Data Leakage**: Strict chronological split (60% Train, 20% Validation, 20% Test). The active run is completely unverified.
  - **Real ML Metrics**: Held-out test ROC-AUC (0.81+), PR-AUC, and Brier Score.
  - **Calibration Reliability Diagram**: Chart 6 plots predicted probability bins against empirical bust frequency along the 45-degree ideal calibration line.
  - **Baseline Comparison**: Outperforms the historical frequency × ensemble spread baseline by over 18% on Brier score.

---

### Scene 6: Pluggable Architecture & Conclusion (4:30 – 5:00)
- **Action**: Click the **PROTOTYPE DATASET** status pill or navigate to **About / Methodology**.
- **Visual**: Show the **8-Stage End-to-End Visual Pipeline**.
- **Presenter**: *"ForecastGuard is 100% pluggable. While today's prototype runs on a reproducible deterministic dataset (seed 26079), the data provider layer is engineered to connect directly to NCMRWF NCUM/NEPS feeds and IMD observational networks."*
