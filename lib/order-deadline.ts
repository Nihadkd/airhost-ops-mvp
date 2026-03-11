const DEADLINE_PREFIX = "[[DEADLINE_AT=";
const DEADLINE_SUFFIX = "]]";

export function extractDeadlineAt(note: string | null | undefined): string | null {
  if (!note) return null;
  const trimmed = note.trimStart();
  if (!trimmed.startsWith(DEADLINE_PREFIX)) return null;
  const suffixIndex = trimmed.indexOf(DEADLINE_SUFFIX);
  if (suffixIndex < 0) return null;
  const value = trimmed.slice(DEADLINE_PREFIX.length, suffixIndex).trim();
  return value.length > 0 ? value : null;
}

export function stripDeadlineMetadata(note: string | null | undefined): string {
  if (!note) return "";
  const trimmed = note.trimStart();
  if (!trimmed.startsWith(DEADLINE_PREFIX)) return note.trim();
  const suffixIndex = trimmed.indexOf(DEADLINE_SUFFIX);
  if (suffixIndex < 0) return note.trim();
  const rest = trimmed.slice(suffixIndex + DEADLINE_SUFFIX.length).replace(/^\s+/, "");
  return rest.trim();
}

export function withDeadlineMetadata(note: string | null | undefined, deadlineAtIso: string | null | undefined): string {
  const cleanNote = stripDeadlineMetadata(note);
  if (!deadlineAtIso) return cleanNote;
  return cleanNote ? `${DEADLINE_PREFIX}${deadlineAtIso}${DEADLINE_SUFFIX}\n${cleanNote}` : `${DEADLINE_PREFIX}${deadlineAtIso}${DEADLINE_SUFFIX}`;
}

export function splitOrderNote(note: string | null | undefined): { note: string; deadlineAt: string | null } {
  return {
    note: stripDeadlineMetadata(note),
    deadlineAt: extractDeadlineAt(note),
  };
}
