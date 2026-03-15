"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { ReviewComposer } from "@/components/review-composer";

type ReviewLandingPageProps = {
  inputFocused: boolean;
  text: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSubmit: (message: PromptInputMessage) => void;
};

const reviewLenses = [
  {
    title: "Correctness",
    desc: "Logic errors, edge cases, type mismatches, and potential runtime failures.",
    num: "01",
  },
  {
    title: "Security",
    desc: "Injection vectors, auth gaps, secrets exposure, and dependency risks.",
    num: "02",
  },
  {
    title: "Architecture",
    desc: "Coupling, abstraction quality, naming, and adherence to project patterns.",
    num: "03",
  },
];

const sampleFindings = [
  {
    body: "No max-retry cap. Will hammer upstream on persistent 503s.",
    location: "src/stream.ts:42",
    title: "Unbounded retry loop",
    tone: "#e5484d",
    toneBg: "rgba(229,72,77,0.1)",
    type: "critical",
  },
  {
    body: "Client disconnect won't cancel in-flight retries.",
    location: "src/handler.ts:18",
    title: "Missing abort signal propagation",
    tone: "#f5a623",
    toneBg: "rgba(245,166,35,0.1)",
    type: "warning",
  },
  {
    body: "Exponential with jitter, capped at 30s. Clean implementation.",
    location: "",
    title: "Backoff calculation is correct",
    tone: "#30a46c",
    toneBg: "rgba(48,164,108,0.1)",
    type: "good",
  },
];

export function ReviewLandingPage({
  inputFocused,
  text,
  onBlur,
  onChange,
  onFocus,
  onSubmit,
}: ReviewLandingPageProps) {
  return (
    <div
      style={{
        background: "#000",
        color: "#ededed",
        fontFamily:
          "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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

      <nav
        style={{
          alignItems: "center",
          display: "flex",
          margin: "0 auto",
          maxWidth: 1200,
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
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            PR Lens
          </span>
        </div>
      </nav>

      <main
        style={{
          margin: "0 auto",
          maxWidth: 1200,
          padding: "0 24px",
        }}
      >
        <section
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            justifyContent: "center",
            minHeight: "calc(100vh - 60px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #222",
              borderRadius: 999,
              color: "#888",
              fontSize: 13,
              marginBottom: 32,
              padding: "5px 14px",
            }}
          >
            AI-powered code review
          </div>

          <h1
            style={{
              color: "#ededed",
              fontFamily:
                "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontSize: "clamp(40px, 7vw, 72px)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              margin: 0,
              maxWidth: 720,
            }}
          >
            Review pull requests
            <br />
            <span style={{ color: "#888" }}>in seconds.</span>
          </h1>

          <p
            style={{
              color: "#888",
              fontFamily:
                "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontSize: 17,
              lineHeight: 1.6,
              marginBottom: 40,
              marginTop: 20,
              maxWidth: 500,
            }}
          >
            Paste a GitHub PR URL. Get a structured review across correctness,
            security, and architecture.
          </p>

          <div
            style={{
              maxWidth: 600,
              position: "relative",
              width: "100%",
            }}
          >
            <ReviewComposer
              focused={inputFocused}
              onBlur={onBlur}
              onChange={onChange}
              onFocus={onFocus}
              onSubmit={onSubmit}
              placeholder="https://github.com/owner/repo/pull/123"
              submitAriaLabel="Submit PR"
              value={text}
            />
          </div>

          <p
            style={{
              color: "#444",
              fontSize: 13,
              marginTop: 16,
            }}
          >
            Powered by Claude · No code stored
          </p>
        </section>

        <section
          style={{
            margin: "0 auto",
            maxWidth: 900,
            paddingBottom: 120,
          }}
        >
          <p
            style={{
              color: "#555",
              fontSize: 13,
              letterSpacing: "0.08em",
              marginBottom: 32,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            Three review lenses
          </p>
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 16,
              display: "grid",
              gap: 1,
              gridTemplateColumns: "repeat(3, 1fr)",
              overflow: "hidden",
            }}
          >
            {reviewLenses.map((lens) => (
              <div
                key={lens.num}
                style={{
                  background: "#0a0a0a",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 32,
                }}
              >
                <span
                  style={{
                    color: "#444",
                    fontFamily: "var(--font-ibm-plex-mono), monospace",
                    fontSize: 12,
                  }}
                >
                  {lens.num}
                </span>
                <h3
                  style={{
                    color: "#ededed",
                    fontFamily:
                      "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {lens.title}
                </h3>
                <p
                  style={{
                    color: "#666",
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {lens.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ margin: "0 auto", maxWidth: 700, paddingBottom: 120 }}>
          <p
            style={{
              color: "#555",
              fontSize: 13,
              letterSpacing: "0.08em",
              marginBottom: 32,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            What a review looks like
          </p>

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
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 14,
                padding: "14px 18px",
              }}
            >
              https://github.com/acme/api/pull/247
            </div>
          </div>

          <div>
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
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                color: "#ccc",
                fontSize: 14,
                lineHeight: 1.7,
                padding: "20px 24px",
              }}
            >
              <p style={{ color: "#ededed", fontWeight: 600, margin: "0 0 16px 0" }}>
                feat: Add streaming response handler with retry logic
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                Reviewed <span style={{ color: "#ededed" }}>12 files</span> with{" "}
                <span style={{ color: "#ededed" }}>+342 / −89</span> lines changed.
              </p>

              <div
                style={{
                  borderTop: "1px solid #1a1a1a",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 8,
                  paddingTop: 16,
                }}
              >
                {sampleFindings.map((finding) => (
                  <div
                    key={finding.title}
                    style={{ alignItems: "flex-start", display: "flex", gap: 10 }}
                  >
                    <span
                      style={{
                        background: finding.toneBg,
                        borderRadius: 4,
                        color: finding.tone,
                        flexShrink: 0,
                        fontFamily: "var(--font-ibm-plex-mono), monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        marginTop: 2,
                        padding: "2px 8px",
                      }}
                    >
                      {finding.type}
                    </span>
                    <div>
                      <span style={{ color: "#ededed" }}>{finding.title}</span>
                      <span style={{ color: "#555" }}> — </span>
                      <span style={{ color: "#666" }}>
                        {finding.location ? (
                          <>
                            <code
                              style={{
                                background: "#111",
                                borderRadius: 4,
                                color: "#888",
                                fontFamily: "var(--font-ibm-plex-mono), monospace",
                                fontSize: 13,
                                padding: "2px 6px",
                              }}
                            >
                              {finding.location}
                            </code>{" "}
                            {finding.body}
                          </>
                        ) : (
                          finding.body
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              background: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: 12,
              display: "flex",
              marginTop: 24,
              padding: "4px 4px 4px 16px",
            }}
          >
            <input
              placeholder="Ask a follow-up..."
              style={{
                background: "transparent",
                border: "none",
                color: "#ededed",
                flex: 1,
                fontFamily:
                  "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontSize: 14,
                outline: "none",
                padding: "12px 0",
              }}
              type="text"
            />
            <button
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                color: "#888",
                fontSize: 14,
                padding: "10px 18px",
              }}
              type="button"
            >
              Send
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid #111",
              color: "#333",
              fontSize: 12,
              marginTop: 70,
              paddingTop: 12,
              textAlign: "center",
            }}
          >
            PR Lens
          </div>
        </section>
      </main>
    </div>
  );
}
