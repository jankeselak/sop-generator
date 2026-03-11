"use client";

import { useState } from "react";
import { ProcessMap } from "@/lib/types";
import { Send, X, Loader2, CheckCircle, AlertCircle, Copy, Check, Link } from "lucide-react";

interface StakeholderInviteProps {
  processMap: ProcessMap;
  preselectedRole?: string;
  onClose: () => void;
  onSent?: () => void;
}

export default function StakeholderInvite({
  processMap,
  preselectedRole,
  onClose,
  onSent,
}: StakeholderInviteProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinkFallback, setShowLinkFallback] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  const role = preselectedRole || processMap.roles[0]?.name || "";

  const getInviteLink = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/result/${processMap.id}?role=${encodeURIComponent(role)}`;
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(getInviteLink());
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2000);
  };

  const handleSend = async () => {
    if (!email.includes("@") || !name) {
      setError("Please provide a name and valid email.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processMapId: processMap.id,
          stakeholders: [{ role, name, email }],
          senderName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 503) {
          // Email not configured — show link fallback
          setShowLinkFallback(true);
          return;
        }
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
      onSent?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation."
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-green-bg border border-green/20 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-green flex-shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-fg">Invitation sent to {name}.</span>
          <span className="text-fg-secondary ml-1">
            They&apos;ll see their {role} steps and can validate the process.
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-fg-muted hover:text-fg transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (showLinkFallback) {
    return (
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-fg flex items-center gap-2">
            <Link size={14} className="text-teal" />
            Share validation link for <span className="text-teal">{role}</span>
          </div>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-fg-secondary mb-3">
          Copy this link and send it to your {role}. They&apos;ll see only their steps and can confirm accuracy.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={getInviteLink()}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-sunken text-fg text-xs font-mono focus:outline-none"
          />
          <button
            onClick={() => {
              copyInviteLink();
              onSent?.();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal-dark transition-colors"
          >
            {copiedInviteLink ? <Check size={14} /> : <Copy size={14} />}
            {copiedInviteLink ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-fg">
          Invite <span className="text-teal">{role}</span> to validate
        </div>
        <button
          onClick={onClose}
          className="text-fg-muted hover:text-fg transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name"
          className="px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-fg-muted"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Their email"
          className="px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-fg-muted"
        />
        <input
          type="text"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Your name"
          className="px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-fg-muted"
        />
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setShowLinkFallback(true)}
          className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
        >
          <Link size={12} />
          Or copy link instead
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {sending ? "Sending..." : "Send Invite"}
        </button>
      </div>
    </div>
  );
}
