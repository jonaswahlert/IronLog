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
