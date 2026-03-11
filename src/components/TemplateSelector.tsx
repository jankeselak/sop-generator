"use client";

import { TEMPLATES, Template } from "@/lib/types";
import {
  Receipt,
  UserPlus,
  Tag,
  ClipboardList,
  Package,
  Pencil,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  receipt: <Receipt size={18} strokeWidth={1.5} />,
  "user-plus": <UserPlus size={18} strokeWidth={1.5} />,
  tag: <Tag size={18} strokeWidth={1.5} />,
  "clipboard-list": <ClipboardList size={18} strokeWidth={1.5} />,
  package: <Package size={18} strokeWidth={1.5} />,
  pencil: <Pencil size={18} strokeWidth={1.5} />,
};

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  selected: Template | null;
}

export default function TemplateSelector({
  onSelect,
  selected,
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {TEMPLATES.map((template) => {
        const isSelected = selected?.id === template.id;
        return (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`group text-left p-3.5 rounded-lg border transition-all duration-150 ${
              isSelected
                ? "border-fg bg-bg-elevated shadow-[var(--shadow-md)]"
                : "border-border bg-bg-elevated hover:border-border-strong hover:shadow-[var(--shadow-sm)]"
            }`}
          >
            <div
              className={`mb-2.5 transition-colors ${
                isSelected
                  ? "text-fg"
                  : "text-fg-muted group-hover:text-fg-secondary"
              }`}
            >
              {iconMap[template.icon]}
            </div>
            <div className="font-medium text-[13px] leading-snug text-fg">
              {template.title}
            </div>
            <div className="text-fg-muted text-[11px] mt-1 leading-relaxed line-clamp-2">
              {template.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
