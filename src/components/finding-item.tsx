"use client";

import { useState } from "react";

import type { Finding } from "@/lib/schemas/review";

const RUBRIC_LABELS: Record<Finding["rubric"], string> = {
  "bug-risk": "Bug Risk",
  documentation: "Docs",
  maintainability: "Maintainability",
  "pattern-consistency": "Pattern",
  performance: "Performance",
  security: "Security",
};

const SEVERITY_STYLES: Record<
  Finding["severity"],
  { background: string; border: string; text: string }
> = {
  critical: {
    background: "rgba(127, 29, 29, 0.28)",
    border: "rgba(248, 113, 113, 0.34)",
    text: "#fca5a5",
  },
  suggestion: {
    background: "rgba(30, 64, 175, 0.24)",
    border: "rgba(96, 165, 250, 0.3)",
    text: "#93c5fd",
  },
  warning: {
    background: "rgba(120, 53, 15, 0.26)",
    border: "rgba(251, 191, 36, 0.28)",
    text: "#fcd34d",
  },
};

export function FindingItem({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const severityStyle = SEVERITY_STYLES[finding.severity];

  return (
    <article
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
        border: "1px solid #1f1f1f",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            background: severityStyle.background,
            border: `1px solid ${severityStyle.border}`,
            borderRadius: 999,
            color: severityStyle.text,
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            padding: "4px 8px",
            textTransform: "uppercase",
          }}
        >
          {finding.severity}
        </span>
        <span
          style={{
            background: "#111",
            border: "1px solid #1f1f1f",
            borderRadius: 999,
            color: "#888",
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            padding: "4px 8px",
            textTransform: "uppercase",
          }}
        >
          {RUBRIC_LABELS[finding.rubric]}
        </span>
      </div>

      <div
        style={{
          color: "#ededed",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.4,
          marginBottom: 8,
        }}
      >
        {finding.title}
      </div>

      <div
        style={{
          color: "#666",
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: 11,
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        {finding.file}
        {finding.lineRange ? ` · ${finding.lineRange}` : ""}
      </div>

      <p
        style={{
          color: "#bdbdbd",
          fontSize: 13,
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        {finding.description}
      </p>

      {finding.suggestion ? (
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setExpanded((value) => !value)}
            style={{
              background: "transparent",
              border: 0,
              color: expanded ? "#ededed" : "#888",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              padding: 0,
              textTransform: "uppercase",
            }}
            type="button"
          >
            {expanded ? "Hide suggestion" : "Show suggestion"}
          </button>

          {expanded ? (
            <pre
              style={{
                background: "#050505",
                border: "1px solid #1a1a1a",
                borderRadius: 14,
                color: "#d4d4d4",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 12,
                lineHeight: 1.7,
                margin: "10px 0 0",
                overflowX: "auto",
                padding: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              {finding.suggestion}
            </pre>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
