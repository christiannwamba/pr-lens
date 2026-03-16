"use client";

import { useChat } from "@ai-sdk/react";
import {
  type UIDataTypes,
  type UIMessage,
  type UIMessagePart,
  type UITools,
} from "ai";
import { Trash2Icon } from "lucide-react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import useLocalStorageState from "use-local-storage-state";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ReviewComposer } from "@/components/review-composer";
import { samplePRs } from "@/lib/sample-prs";
import { ReviewLandingPage } from "@/components/review-landing-page";
import { ReviewCard } from "@/components/review-card";
import { ToolProgress } from "@/components/tool-progress";
import {
  clearPendingSubmission,
  DEFAULT_CHAT_TITLE,
  getChatTitle,
  CHAT_THREADS_STORAGE_KEY,
  safeParse,
  type StoredChatThread,
  parseStoredThreads,
  readPendingSubmission,
  removeStoredThread,
  safeSerialize,
  serializeStoredThreads,
  upsertStoredThread,
  writePendingSubmission,
} from "@/lib/chat-storage";
import { type Review } from "@/lib/schemas/review";
import { parsePRUrl } from "@/lib/utils";

type ChatInterfaceProps = {
  chatId?: string | null;
  screenMode: "chat" | "landing";
};

const ROUTE_TRANSITION_MS = 220;

type ToolMessagePart = {
  errorText?: string;
  input?: unknown;
  output?: unknown;
  state: string;
  type: `tool-${string}`;
};

function isToolMessagePart(part: UIMessagePart<UIDataTypes, UITools>) {
  return part.type.startsWith("tool-");
}

function extractPrUrl(messages: UIMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const part of message.parts) {
      if (part.type !== "text") continue;
      const match = part.text.match(
        /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/,
      );
      if (match) return match[0];
    }
  }
  return null;
}

function extractFollowUpSuggestions(messages: UIMessage[]): string[] {
  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") continue;
    for (const part of [...message.parts].reverse()) {
      if (!part.type.startsWith("tool-")) continue;
      const toolPart = part as ToolMessagePart;
      if (
        toolPart.type === "tool-generate_structured_review" &&
        toolPart.state === "output-available" &&
        toolPart.output &&
        typeof toolPart.output === "object" &&
        "followUpSuggestions" in toolPart.output &&
        Array.isArray(toolPart.output.followUpSuggestions)
      ) {
        return toolPart.output.followUpSuggestions as string[];
      }
    }
  }
  return [];
}

function renderAssistantPart(
  part: UIMessagePart<UIDataTypes, UITools>,
  key: string,
  prUrl: string | null,
) {
  if (part.type === "text") {
    return (
      <MessageResponse className="text-sm leading-[1.7] text-[#ccc]" key={key}>
        {part.text}
      </MessageResponse>
    );
  }

  if (part.type === "step-start") {
    return null;
  }

  if (isToolMessagePart(part)) {
    const toolPart = part as ToolMessagePart;
    const toolName = toolPart.type.replace("tool-", "");

    if (
      toolName === "generate_structured_review" &&
      toolPart.state === "output-available"
    ) {
      return (
        <div key={key} style={{ display: "grid", gap: 10 }}>
          <ToolProgress
            input={toolPart.input}
            output={toolPart.output}
            state={toolPart.state}
            toolName={toolName}
          />
          <ReviewCard prUrl={prUrl} review={toolPart.output as Review} />
        </div>
      );
    }

    return (
      <ToolProgress
        errorText={
          toolPart.state === "output-error" ? toolPart.errorText : undefined
        }
        input={toolPart.input}
        key={key}
        output={
          toolPart.state === "output-available" ? toolPart.output : undefined
        }
        state={toolPart.state}
        toolName={toolName}
      />
    );
  }

  return null;
}

function PrLinkCard({
  owner,
  prNumber,
  repo,
  url,
}: {
  owner: string;
  prNumber: number;
  repo: string;
  url: string;
}) {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/pr-title?owner=${owner}&repo=${repo}&prNumber=${prNumber}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { title: string } | null) => {
        if (!cancelled && data?.title) {
          setTitle(data.title);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [owner, repo, prNumber]);

  const displayTitle = title
    ? title.length > 60
      ? `${title.slice(0, 57)}...`
      : title
    : null;

  return (
    <a
      href={url}
      rel="noopener noreferrer"
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 12,
        color: "inherit",
        display: "block",
        padding: "14px 18px",
        textDecoration: "none",
        transition: "border-color 160ms ease",
      }}
      target="_blank"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#333";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#1a1a1a";
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 8,
          marginBottom: displayTitle ? 6 : 0,
        }}
      >
        <span
          style={{
            color: "#888",
            fontFamily: appMonoFont,
            fontSize: 12,
          }}
        >
          {owner}/{repo}
        </span>
        <span
          style={{
            color: "#4ade80",
            fontFamily: appMonoFont,
            fontSize: 12,
          }}
        >
          #{prNumber}
        </span>
      </div>
      {displayTitle ? (
        <div
          style={{
            color: "#ededed",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {displayTitle}
        </div>
      ) : null}
    </a>
  );
}

function renderUserPart(
  part: UIMessagePart<UIDataTypes, UITools>,
  key: string,
) {
  if (part.type !== "text") {
    return null;
  }

  const parsed = parsePRUrl(part.text.trim());
  if (parsed) {
    return (
      <PrLinkCard
        key={key}
        owner={parsed.owner}
        prNumber={parsed.prNumber}
        repo={parsed.repo}
        url={part.text.trim()}
      />
    );
  }

  return (
    <div
      key={key}
      style={{
        color: "#d4d4d4",
        fontFamily: appMonoFont,
        fontSize: 14,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}
    >
      {part.text}
    </div>
  );
}

const appSansFont =
  "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const appMonoFont = "var(--font-ibm-plex-mono), monospace";
const smoothEase = [0.22, 1, 0.36, 1] as const;
const exitEase = [0.4, 0, 1, 1] as const;

type ClientWindow = Window &
  typeof globalThis & {
    __PR_LENS_FROM_LANDING__?: boolean;
  };

function setFromLandingRouteFlag(value: boolean) {
  if (typeof window === "undefined") return;
  (window as ClientWindow).__PR_LENS_FROM_LANDING__ = value;
}

function consumeFromLandingRouteFlag() {
  if (typeof window === "undefined") return false;

  const nextWindow = window as ClientWindow;
  const didRouteFromLanding = nextWindow.__PR_LENS_FROM_LANDING__ === true;
  nextWindow.__PR_LENS_FROM_LANDING__ = false;
  return didRouteFromLanding;
}

const screenTransitionVariants = {
  animate: {
    filter: "blur(0px)",
    opacity: 1,
    transition: {
      duration: 0.34,
      ease: smoothEase,
    },
    y: 0,
  },
  initial: {
    filter: "blur(10px)",
    opacity: 0,
    y: 28,
  },
  routing: {
    filter: "blur(10px)",
    opacity: 0,
    transition: {
      duration: 0.22,
      ease: exitEase,
    },
    y: -20,
  },
};

const contentTransitionVariants = {
  animate: (delay = 0) => ({
    opacity: 1,
    transition: {
      delay,
      duration: 0.32,
      ease: smoothEase,
    },
    y: 0,
  }),
  initial: {
    opacity: 0,
    y: 22,
  },
};

type AppNavigationProps = {
  action?: ReactNode;
};

function AppNavigation({ action }: AppNavigationProps) {
  return (
    <nav
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: action ? "space-between" : "flex-start",
        margin: "0 auto",
        maxWidth: 1400,
        padding: "16px 24px",
      }}
    >
      <Link
        href="/"
        style={{
          alignItems: "center",
          color: "inherit",
          display: "flex",
          gap: 8,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "50%",
            height: 8,
            width: 8,
          }}
        />
        <span
          style={{
            color: "#ededed",
            fontFamily: appSansFont,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          PR Lens
        </span>
      </Link>

      {action}
    </nav>
  );
}

function SidebarActionButton({
  intent = "default",
  label,
  onClick,
}: {
  intent?: "default" | "danger";
  label: string;
  onClick: () => void;
}) {
  const isDanger = intent === "danger";

  return (
    <button
      onClick={onClick}
      style={{
        background: isDanger ? "rgba(127, 29, 29, 0.32)" : "#0a0a0a",
        border: `1px solid ${isDanger ? "rgba(248, 113, 113, 0.52)" : "#222"}`,
        borderRadius: 999,
        color: isDanger ? "#fca5a5" : "#888",
        cursor: "pointer",
        display: "block",
        fontFamily: appSansFont,
        fontSize: 13,
        fontWeight: isDanger ? 500 : 400,
        padding: isDanger ? "10px 14px" : "10px 14px",
        textAlign: "left",
        transition:
          "background-color 160ms ease, border-color 160ms ease, color 160ms ease",
        width: "100%",
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function ConversationListItem({
  onDelete,
  isActive,
  onClick,
  timestamp,
  title,
}: {
  isActive: boolean;
  onDelete: () => void;
  onClick: () => void;
  timestamp: number;
  title: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isActive ? "#111" : hovered ? "#0c0c0c" : "transparent",
        border: `1px solid ${isActive ? "#222" : hovered ? "#1a1a1a" : "transparent"}`,
        borderRadius: 14,
        display: "flex",
        gap: 8,
        padding: "8px",
        transition: "background-color 160ms ease, border-color 160ms ease",
      }}
    >
      <button
        onClick={onClick}
        title={title}
        style={{
          background: "transparent",
          border: 0,
          color: "#ededed",
          cursor: "pointer",
          flex: 1,
          padding: "4px",
          textAlign: "left",
        }}
        type="button"
      >
        <div
          style={{
            color: isActive ? "#ededed" : hovered ? "#d4d4d4" : "#bbb",
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.4,
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 160ms ease",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: hovered || isActive ? "#666" : "#555",
            fontFamily: appMonoFont,
            fontSize: 11,
            transition: "color 160ms ease",
          }}
        >
          {formatTimestamp(timestamp)}
        </div>
      </button>
      <button
        aria-label={`Delete ${title}`}
        onClick={onDelete}
        style={{
          alignItems: "center",
          alignSelf: "center",
          background: "transparent",
          border: 0,
          borderRadius: 999,
          color: hovered ? "#7a7a7a" : "#555",
          cursor: "pointer",
          display: "flex",
          height: 28,
          justifyContent: "center",
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition:
            "opacity 140ms ease, color 140ms ease, background-color 140ms ease",
          width: 28,
        }}
        type="button"
      >
        <Trash2Icon size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(timestamp);
}

export function ChatInterface({
  chatId = null,
  screenMode,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [threads, setThreads, { removeItem: clearThreadStorage }] =
    useLocalStorageState<StoredChatThread[]>(CHAT_THREADS_STORAGE_KEY, {
      defaultServerValue: [],
      defaultValue: [],
      serializer: {
        parse: (value) => parseStoredThreads(value),
        stringify: (value) =>
          serializeStoredThreads(value as StoredChatThread[]),
      },
    });
  const [text, setText] = useState("");
  const [landingFocused, setLandingFocused] = useState(false);
  const [chatFocused, setChatFocused] = useState(false);
  const [isRoutingToChat, setIsRoutingToChat] = useState(false);
  const routeTransitionTimerRef = useRef<number | null>(null);
  const [hydratedRouteKey, setHydratedRouteKey] = useState<string | null>(
    screenMode === "chat" ? null : (chatId ?? "__chat_home__"),
  );
  const [didRouteFromLanding] = useState(
    () => screenMode === "chat" && consumeFromLandingRouteFlag(),
  );
  const [chatShellAnimationComplete, setChatShellAnimationComplete] = useState(
    () => !didRouteFromLanding,
  );

  const persistThread = useCallback(
    (nextMessages: UIMessage[], options?: { finalizeTitle?: boolean }) => {
      if (screenMode !== "chat" || !chatId || nextMessages.length === 0) {
        return;
      }

      const serializedNextMessages = safeSerialize(nextMessages);
      if (!serializedNextMessages) {
        return;
      }

      const serializableMessages = safeParse<UIMessage[]>(
        serializedNextMessages,
        [],
      );
      const timestamp = Date.now();

      setThreads((currentThreads) => {
        const storedThread = currentThreads.find(
          (thread) => thread.id === chatId,
        );
        const serializedStoredMessages = storedThread
          ? safeSerialize(storedThread.messages)
          : null;

        if (serializedStoredMessages === serializedNextMessages) {
          return currentThreads;
        }

        const nextTitle =
          storedThread?.title && storedThread.title !== DEFAULT_CHAT_TITLE
            ? storedThread.title
            : options?.finalizeTitle
              ? getChatTitle(nextMessages)
              : DEFAULT_CHAT_TITLE;

        return upsertStoredThread(currentThreads, {
          createdAt: storedThread?.createdAt ?? timestamp,
          id: chatId,
          messages: serializableMessages,
          title: nextTitle,
          updatedAt: timestamp,
        });
      });
    },
    [chatId, screenMode, setThreads],
  );

  const { error, messages, sendMessage, setMessages, status, stop } = useChat({
    experimental_throttle: 50,
    id: chatId ?? "chat-home",
    onFinish: ({ messages: finishedMessages }) => {
      persistThread(finishedMessages, { finalizeTitle: true });
    },
  });
  const hasMessages = messages.length > 0;
  const waitingOnAssistant = status === "submitted" || status === "streaming";
  const activeConversationKey = chatId ?? "chat-home";
  const serializedMessages = safeSerialize(messages);
  const shouldAnimateFullChatShell =
    screenMode === "chat" && didRouteFromLanding && !chatShellAnimationComplete;
  const shouldAnimateChatContent =
    screenMode === "chat" && !shouldAnimateFullChatShell;

  useEffect(() => {
    return () => {
      if (routeTransitionTimerRef.current) {
        window.clearTimeout(routeTransitionTimerRef.current);
      }
    };
  }, []);

  // Read queued message from session storage and send it
  useEffect(() => {
    if (screenMode !== "chat") return;

    const routeKey = chatId ?? "__chat_home__";
    // This re-render is not a hydration (first) render
    // Could be a rerender after a received message
    if (hydratedRouteKey === routeKey) return;

    const pendingSubmission = readPendingSubmission();

    if (pendingSubmission && pendingSubmission.chatId === chatId) {
      clearPendingSubmission();
      setMessages([]);
      void sendMessage({ text: pendingSubmission.text });
      return;
    }

    const currentThread = chatId
      ? threads.find((thread) => thread.id === chatId)
      : null;

    setMessages(currentThread?.messages ?? []);
    // This is an ordering problem, not a priority problem — so we use
    // queueMicrotask (guaranteed execution order) instead of startTransition
    // (deferred priority). We need setHydratedRouteKey to commit strictly
    // *after* setMessages is queued in React's batch. startTransition would
    // let React batch both updates together, risking the guard being set
    // before messages are rendered — causing subsequent effect runs to skip
    // hydration ("already hydrated") before the chat is actually restored.
    // Example: user clicks thread A in sidebar → setMessages(threadA.messages)
    // runs → queueMicrotask ensures the "hydrated" guard is set only after
    // React has processed the messages, not simultaneously with them.
    queueMicrotask(() => {
      setHydratedRouteKey(routeKey);
    });
  }, [chatId, hydratedRouteKey, screenMode, sendMessage, setMessages, threads]);

  // update thread storage when messages change
  useEffect(() => {
    if (screenMode !== "chat") return;

    if (!chatId) {
      return;
    }

    if (messages.length === 0 || !serializedMessages) {
      return;
    }

    persistThread(messages, { finalizeTitle: status === "ready" });
  }, [chatId, messages, persistThread, screenMode, serializedMessages, status]);

  const createChatRoute = (nextChatId: string) => `/chat/${nextChatId}`;

  const handleSubmit = (message: PromptInputMessage) => {
    const nextValue = message.text.trim();
    if (!nextValue) return;

    if (screenMode === "landing") {
      const nextChatId = nanoid(10);
      writePendingSubmission({ chatId: nextChatId, text: nextValue });
      setFromLandingRouteFlag(true);
      setIsRoutingToChat(true);

      routeTransitionTimerRef.current = window.setTimeout(() => {
        router.push(createChatRoute(nextChatId));
      }, ROUTE_TRANSITION_MS);
      return;
    }

    if (!chatId) {
      const nextChatId = nanoid(10);
      writePendingSubmission({ chatId: nextChatId, text: nextValue });
      router.push(createChatRoute(nextChatId));
      return;
    }

    void sendMessage({ text: nextValue });
    // This is a priority problem, not an ordering problem — so we use
    // startTransition (deferred priority) instead of queueMicrotask
    // (guaranteed execution order). sendMessage triggers rapid re-renders
    // from token streaming, and a direct setText("") would compete with
    // those as an urgent update, causing UI stutter. startTransition tells
    // React to yield to the higher-priority stream renders first.
    // queueMicrotask would fire immediately after the microtask queue drains,
    // giving React no opportunity to deprioritize the input clear.
    // Example: user submits "review this PR" → streaming begins → React
    // prioritizes rendering incoming tokens over clearing the input field,
    // keeping the stream smooth.
    startTransition(() => {
      setText("");
    });
  };

  const handleNewChat = () => {
    stop();
    setText("");
    setMessages([]);
    clearPendingSubmission();
    router.push(createChatRoute(nanoid(10)));
  };

  const handleDeleteChat = (targetChatId: string) => {
    if (targetChatId === chatId) {
      stop();
      setText("");
      setMessages([]);
      clearPendingSubmission();
    }

    const nextThreads = removeStoredThread(threads, targetChatId);
    setThreads(nextThreads);
    if (targetChatId !== chatId) {
      return;
    }

    const nextThread = nextThreads[0];
    router.push(nextThread ? createChatRoute(nextThread.id) : "/chat");
  };

  const handleResetAllChats = () => {
    stop();
    setText("");
    setMessages([]);
    clearPendingSubmission();
    clearThreadStorage();
    router.push("/");
  };

  if (screenMode === "landing") {
    return (
      <motion.div
        animate={
          isRoutingToChat
            ? screenTransitionVariants.routing
            : screenTransitionVariants.animate
        }
        initial={screenTransitionVariants.initial}
      >
        <ReviewLandingPage
          inputFocused={landingFocused}
          onBlur={() => setLandingFocused(false)}
          onChange={setText}
          onFocus={() => setLandingFocused(true)}
          onSubmit={handleSubmit}
          text={text}
        />
      </motion.div>
    );
  }

  const chatShell = (
    <div
      style={{
        background: "#000",
        color: "#ededed",
        fontFamily: appSansFont,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
          height: "1px",
          insetInline: 0,
          position: "fixed",
          top: 0,
        }}
      />

      <AppNavigation
        action={
          <button
            onClick={handleResetAllChats}
            style={{
              background: "transparent",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              fontFamily: appSansFont,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              padding: "6px 12px",
              borderRadius: 8,
              transition: "text-shadow 200ms ease, color 200ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textShadow =
                "0 0 12px rgba(248,113,113,0.6)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textShadow = "none";
              e.currentTarget.style.color = "#fca5a5";
            }}
            type="button"
          >
            Clear history
          </button>
        }
      />

      <main
        style={{
          margin: "0 auto",
          maxWidth: 1400,
          minHeight: "calc(100vh - 60px)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            columnGap: 32,
            display: "grid",
            gridTemplateColumns: "240px minmax(0, 700px)",
            justifyContent: "center",
            minHeight: "calc(100vh - 60px)",
          }}
        >
          <aside
            style={{
              borderRight: "1px solid #111",
              paddingBottom: 40,
              paddingRight: 20,
              paddingTop: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "calc(100vh - 140px)",
                position: "sticky",
                top: 88,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <SidebarActionButton label="New chat" onClick={handleNewChat} />

                <div
                  style={{
                    color: "#444",
                    fontFamily: appMonoFont,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    padding: "12px 2px 4px",
                    textTransform: "uppercase",
                  }}
                >
                  Chats
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {threads.length === 0 ? (
                    <div
                      style={{
                        color: "#555",
                        fontSize: 13,
                        lineHeight: 1.5,
                        padding: "10px 2px",
                      }}
                    >
                      No saved chats yet.
                    </div>
                  ) : (
                    threads.map((thread) => {
                      const isActive = thread.id === chatId;

                      return (
                        <ConversationListItem
                          key={thread.id}
                          isActive={isActive}
                          onClick={() =>
                            router.push(createChatRoute(thread.id))
                          }
                          onDelete={() => handleDeleteChat(thread.id)}
                          timestamp={thread.updatedAt}
                          title={thread.title}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(100vh - 60px)",
              paddingBottom: 176,
              paddingTop: 32,
              position: "relative",
            }}
          >
            <motion.div
              animate={
                shouldAnimateChatContent
                  ? contentTransitionVariants.animate(0.12)
                  : undefined
              }
              initial={
                shouldAnimateChatContent
                  ? contentTransitionVariants.initial
                  : false
              }
              key={`content-${activeConversationKey}`}
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Conversation className="min-h-0 flex-1">
                <ConversationContent className="gap-6 px-0 py-0 pb-8">
                  {messages.map((message) => {
                    if (message.role === "user") {
                      const renderedUserParts = message.parts
                        .map((part, index) =>
                          renderUserPart(part, `${message.id}-${index}`),
                        )
                        .filter(Boolean);

                      if (renderedUserParts.length === 0) {
                        return null;
                      }

                      return (
                        <Message
                          className="items-end"
                          from="user"
                          key={message.id}
                        >
                          <div
                            style={{
                              alignItems: "center",
                              display: "flex",
                              gap: 8,
                              justifyContent: "flex-end",
                              marginBottom: 8,
                            }}
                          >
                            <span style={{ color: "#666", fontSize: 13 }}>
                              You
                            </span>
                            <div
                              style={{
                                alignItems: "center",
                                background: "#1a1a1a",
                                border: "1px solid #333",
                                borderRadius: "50%",
                                color: "#888",
                                display: "flex",
                                fontSize: 11,
                                height: 24,
                                justifyContent: "center",
                                width: 24,
                              }}
                            >
                              Y
                            </div>
                          </div>
                          <MessageContent className="ml-auto max-w-[min(100%,32rem)] rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-5 text-sm leading-[1.7] text-[#ccc]">
                            {renderedUserParts}
                          </MessageContent>
                        </Message>
                      );
                    }

                    if (message.role !== "assistant") {
                      return null;
                    }

                    return (
                      <Message
                        className="items-start"
                        from={message.role}
                        key={message.id}
                      >
                        <div
                          style={{
                            alignItems: "center",
                            display: "flex",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              alignItems: "center",
                              background: "#ededed",
                              borderRadius: "50%",
                              color: "#000",
                              display: "flex",
                              fontSize: 11,
                              fontWeight: 600,
                              height: 24,
                              justifyContent: "center",
                              width: 24,
                            }}
                          >
                            P
                          </div>
                          <span style={{ color: "#666", fontSize: 13 }}>
                            PR Lens
                          </span>
                        </div>
                        <MessageContent className="w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-5 text-sm leading-[1.7] text-[#ccc]">
                          {message.parts.map((part, index) =>
                            renderAssistantPart(
                              part,
                              `${message.id}-${index}`,
                              extractPrUrl(messages),
                            ),
                          )}
                        </MessageContent>
                      </Message>
                    );
                  })}

                  {waitingOnAssistant ? (
                    <Message from="assistant">
                      <div
                        style={{
                          alignItems: "center",
                          display: "flex",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            alignItems: "center",
                            background: "#ededed",
                            borderRadius: "50%",
                            color: "#000",
                            display: "flex",
                            fontSize: 11,
                            fontWeight: 600,
                            height: 24,
                            justifyContent: "center",
                            width: 24,
                          }}
                        >
                          P
                        </div>
                        <span style={{ color: "#666", fontSize: 13 }}>
                          PR Lens
                        </span>
                      </div>
                      <Loader label="Reviewing..." />
                    </Message>
                  ) : null}

                  {!hasMessages && !waitingOnAssistant ? (
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        marginTop: 32,
                      }}
                    >
                      <div style={{ color: "#444", fontSize: 13 }}>
                        Paste a PR URL to get started.
                      </div>
                      <Suggestions className="justify-center">
                        {samplePRs.map((pr) => (
                          <Suggestion
                            className="border-[#222] bg-transparent text-[#666] hover:border-[#444] hover:text-[#999]"
                            key={pr}
                            onClick={(s) => {
                              setText(s);
                              handleSubmit({ files: [], text: s });
                            }}
                            suggestion={pr}
                          />
                        ))}
                      </Suggestions>
                    </div>
                  ) : null}
                  {(() => {
                    const followUps = extractFollowUpSuggestions(messages);
                    if (followUps.length === 0 || waitingOnAssistant)
                      return null;
                    return (
                      <div style={{ marginTop: 16 }}>
                        <Suggestions>
                          {followUps.map((s) => (
                            <Suggestion
                              className="cursor-pointer border-[#222] bg-transparent text-[#888] hover:border-[#444] hover:text-[#ccc]"
                              key={s}
                              onClick={(text) => void sendMessage({ text })}
                              suggestion={s}
                            />
                          ))}
                        </Suggestions>
                      </div>
                    );
                  })()}
                </ConversationContent>
                <ConversationScrollButton className="border-[#333] bg-[#0a0a0a] text-foreground hover:bg-[#111]" />
              </Conversation>

              {error ? (
                <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error.message}
                </div>
              ) : null}
            </motion.div>
          </section>
        </div>
      </main>

      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.92) 24%, #000 52%)",
          bottom: 0,
          insetInline: 0,
          padding: "48px 24px 24px",
          pointerEvents: "none",
          position: "fixed",
        }}
      >
        <div
          style={{
            columnGap: 32,
            display: "grid",
            gridTemplateColumns: "240px minmax(0, 700px)",
            justifyContent: "center",
            margin: "0 auto",
            maxWidth: 1400,
            pointerEvents: "none",
          }}
        >
          <div />
          <div style={{ pointerEvents: "auto", width: "100%" }}>
            <ReviewComposer
              focused={chatFocused}
              onBlur={() => setChatFocused(false)}
              onChange={setText}
              onFocus={() => setChatFocused(true)}
              onStop={stop}
              onSubmit={handleSubmit}
              placeholder="Ask a follow-up..."
              status={status}
              value={text}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (shouldAnimateFullChatShell) {
    return (
      <motion.div
        animate={screenTransitionVariants.animate}
        initial={screenTransitionVariants.initial}
        onAnimationComplete={() => {
          setChatShellAnimationComplete(true);
        }}
      >
        {chatShell}
      </motion.div>
    );
  }

  return chatShell;
}
