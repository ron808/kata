import { nanoid } from "nanoid";
import { complete, isGroqConfigured } from "@/lib/ai/groq";
import { QUESTION_BANK, type QuestionTag } from "@/lib/questions/bank";
import { ROLE_PRESETS } from "@/lib/roles";
import type { RoleKey, TemplateField } from "@/lib/types";
import { GroqTemplateSchema } from "./schemas";
import { joinList } from "./text";

export interface SuggestedTemplate {
  name: string;
  description: string;
  fields: TemplateField[];
}

const ROLE_WORDS: [RoleKey, RegExp][] = [
  ["developer", /\b(?:code|coding|developer|engineer\w*|programm\w*|software|ship(?:ping)?|prs?|pull requests?|bugs?|deploy\w*|backend|frontend|devops)\b/gi],
  ["designer", /\b(?:design\w*|figma|ux|ui|prototyp\w*|wireframes?|illustrat\w*|branding)\b/gi],
  ["founder", /\b(?:startup|founder|ceo|company|investors?|fundrais\w*|customers?|clients?|revenue|co-?founder|business(?:es)?|shop|store|bakery|caf[eé]|restaurant|studio)\b/gi],
  ["job_seeker", /\b(?:job|jobs|interview\w*|applications?|applying|resume|cv|recruiters?|job hunt|job search|laid off)\b/gi],
  ["student", /\b(?:study|studying|exams?|class(?:es)?|courses?|university|college|school|thesis|homework|lectures?|grades?)\b/gi],
  ["freelancer", /\b(?:freelanc\w*|self-employed|invoic\w*|contract work|gigs?|commissions?)\b/gi],
  ["teacher", /\b(?:teach\w*|classroom|lessons?|pupils|marking|my students|my class)\b/gi],
  ["healthcare", /\b(?:nurs\w*|doctors?|hospital|clinic|patients?|ward|healthcare|medic\w*|paramedic|pharmac\w*)\b/gi],
  ["shift_worker", /\b(?:shifts?|rota|nights|warehouse|retail|bar work|kitchen|driver|delivery|factory|cashier)\b/gi],
  ["creative", /\b(?:artist|art|music\w*|paint\w*|draw\w*|singer|band|writer|poet\w*|craft\w*|pottery|knit\w*|sculpt\w*)\b/gi],
  ["parent", /\b(?:kids?|children|baby|toddler|parent\w*|mum|mom|dad|caring for|carer|school run|nursery)\b/gi],
  ["athlete", /\b(?:train(?:ing)? for|marathon|races?|athlet\w*|triathlon|swim\w*|cycl\w*|matches|coach)\b/gi],
  ["wellbeing", /\b(?:anxi\w*|stress\w*|burn(?:ed|t)? out|burnout|therap\w*|wellbeing|self-care|recover\w*|mental health)\b/gi],
  ["retired", /\b(?:retired|retirement|pension\w*|grandchildren|grandkids|volunteer\w*)\b/gi],
];

const TOPIC_WORDS: [QuestionTag, RegExp][] = [
  ["sleep", /\b(?:sleep\w*|insomnia|tired|bedtime)\b/i],
  // "I run a bakery" is work, not exercise: "run" counts only when it isn't running something.
  ["fitness", /\b(?:gym|runs?(?!\s+(?:a|an|the|my|our|this|that)\b)|running(?!\s+(?:a|an|the|my|our|this|that)\b)|workouts?|fitness|exercis\w*|marathon|training|lift\w*|yoga)\b/i],
  ["food", /\b(?:eat\w*|food|diet|cook\w*|meals?|nutrition)\b/i],
  ["mood", /\b(?:mood|anxi\w*|stress\w*|feelings?|mental health|emotions?)\b/i],
  ["gratitude", /\b(?:grateful|gratitude|thankful)\b/i],
  ["focus", /\b(?:focus\w*|distract\w*|deep work|attention|procrastinat\w*)\b/i],
  ["money", /\b(?:money|budget\w*|spend\w*|saving|savings|financ\w*)\b/i],
  ["writing", /\b(?:writ\w*|blog\w*|novel|essays?|newsletter)\b/i],
  ["learning", /\b(?:learn\w*|reading|books?|course)\b/i],
  ["family", /\b(?:family|kids|parent\w*|mom|mum|dad)\b/i],
  ["friends", /\b(?:friends?|social)\b/i],
  ["love", /\b(?:partner|relationship|marriage|wife|husband|dating)\b/i],
  ["health", /\b(?:health|doctor|recovery|injur\w*|pain)\b/i],
  ["creativity", /\b(?:creative|creativity|art|draw\w*|paint\w*|photograph\w*)\b/i],
  ["music", /\b(?:music|guitar|piano|sing\w*|band|choir)\b/i],
  ["reading", /\b(?:read\w*|books?|novels?)\b/i],
  ["kids", /\b(?:kids?|children|baby|toddler|school run)\b/i],
  ["caring", /\b(?:caring for|carer|looking after)\b/i],
  ["pets", /\b(?:dogs?|cats?|pets?|puppy|kitten)\b/i],
  ["nature", /\b(?:garden\w*|hik\w*|outdoors|nature|plants?)\b/i],
  ["home", /\b(?:home|house|flat|chores|cleaning)\b/i],
  ["travel", /\b(?:travel\w*|trips?|holiday|vacation)\b/i],
  ["rest", /\b(?:rest|day off|naps?)\b/i],
  ["faith", /\b(?:faith|church|mosque|temple|prayer|pray\w*)\b/i],
  ["community", /\b(?:volunteer\w*|community|neighbou?rs?)\b/i],
];

/** No model: the closest role preset, plus a few questions from the bank for what else they mentioned. */
function fromKeywords(description: string): SuggestedTemplate {
  const scores = ROLE_WORDS.map(([key, re]) => [key, description.match(re)?.length ?? 0] as const);
  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a), ["custom", 0] as const);
  const preset = ROLE_PRESETS.find((p) => p.key === best[0]) ?? ROLE_PRESETS[ROLE_PRESETS.length - 1];
  const topics = TOPIC_WORDS.filter(([, re]) => re.test(description)).map(([tag]) => tag).slice(0, 3);
  const extra = topics.flatMap((tag) => {
    const q = QUESTION_BANK.find((b) => b.tags[0] === tag && !b.text.includes("{thread}") && b.when === "evening");
    return q ? [q.text] : [];
  });
  const fields: TemplateField[] = [
    ...preset.fields.map((f) => ({ ...f, config: { ...f.config } })),
    ...extra.map((label) => ({ type: "long_text" as const, label, required: false, config: {} })),
  ].map((f, i) => ({ ...f, id: nanoid(8), order: i }));
  const named = topics.map((t) => t.replace(/-/g, " "));
  return {
    name: preset.key === "custom" ? "Daily page" : `${preset.name} page`,
    description: named.length ? `${preset.description} With questions on ${joinList(named)}.` : preset.description,
    fields,
  };
}

const SYSTEM = `You design a short daily journal page for one person, from their description.
Return JSON only: {"name":"...","description":"...","fields":[{"type":"...","label":"...","required":false,"config":{}}]}
Field types: short_text, long_text, mood_slider, energy, number, tags, yes_no, rating, link.
Rules:
- 3 to 7 fields. The first is a long_text question about the day and is required.
- Labels are short, specific questions in sentence case. No emoji, no exclamation marks.
- number fields may set config.unit, config.min, config.max. tags fields may set config.freeForm to true.
- name: 2 to 4 words. description: one plain sentence.`;

async function fromGroq(description: string): Promise<SuggestedTemplate | null> {
  try {
    const completion = await complete(
      {
        temperature: 0.3,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: description },
        ],
      },
      { timeout: 6000 }
    );
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = GroqTemplateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const clean = (s: string) => s.replace(/!/g, ".").replace(/\p{Extended_Pictographic}/gu, "").trim();
    return {
      name: clean(parsed.data.name),
      description: clean(parsed.data.description),
      fields: parsed.data.fields.map((f, i) => ({
        id: nanoid(8),
        type: f.type,
        label: clean(f.label),
        required: f.required,
        order: i,
        config: f.config,
      })),
    };
  } catch {
    return null;
  }
}

export async function suggestTemplate(description: string): Promise<SuggestedTemplate> {
  return (isGroqConfigured() ? await fromGroq(description) : null) ?? fromKeywords(description);
}
