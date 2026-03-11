"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ProcessMapView from "@/components/ProcessMapView";
import { ProcessMap } from "@/lib/types";
import { Loader2, AlertCircle, CheckCircle, Users } from "lucide-react";

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const highlightRole = searchParams.get("role");

  const [processMap, setProcessMap] = useState<ProcessMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/results?id=${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(
              "This SOP was not found. It may have expired or the link may be incorrect."
            );
          } else {
            throw new Error("Failed to load SOP");
          }
          return;
        }
        const data = await response.json();
        setProcessMap(data);
      } catch {
        setError("Failed to load the SOP. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  const highlightedStepCount = processMap
    ? processMap.steps.filter(
        (s) => s.role.toLowerCase() === highlightRole?.toLowerCase()
      ).length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={20} className="text-fg-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !processMap) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="max-w-md mx-auto text-center py-32 px-6">
          <AlertCircle
            size={32}
            className="mx-auto text-fg-muted mb-4"
            strokeWidth={1.5}
          />
          <h1 className="font-display text-xl font-semibold text-fg">
            SOP Not Found
          </h1>
          <p className="text-fg-secondary mt-2 text-sm">{error}</p>
          <a
            href="/"
            className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-fg text-bg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create Your Own SOP
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="px-6 py-10">
        {/* Stakeholder validation banner */}
        {highlightRole && (
          <div className="max-w-[1100px] mx-auto mb-8 animate-fade-up">
            {confirmed ? (
              <div className="bg-green-bg border border-green/20 rounded-xl px-6 py-5 flex items-center gap-4">
                <CheckCircle size={20} className="text-green flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-fg">
                    Thanks! You&apos;ve confirmed your steps as{" "}
                    <strong>{highlightRole}</strong>.
                  </p>
                  <p className="text-xs text-fg-secondary mt-0.5">
                    The process owner has been notified.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-orange-bg border border-orange/20 rounded-xl px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={18} className="text-orange" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-fg">
                        Action needed — validate your steps as{" "}
                        <strong className="text-orange">{highlightRole}</strong>
                      </p>
                      <p className="text-xs text-fg-secondary mt-1">
                        {highlightedStepCount} step{highlightedStepCount !== 1 ? "s" : ""}{" "}
                        assigned to you are highlighted below. Review them and confirm
                        if they accurately describe your work.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmed(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange text-white text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0 animate-[pulse-ring-orange_2s_ease-in-out_infinite]"
                  >
                    <CheckCircle size={14} />
                    Confirm Steps
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <ProcessMapView
          processMap={processMap}
          highlightRole={highlightRole}
        />
      </main>
    </div>
  );
}
