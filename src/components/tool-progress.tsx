"use client";

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
} from "@/components/ai-elements/code-block";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

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
  input?: unknown;
  output?: unknown;
  state: string;
  toolName: string;
};

function getStatusIndicator(state: string) {
  if (state === "output-error") {
    return { color: "#f87171", symbol: "✕" };
  }
  if (state === "output-available") {
    return { color: "#4ade80", symbol: "●" };
  }
  return { color: "#555", symbol: "◌" };
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolCodeBlock({ code, label }: { code: string; label: string }) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replaceAll(" ", "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, label]);

  return (
    <CodeBlock code={code} language="json">
      <CodeBlockHeader>
        <span className="font-mono text-xs text-muted-foreground">json</span>
        <CodeBlockActions>
          <Button onClick={handleDownload} size="icon" variant="ghost">
            <DownloadIcon size={14} />
          </Button>
          <CodeBlockCopyButton />
        </CodeBlockActions>
      </CodeBlockHeader>
    </CodeBlock>
  );
}

function ToolDetails({
  errorText,
  input,
  output,
}: {
  errorText?: string;
  input?: unknown;
  output?: unknown;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      initial={{ height: 0, opacity: 0 }}
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        ref={contentRef}
        style={{
          borderLeft: "1px solid #222",
          marginLeft: 3,
          marginTop: 4,
          paddingBottom: 4,
          paddingLeft: 13,
        }}
      >
        {input !== undefined ? (
          <div style={{ marginBottom: output || errorText ? 8 : 0 }}>
            <div
              style={{
                color: "#555",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.06em",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              Input
            </div>
            <ToolCodeBlock code={formatJson(input)} label="Input" />
          </div>
        ) : null}

        {output !== undefined ? (
          <div>
            <div
              style={{
                color: "#555",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.06em",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              Output
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              <ToolCodeBlock
                code={typeof output === "string" ? output : formatJson(output)}
                label="Output"
              />
            </div>
          </div>
        ) : null}

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
    </motion.div>
  );
}

export function ToolProgress({ errorText, input, output, state, toolName }: ToolProgressProps) {
  const [open, setOpen] = useState(false);
  const label = TOOL_LABELS[toolName] ?? toolName.replaceAll("_", " ");
  const indicator = getStatusIndicator(state);
  const suffix =
    state === "output-available" ? "" : state === "output-error" ? " failed" : "...";
  const isInProgress = state !== "output-available" && state !== "output-error";
  const hasDetails = input !== undefined || output !== undefined || errorText;

  return (
    <div style={{ marginTop: 2 }}>
      <button
        onClick={() => hasDetails && setOpen(!open)}
        style={{
          alignItems: "center",
          background: "transparent",
          border: "none",
          cursor: hasDetails ? "pointer" : "default",
          display: "inline-flex",
          gap: 8,
          minWidth: 0,
          padding: "2px 0",
        }}
        type="button"
      >
        <span
          style={{
            animation: isInProgress ? "pulse 1.5s ease-in-out infinite" : "none",
            color: indicator.color,
            fontSize: 8,
            lineHeight: 1,
          }}
        >
          {indicator.symbol}
        </span>
        <span
          style={{
            color: "#777",
            fontSize: 12,
            letterSpacing: "-0.01em",
            lineHeight: 1.4,
          }}
        >
          {label}
          {suffix}
        </span>
        {hasDetails ? (
          <span
            style={{
              color: "#444",
              fontSize: 10,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
            }}
          >
            ▾
          </span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {open && hasDetails ? (
          <ToolDetails errorText={errorText} input={input} output={output} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
