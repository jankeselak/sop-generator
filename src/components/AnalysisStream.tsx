"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ProcessMap, ProcessStep } from "@/lib/types";
import {
  extractStepsFromPartialJSON,
  extractTitleFromPartialJSON,
  extractCategoryFromPartialJSON,
} from "@/lib/parseStream";
import { Loader2, Check } from "lucide-react";

interface AnalysisStreamProps {
  description: string;
  onComplete: (processMap: ProcessMap) => void;
  onError: (message: string) => void;
}

export default function AnalysisStream({
  description,
  onComplete,
  onError,
}: AnalysisStreamProps) {
  const [streamedText, setStreamedText] = useState("");
  const [phase, setPhase] = useState<
    "connecting" | "analyzing" | "finalizing"
  >("connecting");
  const hasStarted = useRef(false);

  const extractedSteps = useMemo(
    () => extractStepsFromPartialJSON(streamedText),
    [streamedText]
  );
  const extractedTitle = useMemo(
    () => extractTitleFromPartialJSON(streamedText),
    [streamedText]
  );
  const extractedCategory = useMemo(
    () => extractCategoryFromPartialJSON(streamedText),
    [streamedText]
  );

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const analyze = async () => {
      await new Promise((r) => setTimeout(r, 600));
      setPhase("analyzing");

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Analysis failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            if (data.type === "delta") {
              setStreamedText((prev) => prev + data.text);
            } else if (data.type === "complete") {
              setPhase("finalizing");
              await new Promise((r) => setTimeout(r, 400));
              onComplete(data.processMap);
              return;
            } else if (data.type === "error") {
              onError(data.message);
              return;
            }
          }
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : "Analysis failed");
      }
    };

    analyze();
  }, [description, onComplete, onError]);

  const automationCounts = useMemo(() => {
    const full = extractedSteps.filter(
      (s) => s.automationPotential === "full"
    ).length;
    const partial = extractedSteps.filter(
      (s) => s.automationPotential === "partial"
    ).length;
    const human = extractedSteps.filter(
      (s) => s.automationPotential === "human-required"
    ).length;
    return { full, partial, human };
  }, [extractedSteps]);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-md)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            {phase === "finalizing" ? (
              <div className="w-5 h-5 rounded-full bg-green/10 flex items-center justify-center">
                <Check size={12} className="text-green" />
              </div>
            ) : (
              <Loader2 size={16} className="text-fg-muted animate-spin" />
            )}
            <span className="text-sm font-medium text-fg">
              {phase === "connecting" && "Connecting..."}
              {phase === "analyzing" && "Building your SOP..."}
              {phase === "finalizing" && "SOP ready"}
            </span>
          </div>
          {extractedSteps.length > 0 && (
            <span className="text-sm font-mono text-fg-muted">
              {extractedSteps.length} step
              {extractedSteps.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {/* Title + Category */}
          {extractedTitle && (
            <div className="mb-6 animate-fade-up">
              <h2 className="font-display font-bold text-2xl text-fg">
                {extractedTitle}
              </h2>
              {extractedCategory && (
                <span className="text-sm text-fg-muted mt-1 inline-block">
                  {extractedCategory}
                </span>
              )}
            </div>
          )}

          {/* Steps list */}
          <div className="space-y-2">
            {extractedSteps.map((step, index) => (
              <StreamingStepCard
                key={step.id || `step-${index}`}
                step={step}
                index={index}
              />
            ))}
          </div>

          {/* Empty/connecting states */}
          {phase === "connecting" && (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <Loader2
                  size={20}
                  className="text-fg-muted animate-spin mx-auto mb-3"
                />
                <p className="text-fg-muted text-sm">
                  Initializing analysis...
                </p>
              </div>
            </div>
          )}

          {phase === "analyzing" && extractedSteps.length === 0 && (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <Loader2
                  size={20}
                  className="text-fg-muted animate-spin mx-auto mb-3"
                />
                <p className="text-fg-muted text-sm">
                  Analyzing process description...
                </p>
              </div>
            </div>
          )}

          {/* Finalizing */}
          {phase === "finalizing" && (
            <div className="mt-6 flex items-center gap-2 text-green text-sm font-medium">
              <Check size={16} />
              {extractedSteps.length} steps documented — opening editor...
            </div>
          )}
        </div>

        {/* Footer stats */}
        {extractedSteps.length > 0 && (
          <div className="px-5 py-3 border-t border-border-subtle flex items-center gap-4 text-xs text-fg-muted font-mono">
            <span>{automationCounts.full} fully automatable</span>
            <span className="text-border-strong">&middot;</span>
            <span>{automationCounts.partial} partial</span>
            <span className="text-border-strong">&middot;</span>
            <span>{automationCounts.human} human required</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingStepCard({
  step,
  index,
}: {
  step: ProcessStep;
  index: number;
}) {
  const automationColors: Record<string, string> = {
    full: "text-green",
    partial: "text-amber",
    "human-required": "text-red",
  };
  const automationLabels: Record<string, string> = {
    full: "Auto",
    partial: "Partial",
    "human-required": "Manual",
  };

  return (
    <div
      className="flex items-start gap-4 p-3.5 rounded-lg border border-border-subtle bg-bg animate-fade-up"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="flex items-center justify-center w-6 h-6 rounded bg-bg-sunken text-fg-muted text-xs font-mono font-medium flex-shrink-0 mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-fg">{step.title}</div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-muted">
          <span>{step.system}</span>
          <span className="text-border-strong">&middot;</span>
          <span>{step.role}</span>
          <span className="text-border-strong">&middot;</span>
          <span>{step.estimatedMinutes}m</span>
          <span className="text-border-strong">&middot;</span>
          <span className={automationColors[step.automationPotential] || ""}>
            {automationLabels[step.automationPotential] || ""}
          </span>
        </div>
      </div>
    </div>
  );
}
