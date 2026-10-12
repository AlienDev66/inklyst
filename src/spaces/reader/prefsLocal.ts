const MUTE_KEY = "inklyst.mute.v1";

export type MutePrefs = {
  genres: string[];
  tags: string[];
  editionIds: string[];
};

function read(): MutePrefs {
  try {
    const raw = localStorage.getItem(MUTE_KEY);
    if (!raw) return { genres: [], tags: [], editionIds: [] };
    const parsed = JSON.parse(raw) as MutePrefs;
    return {
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      editionIds: Array.isArray(parsed.editionIds) ? parsed.editionIds : [],
    };
  } catch {
    return { genres: [], tags: [], editionIds: [] };
  }
}

function write(prefs: MutePrefs) {
  localStorage.setItem(MUTE_KEY, JSON.stringify(prefs));
}

export function getMutePrefs() {
  return read();
}

export function muteEdition(editionId: string, genre?: string, tags?: string[]) {
  const prefs = read();
  if (!prefs.editionIds.includes(editionId)) prefs.editionIds.push(editionId);
  if (genre && !prefs.genres.includes(genre.toLowerCase())) {
    prefs.genres.push(genre.toLowerCase());
  }
  for (const tag of tags ?? []) {
    const key = tag.toLowerCase();
    if (!prefs.tags.includes(key)) prefs.tags.push(key);
  }
  write(prefs);
  return prefs;
}

export function isMuted(
  edition: { id: string; genre?: string; tags?: string[] },
  prefs = read(),
) {
  if (prefs.editionIds.includes(edition.id)) return true;
  const genre = (edition.genre || "").toLowerCase();
  if (genre && prefs.genres.includes(genre)) return true;
  for (const tag of edition.tags ?? []) {
    if (prefs.tags.includes(tag.toLowerCase())) return true;
  }
  return false;
}
