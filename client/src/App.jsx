import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BrainCircuit, CalendarDays, Check,
  ChevronDown, Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSun,
  Eye, Gauge, Globe, History, Layers, LocateFixed, MapPin, Menu, Mic, MicOff, RefreshCw,
  Search, Send, ShieldCheck, Sparkles, Sun, Thermometer, Volume2, VolumeX, Wind, X, Zap
} from 'lucide-react';
import L from 'leaflet';
import { api } from './api';

const pct = (v) => `${(Number(v || 0) * 100).toFixed(0)}%`;

/* =========================================================
   POPULAR CURATED INDIAN CITIES FOR QUICK 1-TAP LIVE WEATHER
========================================================= */
const QUICK_CITIES = [
  { id: 'indore', nameEn: 'Indore', nameHi: 'इंदौर', lat: 22.717, lon: 75.8337, state: 'MP' },
  { id: 'bhopal', nameEn: 'Bhopal', nameHi: 'भोपाल', lat: 23.25, lon: 77.41, state: 'MP' },
  { id: 'delhi', nameEn: 'New Delhi', nameHi: 'नई दिल्ली', lat: 28.61, lon: 77.20, state: 'Delhi' },
  { id: 'mumbai', nameEn: 'Mumbai', nameHi: 'मुंबई', lat: 19.07, lon: 72.87, state: 'MH' },
  { id: 'bengaluru', nameEn: 'Bengaluru', nameHi: 'बेंगलुरु', lat: 12.97, lon: 77.59, state: 'KA' },
  { id: 'srinagar', nameEn: 'Srinagar', nameHi: 'श्रीनगर', lat: 34.08, lon: 74.79, state: 'J&K' },
  { id: 'kolkata', nameEn: 'Kolkata', nameHi: 'कोलकाता', lat: 22.57, lon: 88.36, state: 'WB' },
  { id: 'jaipur', nameEn: 'Jaipur', nameHi: 'जयपुर', lat: 26.91, lon: 75.78, state: 'RJ' },
  { id: 'lucknow', nameEn: 'Lucknow', nameHi: 'लखनऊ', lat: 26.84, lon: 80.94, state: 'UP' },
];

/* =========================================================
   BILINGUAL DICTIONARY (ENGLISH & HINDI)
========================================================= */
const T = {
  en: {
    brandSubtitle: 'SIH26079 · Weather Reliability',
    navHome: 'Landing',
    navOverview: 'Overview',
    navForecast: 'Forecast Inspector',
    navMap: 'Live Risk Map',
    navHistory: 'Historical Accuracy',
    navModel: 'ML Architecture',
    launchDashboard: 'Launch Dashboard',
    backLanding: 'Landing Page',
    searchPlaceholder: 'Search any city (e.g. Bhopal, Indore, Delhi, Mumbai, Srinagar)…',
    myLocation: 'My Location',
    detectingLoc: 'Detecting location…',
    locatedAt: 'Located',
    forecastAi: 'Forecast AI',
    whatIsBust: 'What is a Forecast Bust?',
    bustDesc: 'A severe mismatch between medium-range model predictions and real ground truth weather observations.',
    demoMode: 'Demo Simulation Engine',

    // Landing Page
    liveBadge: 'Operational Weather Reliability Engine',
    heroTitlePre: 'AI-Powered Medium-Range ',
    heroTitleHighlight: 'Forecast Bust Intelligence',
    heroDesc: 'Predict numerical weather forecast failure up to 10 days in advance. Identify high-risk atmospheric regimes across India before model errors propagate.',
    ctaDashboard: 'Explore Live Dashboard',
    ctaVoiceAi: 'Ask Voice AI Copilot',
    statHorizon: 'Forecast Horizon',
    statRegions: 'Covered Regions',
    statModel: 'ML Verification',
    statHorizonVal: '1–10 Days',
    statRegionsVal: '12 Zones',
    statModelVal: 'Calibrated',

    // Center Parallax Card
    activeScan: 'Active Radar Scan',
    radarTracking: 'Tracking Ensemble Variance',
    centralIndia: 'Central India',
    monsoonRisk: 'Active Monsoon · Moderate Bust Risk',
    estPrecip: 'Est. Rainfall',
    leadHorizon: 'Lead Horizon',

    // AI Panel
    aiPanelTitle: 'ForecastGuard AI Assistant',
    aiPanelSubtitle: 'Ask in English or हिंदी about forecast risks',
    aiOnline: 'Gemini AI Active',
    aiOffline: 'Configuring Key',
    aiPlaceholder: 'Ask anything — e.g. What is today\'s weather in Bhopal?',
    suggest1: 'Which forecast day is most unpredictable?',
    suggest2: 'Why does Central India have elevated risk?',
    suggest3: 'Explain Day 5 rainfall forecast',
    initialGreeting: 'Hello! I am ForecastGuard AI. Ask me anything in English or हिंदी about medium-range weather forecast reliability across India!',
    listeningBanner: '🎤 Listening to your voice... Speak now!',
    listeningBannerHi: '🎤 Listening in Hindi (हिंदी में बोलें)...',
    speakerListen: 'Listen',
    speakerSpeaking: 'Speaking…',
    askAiSidebar: 'Ask AI Copilot',

    // Highlights
    hl1Title: '10-Day Error Drift',
    hl1Desc: 'Analyzes how numerical prediction errors compound over extended lead times.',
    hl2Title: 'Geospatial Risk Radar',
    hl2Desc: 'Interactive Leaflet India map color-coded by model bust probability.',
    hl3Title: 'ML Feature Pipeline',
    hl3Desc: 'Combines atmospheric stability indices and past error frequency.',

    // Dashboard Overview
    overviewHeroTitle: 'How much can you trust today\'s weather forecast?',
    overviewHeroDesc: 'Track Days 1 through 10 to detect where numerical models are likely to experience major forecast busts across India.',
    cycle: 'National Forecast Run',
    localWeatherTitle: 'Live Weather & 7-Day Forecast',
    quickCitiesTitle: 'Popular Indian Cities:',
    feelsLike: 'Feels like',
    humidity: 'Humidity',
    wind: 'Wind',
    precip: 'Precipitation',
    pressure: 'Pressure',
    cloudCover: 'Cloud Cover',
    fetchingWeather: 'Fetching live weather data…',
    searchCityPrompt: 'Search a city above or tap "My Location"',
    overallReliability: 'Overall Reliability',
    overallReliabilitySub: 'Average confidence across Day 1–10',
    mostUncertainDay: 'Most Uncertain Day',
    mostUncertainDaySub: 'Lowest model confidence point',
    peakBustRisk: 'Peak Bust Risk',
    peakBustRiskSub: 'Highest probability in current run',
    reliabilityCurve: 'Forecast Reliability Curve',
    reliabilityCurveSub: 'Confidence drops and bust risk increases with lead time.',
    openInspector: 'Open Detailed Inspector',
    highRiskRegions: 'High Risk Regions',
    openMap: 'Open Map',
    activeRegionFocus: 'Active Region Focus',
    stableDesc: 'Model indicators suggest this regional forecast is stable and consistent across ensemble members.',
    unstableDesc: 'Ensemble disagreement and historical error patterns indicate elevated risk of a forecast bust.',
    inspectDrivers: 'Inspect Meteorological Drivers',

    // Forecast Inspector
    forecastInspectorTitle: 'Granular Model Uncertainty Inspector',
    forecastInspectorSub: 'Inspect forecast bust probabilities by lead day, atmospheric variable, and synoptic regime.',
    confidenceScore: 'Confidence Score',
    histErrorRate: 'Historical Error Frequency',
    forecastVal: 'Forecast Value',
    synopticRegime: 'Synoptic Regime',
    whyAtRisk: 'Why is this forecast at risk?',

    // Map
    mapTitle: 'India Weather Bust Risk Map',
    mapSub: 'Interactive Leaflet map showing real-time medium-range numerical prediction bust probabilities.',
    safeLegend: 'Low Risk (<25% bust probability)',
    warnLegend: 'Moderate Risk (25%–50% bust probability)',
    dangerLegend: 'High / Very High Risk (>50% bust probability)',

    // History & Model
    historyTitle: 'Historical 10-Day Error Drift',
    historySub: 'Quantifies how numerical prediction reliability degrades from Day 1 through Day 10.',
    historyNoteTitle: 'Dataset & Evaluation Methodology',
    historyNoteDesc: 'Uses strictly chronological forecast-observation pairs without look-ahead leakage.',
    modelTitle: 'Machine Learning Reliability Architecture',
    modelSub: 'Combines dynamic numerical features, atmospheric stability indices, and historical frequency.',
    modelNoteTitle: 'Prototype Calibration Status',
    modelNoteDesc: 'Trained on chronologically separated simulated test partitions with balanced cross-entropy weighting.',

    // Variables & Conditions
    varRainfall: 'Rainfall',
    varTemperature: 'Temperature',
    varWind: 'Wind Speed',
    varPressure: 'Surface Pressure',
    condClear: 'Clear Sky',
    condPartlyCloudy: 'Partly Cloudy',
    condOvercast: 'Overcast Clouds',
    condFog: 'Fog & Mist',
    condDrizzle: 'Light Drizzle',
    condRain: 'Rain Showers',
    condSnow: 'Snowfall',
    condThunder: 'Thunderstorm',
    condAvailable: 'Weather Available',
  },
  hi: {
    brandSubtitle: 'SIH26079 · मौसम विश्वसनीयता',
    navHome: 'होम',
    navOverview: 'डैशबोर्ड ओवरव्यू',
    navForecast: 'फोरकास्ट विश्लेषक',
    navMap: 'लाइव रिस्क मैप',
    navHistory: 'पुराना रिकॉर्ड',
    navModel: 'ML आर्किटेक्चर',
    launchDashboard: 'डैशबोर्ड खोलें',
    backLanding: 'लैंडिंग पेज',
    searchPlaceholder: 'किसी भी शहर का नाम खोजें (जैसे: भोपाल, इंदौर, दिल्ली, मुंबई, श्रीनगर)…',
    myLocation: 'मेरी लोकेशन',
    detectingLoc: 'लोकेशन खोजी जा रही है…',
    locatedAt: 'स्थान मिला',
    forecastAi: 'मौसम AI',
    whatIsBust: 'फोरकास्ट Bust क्या है?',
    bustDesc: 'जब मौसम मॉडल का अनुमान और जमीन पर असली मौसम में बहुत बड़ा अंतर आ जाता है।',
    demoMode: 'डेमो सिमुलेशन इंजन',

    // Landing Page
    liveBadge: 'लाइव मौसम विश्वसनीयता इंजन',
    heroTitlePre: 'AI-संचालित मीडियम-रेंज ',
    heroTitleHighlight: 'मौसम Bust इंटेलिजेंस',
    heroDesc: 'मौसम पूर्वानुमान की गलतियों (Busts) को 10 दिन पहले पहचानें। मॉडल गलत होने से पहले ही जोखिम वाले क्षेत्रों की सटीक जानकारी पाएं।',
    ctaDashboard: 'लाइव डैशबोर्ड देखें',
    ctaVoiceAi: 'आवाज से AI से पूछें',
    statHorizon: 'फोरकास्ट सीमा',
    statRegions: 'कवर्ड क्षेत्र',
    statModel: 'ML वेरिफिकेशन',
    statHorizonVal: '1–10 दिन',
    statRegionsVal: '12 ज़ोन',
    statModelVal: 'सटीक जाँचा हुआ',

    // Center Parallax Card
    activeScan: 'सक्रिय रडार स्कैन',
    radarTracking: 'एन्सेम्बल विचलन ट्रैकिंग',
    centralIndia: 'मध्य भारत',
    monsoonRisk: 'सक्रिय मानसून · मध्यम जोखिम',
    estPrecip: 'अनुमानित बारिश',
    leadHorizon: 'लीड दिन',

    // AI Panel
    aiPanelTitle: 'ForecastGuard AI सहायक',
    aiPanelSubtitle: 'मौसम व जोखिम पर हिंदी या English में पूछें',
    aiOnline: 'Gemini AI कनेक्टेड',
    aiOffline: 'कुंजी बाकी है',
    aiPlaceholder: 'पूछें — जैसे: भोपाल में आज का मौसम कैसा है?',
    suggest1: 'कौन सा दिन सबसे अनिश्चित है?',
    suggest2: 'मध्य भारत में जोखिम क्यों ज्यादा है?',
    suggest3: 'Day 5 की बारिश का हाल समझाओ',
    initialGreeting: 'नमस्ते! मैं ForecastGuard AI हूँ। भारत के मौसम पूर्वानुमान और जोखिम पर हिंदी में कुछ भी पूछें!',
    listeningBanner: '🎤 आपकी आवाज सुन रहे हैं... बोलिए!',
    listeningBannerHi: '🎤 हिंदी में सुन रहे हैं... बोलिए!',
    speakerListen: 'सुनें',
    speakerSpeaking: 'बोल रहे हैं…',
    askAiSidebar: 'मौसम AI से पूछें',

    // Highlights
    hl1Title: '10-दिवसीय त्रुटि विश्लेषण',
    hl1Desc: 'लीड टाइम बढ़ने के साथ मॉडल की गलतियों का विश्लेषण करता है।',
    hl2Title: 'जियोस्पाशियल रिस्क रडार',
    hl2Desc: 'पूरे भारत का इंटरैक्टिव मैप जहाँ जोखिम रंगों से दिखता है।',
    hl3Title: 'ML फीचर पाइपलाइन',
    hl3Desc: 'वायुमंडलीय स्थिरता और पुराने गलतियों के पैटर्न को जोड़ता है।',

    // Dashboard Overview
    overviewHeroTitle: 'आज के मौसम पूर्वानुमान पर कितना भरोसा करें?',
    overviewHeroDesc: 'Day 1 से Day 10 तक देखें कि किस जगह और किस दिन मौसम मॉडल में बड़ी गलती होने का जोखिम बढ़ रहा है।',
    cycle: 'राष्ट्रीय फोरकास्ट रन',
    localWeatherTitle: 'लाइव मौसम व 7-दिवसीय पूर्वानुमान',
    quickCitiesTitle: 'प्रमुख भारतीय शहर:',
    feelsLike: 'महसूस',
    humidity: 'नमी (Humidity)',
    wind: 'हवा',
    precip: 'बारिश',
    pressure: 'दबाव',
    cloudCover: 'बादल',
    fetchingWeather: 'लाइव मौसम लोड हो रहा है…',
    searchCityPrompt: 'शहर खोजें या "मेरी लोकेशन" दबाएँ',
    overallReliability: 'कुल भरोसा',
    overallReliabilitySub: 'Day 1–10 का औसत भरोसा',
    mostUncertainDay: 'सबसे अनिश्चित दिन',
    mostUncertainDaySub: 'जहाँ मॉडल का भरोसा सबसे कम है',
    peakBustRisk: 'सबसे बड़ा Bust रिस्क',
    peakBustRiskSub: 'मौजूदा रन में सबसे ज्यादा रिस्क',
    reliabilityCurve: 'फोरकास्ट विश्वसनीयता टाइमलाइन',
    reliabilityCurveSub: 'जैसे-जैसे दिन बढ़ते हैं, मॉडल का रिस्क बढ़ता है।',
    openInspector: 'पूरा फोरकास्ट विश्लेषक देखें',
    highRiskRegions: 'उच्च जोखिम वाले क्षेत्र',
    openMap: 'मैप खोलें',
    activeRegionFocus: 'चुना हुआ क्षेत्र',
    stableDesc: 'मॉडल के अनुसार इस क्षेत्र का पूर्वानुमान स्थिर और भरोसेमंद है।',
    unstableDesc: 'एन्सेम्बल सदस्यों में मतभेद के कारण यहाँ बड़ी गलती होने का जोखिम बढ़ा हुआ है।',
    inspectDrivers: 'मौसम संबंधी कारण देखें',

    // Forecast Inspector
    forecastInspectorTitle: 'गहराई से मॉडल अनिश्चितता विश्लेषण',
    forecastInspectorSub: 'दिन, मौसम प्रकार और क्षेत्र बदलकर रिस्क देखें।',
    confidenceScore: 'विश्वसनीयता स्कोर',
    histErrorRate: 'पुराना गलती प्रतिशत',
    forecastVal: 'अनुमानित मान',
    synopticRegime: 'मौसम पैटर्न',
    whyAtRisk: 'इस पूर्वानुमान में क्या जोखिम है?',

    // Map
    mapTitle: 'भारत मौसम Bust रिस्क मैप',
    mapSub: 'इंटरैक्टिव मौसम रडार जो बताता है कि भारत में कहाँ गलत होने की संभावना ज्यादा है।',
    safeLegend: 'सुरक्षित पूर्वानुमान (<25% रिस्क)',
    warnLegend: 'मध्यम अनिश्चितता (25%–50%)',
    dangerLegend: 'बड़ा Bust खतरा (>50%)',

    // History & Model
    historyTitle: '10-दिवसीय मॉडल सटीकता गिरावट',
    historySub: 'पुराने डेटा से समझें कि समय के साथ मॉडल की सटीकता कैसे घटती है।',
    historyNoteTitle: 'प्रोटोटाइप डेटा सूचना',
    historyNoteDesc: 'यह प्रोटोटाइप बिना किसी लुक-अहेड लीकेज के क्रमिक डेमो डेटा पर चलता है। प्रोडक्शन में यह NCMRWF और IMD AWS डेटा से जुड़ेगा।',
    modelTitle: 'मशीन लर्निंग प्रेडिक्शन आर्किटेक्चर',
    modelSub: 'वायुमंडलीय स्थिरता और पुराने गलतियों के पैटर्न से Bust सम्भावना की गणना।',
    modelNoteTitle: 'प्रोटोटाइप सीमा',
    modelNoteDesc: 'अभी ओपन-मेटियो और सिमुलेटेड टेस्ट डेटा का उपयोग हो रहा है।',

    // Variables & Conditions
    varRainfall: 'बारिश (Rainfall)',
    varTemperature: 'तापमान (Temperature)',
    varWind: 'हवा की गति (Wind Speed)',
    varPressure: 'सतही दबाव (Surface Pressure)',
    condClear: 'साफ आसमान',
    condPartlyCloudy: 'हल्के बादल',
    condOvercast: 'घने बादल',
    condFog: 'कोहरा व धुंध',
    condDrizzle: 'हल्की फुहार',
    condRain: 'बारिश',
    condSnow: 'बर्फबारी',
    condThunder: 'गरज-चमक के साथ बौछार',
    condAvailable: 'मौसम उपलब्ध',
  }
};

const WeatherIcon = ({ code = 2, size = 30 }) => {
  if (code === 0) return <Sun size={size} color="#f59e0b" />;
  if ([61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain size={size} color="#0284c7" />;
  if ([51, 53, 55].includes(code)) return <CloudDrizzle size={size} color="#0d9488" />;
  if ([95, 96, 99].includes(code)) return <CloudLightning size={size} color="#f59e0b" />;
  if ([1, 2].includes(code)) return <CloudSun size={size} color="#38bdf8" />;
  return <Cloud size={size} color="#64748b" />;
};

function formatDayName(dateStr, lang) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/* =========================================================
   REUSABLE AI ASSISTANT PANEL COMPONENT
========================================================= */
function AiAssistantPanel({
  t,
  lang,
  messages,
  aiInput,
  setAiInput,
  aiBusy,
  listening,
  startVoice,
  speakingId,
  speak,
  askAI,
  aiHealth,
  isDrawer = false,
  onClose = null,
}) {
  return (
    <div className={`landing-ai-panel ${isDrawer ? 'ai-drawer-panel' : ''}`}>
      <div>
        <div className="ai-panel-head">
          <div className="ai-panel-avatar">
            <Sparkles size={22} />
          </div>
          <div>
            <h3>{t.aiPanelTitle}</h3>
            <p>{t.aiPanelSubtitle}</p>
          </div>
          <div
            className={`ai-status ${aiHealth.configured ? 'on' : ''}`}
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '10px' }}
          >
            <i /> {aiHealth.configured ? t.aiOnline : t.aiOffline}
          </div>
          {isDrawer && (
            <button className="drawer-close-btn" onClick={onClose} title="Close AI">
              <X size={18} />
            </button>
          )}
        </div>

        {listening && (
          <div className="voice-status-bar">
            <span className="voice-pulse-dot" />
            <span>{lang === 'hi' ? t.listeningBannerHi : t.listeningBanner}</span>
          </div>
        )}

        <div className={`ai-chat-bubble-stream ${isDrawer ? 'drawer-stream' : ''}`}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <div>{m.text}</div>
              {m.role === 'ai' && (
                <button
                  className={`speaker-btn ${speakingId === m.id ? 'speaking' : ''}`}
                  onClick={() => speak(m.text, m.id)}
                  title={t.speakerListen}
                >
                  <Volume2 size={13} />
                  <span>{speakingId === m.id ? t.speakerSpeaking : t.speakerListen}</span>
                </button>
              )}
            </div>
          ))}
          {aiBusy && (
            <div className="chat-bubble ai">
              <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'hi' ? 'सोच रहे हैं…' : 'Analyzing forecast parameters…'}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="ai-preset-queries">
          {[t.suggest1, t.suggest2, t.suggest3].map((q) => (
            <button
              key={q}
              className="preset-chip-btn"
              onClick={() => askAI(q)}
            >
              <span>{q}</span>
              <ArrowRight size={12} color="#0284c7" />
            </button>
          ))}
        </div>

        <div className="ai-panel-input-box">
          <button
            className={`voice-btn ${listening ? 'listening' : ''}`}
            onClick={startVoice}
            title={listening ? 'Stop Mic' : 'Voice Input (हिंदी/English)'}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAI()}
            placeholder={t.aiPlaceholder}
          />
          <button
            className="send-btn"
            onClick={() => askAI()}
            disabled={aiBusy}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'dashboard'
  const [page, setPage] = useState('home'); // 'home' | 'forecast' | 'map' | 'history' | 'model'
  const [lang, setLang] = useState('hi'); // Default: Hindi ('hi')

  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [historical, setHistorical] = useState(null);
  const [model, setModel] = useState(null);
  const [leadDay, setLeadDay] = useState(5);
  const [variable, setVariable] = useState('rainfall');
  const [selectedRegion, setSelectedRegion] = useState('central');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Live weather state
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState([]);
  const [localWeather, setLocalWeather] = useState(null);
  const [localName, setLocalName] = useState('Indore, Madhya Pradesh');
  const [localLoading, setLocalLoading] = useState(false);
  const [locFeedback, setLocFeedback] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('indore');

  // AI & Voice state
  const [aiHealth, setAiHealth] = useState({ configured: false });
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: T.hi.initialGreeting }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const recognitionRef = useRef(null);
  const voicesRef = useRef([]);
  const searchWrapRef = useRef(null);

  const t = T[lang];

  // Helper for weather condition text
  const weatherLabel = (code) => {
    if (code === 0) return t.condClear;
    if ([1, 2].includes(code)) return t.condPartlyCloudy;
    if (code === 3) return t.condOvercast;
    if ([45, 48].includes(code)) return t.condFog;
    if ([51, 53, 55, 56, 57].includes(code)) return t.condDrizzle;
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return t.condRain;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return t.condSnow;
    if ([95, 96, 99].includes(code)) return t.condThunder;
    return t.condAvailable;
  };

  const varLabel = {
    rainfall: t.varRainfall,
    temperature: t.varTemperature,
    wind: t.varWind,
    pressure: t.varPressure,
  };

  // Pre-load speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Update greeting when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'ai') {
      setMessages([{ id: 1, role: 'ai', text: t.initialGreeting }]);
    }
  }, [lang]);

  // Initial Data Load
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [o, h, m, ai] = await Promise.all([
        api('/weather/overview'),
        api(`/weather/historical?region=${selectedRegion}&variable=${variable}&leadDay=${leadDay}`),
        api('/weather/model'),
        api('/ai/health'),
      ]);
      setData(o);
      setHistorical(h);
      setModel(m);
      setAiHealth(ai);
    } catch (e) {
      setError(e.message || 'Failed to load meteorological engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-detect location on initial load so user sees real weather right away!
    detectLocation(true);
  }, []);

  // Detail update on params change
  useEffect(() => {
    if (!data) return;
    Promise.all([
      api(`/weather/prediction?leadDay=${leadDay}&region=${selectedRegion}&variable=${variable}`),
      api(`/weather/historical?region=${selectedRegion}&variable=${variable}&leadDay=${leadDay}`),
    ])
      .then(([d, h]) => {
        setDetail(d);
        setHistorical(h);
      })
      .catch(() => {});
  }, [data, leadDay, selectedRegion, variable]);

  // Geocoding city search with debounce
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setPlaces([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`
        );
        const j = await r.json();
        setPlaces(j.results || []);
      } catch {
        setPlaces([]);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [search, lang]);

  // Click outside to dismiss search results
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setPlaces([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live weather from backend endpoint
  const fetchLocal = async (lat, lon, name) => {
    setLocalLoading(true);
    try {
      const w = await api(`/local-weather?lat=${lat}&lon=${lon}`);
      setLocalWeather(w);
      if (name) setLocalName(name);
    } catch (err) {
      console.error('Failed to fetch local weather:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  // Robust location detector: GPS -> Fallback to Server IP Geolocation
  const detectLocation = async (isInitial = false) => {
    setLocalLoading(true);
    setLocFeedback(t.detectingLoc);

    const tryIpFallback = async () => {
      try {
        const ipData = await api('/location/detect');
        const cityName = `${ipData.city}, ${ipData.region}`;
        setLocalName(cityName);
        setLocFeedback(`${t.locatedAt}: ${cityName}`);
        await fetchLocal(ipData.lat, ipData.lon, cityName);
      } catch {
        // Fallback to Indore if offline
        setLocalName('Indore, Madhya Pradesh');
        await fetchLocal(22.717, 75.8337, 'Indore, Madhya Pradesh');
      } finally {
        setLocalLoading(false);
        setTimeout(() => setLocFeedback(''), 4000);
      }
    };

    if (!navigator.geolocation) {
      return tryIpFallback();
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const rev = await api(`/location/reverse?lat=${lat}&lon=${lon}`);
          const label = rev.name || (lang === 'hi' ? 'मेरी लोकेशन' : 'Current Location');
          setLocalName(label);
          setLocFeedback(`${t.locatedAt}: ${label}`);
          await fetchLocal(lat, lon, label);
        } catch {
          await fetchLocal(lat, lon, lang === 'hi' ? 'मेरी लोकेशन' : 'Current Location');
        } finally {
          setLocalLoading(false);
          setTimeout(() => setLocFeedback(''), 4000);
        }
      },
      () => {
        tryIpFallback();
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  const selectPlace = (p) => {
    setSearch('');
    setPlaces([]);
    setSelectedCityId(null);
    const fullName = [p.name, p.admin1, p.country].filter(Boolean).join(', ');
    fetchLocal(p.latitude, p.longitude, fullName);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (places.length > 0) {
        selectPlace(places[0]);
      } else if (search.trim()) {
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search.trim())}&count=1&format=json`)
          .then((r) => r.json())
          .then((j) => {
            if (j.results?.[0]) selectPlace(j.results[0]);
          })
          .catch(() => {});
      }
    }
  };

  const selectQuickCity = (c) => {
    setSelectedCityId(c.id);
    const name = `${lang === 'hi' ? c.nameHi : c.nameEn}, ${c.state}`;
    setLocalName(name);
    fetchLocal(c.lat, c.lon, name);
  };

  // AI context updated with real live weather
  const context = useMemo(
    () => ({
      project: 'SIH26079 ForecastGuard Weather Bust Intelligence',
      language: lang,
      dataMode: data?.dataset?.mode || 'demo',
      currentRun: data?.currentRun,
      selected: detail
        ? {
            region: detail.regionName,
            leadDay: detail.leadDay,
            variable: detail.variable,
            forecastValue: detail.forecastValue,
            bustProbability: detail.bustProbability,
            confidence: detail.confidence,
            riskLevel: detail.riskLevel,
            historicalErrorFrequency: detail.historicalErrorFrequency,
            weatherRegime: detail.weatherRegime,
            explanation: detail.explanation,
          }
        : null,
      overview: data?.kpis,
      localWeather: localWeather?.current
        ? {
            place: localName,
            temperature: Math.round(localWeather.current.temperature_2m),
            apparentTemperature: Math.round(localWeather.current.apparent_temperature),
            precipitation: localWeather.current.precipitation,
            wind: Math.round(localWeather.current.wind_speed_10m),
            weather: weatherLabel(localWeather.current.weather_code),
            humidity: localWeather.current.relative_humidity_2m,
          }
        : null,
    }),
    [data, detail, localWeather, localName, lang]
  );

  // Text-To-Speech (TTS) with Windows/Chrome Hindi Voice Support
  const speak = (text, msgId) => {
    if (!('speechSynthesis' in window)) return;
    
    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const clean = text
      .replace(/[*_#`>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const u = new SpeechSynthesisUtterance(clean);
    const isHindiText = /[\u0900-\u097F]/.test(clean) || lang === 'hi';
    u.lang = isHindiText ? 'hi-IN' : 'en-US';

    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    
    let voice = null;
    if (isHindiText) {
      voice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.includes('हिन्दी') ||
          v.name.toLowerCase().includes('kalpana') ||
          v.name.toLowerCase().includes('hemant')
      );
    }
    
    if (!voice) {
      voice = voices.find((v) => v.lang.toLowerCase().includes('in') || v.lang.toLowerCase().startsWith('en')) || voices[0];
    }

    if (voice) u.voice = voice;
    u.rate = 0.94;
    u.pitch = 1.0;

    u.onstart = () => setSpeakingId(msgId);
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);

    setTimeout(() => {
      window.speechSynthesis.speak(u);
    }, 60);
  };

  const askAI = async (text = aiInput, overrideLang = null) => {
    const q = text.trim();
    if (!q || aiBusy) return;
    setAiInput('');
    const userMsgId = Date.now();
    setMessages((m) => [...m, { id: userMsgId, role: 'user', text: q }]);
    setAiBusy(true);

    const wantsEnglish = /\b(speak in english|reply in english|answer in english|only english|in english)\b/i.test(q);
    const queryLang = wantsEnglish ? 'en' : (overrideLang || (lang === 'en' ? 'en' : 'hi'));

    try {
      const r = await api('/ai/chat', {
        method: 'POST',
        body: { message: q, context, language: queryLang },
      });
      const aiMsgId = Date.now() + 1;
      setMessages((m) => [...m, { id: aiMsgId, role: 'ai', text: r.reply }]);
      speak(r.reply, aiMsgId);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 2,
          role: 'ai',
          text:
            queryLang === 'hi'
              ? 'AI से संपर्क नहीं हो पाया। कृपया सर्वर व इंटरनेट जांचें।'
              : (e.message || 'Unable to connect to AI. Please verify API configuration.'),
        },
      ]);
    } finally {
      setAiBusy(false);
    }
  };

  // Voice Input with Dual-language Speech Recognition
  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        lang === 'hi'
          ? 'इस ब्राउज़र में वॉइस इनपुट सपोर्ट नहीं है। Chrome या Edge का उपयोग करें।'
          : 'Voice recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const r = new SpeechRecognition();
    r.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;

    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      console.warn('SpeechRecognition error:', e.error);
    };
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setAiInput(text);
      askAI(text, lang === 'hi' ? 'hi' : null);
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };

  // Cursor Move Parallax Handler
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -(y * 18), y: x * 18 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  if (loading)
    return (
      <div className="loading-screen">
        <div className="weather-orb">
          <CloudRain size={36} />
        </div>
        <h1>ForecastGuard</h1>
        <p>{lang === 'hi' ? 'मौसम इंटेलिजेंस इंजन लोड हो रहा है…' : 'Loading meteorological engine & forecast intelligence…'}</p>
      </div>
    );

  if (error)
    return (
      <div className="loading-screen">
        <AlertTriangle size={48} color="#ef4444" />
        <h2>{lang === 'hi' ? 'डेटा इंजन अनुपलब्ध' : 'Data Engine Unavailable'}</h2>
        <p>{error}</p>
        <button className="primary" onClick={load}>
          <RefreshCw size={16} /> {lang === 'hi' ? 'फिर से प्रयास करें' : 'Retry Connection'}
        </button>
      </div>
    );

  const regions = data?.regions || [];
  const selected = regions.find((r) => r.region === selectedRegion) || regions[0];
  const riskColor = (p) => (p >= 0.5 ? 'danger' : p >= 0.25 ? 'warn' : 'safe');

  const NAV = [
    ['home', t.navOverview, Gauge],
    ['forecast', t.navForecast, CloudRain],
    ['map', t.navMap, MapPin],
    ['history', t.navHistory, History],
    ['model', t.navModel, BrainCircuit],
  ];

  return (
    <div className="app">
      {/* Ambient Rain Particles */}
      <div className="ambient-rain-bg">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="raindrop"
            style={{
              left: `${(i * 4.2) % 100}%`,
              animationDuration: `${0.8 + (i % 5) * 0.25}s`,
              animationDelay: `${(i * 0.15)}s`,
            }}
          />
        ))}
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="topbar">
        <div
          className="brand"
          onClick={() => {
            setViewMode('landing');
            setPage('home');
          }}
        >
          <div className="brand-icon">
            <CloudRain size={24} />
          </div>
          <div>
            <b>
              Forecast<span>Guard</span>
            </b>
            <small>{t.brandSubtitle}</small>
          </div>
        </div>

        {/* Omnipresent Live Weather Search Bar */}
        <div className="search-wrap" ref={searchWrapRef}>
          <Search size={18} color="#0284c7" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t.searchPlaceholder}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearch('');
                setPlaces([]);
              }}
              title="Clear"
            >
              <X size={15} />
            </button>
          )}
          {places.length > 0 && (
            <div className="search-results">
              {places.map((p) => (
                <button
                  key={`${p.id}-${p.latitude}`}
                  onClick={() => selectPlace(p)}
                >
                  <MapPin size={16} color="#0284c7" />
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {[p.admin1, p.country].filter(Boolean).join(', ')} · Lat: {p.latitude.toFixed(2)}, Lon: {p.longitude.toFixed(2)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="top-right">
          <button
            className="location-btn"
            onClick={() => detectLocation(false)}
            title={locFeedback || t.myLocation}
          >
            <LocateFixed size={15} />
            <span>{t.myLocation}</span>
          </button>

          {/* Bilingual Language Switcher */}
          <button
            className="lang-switch-btn"
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            title="Toggle English / हिंदी"
          >
            <Globe size={15} />
            <span>{lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}</span>
          </button>

          {viewMode === 'landing' ? (
            <button
              className="launch-dash-btn"
              onClick={() => {
                setViewMode('dashboard');
                setPage('home');
              }}
            >
              <Zap size={16} /> {t.launchDashboard}
            </button>
          ) : (
            <button
              className="launch-dash-btn"
              onClick={() => setViewMode('landing')}
            >
              <CloudSun size={16} /> {t.backLanding}
            </button>
          )}
        </div>
      </header>

      {/* =========================================================
          VIEW MODE 1: DEDICATED LANDING PAGE
      ========================================================= */}
      {viewMode === 'landing' && (
        <main className="landing-wrap">
          <section
            className="landing-hero-grid"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Left Column: Headline, stats & CTA */}
            <div className="hero-col-left">
              <div className="storm-badge">
                <i /> {t.liveBadge}
              </div>
              <h1>
                {t.heroTitlePre}
                <span>{t.heroTitleHighlight}</span>
              </h1>
              <p>{t.heroDesc}</p>

              <div className="hero-stats-strip">
                <div className="hero-stat-card">
                  <span>{t.statHorizon}</span>
                  <strong>{t.statHorizonVal}</strong>
                </div>
                <div className="hero-stat-card">
                  <span>{t.statRegions}</span>
                  <strong>{t.statRegionsVal}</strong>
                </div>
                <div className="hero-stat-card">
                  <span>{t.statModel}</span>
                  <strong>{t.statModelVal}</strong>
                </div>
              </div>

              <div className="hero-cta-row">
                <button
                  className="cta-btn-primary"
                  onClick={() => {
                    setViewMode('dashboard');
                    setPage('home');
                  }}
                >
                  {t.ctaDashboard} <ArrowRight size={17} />
                </button>
                <button
                  className="cta-btn-secondary"
                  onClick={() => {
                    startVoice();
                  }}
                >
                  <Mic size={17} /> {t.ctaVoiceAi}
                </button>
              </div>
            </div>

            {/* Center Column: 3D Weather Card reacting to Cursor Movement */}
            <div className="hero-col-center">
              <div
                className="parallax-card-stage"
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
                }}
              >
                <div className="parallax-decor-circle" />

                <div className="stage-header-row">
                  <div className="stage-badge">
                    <CloudLightning size={14} color="#f59e0b" />
                    <span>{t.activeScan}</span>
                  </div>
                  <span className="chip" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                    Live Radar
                  </span>
                </div>

                {/* Floating 3D Clouds with animated rain droplets */}
                <div className="parallax-cloud-floater">
                  <WeatherIcon code={localWeather?.current?.weather_code ?? 61} size={88} />
                  <div className="floating-rain-drizzle">
                    <div className="drizzle-drop" />
                    <div className="drizzle-drop" />
                    <div className="drizzle-drop" />
                    <div className="drizzle-drop" />
                  </div>
                </div>

                <div className="stage-middle-info">
                  <b>{localWeather?.current ? `${Math.round(localWeather.current.temperature_2m)}°C` : '29°C'}</b>
                  <span>{localName}</span>
                  <small style={{ display: 'block', color: '#93c5fd', marginTop: '4px' }}>
                    {weatherLabel(localWeather?.current?.weather_code ?? 0)} · {t.feelsLike}{' '}
                    {localWeather?.current ? Math.round(localWeather.current.apparent_temperature) : 32}°C
                  </small>
                </div>

                <div className="stage-bottom-chip">
                  <div>
                    <span>{t.precip}</span>
                    <strong>{localWeather?.current?.precipitation ? `${localWeather.current.precipitation} mm` : '0 mm'}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span>{t.wind}</span>
                    <strong>{localWeather?.current?.wind_speed_10m ? `${Math.round(localWeather.current.wind_speed_10m)} km/h` : '8 km/h'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Embedded Interactive AI Copilot */}
            <div className="hero-col-right">
              <AiAssistantPanel
                t={t}
                lang={lang}
                messages={messages}
                aiInput={aiInput}
                setAiInput={setAiInput}
                aiBusy={aiBusy}
                listening={listening}
                startVoice={startVoice}
                speakingId={speakingId}
                speak={speak}
                askAI={askAI}
                aiHealth={aiHealth}
              />
            </div>
          </section>

          {/* Section 2: Highlights Strip */}
          <section className="landing-highlights">
            <div
              className="feature-clay-card"
              onClick={() => {
                setViewMode('dashboard');
                setPage('history');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="feature-icon-box rain">
                <CloudRain size={26} />
              </div>
              <div>
                <h4>{t.hl1Title}</h4>
                <p>{t.hl1Desc}</p>
              </div>
            </div>

            <div
              className="feature-clay-card"
              onClick={() => {
                setViewMode('dashboard');
                setPage('map');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="feature-icon-box radar">
                <MapPin size={26} />
              </div>
              <div>
                <h4>{t.hl2Title}</h4>
                <p>{t.hl2Desc}</p>
              </div>
            </div>

            <div
              className="feature-clay-card"
              onClick={() => {
                setViewMode('dashboard');
                setPage('model');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="feature-icon-box model">
                <BrainCircuit size={26} />
              </div>
              <div>
                <h4>{t.hl3Title}</h4>
                <p>{t.hl3Desc}</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* =========================================================
          VIEW MODE 2: FULL DASHBOARD WORKSPACE (FIXED TOP CONTENT)
      ========================================================= */}
      {viewMode === 'dashboard' && (
        <div className="layout">
          <aside className="sidebar">
            <nav>
              {NAV.map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={page === id ? 'active' : ''}
                  onClick={() => setPage(id)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {page === id && <Check size={14} />}
                </button>
              ))}
            </nav>

            <button
              className="sidebar-ai-btn"
              onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
              title="Open ForecastGuard AI Copilot"
            >
              <Sparkles size={17} />
              <span>{t.askAiSidebar}</span>
            </button>

            <div className="side-note">
              <ShieldCheck size={20} />
              <div>
                <b>{t.whatIsBust}</b>
                <span>{t.bustDesc}</span>
              </div>
            </div>
            <div className="side-bottom">
              <span className="dot" /> {t.demoMode}
            </div>
          </aside>

          <main className="content">
            {/* VIEW 1: EXECUTIVE OVERVIEW */}
            {page === 'home' && (
              <DashboardOverview
                t={t}
                lang={lang}
                data={data}
                regions={regions}
                leadDay={leadDay}
                setLeadDay={setLeadDay}
                selected={selected}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                setPage={setPage}
                riskColor={riskColor}
                varLabel={varLabel}
                weatherLabel={weatherLabel}
                localWeather={localWeather}
                localName={localName}
                localLoading={localLoading}
                detectLocation={detectLocation}
                selectedCityId={selectedCityId}
                selectQuickCity={selectQuickCity}
                // AI panel passed into overview
                aiAssistantProps={{
                  t,
                  lang,
                  messages,
                  aiInput,
                  setAiInput,
                  aiBusy,
                  listening,
                  startVoice,
                  speakingId,
                  speak,
                  askAI,
                  aiHealth,
                }}
              />
            )}

            {/* VIEW 2: FORECAST INSPECTOR (No Overview clutter on top!) */}
            {page === 'forecast' && (
              <DashboardForecast
                t={t}
                data={data}
                detail={detail}
                leadDay={leadDay}
                setLeadDay={setLeadDay}
                variable={variable}
                setVariable={setVariable}
                selected={selected}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                riskColor={riskColor}
                varLabel={varLabel}
              />
            )}

            {/* VIEW 3: LIVE RISK MAP (Dedicated Full-height Leaflet Map) */}
            {page === 'map' && (
              <RiskMap
                t={t}
                data={data}
                regions={regions}
                leadDay={leadDay}
                setLeadDay={setLeadDay}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                setPage={setPage}
                riskColor={riskColor}
              />
            )}

            {/* VIEW 4: HISTORICAL VERIFICATION */}
            {page === 'history' && (
              <HistoryPage t={t} historical={historical} data={data} />
            )}

            {/* VIEW 5: ML ARCHITECTURE */}
            {page === 'model' && <ModelPage t={t} model={model} />}
          </main>
        </div>
      )}

      {/* =========================================================
          PERSISTENT FLOATING AI COPILOT BUTTON & DRAWER
          (Always available on Dashboard and all views!)
      ========================================================= */}
      {viewMode === 'dashboard' && (
        <>
          <button
            className="floating-ai-orb"
            onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
            title="Ask Voice AI Copilot"
          >
            <Sparkles size={18} />
            <span>{lang === 'hi' ? 'मौसम AI' : 'Forecast AI'}</span>
            <span className="ai-orb-pulse" />
          </button>

          {aiDrawerOpen && (
            <div className="ai-drawer-container">
              <AiAssistantPanel
                t={t}
                lang={lang}
                messages={messages}
                aiInput={aiInput}
                setAiInput={setAiInput}
                aiBusy={aiBusy}
                listening={listening}
                startVoice={startVoice}
                speakingId={speakingId}
                speak={speak}
                askAI={askAI}
                aiHealth={aiHealth}
                isDrawer={true}
                onClose={() => setAiDrawerOpen(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD SUBCOMPONENTS
========================================================= */

function DashboardOverview({
  t,
  lang,
  data,
  regions,
  leadDay,
  setLeadDay,
  selected,
  selectedRegion,
  setSelectedRegion,
  setPage,
  riskColor,
  varLabel,
  weatherLabel,
  localWeather,
  localName,
  localLoading,
  detectLocation,
  selectedCityId,
  selectQuickCity,
  aiAssistantProps,
}) {
  const timeline = data?.timeline || [];
  const cur = localWeather?.current;
  const daily = localWeather?.daily;

  return (
    <>
      <section className="page-hero overview-theme">
        <div>
          <span className="eyebrow" style={{ color: '#99f6e4' }}>
            {t.liveBadge}
          </span>
          <h1>{t.overviewHeroTitle}</h1>
          <p>{t.overviewHeroDesc}</p>
        </div>
        <div className="page-hero-aside">
          <CloudSun size={48} color="#fcd34d" />
          <div>
            <span>{t.cycle}</span>
            <strong>{data?.currentRun?.initialization ? '00Z' : 'Active'}</strong>
            <small>Deterministic Run</small>
          </div>
        </div>
      </section>

      {/* QUICK INDIAN CITY SELECTOR CHIPS */}
      <div className="quick-city-chips">
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={14} color="#0284c7" /> {t.quickCitiesTitle}
        </span>
        {QUICK_CITIES.map((c) => (
          <button
            key={c.id}
            className={`city-chip ${selectedCityId === c.id ? 'active' : ''}`}
            onClick={() => selectQuickCity(c)}
          >
            <span>{lang === 'hi' ? c.nameHi : c.nameEn}</span>
          </button>
        ))}
      </div>

      {/* DEDICATED LIVE CITY WEATHER & 7-DAY FORECAST CARD */}
      <section className="live-weather-card">
        <div className="live-weather-top-row">
          <div className="live-city-title">
            <MapPin size={22} color="#0284c7" />
            <h3>{localName}</h3>
            <span className="live-badge-live">
              <span className="pulse-dot" style={{ width: 6, height: 6, background: '#10b981', animation: 'none' }} /> LIVE
            </span>
          </div>
          <button className="location-btn" onClick={() => detectLocation(false)} style={{ height: 34, padding: '0 12px', fontSize: 11.5 }}>
            <RefreshCw size={13} className={localLoading ? 'spin' : ''} /> {t.myLocation}
          </button>
        </div>

        {cur ? (
          <div>
            <div className="live-weather-main-grid">
              <div className="live-temp-hero">
                <WeatherIcon code={cur.weather_code} size={56} />
                <div>
                  <div className="live-big-temp">{Math.round(cur.temperature_2m)}°C</div>
                  <div className="live-temp-desc">
                    <b>{weatherLabel(cur.weather_code)}</b>
                    <small>
                      {t.feelsLike} {Math.round(cur.apparent_temperature)}°C · {cur.relative_humidity_2m}% {t.humidity}
                    </small>
                  </div>
                </div>
              </div>

              <div className="live-metrics-strip">
                <div className="live-metric-box">
                  <span><Wind size={13} color="#0284c7" /> {t.wind}</span>
                  <strong>{Math.round(cur.wind_speed_10m)} km/h</strong>
                </div>
                <div className="live-metric-box">
                  <span><CloudRain size={13} color="#0d9488" /> {t.precip}</span>
                  <strong>{cur.precipitation} mm</strong>
                </div>
                <div className="live-metric-box">
                  <span><Thermometer size={13} color="#f59e0b" /> {t.pressure}</span>
                  <strong>{cur.surface_pressure ? Math.round(cur.surface_pressure) : 1012} hPa</strong>
                </div>
                <div className="live-metric-box">
                  <span><Cloud size={13} color="#6366f1" /> {t.cloudCover}</span>
                  <strong>{cur.cloud_cover ?? 10}%</strong>
                </div>
              </div>
            </div>

            {/* 7-Day Live Outlook Strip */}
            {daily?.time && (
              <div className="live-forecast-strip">
                {daily.time.slice(0, 7).map((dayTime, i) => (
                  <div key={dayTime} className="live-day-col">
                    <span className="day-name">{i === 0 ? (lang === 'hi' ? 'आज' : 'Today') : formatDayName(dayTime, lang)}</span>
                    <WeatherIcon code={daily.weather_code?.[i] ?? 0} size={26} />
                    <span className="temp-high">{Math.round(daily.temperature_2m_max?.[i] ?? 30)}°</span>
                    <span className="temp-low">{Math.round(daily.temperature_2m_min?.[i] ?? 20)}°</span>
                    <span className="rain-chance">
                      {daily.precipitation_probability_max?.[i] ?? 0}% rain
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="local-empty">
            <MapPin size={24} />
            <span>{localLoading ? t.fetchingWeather : t.searchCityPrompt}</span>
          </div>
        )}
      </section>

      {/* QUICK KPIS */}
      <section className="quick-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi card">
          <span>{t.overallReliability}</span>
          <strong>{pct(data?.kpis?.overallConfidence)}</strong>
          <small>{t.overallReliabilitySub}</small>
        </div>

        <div className="kpi card">
          <span>{t.mostUncertainDay}</span>
          <strong>Day {data?.kpis?.mostUncertainLeadDay}</strong>
          <small>{t.mostUncertainDaySub}</small>
        </div>

        <div className="kpi card danger-card">
          <span>{t.peakBustRisk}</span>
          <strong>{pct(data?.kpis?.maxBustProbability)}</strong>
          <small>{t.peakBustRiskSub}</small>
        </div>
      </section>

      {/* 10-DAY RELIABILITY TIMELINE */}
      <section className="section-head">
        <div>
          <span className="eyebrow">{t.reliabilityCurve}</span>
          <h2>Day 1 → Day 10 Outlook</h2>
          <p>{t.reliabilityCurveSub}</p>
        </div>
        <button className="link-btn" onClick={() => setPage('forecast')}>
          {t.openInspector} <ArrowRight size={15} />
        </button>
      </section>

      <div className="day-strip">
        {timeline.map((d) => (
          <button
            key={d.leadDay}
            className={leadDay === d.leadDay ? 'selected' : ''}
            onClick={() => setLeadDay(d.leadDay)}
          >
            <span>Day {d.leadDay}</span>
            <strong>{pct(d.confidence)}</strong>
            <small className={riskColor(d.bustProbability)}>
              {pct(d.bustProbability)} risk
            </small>
          </button>
        ))}
      </div>

      {/* DASHBOARD AI COPILOT & RISK REGIONS GRID */}
      <section className="two-col" style={{ gridTemplateColumns: '1fr 1.15fr', marginTop: 24, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="card-title">
              <span>
                <MapPin size={16} /> {t.highRiskRegions}
              </span>
              <button onClick={() => setPage('map')}>
                {t.openMap} <ArrowRight size={13} />
              </button>
            </div>
            <div className="region-list">
              {regions
                .slice()
                .sort((a, b) => b.bustProbability - a.bustProbability)
                .slice(0, 4)
                .map((r) => (
                  <button
                    key={r.region}
                    className="region-row"
                    onClick={() => {
                      setSelectedRegion(r.region);
                      setPage('forecast');
                    }}
                  >
                    <span>
                      <b>{r.regionName}</b>
                      <small>
                        {varLabel[r.dominantVariable] || r.dominantVariable} · Day{' '}
                        {r.leadDay}
                      </small>
                    </span>
                    <strong className={riskColor(r.bustProbability)}>
                      {pct(r.bustProbability)}
                    </strong>
                    <ArrowRight size={15} />
                  </button>
                ))}
            </div>
          </div>

          <div className="card selected-summary">
            <div className="card-title">
              <span>
                <Activity size={16} /> {t.activeRegionFocus}
              </span>
              <span className="chip">Day {selected?.leadDay}</span>
            </div>
            <h3>{selected?.regionName}</h3>
            <div className="big-risk">
              <div>
                <span>Bust Risk</span>
                <strong className={riskColor(selected?.bustProbability)}>
                  {pct(selected?.bustProbability)}
                </strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{pct(selected?.confidence)}</strong>
              </div>
            </div>
            <p>{selected?.riskLevel === 'Low' ? t.stableDesc : t.unstableDesc}</p>
          </div>
        </div>

        {/* EMBEDDED DASHBOARD AI COPILOT */}
        {aiAssistantProps && (
          <div style={{ display: 'flex', height: '100%' }}>
            <AiAssistantPanel {...aiAssistantProps} />
          </div>
        )}
      </section>

      {/* EMBEDDED LIVE RISK MAP SECTION (Direct in Overview) */}
      <section style={{ marginTop: 26 }}>
        <div className="section-head" style={{ marginBottom: 12 }}>
          <div>
            <span className="eyebrow" style={{ color: '#0284c7' }}>
              <MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              {t.navMap}
            </span>
            <h2 style={{ margin: '2px 0 0' }}>{t.mapTitle}</h2>
          </div>
          <button
            className="secondary"
            onClick={() => setPage('map')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {t.openMap} <ArrowRight size={14} />
          </button>
        </div>

        <IndiaRiskMapLeaflet
          regions={regions}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          leadDay={leadDay}
          setLeadDay={setLeadDay}
          setPage={setPage}
          riskColor={riskColor}
          height="480px"
          showControls={true}
          data={data}
          t={t}
        />
      </section>
    </>
  );
}

function DashboardForecast({
  t,
  data,
  detail,
  leadDay,
  setLeadDay,
  variable,
  setVariable,
  selected,
  selectedRegion,
  setSelectedRegion,
  riskColor,
  varLabel,
}) {
  return (
    <>
      <section className="page-hero forecast-theme">
        <div>
          <span className="eyebrow" style={{ color: '#7dd3fc' }}>
            {t.navForecast}
          </span>
          <h1>{t.forecastInspectorTitle}</h1>
          <p>{t.forecastInspectorSub}</p>
        </div>
        <div className="filters">
          <select value={variable} onChange={(e) => setVariable(e.target.value)}>
            {data.variables.map((v) => (
              <option key={v.id} value={v.id}>
                {varLabel[v.id] || v.label}
              </option>
            ))}
          </select>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            {data.regions.map((r) => (
              <option key={r.region} value={r.region}>
                {r.regionName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="compact-days">
        {data.leadDays.map((d) => (
          <button
            key={d}
            className={d === leadDay ? 'selected' : ''}
            onClick={() => setLeadDay(d)}
          >
            Day {d}
          </button>
        ))}
      </div>

      <section className="forecast-detail card">
        <div className="detail-title">
          <div>
            <span className="eyebrow">{selected?.regionName}</span>
            <h2>
              Day {leadDay} · {varLabel[variable] || variable}
            </h2>
            <p>{detail?.weatherRegime || 'Active Weather Pattern'}</p>
          </div>
          <div className={`risk-big ${riskColor(detail?.bustProbability)}`}>
            <span>Bust Risk Probability</span>
            <strong>{pct(detail?.bustProbability)}</strong>
          </div>
        </div>

        <div className="detail-grid">
          <Metric
            label={t.confidenceScore}
            value={pct(detail?.confidence)}
            icon={<ShieldCheck />}
          />
          <Metric
            label={t.histErrorRate}
            value={pct(detail?.historicalErrorFrequency)}
            icon={<History />}
          />
          <Metric
            label={t.forecastVal}
            value={`${detail?.forecastValue ?? '—'} ${
              data.variables.find((v) => v.id === variable)?.unit || ''
            }`}
            icon={<Activity />}
          />
          <Metric
            label={t.synopticRegime}
            value={detail?.weatherRegime || 'Standard'}
            icon={<Cloud />}
          />
        </div>

        <div className="why-box">
          <div className="why-title">
            <BrainCircuit size={19} /> {t.whyAtRisk}
          </div>
          {detail?.explanation?.meteorologicalInterpretation?.slice(0, 4).map(
            (x, i) => (
              <div className="why-row" key={i}>
                <span>{i + 1}</span>
                <p>{x.text}</p>
              </div>
            )
          ) || (
            <p>Meteorological explanation is currently being processed for this cell.</p>
          )}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   REUSABLE INTERACTIVE LEAFLET INDIA RISK MAP COMPONENT
========================================================= */
function IndiaRiskMapLeaflet({
  regions = [],
  selectedRegion,
  setSelectedRegion,
  leadDay,
  setLeadDay,
  setPage,
  riskColor,
  height = '560px',
  showControls = true,
  data = null,
  t,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapStyle, setMapStyle] = useState('voyager');

  const tileURLs = {
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };

  const tileLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.8, 80.5],
      zoom: 4.6,
      minZoom: 4,
      maxZoom: 9,
      zoomControl: true,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer(tileURLs[mapStyle], {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Critical: Invalidate size after layout calculations to ensure full rendering
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(tileURLs[mapStyle]);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const activeList = regions && regions.length > 0 ? regions : [];

    activeList.forEach((r) => {
      const p = Number(r.bustProbability ?? 0.3);
      const riskCls = riskColor ? riskColor(p) : (p >= 0.5 ? 'danger' : p >= 0.25 ? 'warn' : 'safe');
      const isSelected = selectedRegion === r.region;

      const markerHtml = `
        <div class="clay-marker-node ${isSelected ? 'selected' : ''}">
          <div class="clay-marker-pin ${riskCls}">
            <div class="clay-marker-pulse"></div>
          </div>
          <div class="clay-marker-badge">
            <b>${r.regionName}</b>
            <span class="${riskCls}">${pct(p)} Risk</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-clay-div-icon',
        html: markerHtml,
        iconSize: [96, 56],
        iconAnchor: [48, 18],
      });

      const marker = L.marker([r.lat, r.lon], { icon }).addTo(map);

      const popupHtml = `
        <div class="clay-popup-card">
          <div class="clay-popup-head">
            <h4>${r.regionName}</h4>
            <span class="clay-popup-tag ${riskCls}">${pct(p)} Risk</span>
          </div>
          <div class="clay-popup-grid">
            <div class="clay-popup-box">
              <span>Confidence</span>
              <strong>${pct(r.confidence)}</strong>
            </div>
            <div class="clay-popup-box">
              <span>Weather Regime</span>
              <strong>${r.weatherRegime || 'Active'}</strong>
            </div>
          </div>
          <button id="inspect-${r.region}" class="clay-popup-btn">
            Inspect Region Details →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: 'clay-leaflet-popup',
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`inspect-${r.region}`);
        if (btn) {
          btn.onclick = () => {
            if (setSelectedRegion) setSelectedRegion(r.region);
            if (setPage) setPage('forecast');
          };
        }
      });

      marker.on('click', () => {
        if (setSelectedRegion) setSelectedRegion(r.region);
      });

      markersRef.current.push(marker);
    });
  }, [regions, selectedRegion, leadDay]);

  return (
    <div className="map-card card" style={{ padding: 18 }}>
      {showControls && (
        <div className="map-controls-top">
          {data?.leadDays && setLeadDay && (
            <div className="day-picker">
              {data.leadDays.slice(0, 7).map((d) => (
                <button
                  className={d === leadDay ? 'active' : ''}
                  key={d}
                  onClick={() => setLeadDay(d)}
                >
                  Day {d}
                </button>
              ))}
            </div>
          )}

          <div className="map-style-toggles">
            <button
              className={mapStyle === 'voyager' ? 'active' : ''}
              onClick={() => setMapStyle('voyager')}
            >
              Voyager Topo
            </button>
            <button
              className={mapStyle === 'osm' ? 'active' : ''}
              onClick={() => setMapStyle('osm')}
            >
              Standard OSM
            </button>
            <button
              className={mapStyle === 'dark' ? 'active' : ''}
              onClick={() => setMapStyle('dark')}
            >
              Night Satellite
            </button>
          </div>
        </div>
      )}

      <div className="leaflet-container-wrap">
        <div ref={mapContainerRef} className="leaflet-map-element" style={{ height }} />
        <div className="radar-scan-overlay" />
      </div>

      <div className="map-legend">
        <span>
          <i className="safe" /> {t?.safeLegend || 'Safe (<25%)'}
        </span>
        <span>
          <i className="warn" /> {t?.warnLegend || 'Moderate (25%-50%)'}
        </span>
        <span>
          <i className="danger" /> {t?.dangerLegend || 'High Risk (>50%)'}
        </span>
      </div>
    </div>
  );
}

function RiskMap({
  t,
  data,
  regions,
  leadDay,
  setLeadDay,
  selectedRegion,
  setSelectedRegion,
  setPage,
  riskColor,
}) {
  return (
    <>
      <section className="page-hero map-theme">
        <div>
          <span className="eyebrow" style={{ color: '#6ee7b7' }}>
            {t.navMap}
          </span>
          <h1>{t.mapTitle}</h1>
          <p>{t.mapSub}</p>
        </div>
      </section>

      <IndiaRiskMapLeaflet
        regions={regions}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        leadDay={leadDay}
        setLeadDay={setLeadDay}
        setPage={setPage}
        riskColor={riskColor}
        height="580px"
        showControls={true}
        data={data}
        t={t}
      />
    </>
  );
}

function HistoryPage({ t, historical, data }) {
  const byLead = historical?.byLead || [];
  return (
    <>
      <section className="page-hero history-theme">
        <div>
          <span className="eyebrow" style={{ color: '#fde68a' }}>
            {t.navHistory}
          </span>
          <h1>{t.historyTitle}</h1>
          <p>{t.historySub}</p>
        </div>
        <div className="page-hero-aside">
          <History size={44} color="#fde68a" />
          <div>
            <span>Verified Runs</span>
            <strong>30 Epochs</strong>
            <small>Chronological Split</small>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 26 }}>
        <div className="section-head" style={{ marginBottom: 20 }}>
          <div>
            <h3>Error Compounding By Forecast Lead Day</h3>
            <p>Empirical normalized error and bust rate across medium range lead times.</p>
          </div>
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Lead Day</th>
                <th>Mean Normalized Error</th>
                <th>Bust Rate (%)</th>
                <th>Reliability Assessment</th>
              </tr>
            </thead>
            <tbody>
              {byLead.map((h) => (
                <tr key={h.leadDay}>
                  <td><b>Day {h.leadDay}</b></td>
                  <td>{Number(h.meanNormalizedError).toFixed(3)}</td>
                  <td>
                    <span className={`badge ${h.bustRate > 0.2 ? 'danger' : h.bustRate > 0.1 ? 'warn' : 'safe'}`}>
                      {pct(h.bustRate)}
                    </span>
                  </td>
                  <td>{h.bustRate < 0.15 ? 'Highly Reliable' : 'Elevated Divergence'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ModelPage({ t, model }) {
  const ml = model?.ml || {};
  const bl = model?.baseline || {};
  return (
    <>
      <section className="page-hero model-theme">
        <div>
          <span className="eyebrow" style={{ color: '#c7d2fe' }}>
            {t.navModel}
          </span>
          <h1>{t.modelTitle}</h1>
          <p>{t.modelSub}</p>
        </div>
        <div className="page-hero-aside">
          <BrainCircuit size={44} color="#c7d2fe" />
          <div>
            <span>ML F1-Score</span>
            <strong>{Number(ml.f1 || 0.65).toFixed(2)}</strong>
            <small>Baseline: {Number(bl.f1 || 0.42).toFixed(2)}</small>
          </div>
        </div>
      </section>

      <section className="two-col">
        <div className="card" style={{ padding: 24 }}>
          <h3>Model Classification Metrics</h3>
          <div className="detail-grid" style={{ marginTop: 16 }}>
            <Metric label="Test Samples" value={model?.samples?.test || '20'} icon={<Activity />} />
            <Metric label="ML Precision" value={Number(ml.precision || 0.68).toFixed(2)} icon={<ShieldCheck />} />
            <Metric label="ML Recall" value={Number(ml.recall || 0.72).toFixed(2)} icon={<Eye />} />
            <Metric label="Decision Threshold" value="0.32" icon={<Gauge />} />
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3>Pipeline Architecture</h3>
          <ul style={{ lineHeight: 1.8, fontSize: '13px', color: '#475569', paddingLeft: 20 }}>
            <li>Numerical Ensemble Spread (Z-normalized)</li>
            <li>Synoptic Pressure Tendencies & Precipitation Gradients</li>
            <li>Convective Available Potential Instability Index</li>
            <li>Cell Historical Error Drift Frequency</li>
          </ul>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
