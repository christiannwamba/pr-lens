"use client";

const TOOL_LABELS: Record<string, string> = {
  fetch_blame: "Analyzing git history",
  fetch_file_content: "Reading file context",
  fetch_pr_diff: "Fetching pull request diff",
  fetch_related_issues: "Searching related issues",
  fetch_repo_guidelines: "Checking repository guidelines",
  generate_structured_review: "Generating structured review",
  load_skill: "Loading skill",
  search_tools: "Activating tools",
};

type ToolProgressProps = {
  errorText?: string;
  state: string;
  toolName: string;
};

function getStatusTone(state: string) {
  if (state === "output-error") {
    return {
      background: "rgba(127, 29, 29, 0.26)",
      border: "rgba(248, 113, 113, 0.38)",
      glyph: "x",
      glyphColor: "#fca5a5",
      text: "#fecaca",
    };
  }

  if (state === "output-available") {
    return {
      background: "rgba(21, 128, 61, 0.2)",
      border: "rgba(74, 222, 128, 0.28)",
      glyph: "done",
      glyphColor: "#86efac",
      text: "#dcfce7",
    };
  }

  return {
    background: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    glyph: "live",
    glyphColor: "#888",
    text: "#b3b3b3",
  };
}

export function ToolProgress({ errorText, state, toolName }: ToolProgressProps) {
  const label = TOOL_LABELS[toolName] ?? toolName.replaceAll("_", " ");
  const tone = getStatusTone(state);
  const suffix = state === "output-available" ? "" : state === "output-error" ? " failed" : "...";

  return (
    <div
      style={{
        background: tone.background,
        border: `1px solid ${tone.border}`,
        borderRadius: 999,
        color: tone.text,
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        marginTop: 10,
        maxWidth: "100%",
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 10,
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: tone.glyphColor,
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {tone.glyph}
        </span>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "-0.01em",
            lineHeight: 1.4,
          }}
        >
          {label}
          {suffix}
        </span>
      </div>

      {errorText ? (
        <div
          style={{
            color: "#fca5a5",
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 11,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {errorText}
        </div>
      ) : null}
    </div>
  );
}
