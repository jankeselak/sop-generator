export interface ProcessStep {
  id: string;
  order: number;
  title: string;
  description: string;
  role: string;
  system: string; // e.g., "SAP", "Email", "Excel", "Portal", "Phone"
  estimatedMinutes: number;
  automationPotential: "full" | "partial" | "human-required";
  exceptions: string[];
}

export interface Role {
  name: string;
  department: string;
  stepsInvolved: number[];
  totalMinutesPerWeek: number;
}

export interface ProcessMap {
  id: string;
  title: string;
  category: string; // e.g., "Invoice Processing", "Supplier Onboarding"
  summary: string;
  steps: ProcessStep[];
  roles: Role[];
  metrics: {
    totalSteps: number;
    manualSteps: number;
    automatableSteps: number;
    estimatedWeeklyMinutes: number;
    estimatedWeeklySavingsMinutes: number;
    automationReadinessScore: number; // 0-100
  };
  duvoSolutions: string[]; // matching Duvo solution names
  sopText: string; // formatted SOP for export to Duvo
  createdAt: string;
}

export interface Stakeholder {
  role: string;
  name: string;
  email: string;
}

export type TemplateId =
  | "invoice-processing"
  | "supplier-onboarding"
  | "promo-execution"
  | "po-management"
  | "inventory-monitoring"
  | "custom";

export interface Template {
  id: TemplateId;
  title: string;
  description: string;
  icon: string;
  placeholder: string;
  category: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "invoice-processing",
    title: "Invoice Processing",
    description: "Supplier invoice receipt, validation, reconciliation, and payment",
    icon: "receipt",
    placeholder:
      "Every week we receive about 200 supplier invoices via email. I manually extract the data (vendor, amounts, PO numbers), check them against our purchase orders in SAP, flag any discrepancies, and forward to finance for approval. Exceptions like missing POs or price mismatches take about 30 minutes each...",
    category: "Finance Ops",
  },
  {
    id: "supplier-onboarding",
    title: "Supplier Onboarding",
    description: "New supplier setup, documentation, compliance, and system entry",
    icon: "user-plus",
    placeholder:
      "When we onboard a new supplier, it involves collecting tax documents, certificates, banking details, and compliance forms. I enter everything into SAP, set up the vendor master record, configure payment terms, and coordinate with legal for contract review. The whole process takes 2-3 weeks per supplier...",
    category: "Vendor & Trade",
  },
  {
    id: "promo-execution",
    title: "Promotion Execution",
    description: "Promotional planning, pricing updates, and performance tracking",
    icon: "tag",
    placeholder:
      "For each promotion, I update prices across our POS systems and e-commerce platform, coordinate with marketing for materials, notify store managers, and set up tracking in our analytics dashboard. Post-promotion, I compile performance reports comparing actual vs planned lift...",
    category: "Category & Merchandising",
  },
  {
    id: "po-management",
    title: "Purchase Order Management",
    description: "PO creation, approval, tracking, and receipt confirmation",
    icon: "clipboard-list",
    placeholder:
      "Our team creates about 150 purchase orders per week. We check inventory levels, calculate reorder quantities based on demand forecasts, create POs in SAP, send them to suppliers via email, track confirmations, and follow up on late deliveries...",
    category: "Supply Chain",
  },
  {
    id: "inventory-monitoring",
    title: "Inventory Health Monitoring",
    description: "Stock level monitoring, alerts, and replenishment actions",
    icon: "package",
    placeholder:
      "Every morning I pull inventory reports from SAP, identify SKUs below safety stock, check incoming deliveries in the logistics portal, decide on emergency orders or stock transfers between stores, and report critical stockouts to the category team...",
    category: "Supply Chain",
  },
  {
    id: "custom",
    title: "Custom Workflow",
    description: "Describe any operational process your team runs",
    icon: "pencil",
    placeholder:
      "Describe your workflow here. Include: what triggers it, what steps are involved, which systems you use, who's responsible for what, how often it happens, and where the pain points are...",
    category: "Custom",
  },
];
