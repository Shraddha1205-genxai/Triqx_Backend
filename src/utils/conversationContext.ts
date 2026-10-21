/** Minimal message shape needed to build time-aware prompts. */
export interface ContextMessage {
  sender: string;
  text: string;
  timestamp?: number;
  isFromUser?: boolean;
  mediaType?: string;
  mediaBase64?: string;
}

const HOUR_MS = 60 * 60 * 1000;
/** A client clock further than this from the server clock is not trusted (wrong phone date, tampering). */
const MAX_CLOCK_SKEW_MS = 24 * HOUR_MS;

export const isValidTimeZone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** The "now" and timezone the prompt should use: the phone's if sane, otherwise the server clock / UTC. */
export const resolveNow = (clientNow: unknown, timeZone: unknown, serverNow = Date.now()) => {
  const n = Number(clientNow);
  const now = Number.isFinite(n) && Math.abs(n - serverNow) <= MAX_CLOCK_SKEW_MS ? n : serverNow;
  const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  return { now, tz };
};

export const formatTime = (ms: number, tz: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(new Date(ms));

const line = (
  m: ContextMessage,
  tz: string,
  fallbackSender: string,
  clip: (s: unknown, n: number) => string,
  maxChars: number,
) => {
  const sender = clip(m.sender, 100) || (m.isFromUser ? 'You' : fallbackSender);
  const content = clip(m.text, maxChars) || (m.mediaType ? '[Media Attachment]' : '');
  const when = typeof m.timestamp === 'number' ? `[${formatTime(m.timestamp, tz)}] ` : '';
  return `${when}${sender}: ${content}`;
};

/**
 * Builds the user-message half of the reply prompt. `messages` is oldest -> newest.
 * Every message carries its timestamp; the newest one is set apart as the message to reply to and
 * everything before it is context.
 */
export const buildReplyInput = (opts: {
  conversationTitle: string;
  appPackage: string;
  messages: ContextMessage[];
  replyCount: number;
  now: number;
  tz: string;
  clip: (s: unknown, n: number) => string;
  maxChars: number;
}): string => {
  const { conversationTitle, appPackage, messages, replyCount, now, tz, clip, maxChars } = opts;
  const fmt = (m: ContextMessage) => line(m, tz, conversationTitle, clip, maxChars);

  const context = messages.slice(0, -1);
  const last = messages[messages.length - 1];

  const parts: string[] = [
    `Current time: ${formatTime(now, tz)} (${tz})`,
    `Conversation: ${conversationTitle} (${appPackage})`,
  ];

  if (context.length > 0) {
    parts.push('', 'Earlier messages (context only, oldest first):', context.map(fmt).join('\n'));
  }

  parts.push('', 'Last message (reply to this):', fmt(last));
  parts.push('', `Write ${replyCount} options for what "You" should send next, right now.`);
  return parts.join('\n');
};

export const REPLY_FLOW_RULES = `Write each reply as the natural next message in this conversation, exactly as the user would send it right now.
Reply to the "Last message". The earlier messages are context only: use them to understand tone and what the conversation is about, but do not bring up older topics unless the last message refers to them.
Match the message in front of you: a greeting gets a greeting, a short message gets a short reply. Do not add information the other person did not ask about.
Every message has a timestamp. Use the timestamps and the current time to judge how recent each message is and to interpret words like "today", "tonight", "tomorrow" and "yesterday".`;
