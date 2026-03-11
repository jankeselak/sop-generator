"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-md border-b border-border">
      <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-fg"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="font-display font-semibold text-fg text-[15px]">
            SOP Creator
          </span>
          <span className="text-fg-muted text-xs border-l border-border pl-2 ml-1">
            by Duvo
          </span>
        </Link>
        <a
          href="https://app.duvo.ai/sign-up"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors"
        >
          Try Duvo
          <ArrowUpRight size={14} />
        </a>
      </div>
    </header>
  );
}
