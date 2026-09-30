# ForecastGuard — SIH26079

ForecastGuard is a student prototype for **AI-based forecast bust detection** for medium-range weather forecasts (Day 1–10).

## What is new in this version

- Simple weather-app style dashboard instead of a research-console UI.
- Hindi/Hinglish-first labels with short explanations.
- City search at the top using Open-Meteo geocoding.
- “मेरी लोकेशन” button for current local weather (browser location permission required).
- Local weather card with temperature, feel-like temperature, wind, rain and weather condition.
- Prominent **Mausam AI** panel at the top.
- Gemini backend integration: the API key stays on the Node/Express server.
- Voice input with browser Speech Recognition and spoken AI answers with browser Text-to-Speech.
- AI receives the project's actual selected forecast/model context instead of inventing dashboard numbers.
- Day 1–10 clickable forecast strip.
- India-focused risk map with clickable regional risk bubbles.
- Simple historical error view and model view.
- Old SANGAM/career UI is no longer part of the active application.

## AI setup

Create a Google Gemini API key in Google AI Studio, then put it in `server/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

**Never put the Gemini key in React code or commit `.env`.** `.gitignore` already excludes `.env`.

The frontend calls:

```text
React -> /api/ai/chat -> Express -> Gemini -> React
```

Voice does not require another paid voice API in this version:

```text
Mic -> Browser Speech Recognition -> Gemini -> Browser Speech Synthesis
```

Browser voice support is best in Chrome/Edge. The user can ask in Hindi, English or Hinglish; the AI prompt asks it to reply in the same language style.

## Local weather

Search a city in the top search box, or allow browser location access through **मेरी लोकेशन**. The app calls Open-Meteo for current local weather. This is separate from the SIH26079 bust-detection model.

## Run

From the project root:

```bash
npm ci
npm run dev
```

Then open the Vite URL shown in the terminal, normally:

```text
http://127.0.0.1:5173
```

For production:

```bash
npm run build
npm start
```

## Tests

```bash
npm test
```

## Important scientific limitation

The current SIH prototype still uses a deterministic simulated/demo forecast and observation dataset. The ML model calculates a forecast-bust probability from that prototype data. Gemini is only the explanation/assistant layer; it does **not** replace the bust-detection model and must not be presented as the source of the forecast probability.

For an operational-quality SIH system, the provider layer should later ingest real NWP forecast data and verified observations, then retrain and validate the model on those real historical cycles.

## Main API routes

- `GET /api/weather/overview`
- `GET /api/weather/prediction?leadDay=5&region=central&variable=rainfall`
- `GET /api/weather/historical?region=central&variable=rainfall&leadDay=5`
- `GET /api/weather/model`
- `GET /api/weather/runs`
- `GET /api/weather/health`
- `GET /api/ai/health`
- `POST /api/ai/chat`
- `GET /api/local-weather?lat=23.25&lon=77.41`
