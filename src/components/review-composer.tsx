"use client";

import type { ChatStatus } from "ai";
import { ArrowUpIcon } from "lucide-react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

const appSansFont =
  "var(--font-ibm-plex-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const appMonoFont = "var(--font-ibm-plex-mono), monospace";

type ReviewComposerProps = {
  focused?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onStop?: () => void;
  onSubmit: (message: PromptInputMessage) => void;
  placeholder: string;
  status?: ChatStatus;
  submitAriaLabel?: string;
  value: string;
};

export function ReviewComposer({
  focused = false,
  onBlur,
  onChange,
  onFocus,
  onStop,
  onSubmit,
  placeholder,
  status,
  submitAriaLabel,
  value,
}: ReviewComposerProps) {
  const waitingOnAssistant = status === "submitted" || status === "streaming";

  return (
    <PromptInput
      className={cn(
        "[&>input[type=file]]:hidden [&>[data-slot=input-group]]:h-auto [&>[data-slot=input-group]]:rounded-[999px] [&>[data-slot=input-group]]:border [&>[data-slot=input-group]]:border-[#222] [&>[data-slot=input-group]]:bg-[#0a0a0a] [&>[data-slot=input-group]]:pl-[16px] [&>[data-slot=input-group]]:pr-[6px] [&>[data-slot=input-group]]:py-[6px] [&>[data-slot=input-group]]:shadow-none [&>[data-slot=input-group]]:ring-0 [&>[data-slot=input-group]]:transition-colors [&>[data-slot=input-group]]:focus-within:ring-0",
        focused ? "[&>[data-slot=input-group]]:border-[#444]" : ""
      )}
      onSubmit={onSubmit}
    >
      <div className="flex w-full items-center gap-3 px-1">
        <svg
          fill="none"
          height="16"
          style={{ flexShrink: 0, marginLeft: 2 }}
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M7.775 3.275a1.15 1.15 0 0 1 1.625 0l3.325 3.325a1.15 1.15 0 0 1 0 1.625l-3.325 3.325a1.15 1.15 0 0 1-1.625 0L4.45 8.225a1.15 1.15 0 0 1 0-1.625L7.775 3.275Z"
            stroke="#555"
            strokeWidth="1.2"
          />
        </svg>
        <PromptInputTextarea
          className="max-h-[44px] min-h-[44px] flex-1 resize-none bg-transparent px-0 py-3 text-sm text-[#ededed] placeholder:text-[#666]"
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          style={{ fontFamily: appMonoFont }}
          value={value}
        />
        <PromptInputSubmit
          aria-label={submitAriaLabel}
          className="my-0 ml-3 mr-0 size-11 shrink-0 rounded-full border-0 bg-[#ededed] p-0 text-sm font-medium text-[#000] transition-opacity hover:opacity-90"
          onStop={onStop}
          size="icon-sm"
          status={status}
          style={{ fontFamily: appSansFont }}
        >
          {waitingOnAssistant ? null : (
            <ArrowUpIcon className="h-[22px] w-[22px]" strokeWidth={2.6} />
          )}
        </PromptInputSubmit>
      </div>
    </PromptInput>
  );
}
