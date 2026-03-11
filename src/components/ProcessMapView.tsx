"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProcessMap, ProcessStep } from "@/lib/types";
import {
  Clock,
  Zap,
  Users,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UserPlus,
  Monitor,
  Mail,
  FileSpreadsheet,
  Phone,
  Globe,
  MessageSquare,
  Share2,
  Pencil,
  Trash2,
  Save,
  Plus,
  Loader2,
  X,
  FileText,
  Download,
} from "lucide-react";
import StakeholderInvite from "./StakeholderInvite";

interface ProcessMapViewProps {
  processMap: ProcessMap;
  highlightRole?: string | null;
  editable?: boolean;
  onFinalize?: (id: string) => void;
}

const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  SAP: <Monitor size={14} strokeWidth={1.5} />,
  Oracle: <Monitor size={14} strokeWidth={1.5} />,
  Email: <Mail size={14} strokeWidth={1.5} />,
  Excel: <FileSpreadsheet size={14} strokeWidth={1.5} />,
  "Google Sheets": <FileSpreadsheet size={14} strokeWidth={1.5} />,
  Phone: <Phone size={14} strokeWidth={1.5} />,
  Browser: <Globe size={14} strokeWidth={1.5} />,
  "Supplier Portal": <Globe size={14} strokeWidth={1.5} />,
  Slack: <MessageSquare size={14} strokeWidth={1.5} />,
};

const AUTOMATION_STYLES = {
  full: {
    dot: "bg-green",
    label: "Automatable",
    bg: "bg-green-bg",
    border: "border-green/20",
  },
  partial: {
    dot: "bg-amber",
    label: "Partially",
    bg: "bg-amber-bg",
    border: "border-amber/20",
  },
  "human-required": {
    dot: "bg-red",
    label: "Human Required",
    bg: "bg-red-bg",
    border: "border-red/20",
  },
};

export default function ProcessMapView({
  processMap: initialProcessMap,
  highlightRole,
  editable = false,
  onFinalize,
}: ProcessMapViewProps) {
  const router = useRouter();
  const [processMap, setProcessMap] = useState<ProcessMap>(initialProcessMap);
  const [copiedSOP, setCopiedSOP] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [invitingRole, setInvitingRole] = useState<string | null>(null);
  const [invitingStepId, setInvitingStepId] = useState<string | null>(null);
  const [invitedRoles, setInvitedRoles] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [sopOpen, setSopOpen] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [emailGateAction, setEmailGateAction] = useState<"finalize" | "viewSop">("finalize");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCollected, setEmailCollected] = useState(false);
  const inviteSectionRef = useRef<HTMLDivElement>(null);

  const toggleStep = (stepId: string) => {
    if (editable) {
      setEditingStepId(editingStepId === stepId ? null : stepId);
      return;
    }
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const updateStep = useCallback(
    (stepId: string, updates: Partial<ProcessStep>) => {
      setProcessMap((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId ? { ...s, ...updates } : s
        ),
      }));
    },
    []
  );

  const deleteStep = useCallback((stepId: string) => {
    setProcessMap((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
    setEditingStepId(null);
  }, []);

  const addStep = useCallback((afterIndex: number) => {
    const newStep: ProcessStep = {
      id: `step-new-${Date.now()}`,
      order: afterIndex + 2,
      title: "New Step",
      description: "",
      role: "Unassigned",
      system: "Email",
      estimatedMinutes: 5,
      automationPotential: "partial",
      exceptions: [],
    };
    setProcessMap((prev) => {
      const steps = [...prev.steps];
      steps.splice(afterIndex + 1, 0, newStep);
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
      };
    });
    setEditingStepId(newStep.id);
  }, []);

  const moveStep = useCallback((index: number, direction: "up" | "down") => {
    setProcessMap((prev) => {
      const steps = [...prev.steps];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= steps.length) return prev;
      [steps[index], steps[targetIndex]] = [steps[targetIndex], steps[index]];
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
      };
    });
  }, []);

  const handleFinalizeClick = () => {
    if (emailCollected) {
      handleFinalizeSubmit();
      return;
    }
    setEmailGateAction("finalize");
    setShowEmailGate(true);
  };

  const handleViewSopClick = () => {
    if (emailCollected) {
      setSopOpen(true);
      return;
    }
    setEmailGateAction("viewSop");
    setShowEmailGate(true);
  };

  const handleEmailSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setEmailCollected(true);
    setShowEmailGate(false);

    if (emailGateAction === "viewSop") {
      setSopOpen(true);
      return;
    }

    // finalize action
    await handleFinalizeSubmit();
  };

  const handleFinalizeSubmit = async () => {
    setSaving(true);
    try {
      const updatedMap = {
        ...processMap,
        creatorEmail: email.trim(),
        metrics: {
          ...processMap.metrics,
          totalSteps: processMap.steps.length,
          automatableSteps: processMap.steps.filter(
            (s) => s.automationPotential === "full"
          ).length,
          manualSteps: processMap.steps.filter(
            (s) => s.automationPotential === "human-required"
          ).length,
        },
      };

      await fetch("/api/results", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedMap),
      });

      if (onFinalize) {
        onFinalize(processMap.id);
      } else {
        router.replace(`/result/${processMap.id}`);
      }
    } catch {
      if (onFinalize) {
        onFinalize(processMap.id);
      } else {
        router.replace(`/result/${processMap.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const buildFullSOP = () => {
    const lines: string[] = [];
    lines.push(`# ${processMap.title}`);
    lines.push(`Category: ${processMap.category}`);
    lines.push(`Created: ${new Date(processMap.createdAt).toLocaleDateString()}`);
    lines.push("");
    lines.push(`## Summary`);
    lines.push(processMap.summary);
    lines.push("");
    lines.push(`## Metrics`);
    lines.push(`- Total steps: ${processMap.steps.length}`);
    lines.push(`- Automatable steps: ${processMap.metrics.automatableSteps}`);
    lines.push(`- Manual steps: ${processMap.metrics.manualSteps}`);
    lines.push(`- Weekly effort: ${(processMap.metrics.estimatedWeeklyMinutes / 60).toFixed(1)}h`);
    lines.push(`- Weekly savings potential: ${(processMap.metrics.estimatedWeeklySavingsMinutes / 60).toFixed(1)}h`);
    lines.push(`- Annual savings potential: ${Math.round((processMap.metrics.estimatedWeeklySavingsMinutes * 52) / 60)}h (~${annualCostSavingsFormatted} at $${HOURLY_COST}/hr)`);
    lines.push(`- Automation readiness score: ${processMap.metrics.automationReadinessScore}/100`);
    lines.push("");
    lines.push(`## Roles`);
    for (const role of processMap.roles) {
      lines.push(`- ${role.name} (${role.department}) — ${(role.totalMinutesPerWeek / 60).toFixed(1)}h/week`);
    }
    lines.push("");
    lines.push(`## Procedure`);
    for (const step of processMap.steps) {
      const autoLabel =
        step.automationPotential === "full" ? "Automatable"
        : step.automationPotential === "partial" ? "Partially automatable"
        : "Human required";
      lines.push("");
      lines.push(`### Step ${step.order}: ${step.title}`);
      if (step.description) lines.push(step.description);
      lines.push(`- Role: ${step.role}`);
      lines.push(`- System: ${step.system}`);
      lines.push(`- Estimated time: ${step.estimatedMinutes} minutes`);
      lines.push(`- Automation: ${autoLabel}`);
      if (step.exceptions.length > 0) {
        lines.push(`- Exceptions:`);
        for (const exc of step.exceptions) {
          lines.push(`  - ${exc}`);
        }
      }
    }
    if (processMap.duvoSolutions.length > 0) {
      lines.push("");
      lines.push(`## Matching Duvo Solutions`);
      for (const sol of processMap.duvoSolutions) {
        lines.push(`- ${sol}`);
      }
    }
    lines.push("");
    lines.push(`## Duvo Assignment Builder Format`);
    lines.push(processMap.sopText);
    return lines.join("\n");
  };

  const copySOP = async () => {
    await navigator.clipboard.writeText(buildFullSOP());
    setCopiedSOP(true);
    setTimeout(() => setCopiedSOP(false), 2000);
  };

  const downloadSOP = () => {
    const content = buildFullSOP();
    const slug = processMap.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-sop.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStepInvite = (stepId: string, role: string) => {
    if (invitingStepId === stepId) {
      setInvitingStepId(null);
    } else {
      setInvitingStepId(stepId);
      setInvitingRole(role);
    }
  };

  const handleInviteSent = (role: string) => {
    setInvitedRoles((prev) => new Set([...prev, role]));
    setInvitingStepId(null);
  };

  const uniqueRoles = Array.from(new Set(processMap.steps.map((s) => s.role)));
  const uninvitedRoles = uniqueRoles.filter((r) => !invitedRoles.has(r));

  const weeklyHours = (
    processMap.metrics.estimatedWeeklyMinutes / 60
  ).toFixed(1);
  const savingsHours = (
    processMap.metrics.estimatedWeeklySavingsMinutes / 60
  ).toFixed(1);
  const annualSavingsHours = Math.round(
    (processMap.metrics.estimatedWeeklySavingsMinutes * 52) / 60
  );
  const savingsPercent = Math.round(
    (processMap.metrics.estimatedWeeklySavingsMinutes /
      processMap.metrics.estimatedWeeklyMinutes) *
      100
  );
  const HOURLY_COST = 45; // average ops role cost
  const annualCostSavings = Math.round(annualSavingsHours * HOURLY_COST);
  const annualCostSavingsFormatted =
    annualCostSavings >= 1000
      ? `$${(annualCostSavings / 1000).toFixed(1)}k`
      : `$${annualCostSavings}`;

  // Derive roles from steps (source of truth) so edits stay in sync
  const roleGroups = (() => {
    const roleMap = new Map<string, { steps: ProcessStep[]; department: string; totalMinutesPerWeek: number }>();
    for (const step of processMap.steps) {
      const key = step.role;
      if (!roleMap.has(key)) {
        // Try to find department from original AI-generated roles
        const originalRole = processMap.roles.find(
          (r) => r.name.toLowerCase() === key.toLowerCase()
        );
        roleMap.set(key, {
          steps: [],
          department: originalRole?.department || "",
          totalMinutesPerWeek: 0,
        });
      }
      const entry = roleMap.get(key)!;
      entry.steps.push(step);
      entry.totalMinutesPerWeek += step.estimatedMinutes;
    }
    return Array.from(roleMap.entries()).map(([name, data]) => ({
      name,
      department: data.department,
      steps: data.steps,
      totalMinutesPerWeek: data.totalMinutesPerWeek,
      stepsInvolved: data.steps.map((s) => s.order),
    }));
  })();

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* SOP Drawer */}
      {sopOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSopOpen(false)}>
          <div className="absolute inset-0 bg-fg/10" />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-bg-elevated border-l border-border shadow-[var(--shadow-lg)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-fg-muted" />
                <span className="font-display font-semibold text-fg text-sm">
                  Standard Operating Procedure
                </span>
              </div>
              <button
                onClick={() => setSopOpen(false)}
                className="p-1 text-fg-muted hover:text-fg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* SOP Header */}
              <div>
                <h3 className="font-display font-bold text-lg text-fg">
                  {processMap.title}
                </h3>
                <p className="text-xs text-fg-muted font-mono mt-1">
                  {processMap.category} · {processMap.steps.length} steps · Created{" "}
                  {new Date(processMap.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-fg-secondary mt-2 leading-relaxed">
                  {processMap.summary}
                </p>
              </div>

              {/* Metrics summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg-sunken rounded-lg p-3">
                  <div className="text-[10px] text-fg-muted font-mono uppercase tracking-wider">Weekly effort</div>
                  <div className="font-display font-bold text-fg text-lg mt-0.5">{weeklyHours}h</div>
                </div>
                <div className="bg-bg-sunken rounded-lg p-3">
                  <div className="text-[10px] text-fg-muted font-mono uppercase tracking-wider">Savings potential</div>
                  <div className="font-display font-bold text-green text-lg mt-0.5">{savingsHours}h/wk</div>
                </div>
                <div className="bg-bg-sunken rounded-lg p-3">
                  <div className="text-[10px] text-fg-muted font-mono uppercase tracking-wider">Automation score</div>
                  <div className="font-display font-bold text-fg text-lg mt-0.5">{processMap.metrics.automationReadinessScore}/100</div>
                </div>
                <div className="bg-bg-sunken rounded-lg p-3">
                  <div className="text-[10px] text-fg-muted font-mono uppercase tracking-wider">Est. annual savings</div>
                  <div className="font-display font-bold text-teal text-lg mt-0.5">{annualCostSavingsFormatted}/yr</div>
                </div>
              </div>

              {/* Roles */}
              <div>
                <h4 className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-2">Roles involved</h4>
                <div className="space-y-1.5">
                  {processMap.roles.map((role) => (
                    <div key={role.name} className="flex items-center justify-between text-sm">
                      <span className="text-fg font-medium">{role.name}</span>
                      <span className="text-fg-muted text-xs">
                        {role.department} · {(role.totalMinutesPerWeek / 60).toFixed(1)}h/wk
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-step procedure */}
              <div>
                <h4 className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-3">Procedure</h4>
                <div className="space-y-4">
                  {processMap.steps.map((step) => {
                    const autoLabel =
                      step.automationPotential === "full"
                        ? "Automatable"
                        : step.automationPotential === "partial"
                        ? "Partially automatable"
                        : "Human required";
                    return (
                      <div key={step.id} className="border-l-2 border-border pl-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-fg-muted">
                            {String(step.order).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-semibold text-fg">
                            {step.title}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-sm text-fg-secondary mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-fg-muted">
                          <span>Role: {step.role}</span>
                          <span>System: {step.system}</span>
                          <span>Time: {step.estimatedMinutes}min</span>
                          <span>{autoLabel}</span>
                        </div>
                        {step.exceptions.length > 0 && (
                          <div className="mt-2 text-xs text-amber">
                            <span className="font-medium">Exceptions: </span>
                            {step.exceptions.join("; ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Duvo solutions */}
              {processMap.duvoSolutions.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-2">Matching Duvo solutions</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {processMap.duvoSolutions.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-teal-bg text-teal font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw SOP text for Duvo import */}
              <div>
                <h4 className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-2">
                  Duvo Assignment Builder format
                </h4>
                <pre className="text-xs text-fg-secondary whitespace-pre-wrap font-mono leading-relaxed bg-bg-sunken rounded-lg p-3">
                  {processMap.sopText}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex gap-2">
              <button
                onClick={copySOP}
                className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-lg bg-fg text-bg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {copiedSOP ? <Check size={14} /> : <Copy size={14} />}
                {copiedSOP ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={downloadSOP}
                className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-lg border border-border text-fg text-sm font-medium hover:bg-bg-sunken transition-colors"
              >
                <Download size={14} />
                Download .md
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-10 ${editable || (!highlightRole) ? "pb-20" : ""}`}>
        {/* Draft banner */}
        {editable && (
          <div className="flex items-center gap-2.5 bg-bg-elevated border border-border rounded-lg px-5 py-3.5 animate-fade-up">
            <Pencil size={14} className="text-fg-muted flex-shrink-0" />
            <span className="text-sm text-fg">
              <strong>Review your SOP</strong> — edit steps, invite
              stakeholders to validate, then finalize to share.
            </span>
          </div>
        )}

        {/* Header */}
        <div className="animate-fade-up" style={{ animationDelay: "0s" }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-bg-sunken text-fg-muted font-mono font-medium uppercase tracking-wider mb-3">
                {processMap.category}
              </span>
              <h1 className="font-display font-bold text-3xl sm:text-4xl text-fg leading-tight">
                {processMap.title}
              </h1>
              <p className="text-fg-secondary mt-3 max-w-2xl leading-relaxed text-[15px]">
                {processMap.summary}
              </p>
            </div>
            {!editable && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSopOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-fg-secondary text-sm hover:bg-bg-elevated transition-colors"
                >
                  <FileText size={14} />
                  SOP
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-fg-secondary text-sm hover:bg-bg-elevated transition-colors"
                >
                  {copiedLink ? (
                    <Check size={14} className="text-green" />
                  ) : (
                    <Share2 size={14} />
                  )}
                  {copiedLink ? "Copied!" : "Share report"}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Validation status bar — read-only mode */}
        {!editable && !highlightRole && (
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="bg-bg-elevated border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-fg flex items-center gap-2">
                  <Users size={14} className="text-fg-muted" />
                  Stakeholder validation
                </span>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
                >
                  {copiedLink ? <Check size={12} className="text-green" /> : <Share2 size={12} />}
                  {copiedLink ? "Copied" : "Copy link"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {roleGroups.map((role) => (
                  <button
                    key={role.name}
                    onClick={() =>
                      setInvitingRole(
                        invitingRole === role.name ? null : role.name
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      invitingRole === role.name
                        ? "bg-teal text-white font-medium"
                        : "bg-bg-sunken text-fg-secondary hover:bg-border"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-fg-muted/40" />
                    {role.name}
                    <span className="text-xs text-fg-muted">
                      · {role.steps.length} step{role.steps.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
              {invitingRole && (
                <div className="mt-3 animate-scale-in">
                  <StakeholderInvite
                    processMap={processMap}
                    preselectedRole={invitingRole}
                    onClose={() => setInvitingRole(null)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metrics strip */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
            <div className="text-fg-muted text-xs font-medium uppercase tracking-wider">
              Process Steps
            </div>
            <div className="font-display text-3xl font-bold text-fg mt-1.5 tabular-nums">
              {processMap.steps.length}
            </div>
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full mt-2 font-medium text-fg-muted bg-bg-sunken">
              {processMap.metrics.manualSteps} manual · {processMap.metrics.automatableSteps} automatable
            </span>
          </div>

          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
            <div className="text-fg-muted text-xs font-medium uppercase tracking-wider">
              Roles Involved
            </div>
            <div className="font-display text-3xl font-bold text-fg mt-1.5 tabular-nums">
              {roleGroups.length}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {roleGroups.map((role) => {
                const invited = invitedRoles.has(role.name);
                return (
                  <button
                    key={role.name}
                    onClick={() => {
                      if (editable) {
                        setInvitingRole(invitingRole === role.name ? null : role.name);
                        inviteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      } else {
                        setInvitingRole(invitingRole === role.name ? null : role.name);
                      }
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-all ${
                      invited
                        ? "bg-green-bg text-green"
                        : "bg-orange-bg text-orange hover:bg-amber-bg"
                    }`}
                  >
                    {invited ? <Check size={9} /> : <UserPlus size={9} />}
                    {role.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
            <div className="text-fg-muted text-xs font-medium uppercase tracking-wider">
              Weekly Effort
            </div>
            <div className="font-display text-3xl font-bold text-fg mt-1.5 tabular-nums">
              {weeklyHours}h
            </div>
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full mt-2 font-medium text-fg-muted bg-bg-sunken">
              across {processMap.steps.length} steps
            </span>
          </div>

          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
            <div className="text-fg-muted text-xs font-medium uppercase tracking-wider">
              Systems
            </div>
            <div className="font-display text-3xl font-bold text-fg mt-1.5 tabular-nums">
              {new Set(processMap.steps.map((s) => s.system)).size}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.from(new Set(processMap.steps.map((s) => s.system))).map((sys) => (
                <span
                  key={sys}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-bg-sunken text-fg-muted"
                >
                  {SYSTEM_ICONS[sys] || <Monitor size={10} strokeWidth={1.5} />}
                  {sys}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Savings callout — above the fold, prominent */}
        {!editable && !highlightRole && (
          <div className="animate-fade-up" style={{ animationDelay: "0.12s" }}>
            <div className="relative overflow-hidden bg-teal-bg border border-teal/15 rounded-xl px-6 py-5">
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "radial-gradient(circle at 20% 50%, var(--teal), transparent 70%)",
                }}
              />
              <div className="relative flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap size={20} className="text-teal" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-fg leading-snug">
                      Duvo could save{" "}
                      <span className="text-teal">{annualSavingsHours} hours</span> and{" "}
                      <span className="text-teal">{annualCostSavingsFormatted}</span> per year on this process.
                    </p>
                    <p className="text-sm text-fg-secondary mt-1">
                      Import to Duvo and set up this automation for free today.{" "}
                      <a href="#automation-analysis" className="text-teal hover:underline font-medium">
                        See detailed analysis &darr;
                      </a>
                    </p>
                  </div>
                </div>
                <a
                  href="https://app.duvo.ai/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors flex-shrink-0"
                >
                  Try Duvo free
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Stakeholders — invite-focused, above the flow */}
        {editable && (
          <div
            ref={inviteSectionRef}
            className="animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="bg-orange-bg border border-orange/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm font-semibold text-fg flex items-center gap-2">
                  <UserPlus size={15} className="text-orange" />
                  Invite stakeholders to validate
                </h2>
                <span className="text-xs text-fg-muted font-mono">
                  {invitedRoles.size}/{uniqueRoles.length} invited
                </span>
              </div>
              <p className="text-fg-secondary text-sm mb-4">
                Each role should review their steps before you finalize. Invite them to confirm accuracy.
              </p>
              <div className="flex flex-wrap gap-2">
                {roleGroups.map((role) => {
                  const invited = invitedRoles.has(role.name);
                  return (
                    <button
                      key={role.name}
                      onClick={() =>
                        setInvitingRole(
                          invitingRole === role.name ? null : role.name
                        )
                      }
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        invited
                          ? "bg-green-bg border border-green/20 text-green"
                          : invitingRole === role.name
                          ? "bg-orange text-white"
                          : "bg-bg-elevated border border-border text-fg hover:border-orange hover:text-orange"
                      }`}
                    >
                      {invited ? (
                        <Check size={13} />
                      ) : (
                        <UserPlus size={13} />
                      )}
                      <span>{role.name}</span>
                      <span className="text-xs opacity-70">
                        · {role.steps.length} step{role.steps.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              {invitingRole && (
                <div className="mt-3 animate-scale-in">
                  <StakeholderInvite
                    processMap={processMap}
                    preselectedRole={invitingRole}
                    onClose={() => setInvitingRole(null)}
                    onSent={() => handleInviteSent(invitingRole)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flow Diagram */}
        <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-fg">
              Process Flow
            </h2>
            <div className="flex items-center gap-4 text-xs">
              {Object.entries(AUTOMATION_STYLES).map(([key, style]) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-fg-muted"
                >
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  {style.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent" />

            <div className="space-y-0">
              {processMap.steps.map((step, index) => (
                <div key={step.id}>
                  <FlowStep
                    step={step}
                    index={index}
                    totalSteps={processMap.steps.length}
                    isExpanded={expandedSteps.has(step.id)}
                    isEditing={editingStepId === step.id}
                    isHighlighted={
                      highlightRole
                        ? step.role.toLowerCase() ===
                          highlightRole.toLowerCase()
                        : false
                    }
                    editable={editable}
                    onToggle={() => toggleStep(step.id)}
                    onUpdate={(updates) => updateStep(step.id, updates)}
                    onDelete={() => deleteStep(step.id)}
                    onMove={(dir) => moveStep(index, dir)}
                    isLast={index === processMap.steps.length - 1}
                    isInviting={invitingStepId === step.id}
                    isRoleInvited={invitedRoles.has(step.role)}
                    onInvite={() => handleStepInvite(step.id, step.role)}
                  />
                  {/* Inline invite form for this step */}
                  {invitingStepId === step.id && (
                    <div className="relative pl-12 pr-0 py-2 animate-scale-in">
                      <StakeholderInvite
                        processMap={processMap}
                        preselectedRole={step.role}
                        onClose={() => {
                          setInvitingStepId(null);
                        }}
                        onSent={() => handleInviteSent(step.role)}
                      />
                    </div>
                  )}
                  {/* Add step button between steps */}
                  {editable && (
                    <div className="relative pl-12 py-1">
                      <button
                        onClick={() => addStep(index)}
                        className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors group"
                      >
                        <Plus
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Add step
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add step at end */}
            {editable && processMap.steps.length === 0 && (
              <div className="pl-12 py-4">
                <button
                  onClick={() => addStep(-1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-fg-muted text-sm hover:border-border-strong hover:text-fg transition-colors"
                >
                  <Plus size={14} />
                  Add first step
                </button>
              </div>
            )}
          </div>
        </div>

{/* Stakeholders section removed — now above flow diagram */}

{/* Stakeholders grid removed — replaced by validation status bar above */}

        {/* Duvo Solutions */}
        {processMap.duvoSolutions.length > 0 && (
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <h2 className="font-display text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Zap size={18} strokeWidth={1.5} />
              Matching Duvo Solutions
            </h2>
            <div className="flex flex-wrap gap-2">
              {processMap.duvoSolutions.map((solution) => (
                <a
                  key={solution}
                  href="https://app.duvo.ai/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-sm font-medium text-fg hover:border-border-strong hover:shadow-[var(--shadow-sm)] transition-all"
                >
                  <Zap size={14} className="text-teal" />
                  {solution}
                  <ArrowRight
                    size={12}
                    className="text-fg-muted group-hover:text-fg transition-colors"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Automation analysis — the "aha" moment, shown after the SOP */}
        {!editable && !highlightRole && (() => {
          const getAutomationMethod = (step: ProcessStep) => {
            const sys = step.system.toLowerCase();


            if (step.automationPotential === "full") {
              if (sys.includes("sap") || sys.includes("oracle") || sys.includes("erp"))
                return "Duvo connects directly to " + step.system + ", automating data entry, validation, and transaction posting end-to-end";
              if (sys.includes("email"))
                return "Duvo's email agent monitors your inbox, extracts structured data (amounts, PO numbers, dates), and routes to the next step automatically";
              if (sys.includes("excel") || sys.includes("sheet"))
                return "Duvo replaces manual spreadsheet work with automated data pipelines — pulling, transforming, and loading data on schedule";
              if (sys.includes("portal") || sys.includes("browser"))
                return "Duvo's browser agent navigates " + step.system + " automatically — handling login, data entry, and extraction without manual intervention";
              if (sys.includes("phone"))
                return "Duvo's voice agent handles this call — following a script, capturing responses, and logging results into your system";
              return "Duvo's Assignment Builder orchestrates this step end-to-end across your connected systems";
            }
            if (sys.includes("sap") || sys.includes("oracle") || sys.includes("erp"))
              return "Duvo auto-pulls data from " + step.system + " and prepares a review summary — a human makes the final decision";
            if (sys.includes("email"))
              return "Duvo triages and categorizes incoming emails, drafts responses — a human reviews before sending";
            if (sys.includes("phone"))
              return "Duvo's voice agent handles the routine call, flags exceptions for human follow-up, and logs all outcomes";
            if (sys.includes("portal") || sys.includes("browser"))
              return "Duvo pre-fills forms and extracts data from " + step.system + " — a human validates before submission";
            return "Duvo handles preparation and data gathering — a human applies judgment and approves the output";
          };

          const automatableSteps = processMap.steps
            .filter((s) => s.automationPotential === "full" || s.automationPotential === "partial")
            .map((s) => ({
              ...s,
              savingsMin: s.automationPotential === "full" ? s.estimatedMinutes : Math.round(s.estimatedMinutes * 0.5),
              method: getAutomationMethod(s),
            }))
            .sort((a, b) => b.savingsMin - a.savingsMin);

          return (
            <div id="automation-analysis" className="animate-fade-up" style={{ animationDelay: "0.42s" }}>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-bg-elevated px-5 py-4 border-b border-border">
                  <h2 className="font-display text-lg font-semibold text-fg flex items-center gap-2">
                    <Zap size={18} strokeWidth={1.5} className="text-teal" />
                    Automation Analysis
                  </h2>
                  <p className="text-[15px] text-fg-secondary mt-2 leading-relaxed">
                    This {processMap.steps.length}-step process requires{" "}
                    <strong className="text-fg">{weeklyHours}h per week</strong> of manual effort across{" "}
                    {roleGroups.length} roles. With automation,{" "}
                    <strong className="text-green">{savingsPercent}%</strong> of the work ({savingsHours}h/wk)
                    can be eliminated — saving an estimated{" "}
                    <strong className="text-teal">{annualCostSavingsFormatted} per year</strong>.
                  </p>
                </div>

                {automatableSteps.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-4">
                      Step-by-step savings breakdown
                    </div>
                    <div className="space-y-4">
                      {automatableSteps.map((step) => {
                        const annualSavingsH = Math.round((step.savingsMin * 52) / 60);
                        const annualCost = Math.round(annualSavingsH * HOURLY_COST);
                        const annualFormatted = annualCost >= 1000
                          ? `$${(annualCost / 1000).toFixed(1)}k`
                          : `$${annualCost}`;
                        const autoStyle = AUTOMATION_STYLES[step.automationPotential];
                        return (
                          <div key={step.id} className="flex items-start gap-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${autoStyle.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-fg">{step.title}</span>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-sm font-semibold text-fg tabular-nums">{annualFormatted}</span>
                                  <span className="text-xs text-fg-muted">/yr</span>
                                </div>
                              </div>
                              <div className="text-xs text-fg-muted mt-0.5">
                                {step.role} · {step.system} · {step.estimatedMinutes}min per occurrence
                              </div>
                              <p className="text-xs text-teal mt-1 leading-relaxed">
                                {step.method}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Human-required steps */}
                {processMap.steps.filter((s) => s.automationPotential === "human-required").length > 0 && (
                  <div className="px-5 py-4 border-t border-border-subtle">
                    <div className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-2">
                      Stays manual — requires human judgment
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {processMap.steps
                        .filter((s) => s.automationPotential === "human-required")
                        .map((step) => (
                          <span key={step.id} className="text-xs px-2 py-0.5 rounded-full bg-red-bg border border-red/10 text-fg-secondary">
                            {step.title}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Export to Duvo CTA */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="relative overflow-hidden bg-bg-dark rounded-xl p-8">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-fg-on-dark">
                  Ready to automate?
                </h2>
                <p className="text-fg-on-dark-muted mt-2 max-w-lg text-[15px] leading-relaxed">
                  This process has{" "}
                  <span className="text-teal-light font-medium">{annualCostSavingsFormatted}/yr</span> in
                  automation potential across {processMap.steps.filter((s) => s.automationPotential !== "human-required").length} steps.
                  Import this SOP into Duvo&apos;s Assignment Builder to start automating.
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <a
                    href="https://app.duvo.ai/sign-up"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal-dark transition-colors"
                  >
                    Open Duvo
                    <ArrowRight size={16} />
                  </a>
                  <button
                    onClick={copySOP}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-fg-on-dark text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    {copiedSOP ? (
                      <Check size={14} className="text-teal-light" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copiedSOP ? "Copied!" : "Copy SOP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document another process CTA */}
        {!editable && (
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="bg-bg-elevated border border-border rounded-xl p-6 text-center">
              <h2 className="font-display text-base font-semibold text-fg">
                Document another process
              </h2>
              <p className="text-fg-secondary text-sm mt-1.5 max-w-md mx-auto">
                Map your next workflow to build a complete picture of your team&apos;s automation potential.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg bg-fg text-bg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create new SOP
                <ArrowRight size={15} />
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center pb-12 pt-4">
          <p className="text-fg-muted text-sm">
            Built with{" "}
            <a
              href="https://duvo.ai"
              className="text-fg-secondary font-medium hover:underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Duvo.ai
            </a>{" "}
            &mdash; The Secure AI Workforce
          </p>
          <p className="text-fg-muted text-xs mt-2">
            <a
              href="/"
              className="hover:text-fg-secondary transition-colors"
            >
              Create your own SOP &rarr;
            </a>
          </p>
        </footer>
      </div>

      {/* Sticky action bar — editable mode */}
      {editable && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg-dark text-fg-on-dark shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
          <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
            {/* Left: stats */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-fg-on-dark-muted text-xs font-mono uppercase tracking-wider">Steps</span>
                <span className="font-display font-bold text-lg text-fg-on-dark tabular-nums">{processMap.steps.length}</span>
              </div>
              <span className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-fg-on-dark-muted text-xs font-mono uppercase tracking-wider">Automatable</span>
                <span className="font-display font-bold text-lg text-green tabular-nums">
                  {processMap.steps.filter((s) => s.automationPotential === "full").length}
                </span>
              </div>
              <span className="w-px h-5 bg-white/10" />
              <button
                onClick={() => inviteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <UserPlus size={14} className={invitedRoles.size > 0 ? "text-green" : "text-orange-light"} />
                {invitedRoles.size > 0 ? (
                  <span className="text-sm text-green font-medium underline underline-offset-2 decoration-green/40">
                    {invitedRoles.size}/{uniqueRoles.length} roles invited
                  </span>
                ) : (
                  <span className="text-sm text-orange-light font-medium underline underline-offset-2 decoration-orange-light/40">
                    {uniqueRoles.length} roles to invite
                  </span>
                )}
              </button>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleViewSopClick}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/15 text-fg-on-dark text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <FileText size={14} />
                View SOP
              </button>
              <button
                onClick={handleFinalizeClick}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Share2 size={14} />
                )}
                {saving ? "Saving..." : "Finalize & Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar — result page (read-only) */}
      {!editable && !highlightRole && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg-dark text-fg-on-dark shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
          <div className="max-w-[1100px] mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-sm text-fg-on-dark-muted min-w-0">
              <Zap size={14} className="text-teal-light flex-shrink-0" />
              <span className="truncate">
                <strong className="text-teal-light">{annualCostSavingsFormatted}/yr</strong> savings potential · {savingsHours}h/wk automatable
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={downloadSOP}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-fg-on-dark text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                Download
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-fg-on-dark text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-teal-light" /> : <Share2 size={14} />}
                {copiedLink ? "Copied!" : "Share"}
              </button>
              <a
                href="https://app.duvo.ai/sign-up"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors cursor-pointer"
              >
                Automate with Duvo
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Email gate modal */}
      {showEmailGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEmailGate(false)}>
          <div className="absolute inset-0 bg-fg/20 backdrop-blur-sm" />
          <div
            className="relative bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] w-full max-w-md mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="font-display text-xl font-semibold text-fg">
                {emailGateAction === "viewSop" ? "View your SOP" : "Save your SOP"}
              </h2>
              <p className="text-fg-secondary text-sm mt-2 leading-relaxed">
                {emailGateAction === "viewSop"
                  ? "Enter your work email to access the full SOP document."
                  : "Enter your email to get a shareable link and downloadable report."}
              </p>
              <div className="mt-5">
                <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEmailSubmit();
                  }}
                  placeholder="you@company.com"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-bg text-fg text-sm placeholder:text-fg-muted/50 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
                />
                {emailError && (
                  <p className="text-xs text-red mt-1.5">{emailError}</p>
                )}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleEmailSubmit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : emailGateAction === "viewSop" ? (
                    <FileText size={14} />
                  ) : (
                    <Share2 size={14} />
                  )}
                  {saving ? "Saving..." : emailGateAction === "viewSop" ? "View SOP" : "Save & Share"}
                </button>
                <button
                  onClick={() => setShowEmailGate(false)}
                  className="px-4 py-2.5 rounded-lg border border-border text-fg-secondary text-sm font-medium hover:bg-bg-sunken transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-fg-muted mt-4 leading-relaxed">
                No spam. We&apos;ll only email your SOP report and relevant updates from Duvo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function MetricCard({
  label,
  value,
  badge,
  badgeColor,
}: {
  label: string;
  value: string | number;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 hover:shadow-[var(--shadow-sm)] transition-shadow">
      <div className="text-fg-muted text-xs font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className="font-display text-3xl font-bold text-fg mt-1.5 tabular-nums">
        {value}
      </div>
      <span
        className={`inline-block text-[11px] px-2 py-0.5 rounded-full mt-2 font-medium ${badgeColor}`}
      >
        {badge}
      </span>
    </div>
  );
}

function FlowStep({
  step,
  index,
  totalSteps,
  isExpanded,
  isEditing,
  isHighlighted,
  editable,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  isLast,
  isInviting,
  isRoleInvited,
  onInvite,
}: {
  step: ProcessStep;
  index: number;
  totalSteps: number;
  isExpanded: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  editable: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<ProcessStep>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  isLast: boolean;
  isInviting?: boolean;
  isRoleInvited?: boolean;
  onInvite?: () => void;
}) {
  const style = AUTOMATION_STYLES[step.automationPotential];
  const icon =
    SYSTEM_ICONS[step.system] || <Globe size={14} strokeWidth={1.5} />;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={nodeRef}
      className={`relative pl-12 pb-4 ${
        visible ? "animate-fade-up" : "opacity-0"
      }`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div
        className={`absolute left-[16px] top-[2px] w-[15px] h-[15px] rounded-full border-[3px] border-bg z-10 ${style.dot}`}
      />

      <div
        className={`rounded-xl border transition-all ${
          isHighlighted
            ? "border-teal bg-teal-bg shadow-[var(--shadow-glow)]"
            : isEditing
            ? "border-fg bg-bg-elevated shadow-[var(--shadow-md)]"
            : `${style.border} bg-bg-elevated hover:shadow-[var(--shadow-md)]`
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
          className="w-full text-left p-4 flex items-center gap-3 cursor-pointer"
        >
          {/* Reorder arrows — left side */}
          {editable && (
            <div className="flex flex-col gap-0.5 flex-shrink-0 -ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove("up");
                }}
                disabled={index === 0}
                className="p-0.5 text-fg-muted hover:text-fg disabled:opacity-20 transition-colors"
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove("down");
                }}
                disabled={index === totalSteps - 1}
                className="p-0.5 text-fg-muted hover:text-fg disabled:opacity-20 transition-colors"
              >
                <ArrowDown size={12} />
              </button>
            </div>
          )}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-fg-muted text-xs font-mono">
                {String(step.order).padStart(2, "0")}
              </span>
              <span className="font-semibold text-fg text-[15px]">
                {step.title}
              </span>
              {editable && (
                <Pencil size={11} className="text-fg-muted" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-muted">
              {/* Role as interactive invite chip */}
              {onInvite && !isEditing ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInvite();
                  }}
                  className={`group/invite flex items-center gap-1.5 px-2 py-0.5 -ml-2 rounded-md transition-all cursor-pointer ${
                    isRoleInvited
                      ? "bg-green-bg text-green"
                      : isInviting
                      ? "bg-orange-bg text-orange"
                      : "bg-orange-bg/60 text-orange hover:bg-orange-bg"
                  }`}
                >
                  {isRoleInvited ? (
                    <Check size={11} />
                  ) : (
                    <UserPlus size={11} />
                  )}
                  <span>{step.role}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {isRoleInvited ? "— invited" : "— invite"}
                  </span>
                </button>
              ) : (
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {step.role}
                </span>
              )}
              <span className="flex items-center gap-1">
                {icon}
                {step.system}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {step.estimatedMinutes}min
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${style.bg} border ${style.border}`}
            >
              {style.label}
            </span>
            {!editable &&
              (isExpanded ? (
                <ChevronUp size={14} className="text-fg-muted" />
              ) : (
                <ChevronDown size={14} className="text-fg-muted" />
              ))}
          </div>
        </div>

        {/* Read-only expanded */}
        {isExpanded && !editable && (
          <div className="px-4 pb-4 border-t border-border-subtle">
            <p className="text-sm text-fg-secondary leading-relaxed mt-3">
              {step.description}
            </p>
            {step.exceptions.length > 0 && (
              <div className="mt-3 p-3 bg-amber-bg rounded-lg border border-amber/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber mb-2">
                  <AlertTriangle size={12} />
                  Common Exceptions
                </div>
                <ul className="space-y-1">
                  {step.exceptions.map((exc, i) => (
                    <li
                      key={i}
                      className="text-sm text-fg-secondary flex items-start gap-2"
                    >
                      <span className="text-amber mt-1 text-xs">
                        &bull;
                      </span>
                      {exc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Editable panel */}
        {isEditing && editable && (
          <div className="px-4 pb-4 border-t border-border-subtle">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <EditField
                label="Title"
                value={step.title}
                onChange={(v) => onUpdate({ title: v })}
              />
              <EditField
                label="Role"
                value={step.role}
                onChange={(v) => onUpdate({ role: v })}
              />
              <EditField
                label="System"
                value={step.system}
                onChange={(v) => onUpdate({ system: v })}
              />
              <EditField
                label="Est. minutes"
                value={String(step.estimatedMinutes)}
                onChange={(v) =>
                  onUpdate({ estimatedMinutes: parseInt(v) || 0 })
                }
                type="number"
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-fg-muted mb-1">
                Description
              </label>
              <textarea
                value={step.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal resize-none"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-fg-muted">
                  Automation:
                </label>
                {(["full", "partial", "human-required"] as const).map(
                  (level) => (
                    <button
                      key={level}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ automationPotential: level });
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                        step.automationPotential === level
                          ? `${AUTOMATION_STYLES[level].bg} ${AUTOMATION_STYLES[level].border}`
                          : "border-border-subtle text-fg-muted hover:border-border-strong"
                      }`}
                    >
                      {AUTOMATION_STYLES[level].label}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red hover:bg-red-bg transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-fg-muted mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
      />
    </div>
  );
}
