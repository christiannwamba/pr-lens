import type { UIMessage } from "ai";

export const CHAT_THREADS_STORAGE_KEY = "pr-lens-chat-threads-v1";
export const PENDING_SUBMISSION_STORAGE_KEY =
  "pr-lens-pending-submission-v1";

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

const threadListeners = new Set<() => void>();
const EMPTY_THREADS: StoredChatThread[] = [];

let cachedThreads: StoredChatThread[] = EMPTY_THREADS;
let cachedThreadsRaw: string | null | undefined;

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeThreads(threads: StoredChatThread[]) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt);
}

function parseStoredThreads(raw: string | null) {
  if (!raw) return EMPTY_THREADS;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? normalizeThreads(parsed as StoredChatThread[])
      : EMPTY_THREADS;
  } catch {
    return EMPTY_THREADS;
  }
}

function emitThreadListeners() {
  for (const listener of threadListeners) {
    listener();
  }
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

  if (!text) return "Untitled chat";
  return text.length > 42 ? `${text.slice(0, 42).trimEnd()}...` : text;
}

export function readStoredThreads() {
  if (!canUseStorage()) return EMPTY_THREADS;

  const raw = window.localStorage.getItem(CHAT_THREADS_STORAGE_KEY);
  if (raw === cachedThreadsRaw) {
    return cachedThreads;
  }

  cachedThreadsRaw = raw;
  cachedThreads = parseStoredThreads(raw);
  return cachedThreads;
}

export function getStoredThreadsServerSnapshot() {
  return EMPTY_THREADS;
}

export function writeStoredThreads(threads: StoredChatThread[]) {
  if (!canUseStorage()) return;

  const nextThreads = normalizeThreads(threads);
  const serializedThreads = JSON.stringify(nextThreads);

  cachedThreads = nextThreads;
  cachedThreadsRaw = serializedThreads;
  window.localStorage.setItem(CHAT_THREADS_STORAGE_KEY, serializedThreads);
  emitThreadListeners();
}

export function upsertStoredThread(thread: StoredChatThread) {
  const threads = readStoredThreads().filter(
    (existingThread) => existingThread.id !== thread.id
  );
  writeStoredThreads([thread, ...threads]);
}

export function removeStoredThread(chatId: string) {
  const nextThreads = readStoredThreads().filter((thread) => thread.id !== chatId);
  writeStoredThreads(nextThreads);
  return nextThreads;
}

export function clearStoredThreads() {
  if (!canUseStorage()) return;

  cachedThreads = EMPTY_THREADS;
  cachedThreadsRaw = null;
  window.localStorage.removeItem(CHAT_THREADS_STORAGE_KEY);
  emitThreadListeners();
}

export function readPendingSubmission() {
  if (!canUseStorage()) return null;

  const raw = window.sessionStorage.getItem(PENDING_SUBMISSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingSubmission;
  } catch {
    return null;
  }
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

export function subscribeStoredThreads(listener: () => void) {
  threadListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== CHAT_THREADS_STORAGE_KEY) {
      return;
    }

    cachedThreadsRaw = undefined;
    listener();
  };

  if (canUseStorage()) {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    threadListeners.delete(listener);

    if (canUseStorage()) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}
