// Small UI vocabulary for the illustrations. A storyboard can override most of these through the
// scene's `visual` / `labels` properties; other languages fall back to English.
export type Labels = {
  illustration: string;
  appTitle: string;
  nav: string[];
  overview: string;
  customers: string;
  reports: string;
  orders: string;
  deliveries: string;
  active: string;
  isNew: string;
  pending: string;
  customerPrefix: string;
  mobileApp: string;
  manualEntry: string;
  automatic: string;
  sourceDocs: string;
  automation: string;
  steps: string[];
  processed: string;
  unifiedView: string;
  tools: { label: string; icon: string }[];
  stages: { title: string; sub: string; icon: string }[];
  online: string;
  deskWindows: { chaosTitle: string; orderTitle: string }[];
  toasts: string[];
  ticker: string;
  form: string[];
};

const fr: Labels = {
  illustration: "Illustration conceptuelle",
  appTitle: "Mon application · espace de gestion",
  nav: ["Tableau de bord", "Clients", "Commandes", "Rapports"],
  overview: "Vue d'ensemble",
  customers: "Clients",
  reports: "Rapports",
  orders: "Commandes",
  deliveries: "Livraisons",
  active: "Actif",
  isNew: "Nouveau",
  pending: "En attente",
  customerPrefix: "Client",
  mobileApp: "Mon appli",
  manualEntry: "Saisie manuelle",
  automatic: "Automatique",
  sourceDocs: "Factures, e-mails, formulaires…",
  automation: "Automatisation",
  steps: ["Lecture", "Tri", "Saisie"],
  processed: "✓ Traité automatiquement",
  unifiedView: "Vue unifiée",
  tools: [
    { label: "CRM", icon: "users" },
    { label: "Paiements", icon: "card" },
    { label: "E-mails", icon: "mail" },
    { label: "Stock", icon: "box" },
    { label: "Comptabilité", icon: "calc" },
    { label: "Messagerie", icon: "chat" },
  ],
  stages: [
    { title: "Conception", sub: "Analyse du besoin", icon: "idea" },
    { title: "Développement", sub: "Code et intégrations", icon: "code" },
    { title: "Validation", sub: "Tests et ajustements", icon: "shield" },
    { title: "Livraison", sub: "Mise en production", icon: "flag" },
  ],
  online: "En ligne",
  deskWindows: [
    { chaosTitle: "Boîte de réception", orderTitle: "Messages traités" },
    { chaosTitle: "tableau_final_v7.xlsx", orderTitle: "Tableau de suivi" },
    { chaosTitle: "Messagerie", orderTitle: "Messagerie" },
    { chaosTitle: "Agenda", orderTitle: "Agenda" },
    { chaosTitle: "Saisie manuelle", orderTitle: "Saisie automatique" },
    { chaosTitle: "Rapport (à refaire)", orderTitle: "Rapport à jour" },
  ],
  toasts: ["Relance client en retard", "Doublon détecté", "Saisie manuelle × 48", "Erreur de synchronisation"],
  ticker: "COPIER • COLLER • RECOMMENCER • ",
  form: ["Client", "Montant", "Référence"],
};

const en: Labels = {
  illustration: "Conceptual illustration",
  appTitle: "My app · management console",
  nav: ["Dashboard", "Customers", "Orders", "Reports"],
  overview: "Overview",
  customers: "Customers",
  reports: "Reports",
  orders: "Orders",
  deliveries: "Deliveries",
  active: "Active",
  isNew: "New",
  pending: "Pending",
  customerPrefix: "Customer",
  mobileApp: "My app",
  manualEntry: "Manual entry",
  automatic: "Automatic",
  sourceDocs: "Invoices, emails, forms…",
  automation: "Automation",
  steps: ["Reading", "Sorting", "Filing"],
  processed: "✓ Processed automatically",
  unifiedView: "Unified view",
  tools: [
    { label: "CRM", icon: "users" },
    { label: "Payments", icon: "card" },
    { label: "Email", icon: "mail" },
    { label: "Stock", icon: "box" },
    { label: "Accounting", icon: "calc" },
    { label: "Chat", icon: "chat" },
  ],
  stages: [
    { title: "Design", sub: "Understanding the need", icon: "idea" },
    { title: "Development", sub: "Code and integrations", icon: "code" },
    { title: "Validation", sub: "Tests and adjustments", icon: "shield" },
    { title: "Delivery", sub: "Going to production", icon: "flag" },
  ],
  online: "Live",
  deskWindows: [
    { chaosTitle: "Inbox", orderTitle: "Messages handled" },
    { chaosTitle: "final_sheet_v7.xlsx", orderTitle: "Tracking sheet" },
    { chaosTitle: "Chat", orderTitle: "Chat" },
    { chaosTitle: "Calendar", orderTitle: "Calendar" },
    { chaosTitle: "Manual entry", orderTitle: "Automatic entry" },
    { chaosTitle: "Report (redo)", orderTitle: "Report up to date" },
  ],
  toasts: ["Customer follow-up overdue", "Duplicate detected", "Manual entry × 48", "Sync error"],
  ticker: "COPY • PASTE • REPEAT • ",
  form: ["Customer", "Amount", "Reference"],
};

export const getLabels = (lang: string): Labels => (lang.startsWith("fr") ? fr : en);
