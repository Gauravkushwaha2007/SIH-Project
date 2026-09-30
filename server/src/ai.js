import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auto load .env if not already set
if (!process.env.GEMINI_API_KEY) {
  const envCandidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'server/.env'),
    resolve(__dirname, '.env'),
    resolve(__dirname, '../.env'),
  ];
  for (const p of envCandidates) {
    if (existsSync(p)) {
      try {
        const text = readFileSync(p, 'utf8');
        for (const line of text.split(/\r?\n/)) {
          const t = line.trim();
          if (!t || t.startsWith('#')) continue;
          const idx = t.indexOf('=');
          if (idx > 0) {
            const k = t.slice(0, idx).trim();
            const v = t.slice(idx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      } catch {}
    }
  }
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function cleanText(value, max = 6000) {
  return String(value ?? '').replace(/\u0000/g, '').slice(0, max);
}

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function askForecastAI({ message, context = {}, language = 'en' }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      configured: false,
      reply: 'AI API key is not configured. Please set GEMINI_API_KEY in the server .env file and restart.',
    };
  }

  // Model priority cascade: try configured model, then proven working models
  const candidateModels = Array.from(
    new Set([
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
    ].filter(Boolean))
  );

  const explicitEnglish = /\b(speak in english|reply in english|answer in english|only english|in english)\b/i.test(message);
  const isHindi = !explicitEnglish && (
    language === 'hi' ||
    language !== 'en' ||
    /[\u0900-\u097F]/.test(message) ||
    /\b(mausam|barish|barsat|aaj|kal|kaisa|kaise|kya|hogi|hoga|batao|bataye|bata|tapman|karo|kaha|hain|hai|nhi|nahi|badal|garaj|suno|kaho|weather|delhi|mumbai|indore|bhopal|jaipur|lucknow|kolkata|bangalore|bengaluru|india|forecast)\b/i.test(message)
  );

  const prompt = `You are ForecastGuard AI (मौसम इंटेलिजेंस), an expert Indian weather forecast and reliability assistant (SIH26079).

CRITICAL LANGUAGE REQUIREMENT:
${
  isHindi
    ? `आप अनिवार्य रूप से हिंदी (देवनागरी लिपि) में ही उत्तर देंगे।
- उत्तर स्वाभाविक, सहज, मधुर और बातचीत वाली शुद्ध हिंदी में होना चाहिए।
- चाहे उपयोगकर्ता ने अंग्रेजी लिपि में पूछा हो (जैसे "bhopal ka mausam kaisa hai" या "what is the weather in Delhi" या "aaj barish hogi"), आपको उत्तर केवल और केवल देवनागरी हिंदी में ही देना है।
- अंग्रेज़ी (English) शब्दों का अनावश्यक उपयोग न करें।
- वाक्य छोटे, साफ़ और स्पष्ट रखें ताकि टेक्स्ट-टू-स्पीच (आवाज़ में बोलने) पर सुनने में बहुत अच्छा लगे।
- भारी-भरकम टेबल या अनचाहे सिंबल न जोड़ें।`
    : `- The user requested English. Provide a concise, clear, and friendly answer in simple English. Keep sentences TTS-friendly.`
}

RULES:
- When asked about weather in a city or current location, check CURRENT PROJECT CONTEXT for localWeather:
  - If localWeather is present, share the exact real-time temperature, condition, precipitation, and wind.
  - If a city is not yet loaded in context, tell the user how to search it in the search bar or tap "मेरी लोकेशन" (My Location).
- If asked about medium-range forecast reliability or busts, explain simply using the regional bust probability, confidence %, and atmospheric regime.
- Avoid markdown tables or excessive asterisks so voice speech reads smoothly.

User question: ${cleanText(message, 1200)}

CURRENT PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}`;

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch(
        `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.25, maxOutputTokens: 800 },
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.error?.message || `Model ${model} returned ${response.status}`;
        lastError = new Error(detail);
        // If 404 (model retired/unavailable) or 503 (high demand), try next model
        continue;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
      if (!reply) {
        lastError = new Error(`Model ${model} returned an empty response.`);
        continue;
      }

      return { configured: true, model, reply };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate AI response from available models.');
}
