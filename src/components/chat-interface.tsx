"use client";

import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { Trash2Icon } from "lucide-react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useState,
} from "react";

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
import { DesignDComposer } from "@/components/design-d-composer";
import { DesignDLanding } from "@/components/design-d-landing";
import {
  clearPendingSubmission,
  clearStoredThreads,
  getStoredThreadsServerSnapshot,
  getChatTitle,
  readPendingSubmission,
  readStoredThreads,
  removeStoredThread,
  subscribeStoredThreads,
  upsertStoredThread,
  writePendingSubmission,
} from "@/lib/chat-storage";

type ChatInterfaceProps = {
  chatId?: string | null;
  routeMode: "chat" | "landing";
};

const ROUTE_TRANSITION_MS = 220;

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

const designDSansFont =
  "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const designDMonoFont = "var(--font-ibm-plex-mono), monospace";
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

const pageTransition = {
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

const chatSectionTransition = {
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

type DesignDNavigationProps = {
  action?: ReactNode;
};

function DesignDNavigation({ action }: DesignDNavigationProps) {
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
      <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
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
            fontFamily: designDSansFont,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          PR Lens
        </span>
      </div>

      {action}
    </nav>
  );
}

function SidebarButton({
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
        fontFamily: designDSansFont,
        fontSize: 13,
        fontWeight: isDanger ? 500 : 400,
        padding: isDanger ? "10px 14px" : "10px 14px",
        textAlign: "left",
        transition: "background-color 160ms ease, border-color 160ms ease, color 160ms ease",
        width: "100%",
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function ChatThreadButton({
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
            transition: "color 160ms ease",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: hovered || isActive ? "#666" : "#555",
            fontFamily: designDMonoFont,
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
          transition: "opacity 140ms ease, color 140ms ease, background-color 140ms ease",
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

export function ChatInterface({ chatId = null, routeMode }: ChatInterfaceProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [landingFocused, setLandingFocused] = useState(false);
  const [chatFocused, setChatFocused] = useState(false);
  const [isRoutingToChat, setIsRoutingToChat] = useState(false);
  const routeTransitionTimerRef = useRef<number | null>(null);
  const [hydratedRouteKey, setHydratedRouteKey] = useState<string | null>(
    routeMode === "chat" ? null : chatId ?? "__chat_home__"
  );
  const [didRouteFromLanding] = useState(
    () => routeMode === "chat" && consumeFromLandingRouteFlag()
  );
  const [chatShellAnimationComplete, setChatShellAnimationComplete] = useState(
    () => !didRouteFromLanding
  );

  const { error, messages, sendMessage, setMessages, status, stop } = useChat({
    experimental_throttle: 50,
  });
  const threads = useSyncExternalStore(
    subscribeStoredThreads,
    readStoredThreads,
    getStoredThreadsServerSnapshot
  );

  const hasMessages = messages.length > 0;
  const waitingOnAssistant = status === "submitted" || status === "streaming";
  const latestUserText = useMemo(() => {
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    return latestUserMessage ? messageText(latestUserMessage) : "";
  }, [messages]);
  const chatViewKey = chatId ?? "chat-home";
  const shouldAnimateFullChatShell =
    routeMode === "chat" && didRouteFromLanding && !chatShellAnimationComplete;
  const shouldAnimateChatContent = routeMode === "chat" && !shouldAnimateFullChatShell;

  useEffect(() => {
    return () => {
      if (routeTransitionTimerRef.current) {
        window.clearTimeout(routeTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (routeMode !== "chat") return;

    const routeKey = chatId ?? "__chat_home__";
    if (hydratedRouteKey === routeKey) return;

    const storedThreads = readStoredThreads();

    const pendingSubmission = readPendingSubmission();

    if (pendingSubmission && pendingSubmission.chatId === chatId) {
      clearPendingSubmission();
      setMessages([]);
      void sendMessage({ text: pendingSubmission.text });
      return;
    }

    const currentThread = chatId
      ? storedThreads.find((thread) => thread.id === chatId)
      : null;

    setMessages(currentThread?.messages ?? []);
    queueMicrotask(() => {
      setHydratedRouteKey(routeKey);
    });
  }, [chatId, hydratedRouteKey, routeMode, sendMessage, setMessages]);

  useEffect(() => {
    if (routeMode !== "chat") return;

    if (!chatId) {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    const storedThread = readStoredThreads().find((thread) => thread.id === chatId);
    if (storedThread && JSON.stringify(storedThread.messages) === JSON.stringify(messages)) {
      return;
    }

    const timestamp = Date.now();
    upsertStoredThread({
      createdAt: storedThread?.createdAt ?? timestamp,
      id: chatId,
      messages,
      title: getChatTitle(messages),
      updatedAt: timestamp,
    });
  }, [chatId, messages, routeMode]);

  const createChatRoute = (nextChatId: string) => `/chat/${nextChatId}`;

  const handleSubmit = (message: PromptInputMessage) => {
    const nextValue = message.text.trim();
    if (!nextValue) return;

    if (routeMode === "landing") {
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

    const nextThreads = removeStoredThread(targetChatId);
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
    clearStoredThreads();
    router.push("/");
  };

  if (routeMode === "landing") {
    return (
      <motion.div
        animate={isRoutingToChat ? pageTransition.routing : pageTransition.animate}
        initial={pageTransition.initial}
      >
        <DesignDLanding
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
        fontFamily: designDSansFont,
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

      <DesignDNavigation />

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
                <SidebarButton label="New chat" onClick={handleNewChat} />

                <div
                  style={{
                    color: "#444",
                    fontFamily: designDMonoFont,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    padding: "12px 2px 4px",
                    textTransform: "uppercase",
                  }}
                >
                  Chats
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                        <ChatThreadButton
                          key={thread.id}
                          isActive={isActive}
                          onClick={() => router.push(createChatRoute(thread.id))}
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
                  ? chatSectionTransition.animate(0.12)
                  : undefined
              }
              initial={shouldAnimateChatContent ? chatSectionTransition.initial : false}
              key={`content-${chatViewKey}`}
              style={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}
            >
              {latestUserText ? (
                <div style={{ marginBottom: 24 }}>
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
                    <span style={{ color: "#666", fontSize: 13 }}>You</span>
                  </div>
                  <div
                    style={{
                      background: "#0a0a0a",
                      border: "1px solid #1a1a1a",
                      borderRadius: 12,
                      color: "#888",
                      fontFamily: designDMonoFont,
                      fontSize: 14,
                      padding: "14px 18px",
                    }}
                  >
                    {latestUserText}
                  </div>
                </div>
              ) : null}

              <Conversation className="min-h-0 flex-1">
                <ConversationContent className="gap-6 px-0 py-0 pb-8">
                  {messages
                    .filter((message) => message.role !== "user")
                    .map((message) => (
                      <Message className="items-start" from={message.role} key={message.id}>
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
                          <span style={{ color: "#666", fontSize: 13 }}>PR Lens</span>
                        </div>
                        <MessageContent className="max-w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-5 text-sm leading-[1.7] text-[#ccc]">
                          {message.parts.map((part, index) =>
                            part.type === "text" ? (
                              <MessageResponse
                                className="text-sm leading-[1.7] text-[#ccc]"
                                key={`${message.id}-${index}`}
                              >
                                {part.text}
                              </MessageResponse>
                            ) : null
                          )}
                        </MessageContent>
                      </Message>
                    ))}

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
                        <span style={{ color: "#666", fontSize: 13 }}>PR Lens</span>
                      </div>
                      <Loader label="Reviewing..." />
                    </Message>
                  ) : null}

                  {!hasMessages && !waitingOnAssistant ? (
                    <div
                      style={{
                        color: "#444",
                        fontSize: 13,
                        marginTop: 32,
                        textAlign: "center",
                      }}
                    >
                      {chatId
                        ? "Start this chat by sending your first message."
                        : "Select a chat from the sidebar or start a new one."}
                    </div>
                  ) : null}
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
          <div
            style={{
              paddingRight: 20,
              pointerEvents: "auto",
              width: "100%",
            }}
          >
            <SidebarButton
              intent="danger"
              label="Clear history"
              onClick={handleResetAllChats}
            />
          </div>
          <div style={{ pointerEvents: "auto", width: "100%" }}>
            <DesignDComposer
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
        animate={pageTransition.animate}
        initial={pageTransition.initial}
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
