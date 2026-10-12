export const ADVISOR_KINDS = [
  "question",
  "gap",
  "continuity",
  "return",
] as const;

export type AdvisorKind = (typeof ADVISOR_KINDS)[number];

export type AdvisorNote = {
  kind: AdvisorKind;
  prompt: string;
};

const FORBIDDEN_KEYS = [
  "rewrite",
  "prose",
  "continuation",
  "paragraph",
  "replacement",
  "text_to_insert",
  "chapter",
  "body",
];

const MAX_PROMPT = 400;

export function parseAdvisorNote(input: unknown): AdvisorNote {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("advisor payload refused");
  }

  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error("advisor prose refused");
    }
  }

  const kind = record.kind;
  const prompt = record.prompt;
  if (typeof kind !== "string" || !ADVISOR_KINDS.includes(kind as AdvisorKind)) {
    throw new Error("advisor kind refused");
  }
  if (typeof prompt !== "string") {
    throw new Error("advisor prompt refused");
  }

  const trimmed = prompt.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_PROMPT) {
    throw new Error("advisor prompt refused");
  }

  return { kind: kind as AdvisorKind, prompt: trimmed };
}
