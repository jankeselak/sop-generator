"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import TemplateSelector from "@/components/TemplateSelector";
import AnalysisStream from "@/components/AnalysisStream";
import ProcessMapView from "@/components/ProcessMapView";
import { Template, ProcessMap, TEMPLATES } from "@/lib/types";
import { ArrowRight, Zap, Users } from "lucide-react";

type AppState = "input" | "analyzing" | "editing";

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<AppState>("input");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processMap, setProcessMap] = useState<ProcessMap | null>(null);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    if (template.id !== "custom") {
      setDescription(template.placeholder);
    } else {
      setDescription("");
    }
  };

  const handleAnalyze = () => {
    if (description.trim().length < 20) {
      setError("Please describe your process in more detail.");
      return;
    }
    setError(null);
    setState("analyzing");
  };

  const handleComplete = useCallback((map: ProcessMap) => {
    setProcessMap(map);
    setState("editing");
  }, []);

  const handleFinalize = useCallback(
    (id: string) => {
      router.push(`/result/${id}`);
    },
    [router]
  );

  const handleError = useCallback((message: string) => {
    setError(message);
    setState("input");
  }, []);

  if (state === "editing" && processMap) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="px-6 py-10">
          <ProcessMapView
            processMap={processMap}
            editable={true}
            onFinalize={handleFinalize}
          />
        </main>
      </div>
    );
  }

  if (state === "analyzing") {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="px-6 py-12">
          <AnalysisStream
            description={description}
            onComplete={handleComplete}
            onError={handleError}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-[1100px] mx-auto px-6">
        {/* Hero */}
        <section className="pt-24 pb-16">
          <p
            className="text-fg-muted text-sm font-mono uppercase tracking-widest mb-6 animate-fade-up"
            style={{ animationDelay: "0s" }}
          >
            Document any process in 30 seconds
          </p>

          <h1
            className="font-display font-bold text-[3.5rem] sm:text-[4.25rem] text-fg leading-[1.08] tracking-[-0.02em] animate-fade-up"
            style={{ animationDelay: "0.06s" }}
          >
            Your process,
            <br />
            documented.
          </h1>

          <p
            className="text-fg-secondary text-lg mt-6 max-w-[560px] leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.12s" }}
          >
            Describe any operational process in plain English &mdash; get a
            complete SOP with visual workflow, role assignments, time estimates,
            and a shareable link your team can validate.
          </p>
        </section>

        {/* Templates */}
        <section
          className="pb-8 animate-fade-up"
          style={{ animationDelay: "0.18s" }}
        >
          <div className="text-xs font-mono text-fg-muted uppercase tracking-widest mb-4">
            Common retail &amp; CPG workflows
          </div>
          <TemplateSelector
            onSelect={handleTemplateSelect}
            selected={selectedTemplate}
          />
        </section>

        {/* Input */}
        <section
          className="pb-20 animate-fade-up"
          style={{ animationDelay: "0.24s" }}
        >
          <div className="bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-md)] overflow-hidden">
            <div className="p-5 pb-0">
              <label className="block text-sm font-medium text-fg mb-2">
                Describe your process
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError(null);
                }}
                placeholder={
                  selectedTemplate?.placeholder ||
                  "Describe the operational process you want to document. Include: what triggers it, the steps involved, which systems you use, who's responsible, how often it runs, and where the pain points are..."
                }
                rows={6}
                className="w-full bg-transparent text-fg text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-fg-muted/60"
              />
            </div>
            {error && (
              <div className="px-5 pb-2">
                <p className="text-sm text-red">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-subtle">
              <p className="text-xs text-fg-muted font-mono">
                {description.length > 0 ? `${description.length} chars` : ""}
              </p>
              <button
                onClick={handleAnalyze}
                disabled={description.trim().length < 20}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-fg text-bg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
              >
                Generate SOP
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Trust bar */}
          <div className="flex items-center gap-6 mt-5 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green" />
              No sign-up required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green" />
              SOP ready in ~30s
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green" />
              Shareable link
            </span>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-24 border-t border-border pt-16">
          <h2 className="font-display text-lg font-semibold text-fg mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step
              num="01"
              title="Describe"
              body="Pick a template or describe any process in plain English. Include systems, roles, and pain points."
            />
            <Step
              num="02"
              title="Generate"
              body="AI creates a complete SOP with visual workflow, role assignments, time estimates, and automation scoring."
            />
            <Step
              num="03"
              title="Validate & Share"
              body="Invite stakeholders to confirm their steps. Share the report with your team, download it, or export to Duvo to automate."
            />
          </div>
        </section>

        {/* Example SOPs gallery */}
        <section className="pb-24 border-t border-border pt-16">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-semibold text-fg">
              Example SOPs
            </h2>
            <span className="text-xs text-fg-muted font-mono">Generated in ~30s each</span>
          </div>
          <p className="text-fg-secondary text-sm mb-8 max-w-xl">
            See what the tool produces. Click any example to generate a similar SOP from the template.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EXAMPLE_SOPS.map((example, i) => (
              <button
                key={example.title}
                onClick={() => {
                  const template = TEMPLATES.find((t) => t.id === example.templateId);
                  if (template) {
                    handleTemplateSelect(template);
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group text-left bg-bg-elevated border border-border rounded-xl p-5 hover:border-border-strong hover:shadow-[var(--shadow-md)] transition-all animate-fade-up"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-sunken text-fg-muted font-mono uppercase tracking-wider">
                    {example.category}
                  </span>
                </div>
                <h3 className="font-display text-[15px] font-semibold text-fg mb-1.5 group-hover:text-teal transition-colors">
                  {example.title}
                </h3>
                <p className="text-fg-secondary text-xs leading-relaxed mb-4 line-clamp-2">
                  {example.summary}
                </p>
                <div className="flex items-center gap-4 text-xs text-fg-muted mb-3">
                  <span>{example.steps} steps</span>
                  <span>{example.roles} roles</span>
                  <span>{example.weeklyHours}h/wk</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-fg-muted">
                    <Zap size={11} className="text-green" />
                    {example.automatableSteps} of {example.steps} steps automatable
                  </span>
                  <span className="text-fg-muted">·</span>
                  <span className="text-green font-medium">{example.annualSavings}/yr savings</span>
                </div>
                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center gap-1.5 text-xs font-medium text-teal opacity-0 group-hover:opacity-100 transition-opacity">
                  Generate similar SOP
                  <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const EXAMPLE_SOPS = [
  {
    title: "Weekly Invoice Reconciliation",
    category: "Finance Ops",
    templateId: "invoice-processing" as const,
    summary: "200+ supplier invoices processed weekly across SAP, email, and Excel with manual PO matching, discrepancy resolution, and payment scheduling.",
    steps: 8,
    weeklyHours: 14.5,
    annualSavings: "$28.4k",
    automationScore: 82,
    roles: 3,
    automatableSteps: 5,
  },
  {
    title: "New Supplier Onboarding",
    category: "Vendor & Trade",
    templateId: "supplier-onboarding" as const,
    summary: "End-to-end supplier setup including document collection, compliance verification, SAP vendor master creation, and payment term configuration.",
    steps: 7,
    weeklyHours: 8.2,
    annualSavings: "$16.7k",
    automationScore: 68,
    roles: 4,
    automatableSteps: 4,
  },
  {
    title: "Promotional Pricing Execution",
    category: "Category & Merchandising",
    templateId: "promo-execution" as const,
    summary: "Cross-system price updates across POS, e-commerce, and ERP for promotional campaigns with store notification and post-promo performance tracking.",
    steps: 9,
    weeklyHours: 11.0,
    annualSavings: "$22.1k",
    automationScore: 75,
    roles: 3,
    automatableSteps: 6,
  },
];

function Step({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="font-mono text-fg-muted text-xs tracking-widest mb-3">
        {num}
      </div>
      <h3 className="font-display text-base font-semibold text-fg mb-1.5">
        {title}
      </h3>
      <p className="text-fg-secondary text-sm leading-relaxed">{body}</p>
    </div>
  );
}
