"use client";

import { useState } from "react";

export default function DesignD() {
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#ededed",
        fontFamily: "var(--font-ibm-plex-sans), -apple-system, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        }}
      />

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#fff",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#ededed",
            }}
          >
            PR Lens
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 13, color: "#666" }}>Docs</span>
          <span style={{ fontSize: 13, color: "#666" }}>GitHub</span>
          <div
            style={{
              fontSize: 13,
              color: "#ededed",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Sign in
          </div>
        </div>
      </nav>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 60px)",
            textAlign: "center",
            gap: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#888",
              border: "1px solid #222",
              borderRadius: 999,
              padding: "5px 14px",
              marginBottom: 32,
              background: "#0a0a0a",
            }}
          >
            AI-powered code review
          </div>

          <h1
            style={{
              fontSize: "clamp(40px, 7vw, 72px)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#ededed",
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
              fontSize: 17,
              lineHeight: 1.6,
              color: "#888",
              maxWidth: 500,
              marginTop: 20,
              marginBottom: 40,
            }}
          >
            Paste a GitHub PR URL. Get a structured review across
            correctness, security, and architecture.
          </p>

          <div
            style={{
              width: "100%",
              maxWidth: 600,
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#0a0a0a",
                border: `1px solid ${inputFocused ? "#444" : "#222"}`,
                borderRadius: 12,
                padding: "4px 4px 4px 16px",
                transition: "border-color 0.15s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M7.775 3.275a1.15 1.15 0 0 1 1.625 0l3.325 3.325a1.15 1.15 0 0 1 0 1.625l-3.325 3.325a1.15 1.15 0 0 1-1.625 0L4.45 8.225a1.15 1.15 0 0 1 0-1.625L7.775 3.275Z" stroke="#555" strokeWidth="1.2" />
              </svg>
              <input
                type="text"
                placeholder="https://github.com/owner/repo/pull/123"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ededed",
                  fontSize: 14,
                  padding: "12px",
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                }}
              />
              <button
                style={{
                  background: "#ededed",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: "inherit",
                }}
              >
                Review
              </button>
            </div>
          </div>

          <p
            style={{
              fontSize: 13,
              color: "#444",
              marginTop: 16,
            }}
          >
            Powered by Claude &middot; No code stored
          </p>
        </section>

        <section
          style={{
            paddingBottom: 120,
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            Three review lenses
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              background: "#1a1a1a",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #1a1a1a",
            }}
          >
            {[
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
            ].map((lens) => (
              <div
                key={lens.num}
                style={{
                  background: "#0a0a0a",
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-ibm-plex-mono), monospace",
                    color: "#444",
                  }}
                >
                  {lens.num}
                </span>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#ededed",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {lens.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#666",
                    margin: 0,
                  }}
                >
                  {lens.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: 120, maxWidth: 700, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 13,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            What a review looks like
          </p>

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#888",
                }}
              >
                Y
              </div>
              <span style={{ fontSize: 13, color: "#666" }}>You</span>
            </div>
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                padding: "14px 18px",
                fontSize: 14,
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                color: "#888",
              }}
            >
              https://github.com/acme/api/pull/247
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#ededed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#000",
                  fontWeight: 600,
                }}
              >
                P
              </div>
              <span style={{ fontSize: 13, color: "#666" }}>PR Lens</span>
            </div>
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                padding: "20px 24px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#ccc",
              }}
            >
              <p style={{ margin: "0 0 16px 0", fontWeight: 600, color: "#ededed" }}>
                feat: Add streaming response handler with retry logic
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                Reviewed <span style={{ color: "#ededed" }}>12 files</span> with{" "}
                <span style={{ color: "#ededed" }}>+342 / −89</span> lines changed.
              </p>

              <div
                style={{
                  borderTop: "1px solid #1a1a1a",
                  paddingTop: 16,
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#e5484d",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      background: "rgba(229,72,77,0.1)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    critical
                  </span>
                  <div>
                    <span style={{ color: "#ededed" }}>Unbounded retry loop</span>
                    <span style={{ color: "#555" }}> — </span>
                    <span style={{ color: "#666" }}>
                      <code
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono), monospace",
                          fontSize: 13,
                          color: "#888",
                          background: "#111",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        src/stream.ts:42
                      </code>{" "}
                      No max-retry cap. Will hammer upstream on persistent 503s.
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#f5a623",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      background: "rgba(245,166,35,0.1)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    warning
                  </span>
                  <div>
                    <span style={{ color: "#ededed" }}>Missing abort signal propagation</span>
                    <span style={{ color: "#555" }}> — </span>
                    <span style={{ color: "#666" }}>
                      <code
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono), monospace",
                          fontSize: 13,
                          color: "#888",
                          background: "#111",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        src/handler.ts:18
                      </code>{" "}
                      Client disconnect won&apos;t cancel in-flight retries.
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#30a46c",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      background: "rgba(48,164,108,0.1)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    good
                  </span>
                  <div>
                    <span style={{ color: "#ededed" }}>Backoff calculation is correct</span>
                    <span style={{ color: "#555" }}> — </span>
                    <span style={{ color: "#666" }}>
                      Exponential with jitter, capped at 30s. Clean implementation.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              background: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: 12,
              padding: "4px 4px 4px 16px",
            }}
          >
            <input
              type="text"
              placeholder="Ask a follow-up..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ededed",
                fontSize: 14,
                padding: "10px 8px",
                fontFamily: "inherit",
              }}
            />
            <button
              style={{
                background: "#1a1a1a",
                color: "#888",
                border: "1px solid #333",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Send
            </button>
          </div>
        </section>

        <footer
          style={{
            borderTop: "1px solid #1a1a1a",
            padding: "24px 0",
            textAlign: "center",
            fontSize: 13,
            color: "#333",
          }}
        >
          PR Lens
        </footer>
      </main>
    </div>
  );
}
