const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_URL = GEMINI_BASE;

async function geminiVision(base64: string, prompt: string): Promise<string> {
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.1 },
      }),
    });
    const data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    return `__ERROR__: ${JSON.stringify(data.error ?? data)}`;
  } catch (e: any) {
    return `__ERROR__: ${e?.message ?? 'Network error'}`;
  }
}

export async function identifyMachine(base64: string): Promise<{ machine_type: string; confidence: number; muscle_group: string; error?: string }> {
  const text = await geminiVision(base64,
    'Identify this gym machine. Look for any name plate, label, or text on the machine first — that is the most reliable source. If no text visible, identify from shape and design.\nRespond with ONLY a JSON object, no markdown or explanation:\n{"machine_type":"Cable Chest Press","confidence":90,"muscle_group":"Bröst"}\nAlways use English machine names (e.g. "Cable Chest Press", "Lat Pulldown", "Leg Press", "Chest Fly", "Shoulder Press"). muscle_group must be one of these Swedish values: Bröst, Rygg, Axlar, Biceps, Triceps, Ben, Rumpa, Mage, Cardio, Övrigt.'
  );
  if (text.startsWith('__ERROR__:')) {
    return { machine_type: '', confidence: 0, muscle_group: 'Övrigt', error: text.slice(10).trim() };
  }
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return { machine_type: '', confidence: 0, muscle_group: 'Övrigt' };
}

export async function readNameplateText(base64: string): Promise<{ text: string; error?: string }> {
  const raw = await geminiVision(base64,
    'This is a close-up photo of a gym machine\'s name plate or label. Read the exact text printed on it — this is the machine\'s official model name. Ignore brand/manufacturer logos unless no other text exists. Respond with ONLY the exact name text, nothing else — no JSON, no quotes, no explanation. If no readable text is visible, respond with exactly: NONE'
  );
  if (raw.startsWith('__ERROR__:')) {
    return { text: '', error: raw.slice(10).trim() };
  }
  const cleaned = raw.trim().replace(/^["'“”]|["'“”]$/g, '');
  if (!cleaned || cleaned.toUpperCase() === 'NONE') {
    return { text: '' };
  }
  return { text: cleaned };
}

// ── Program generator (text-only, no image) ──────────────────
export type ProgramExercise = {
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  tip: string;
};

export type ProgramDay = {
  dayNumber: number;
  name: string;
  isRest: boolean;
  type: string;
  muscles: string;
  exercises: ProgramExercise[];
};

export async function generateProgram(params: {
  goal: string;
  daysPerWeek: number;
  minutesPerSession: number;
  machines: string[];
  language: 'sv' | 'en';
}): Promise<{ days: ProgramDay[]; error?: string }> {
  const { goal, daysPerWeek, minutesPerSession, machines, language } = params;
  const numEx = minutesPerSession <= 30 ? '3-4' : minutesPerSession <= 45 ? '4-5' : minutesPerSession <= 60 ? '5-6' : '6-8';
  const machineList = machines.length > 0
    ? machines.slice(0, 20).join(', ')
    : language === 'sv'
      ? 'Bröstpress, Lat-drag, Benpress, Axelpress, Kabeldrag, Benextension, Höfttryck, Löpband, Motionscykel'
      : 'Chest Press, Lat Pulldown, Leg Press, Shoulder Press, Cable Row, Leg Extension, Hip Thrust, Treadmill, Stationary Bike';

  const prompt = language === 'sv'
    ? `Du är en personlig tränare. Skapa ett träningsprogram.

Mål: ${goal}
Pass per vecka: ${daysPerWeek}
Tid per pass: ${minutesPerSession} minuter
Tillgängliga maskiner: ${machineList}

Svara BARA med JSON, ingen markdown, ingen förklaring:
{"days":[{"dayNumber":1,"name":"Måndag","isRest":false,"type":"Tryckmuskler","muscles":"Bröst · Axlar · Baksida arm","exercises":[{"name":"Bröstpress","sets":3,"reps":"10-12","restSec":90,"tip":"Håll rygg mot sitsen"}]},{"dayNumber":2,"name":"Tisdag","isRest":true,"type":"Vila","muscles":"","exercises":[]}]}

Regler: exakt 7 dagar, ${daysPerWeek} träningsdagar fördelade jämnt, ${numEx} övningar per pass, övningsnamn på svenska, tryck/drag/ben-uppdelning.`
    : `You are a personal trainer. Create a training program.

Goal: ${goal}
Sessions per week: ${daysPerWeek}
Time per session: ${minutesPerSession} minutes
Available machines: ${machineList}

Respond ONLY with JSON, no markdown, no explanation:
{"days":[{"dayNumber":1,"name":"Monday","isRest":false,"type":"Push muscles","muscles":"Chest · Shoulders · Triceps","exercises":[{"name":"Chest Press","sets":3,"reps":"10-12","restSec":90,"tip":"Keep back against pad"}]},{"dayNumber":2,"name":"Tuesday","isRest":true,"type":"Rest","muscles":"","exercises":[]}]}

Rules: exactly 7 days, ${daysPerWeek} training days spread evenly, ${numEx} exercises per session, push/pull/legs split.`;

  try {
    const res = await fetch(GEMINI_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      }),
    });
    const data = await res.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { days: [], error: JSON.stringify(data.error ?? data) };
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.days)) return { days: parsed.days };
      } catch {}
    }
    return { days: [], error: 'Could not parse AI response' };
  } catch (e: any) {
    return { days: [], error: e?.message ?? 'Network error' };
  }
}

export async function readWeightFromImage(base64: string): Promise<{ weight_kg: number; confidence: number; label: string; error?: string }> {
  const text = await geminiVision(base64,
    'Look at this gym weight setting. Two cases:\n1. Weight STACK (pin selector): find the pin/clip/selector and read the kg value shown. If both kg and lbs, use kg.\n2. Loose PLATES on a bar or machine: count and sum all visible plates. Color coding: grey=5kg, green=10kg, yellow=15kg, blue=20kg, red=25kg. Sum both sides.\nRespond with ONLY a JSON object:\n{"weight_kg":45,"confidence":90,"label":"Weight stack · Pin"}\nor\n{"weight_kg":60,"confidence":85,"label":"Plates · 2×blue + 2×green"}'
  );
  if (text.startsWith('__ERROR__:')) {
    return { weight_kg: 0, confidence: 0, label: '', error: text.slice(10).trim() };
  }
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return { weight_kg: 0, confidence: 0, label: '' };
}

// ── Cardio machine display reading ────────────────────────
export type CardioReading = {
  distance_km?: number;
  duration_min?: number;
  avg_speed_kmh?: number;
  avg_heart_rate?: number;
  calories?: number;
  floors_climbed?: number;
  incline_pct?: number;
  confidence: number;
  error?: string;
};

export async function readCardioDisplay(base64: string): Promise<CardioReading> {
  const text = await geminiVision(base64,
    'Look at this cardio machine\'s console/display (treadmill, stair climber, exercise bike, elliptical, rowing machine, etc.), photographed right after finishing a workout. Read whichever of these values are actually visible on the display — leave out any field that is not shown, do not guess:\n- distance_km (total distance in km; convert from miles if shown as mi)\n- duration_min (elapsed workout time in minutes)\n- avg_speed_kmh (average speed/pace in km/h; convert from mph if shown)\n- avg_heart_rate (average or current heart rate in bpm)\n- calories (calories burned)\n- floors_climbed (floors or flights climbed — stair machines only)\n- incline_pct (incline percentage or resistance/level shown)\nRespond with ONLY a JSON object containing just the fields that are actually visible on the display, plus a confidence 0-100 for how clearly the display could be read:\n{"distance_km":5.2,"duration_min":30,"avg_heart_rate":142,"calories":310,"confidence":85}'
  );
  if (text.startsWith('__ERROR__:')) {
    return { confidence: 0, error: text.slice(10).trim() };
  }
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return { confidence: 0 };
}

// ── Body progress comparison (two photos) ─────────────────
export type BodyPart = {
  name: string;
  change_text: string;
  change_pct: number;
};

export async function compareBodyPhotos(params: {
  base64Before: string;
  base64After: string;
  language: 'sv' | 'en';
}): Promise<{ parts: BodyPart[]; overall: string; error?: string }> {
  const { base64Before, base64After, language } = params;

  const prompt = language === 'sv'
    ? `Jämför dessa två kroppsbilder (Bild 1 = före, Bild 2 = efter), tagna vid olika tillfällen. För varje kroppsdel som syns tydligt i båda bilderna (t.ex. Axlar, Bröst, Armar, Mage, Ben — ta bara med de som faktiskt syns i bilderna), ge:\n1. En kort beskrivning av den synliga skillnaden ("Ingen tydlig skillnad" om ingen syns)\n2. En ungefärlig UPPSKATTAD procentuell förändring (kan vara negativ) — detta är en visuell gissning, inte ett exakt mått\n\nSvara BARA med JSON, ingen markdown:\n{"parts":[{"name":"Axlar","change_text":"Ser bredare och mer definierade ut","change_pct":8}],"overall":"Kort sammanfattning av helhetsintrycket"}\n\nViktigt: detta är en grov AI-uppskattning baserad på foton, inte en exakt mätning — låt procenttalen spegla den osäkerheten (normalt små värden, ungefär -10 till +15, om det inte är en dramatisk skillnad).`
    : `Compare these two body photos (Image 1 = before, Image 2 = after), taken at different times. For each body part clearly visible in both images (e.g. Shoulders, Chest, Arms, Waist, Legs — only include ones actually visible), give:\n1. A short description of the visible difference ("No clear difference" if none)\n2. A rough ESTIMATED percentage change (can be negative) — this is a visual guess, not an exact measurement\n\nRespond ONLY with JSON, no markdown:\n{"parts":[{"name":"Shoulders","change_text":"Look broader and more defined","change_pct":8}],"overall":"Short summary of the overall impression"}\n\nImportant: this is a rough AI estimate based on photos, not an exact measurement — let the percentages reflect that uncertainty (typically small values, roughly -10 to +15, unless the difference is dramatic).`;

  try {
    const res = await fetch(GEMINI_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Before } },
            { inline_data: { mime_type: 'image/jpeg', data: base64After } },
          ],
        }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }),
    });
    const data = await res.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { parts: [], overall: '', error: JSON.stringify(data.error ?? data) };
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.parts)) return { parts: parsed.parts, overall: parsed.overall ?? '' };
      } catch {}
    }
    return { parts: [], overall: '', error: 'Could not parse AI response' };
  } catch (e: any) {
    return { parts: [], overall: '', error: e?.message ?? 'Network error' };
  }
}
