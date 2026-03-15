import type { UIMessage } from "ai";

export const CHAT_THREADS_STORAGE_KEY = "pr-lens-chat-threads-v1";
export const PENDING_SUBMISSION_STORAGE_KEY =
  "pr-lens-pending-submission-v1";
export const DEFAULT_CHAT_TITLE = "New Message";

export type StoredChatThread = {
  createdAt: number;
  id: string;
  messages: UIMessage[];
  title: string;
  updatedAt: number;
};

export type PendingSubmission = {
  chatId: string;
  text: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function createSafeJsonReplacer() {
  const seen = new WeakSet<object>();

  return (_key: string, value: unknown) => {
    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }

      seen.add(value);
    }

    return value;
  };
}

export function safeSerialize(value: unknown) {
  try {
    return JSON.stringify(value, createSafeJsonReplacer());
  } catch {
    return null;
  }
}

export function safeParse<T>(value: string | null | undefined, fallback: T) {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function normalizeStoredThreads(threads: StoredChatThread[]) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function parseStoredThreads(raw: string | null | undefined) {
  const parsed = safeParse<unknown>(raw, []);
  return Array.isArray(parsed)
    ? normalizeStoredThreads(parsed as StoredChatThread[])
    : [];
}

export function serializeStoredThreads(threads: StoredChatThread[]) {
  return safeSerialize(normalizeStoredThreads(threads)) ?? "[]";
}

export function upsertStoredThread(
  threads: StoredChatThread[],
  thread: StoredChatThread
) {
  return normalizeStoredThreads([
    thread,
    ...threads.filter((existingThread) => existingThread.id !== thread.id),
  ]);
}

export function removeStoredThread(
  threads: StoredChatThread[],
  chatId: string
) {
  return normalizeStoredThreads(
    threads.filter((thread) => thread.id !== chatId)
  );
}

export function getChatTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage
    ? firstUserMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ")
        .trim()
    : "";

  if (!text) return DEFAULT_CHAT_TITLE;

  const githubPullMatch = text.match(
    /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i
  );

  if (githubPullMatch) {
    const [, owner, repo, pullNumber] = githubPullMatch;
    return `${owner}/${repo} #${pullNumber}`;
  }

  return text.replace(/\s+/g, " ").trim();
}

export function readPendingSubmission() {
  if (!canUseStorage()) return null;

  const raw = window.sessionStorage.getItem(PENDING_SUBMISSION_STORAGE_KEY);
  return safeParse<PendingSubmission | null>(raw, null);
}

export function writePendingSubmission(submission: PendingSubmission) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(
    PENDING_SUBMISSION_STORAGE_KEY,
    JSON.stringify(submission)
  );
}

export function clearPendingSubmission() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(PENDING_SUBMISSION_STORAGE_KEY);
}
