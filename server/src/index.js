import express from 'express';
import helmet from 'helmet';
import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Automatically load .env from candidate paths
const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'server/.env'),
  resolve(__dirname, '.env'),
  resolve(__dirname, '../.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    } catch {}
  }
}

import { buildEngine } from './weather/engine.js';
import {
  weatherOverview,
  predictionDetail,
  historicalSummary,
  runsList,
} from './weather/api.js';

import { aiConfigured, askForecastAI } from './ai.js';

const app = express();

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '127.0.0.1';

const engine = buildEngine();

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(
  express.json({
    limit: '100kb',
  })
);

/* =========================================================
   HEALTH
========================================================= */

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    version: '1.1.0',
    mode: 'SIH26079 forecast bust detection prototype',
  });
});

app.get('/api/weather/health', (_req, res) => {
  res.json({
    ok: true,
    mode: 'demo',
    engine: 'ready',
    dataset: engine.data.meta,
    providers: engine.providers,
  });
});

/* =========================================================
   WEATHER
========================================================= */

app.get('/api/weather/overview', (_req, res) => {
  try {
    res.json(weatherOverview(engine));
  } catch (error) {
    console.error('Weather overview error:', error);
    res.status(500).json({
      error: 'Unable to load weather overview.',
    });
  }
});

app.get('/api/weather/predictions', (req, res) => {
  try {
    const variable = req.query.variable
      ? String(req.query.variable)
      : null;

    const predictions = engine.predictions
      .filter((p) => !variable || p.variable === variable)
      .map(({ _pr, _features, ...p }) => p);

    res.json({
      predictions,
    });
  } catch (error) {
    console.error('Predictions error:', error);

    res.status(500).json({
      error: 'Unable to load forecast predictions.',
    });
  }
});

app.get('/api/weather/prediction', (req, res) => {
  try {
    const result = predictionDetail(engine, req.query);

    if (!result) {
      return res.status(400).json({
        error:
          'Please provide a valid leadDay (1-10), region, and variable.',
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Prediction detail error:', error);

    res.status(500).json({
      error: 'Unable to load prediction details.',
    });
  }
});

app.get('/api/weather/historical', (req, res) => {
  try {
    res.json(historicalSummary(engine, req.query));
  } catch (error) {
    console.error('Historical weather error:', error);

    res.status(500).json({
      error: 'Unable to load historical forecast data.',
    });
  }
});

app.get('/api/weather/runs', (_req, res) => {
  try {
    res.json(runsList(engine));
  } catch (error) {
    console.error('Runs error:', error);

    res.status(500).json({
      error: 'Unable to load forecast runs.',
    });
  }
});

/* =========================================================
   GEMINI / FORECASTGUARD AI
========================================================= */

app.get('/api/ai/health', (_req, res) => {
  res.json({
    configured: aiConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  });
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const {
      message,
      context = {},
      language = 'en',
    } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        error: 'Message is required.',
      });
    }

    const result = await askForecastAI({
      message: String(message).trim(),
      context,
      language,
    });

    res.json(result);
  } catch (error) {
    console.error('AI error:', error);

    res.status(502).json({
      configured: aiConfigured(),
      error:
        'Could not obtain an AI answer. Please check API key, model availability, or quota.',
      detail: error?.message || 'Unknown AI error',
    });
  }
});

/* =========================================================
   LOCAL WEATHER
   Open-Meteo - no API key required
========================================================= */

app.get('/api/local-weather', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({
        error: 'Valid latitude and longitude required.',
      });
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'precipitation',
        'cloud_cover',
        'surface_pressure',
        'is_day',
      ].join(',')
    );
    url.searchParams.set(
      'daily',
      [
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'weather_code',
      ].join(',')
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');

    const response = await fetch(url);
    const weather = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: 'Local weather provider unavailable.',
      });
    }

    res.json(weather);
  } catch (error) {
    console.error('Local weather error:', error);
    res.status(502).json({
      error: 'Local weather fetch failed.',
    });
  }
});

/* =========================================================
   IP GEOLOCATION & REVERSE GEOCODING
========================================================= */

app.get('/api/location/detect', async (_req, res) => {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (!response.ok) throw new Error('IP geo service unavailable');
    const data = await response.json();
    res.json({
      city: data.city || 'Your City',
      region: data.region || 'India',
      country: data.country || 'India',
      lat: Number(data.latitude) || 22.717,
      lon: Number(data.longitude) || 75.8337,
    });
  } catch (err) {
    // Graceful fallback to Central India coordinates if offline
    res.json({
      city: 'Indore',
      region: 'Madhya Pradesh',
      country: 'India',
      lat: 22.717,
      lon: 75.8337,
    });
  }
});

app.get('/api/location/reverse', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon required' });
    }
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!response.ok) throw new Error('Reverse geocode failed');
    const data = await response.json();
    const city = data.city || data.locality || 'Unknown Area';
    const state = data.principalSubdivision || '';
    const country = data.countryName || 'India';
    res.json({
      name: [city, state, country].filter(Boolean).join(', '),
      city,
      state,
      country,
    });
  } catch (err) {
    res.json({ name: 'Selected Location' });
  }
});

/* =========================================================
   MODEL INTELLIGENCE
========================================================= */

app.get('/api/weather/model', (_req, res) => {
  try {
    res.json({
      metrics: engine.metrics,

      model: {
        type: engine.model.type,
        features: engine.model.weights.length,
        trainedOn: engine.split.train.length,
      },

      threshold: engine.cfg.label,

      bustThreshold: engine.cfg.bustThreshold,
    });
  } catch (error) {
    console.error('Model information error:', error);

    res.status(500).json({
      error: 'Unable to load model information.',
    });
  }
});

/* =========================================================
   FRONTEND STATIC BUILD
========================================================= */

const dist = resolve(process.cwd(), 'client/dist');

if (existsSync(dist)) {
  app.use(express.static(dist));
}

/*
 * React/Vite SPA fallback.
 */
app.get('/{*path}', (_req, res) => {
  const indexFile = resolve(dist, 'index.html');

  if (!existsSync(indexFile)) {
    return res
      .status(503)
      .type('text')
      .send(
        'Frontend build is missing. Run npm run build first.'
      );
  }

  res.sendFile(indexFile);
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, _req, res, _next) => {
  console.error('Unexpected server error:', err);

  res.status(500).json({
    error: 'Unexpected server error',
  });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(port, host, () => {
  console.log(
    `SIH26079 Forecast Bust Detection ready at http://${host}:${port}`
  );

  console.log(
    `Gemini AI: ${aiConfigured() ? 'configured' : 'not configured'}`
  );

  console.log(
    `Gemini model: ${
      process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    }`
  );
});