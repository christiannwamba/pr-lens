import { FindingItem } from "@/components/finding-item";
import type { Review } from "@/lib/schemas/review";

const RISK_TONES: Record<
  Review["riskLevel"],
  { background: string; border: string; text: string }
> = {
  critical: {
    background: "rgba(127, 29, 29, 0.28)",
    border: "rgba(248, 113, 113, 0.34)",
    text: "#fca5a5",
  },
  high: {
    background: "rgba(120, 53, 15, 0.26)",
    border: "rgba(251, 146, 60, 0.28)",
    text: "#fdba74",
  },
  low: {
    background: "rgba(21, 128, 61, 0.2)",
    border: "rgba(74, 222, 128, 0.24)",
    text: "#86efac",
  },
  medium: {
    background: "rgba(120, 53, 15, 0.16)",
    border: "rgba(250, 204, 21, 0.24)",
    text: "#fde047",
  },
};

const VERDICT_LABELS: Record<Review["verdict"], string> = {
  approve: "Approve",
  "needs-discussion": "Needs discussion",
  "request-changes": "Request changes",
};

export function ReviewCard({
  prUrl,
  review,
}: {
  prUrl?: string | null;
  review: Review;
}) {
  const riskTone = RISK_TONES[review.riskLevel];

  return (
    <section
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.01))",
        border: "1px solid #222",
        borderRadius: 24,
        marginTop: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #1a1a1a",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "space-between",
          padding: 20,
        }}
      >
        <div>
          <div
            style={{
              color: "#666",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Structured review
          </div>
          <h2
            style={{
              color: "#ededed",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            PR Review
          </h2>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span
            style={{
              background: riskTone.background,
              border: `1px solid ${riskTone.border}`,
              borderRadius: 999,
              color: riskTone.text,
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              padding: "7px 11px",
              textTransform: "uppercase",
            }}
          >
            {review.riskLevel} risk
          </span>
          {prUrl ? (
            <a
              href={prUrl}
              rel="noopener noreferrer"
              style={{
                color: "#d4d4d4",
                fontSize: 13,
                letterSpacing: "-0.01em",
                textDecoration: "none",
                transition: "color 160ms ease",
              }}
              target="_blank"
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#d4d4d4"; }}
            >
              View
            </a>
          ) : (
            <span
              style={{
                color: "#d4d4d4",
                fontSize: 13,
                letterSpacing: "-0.01em",
              }}
            >
              {VERDICT_LABELS[review.verdict]}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <p
          style={{
            color: "#c7c7c7",
            fontSize: 14,
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          {review.summary}
        </p>

        {review.findings.length > 0 ? (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                color: "#666",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.08em",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Findings · {review.findings.length}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {review.findings.map((finding, index) => (
                <FindingItem finding={finding} key={`${finding.file}-${finding.title}-${index}`} />
              ))}
            </div>
          </div>
        ) : null}

        {review.praise.length > 0 ? (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                color: "#666",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.08em",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              What&apos;s done well
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {review.praise.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    alignItems: "flex-start",
                    color: "#d6f5df",
                    display: "flex",
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <span
                    style={{
                      color: "#4ade80",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    ok
                  </span>
                  <span style={{ color: "#c7c7c7" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
