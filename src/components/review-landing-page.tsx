"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ReviewComposer } from "@/components/review-composer";
import { samplePRs } from "@/lib/sample-prs";

type ReviewLandingPageProps = {
  inputFocused: boolean;
  text: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSubmit: (message: PromptInputMessage) => void;
};


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

          <div style={{ marginTop: 20, maxWidth: 600, width: "100%" }}>
            <Suggestions className="justify-center">
              {samplePRs.map((pr) => (
                <Suggestion
                  className="border-[#222] bg-transparent text-[#666] hover:border-[#444] hover:text-[#999]"
                  key={pr}
                  onClick={(s) => {
                    onChange(s);
                    onSubmit({ files: [], text: s });
                  }}
                  suggestion={pr}
                />
              ))}
            </Suggestions>
          </div>

        </section>
      </main>
    </div>
  );
}
