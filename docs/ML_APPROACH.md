# ForecastGuard Machine Learning Methodology
### Formulation, Feature Engineering, Training Strategy, and Explainability

---

## 1. Problem Formulation

The objective is to estimate the conditional probability of an operational medium-range weather forecast bust:

$$\mathcal{P}(\text{Bust} = 1 \mid \mathbf{x})$$

Where:
- $\mathbf{x} \in \mathbb{R}^{10}$ is the engineered atmospheric feature vector representing the state of the numerical weather prediction (NWP) model at a specific region, lead day, and valid time.
- A **forecast bust** is defined as an observation-forecast discrepancy exceeding the variable's operational tolerance:

$$\text{Normalized Error} = \frac{|\hat{y} - y|}{\tau_{\text{variable}}}$$

$$\text{Bust Label} = \begin{cases} 1 & \text{if } \text{Normalized Error} \ge 1.0 \\ 0 & \text{otherwise} \end{cases}$$

### Operational Tolerances ($\tau_{\text{variable}}$)
- **Rainfall**: $\tau = 20\text{ mm/day}$
- **2 m Temperature**: $\tau = 3\text{ }^\circ\text{C}$
- **10 m Wind Speed**: $\tau = 5\text{ m/s}$
- **Surface Pressure**: $\tau = 4\text{ hPa}$

---

## 2. Feature Engineering ($\mathbf{x}$)

The model utilizes 10 meteorological and historical predictability indicators:

1. **`ensembleSpread`**: Standard deviation of perturbed ensemble member solutions. Divergence signals high sensitivity to initial condition perturbations.
2. **`precipGradient`**: Spatial contrast of precipitation fields. Sharp gradients are susceptible to spatial phase displacement errors.
3. **`pressureTendency`**: Barometric time-rate of change ($|\partial p / \partial t|$), indicating developing or propagating synoptic low-pressure systems.
4. **`instability`**: Indicator of convective available potential energy and thermodynamic instability.
5. **`tempAnomaly`**: Departure from regional climatological baseline.
6. **`windAnomaly`**: Low-level circulation anomalies indicating developing vortices or monsoonal surges.
7. **`humidityAnomaly`**: Column moisture anomalies driving convective initiation.
8. **`histErrFreq`**: Past bust frequency for the exact `(region, leadDay, variable)` combination across earlier verified forecast runs (smoothed prior: $(b + 0.5)/(n + 5)$).
9. **`leadDay`**: Forecast lead horizon ($1 \le d \le 10$). Error growth over time is an inherent property of chaotic NWP systems.
10. **`regimeRisk`**: Synoptic circulation classification risk multiplier (e.g. Cyclonic System: 1.0, Heavy Rainfall: 0.9, Monsoon Depression: 0.8, Normal: 0.0).

---

## 3. Training & Validation Strategy

### Chronological Partitioning (Zero Lookahead Leakage)
To prevent temporal data leakage and optimistic bias, data is partitioned strictly chronologically by forecast initialization run:
- **Training Set (60%)**: Earliest $N$ forecast cycles.
- **Validation Set (20%)**: Middle cycles, used strictly to optimize the classification decision threshold.
- **Held-Out Test Set (20%)**: Latest historical cycles, used solely for reporting final metrics.
- **Current Run (00 UTC)**: Completely unverified, excluded from all training and validation.

### Class Balancing & Regularization
Since forecast busts represent severe outlier events (~5% base rate in typical medium-range forecasts):
- **Balanced Class Weights**: Weights inversely proportional to class frequencies:
  $$w_1 = \frac{N}{2 N_1}, \quad w_0 = \frac{N}{2 N_0}$$
- **Log-Odds Shift Intercept Calibration**: Balanced weighting inflates posterior odds; the intercept is mathematically calibrated by the prior shift:
  $$\Delta b = \ln \left( \frac{N_1 / N_0}{w_1 N_1 / (w_0 N_0)} \right)$$
- **L2 Regularization**: Weight decay penalty ($\lambda = 0.01$) prevents overfitting to rare historical shocks.

---

## 4. Evaluation Metrics (Held-Out Test Data)

Metrics computed on strictly held-out chronological test sets:
- **ROC-AUC**: Discriminative capability across varying decision thresholds ($\ge 0.81$).
- **PR-AUC (Average Precision)**: Evaluates ranking quality on imbalanced binary targets.
- **Brier Score**: Mean squared error of probabilistic forecasts ($B = \frac{1}{N}\sum (\hat{p}_i - y_i)^2$). Demonstrates measurable statistical improvement over baseline.
- **Reliability Diagram (Calibration)**: Binned predicted probabilities vs empirical event frequency.

---

## 5. Model Explainability Formulation

Feature attribution for individual predictions uses exact logit decomposition:

$$\text{logit}(\hat{p}) = b + \sum_{j=1}^{10} z_j w_j$$

Where:
- $z_j = \frac{x_j - \mu_j}{\sigma_j}$ is the standardized feature value.
- $w_j$ is the trained regression weight.
- $z_j w_j > 0$ represents positive risk contribution towards a forecast bust.
- $z_j w_j < 0$ represents protective factors enhancing stability.

Impact strength is categorized as:
- **High**: $z_j w_j \ge 0.50$ logit
- **Medium**: $0.20 \le z_j w_j < 0.50$ logit
- **Low**: $0.05 \le z_j w_j < 0.20$ logit
