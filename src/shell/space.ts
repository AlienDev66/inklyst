export type InklystSpace = "reader" | "studio";
export type OnboardingIntent = "read" | "write" | "both";

const SPACE_KEY = "inklyst.preferred_space";

export function parseSpace(value: string | null | undefined): InklystSpace | null {
  if (value === "reader" || value === "studio") return value;
  return null;
}

export function spaceFromIntent(intent: OnboardingIntent | null | undefined): InklystSpace {
  if (intent === "write") return "studio";
  return "reader";
}

export function readSpaceFromUrl(): InklystSpace | null {
  if (typeof window === "undefined") return null;
  return parseSpace(new URLSearchParams(window.location.search).get("space"));
}

export function readEditionFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("edition") ?? "";
}

export function readLocalPreferredSpace(): InklystSpace | null {
  if (typeof localStorage === "undefined") return null;
  return parseSpace(localStorage.getItem(SPACE_KEY));
}

export function writeLocalPreferredSpace(space: InklystSpace) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SPACE_KEY, space);
}

/** Sync space (+ optional edition) into the URL without full navigation. */
export function pushSpaceUrl(space: InklystSpace, opts?: { edition?: string; demo?: boolean }) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("space", space);
  if (opts?.edition) url.searchParams.set("edition", opts.edition);
  else url.searchParams.delete("edition");
  if (opts?.demo) url.searchParams.set("demo", "1");
  else if (space !== "reader") url.searchParams.delete("demo");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function readerEditionUrl(editionId: string) {
  const url = new URL(typeof window !== "undefined" ? window.location.href : "http://localhost/");
  url.searchParams.set("space", "reader");
  url.searchParams.set("edition", editionId);
  return `${url.pathname}${url.search}`;
}

export function resolveInitialSpace(preferred?: InklystSpace | null, intent?: OnboardingIntent | null): InklystSpace {
  const fromUrl = readSpaceFromUrl();
  if (fromUrl) return fromUrl;
  if (readEditionFromUrl()) return "reader";
  if (preferred) return preferred;
  const local = readLocalPreferredSpace();
  if (local) return local;
  return spaceFromIntent(intent);
}
