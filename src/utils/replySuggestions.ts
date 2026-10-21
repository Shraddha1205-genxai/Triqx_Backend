/**
 * Smart-reply suggestions: a short chip label plus the full text that gets inserted into the
 * composer. Labels let the app show compact, distinct chips ("Interested", "Not right now")
 * even when the replies are long, multi-line emails that all start with the same greeting.
 *
 * Keep the rules here in sync with the app's ReplyLabels.kt fallback.
 */
export interface ReplySuggestion {
  label: string;
  text: string;
}

/** A single-line reply this short is its own label: the chip shows the actual reply. */
export const SHORT_REPLY_CHARS = 30;
/** Longest label kept from the model; anything longer is replaced by a clipped preview. */
export const MAX_LABEL_CHARS = 32;

// "Hi Neha," / "Hello there!" / "Dear Mr Rao:" / "Hey," — greeting plus up to three words, ending in punctuation.
const GREETING = /^(?:hi|hello|hey|dear|good (?:morning|afternoon|evening))(?:\s+[^\s,!.:]+){0,3}?\s*[,!.:]\s*/i;

/** Fallback label: the reply on one line, without a leading greeting, clipped at a word boundary. */
export function previewLabel(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  const withoutGreeting = t.replace(GREETING, '').trim();
  if (withoutGreeting.length > 0) t = withoutGreeting;
  if (t.length <= MAX_LABEL_CHARS) return t;
  const cut = t.slice(0, MAX_LABEL_CHARS - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 12 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:.\-]+$/, '') + '…';
}

/** Chooses the label to show for a reply, given the model's (possibly missing or bad) label. */
export function labelFor(text: string, modelLabel?: string): string {
  const t = text.trim();
  if (t.length <= SHORT_REPLY_CHARS && !t.includes('\n')) return t;
  const clean = (modelLabel || '').replace(/\s+/g, ' ').trim().replace(/[.!,;:]+$/, '');
  return clean.length > 0 && clean.length <= MAX_LABEL_CHARS ? clean : previewLabel(t);
}

/**
 * Normalises the model's `replies` array into at most `max` suggestions. Accepts objects
 * ({label, text}) and, defensively, plain strings.
 */
export function toReplySuggestions(raw: unknown, max: number): ReplySuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ReplySuggestion[] = [];
  for (const item of raw) {
    let text = '';
    let label: string | undefined;
    if (typeof item === 'string') {
      text = item;
    } else if (item && typeof item === 'object') {
      const obj = item as { text?: unknown; label?: unknown };
      text = typeof obj.text === 'string' ? obj.text : '';
      label = typeof obj.label === 'string' ? obj.label : undefined;
    }
    text = text.trim();
    if (!text) continue;
    out.push({ label: labelFor(text, label), text });
    if (out.length >= max) break;
  }
  return out;
}
