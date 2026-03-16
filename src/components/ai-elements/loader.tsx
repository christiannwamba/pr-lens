"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

type LoaderProps = {
  className?: string;
  label?: string;
};

export function Loader({
  className,
  label = "Reviewing the thread...",
}: LoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-4 py-2 shadow-[0_0_0_1px_rgba(245,214,130,0.06)] backdrop-blur",
        className
      )}
    >
      <span className="relative flex size-2.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/80" />
        <span className="relative rounded-full bg-primary size-2.5" />
      </span>
      <span
        className="relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent text-xs uppercase tracking-[0.3em]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #0000 calc(50% - 24px), #ededed, #0000 calc(50% + 24px)), linear-gradient(#888, #888)",
          backgroundRepeat: "no-repeat, padding-box",
          animation: "shimmer-slide 2s linear infinite",
        }}
      >
        {label}
      </span>
    </div>
  );
}
