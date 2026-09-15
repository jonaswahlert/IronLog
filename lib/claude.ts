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

export type ProgramMachine = { name: string; muscleGroup: string | null };

// Raw shape the model is asked to return: a machine INDEX (into the numbered
// list we give it), not a name — the model's own text is never trusted as an
// exercise name, so it can't hallucinate a machine that isn't registered.
type RawProgramExercise = { machineIndex: number; sets?: number; reps?: string; restSec?: number; tip?: string };
type RawProgramDay = { dayNumber: number; name: string; isRest: boolean; type: string; exercises: RawProgramExercise[] };

export async function generateProgram(params: {
  goal: string;
  daysPerWeek: number;
  minutesPerSession: number;
  machines: ProgramMachine[];
  language: 'sv' | 'en';
}): Promise<{ days: ProgramDay[]; error?: string }> {
  const { goal, daysPerWeek, minutesPerSession, machines, language } = params;
  const numEx = minutesPerSession <= 30 ? '3-4' : minutesPerSession <= 45 ? '4-5' : minutesPerSession <= 60 ? '5-6' : '6-8';
  const numbered = machines.slice(0, 40);
  const machineList = numbered.map((m, i) => `${i + 1}. ${m.name}${m.muscleGroup ? ` (${m.muscleGroup})` : ''}`).join('\n');

  const prompt = language === 'sv'
    ? `Du är en personlig tränare. Skapa ett träningsprogram.

Mål: ${goal}
Pass per vecka: ${daysPerWeek}
Tid per pass: ${minutesPerSession} minuter

Tillgängliga maskiner (numrerade, med muskelgrupp inom parentes):
${machineList}

Svara BARA med JSON, ingen markdown, ingen förklaring. Referera varje övning med "machineIndex" (numret från listan ovan) — INTE med namn:
{"days":[{"dayNumber":1,"name":"Måndag","isRest":false,"type":"Tryckmuskler","exercises":[{"machineIndex":1,"sets":3,"reps":"10-12","restSec":90,"tip":"Håll rygg mot sitsen"}]},{"dayNumber":2,"name":"Tisdag","isRest":true,"type":"Vila","exercises":[]}]}

Regler: exakt 7 dagar, ${daysPerWeek} träningsdagar fördelade jämnt, ${numEx} övningar per pass, tryck/drag/ben-uppdelning. VIKTIGT: "machineIndex" måste vara ett nummer från listan ovan (1 till ${numbered.length}) — hitta inte på egna nummer eller namn. Om listan har färre maskiner än vad som behövs, återanvänd samma flera gånger istället för att hitta på nya.`
    : `You are a personal trainer. Create a training program.

Goal: ${goal}
Sessions per week: ${daysPerWeek}
Time per session: ${minutesPerSession} minutes

Available machines (numbered, with muscle group in parentheses):
${machineList}

Respond ONLY with JSON, no markdown, no explanation. Reference each exercise by "machineIndex" (the number from the list above) — NOT by name:
{"days":[{"dayNumber":1,"name":"Monday","isRest":false,"type":"Push muscles","exercises":[{"machineIndex":1,"sets":3,"reps":"10-12","restSec":90,"tip":"Keep back against pad"}]},{"dayNumber":2,"name":"Tuesday","isRest":true,"type":"Rest","exercises":[]}]}

Rules: exactly 7 days, ${daysPerWeek} training days spread evenly, ${numEx} exercises per session, push/pull/legs split. IMPORTANT: "machineIndex" must be a number from the list above (1 to ${numbered.length}) — do not invent your own numbers or names. If the list has fewer machines than needed, reuse the same ones across multiple sessions/days instead of making up new ones.`;

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
    if (!match) return { days: [], error: 'Could not parse AI response' };

    let parsed: { days?: RawProgramDay[] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { days: [], error: 'Could not parse AI response' };
    }
    if (!Array.isArray(parsed.days)) return { days: [], error: 'Could not parse AI response' };

    // Resolve machineIndex -> the real, registered machine. Any exercise
    // referencing an out-of-range index is dropped rather than kept with a
    // hallucinated or missing name — this is what actually guarantees every
    // exercise in the result is a machine the user has registered.
    const days: ProgramDay[] = parsed.days.map((d) => {
      const exercises: ProgramExercise[] = (d.exercises ?? [])
        .map((ex): ProgramExercise | null => {
          const machine = numbered[ex.machineIndex - 1];
          if (!machine) return null;
          return {
            name: machine.name,
            sets: typeof ex.sets === 'number' && ex.sets > 0 ? ex.sets : 3,
            reps: ex.reps || '10-12',
            restSec: typeof ex.restSec === 'number' && ex.restSec > 0 ? ex.restSec : 90,
            tip: ex.tip ?? '',
          };
        })
        .filter((ex): ex is ProgramExercise => ex !== null);

      // Muscle groups shown for the day are computed from the machines
      // actually used (after filtering above), not trusted from the model.
      const usedMachines = (d.exercises ?? [])
        .map((ex) => numbered[ex.machineIndex - 1])
        .filter((m): m is ProgramMachine => !!m);
      const muscles = [...new Set(usedMachines.map((m) => m.muscleGroup).filter(Boolean))].join('  ·  ');

      return {
        dayNumber: d.dayNumber,
        name: d.name,
        isRest: d.isRest || exercises.length === 0,
        type: d.type,
        muscles,
        exercises,
      };
    });

    return { days };
  } catch (e: any) {
    return { days: [], error: e?.message ?? 'Network error' };
  }
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
