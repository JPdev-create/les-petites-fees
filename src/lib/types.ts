export type Role = "ADMIN" | "OWNER";
export type MissionStatus = "REQUESTED" | "CONFIRMED" | "DONE" | "REFUSED" | "CANCELLED";
export type MissionSource = "OWNER" | "ADMIN" | "ICAL";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID";

/** profiles/{email} */
export type Profile = {
  id: string; // = e-mail en minuscules
  role: Role;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  billingAddress?: string;
  vatNumber?: string;
  notifyEmail: boolean;
  notifySms: boolean;
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};

export type IcalFeed = { label: string; url: string };

/** gites/{id} */
export type Gite = {
  id: string;
  name: string;
  kind: "GITE" | "BUREAU" | "APPARTEMENT" | "AUTRE";
  ownerEmail: string;
  ownerName: string;
  address: string;
  postalCode?: string;
  city?: string;
  accessInfo?: string;
  notes?: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  bedSets: number;
  towelSets: number;
  price: number; // centimes HTVA par passage
  durationMin: number;
  defaultTime?: string;
  color: string;
  icalFeeds: IcalFeed[];
  icalLastSync?: string;
  icalLastError?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** missions/{id} — une demande de passage ou un passage planifié */
export type Mission = {
  id: string;
  giteId: string;
  giteName: string;
  giteColor: string;
  ownerEmail: string;
  ownerName: string;
  date: string; // AAAA-MM-JJ
  time?: string | null;
  status: MissionStatus;
  source: MissionSource;
  icalUid?: string | null;
  icalSource?: string | null;
  urgent?: boolean;
  extraLinen?: boolean;
  ownerNote?: string | null;
  adminNote?: string | null;
  refuseReason?: string | null;
  price: number;
  invoiceId: string | null;
  notifyAdmin?: boolean;
  notifyOwner?: string | null; // CONFIRMED | REFUSED | MOVED | CANCELLED → e-mail à envoyer au client
  cancelledBy?: string;
  createdAt?: string;
  updatedAt?: string;
  doneAt?: string | null;
};

/** submissions/{giteId_period} */
export type Submission = {
  id: string;
  giteId: string;
  ownerEmail: string;
  period: string;
  empty: boolean;
  submittedAt: string;
};

export type InvoiceLine = { label: string; quantity: number; unitPrice: number; total: number };

/** invoices/{id} */
export type Invoice = {
  id: string;
  number: string;
  ownerEmail: string;
  ownerName: string;
  ownerCompany?: string;
  ownerAddress?: string;
  ownerVat?: string;
  period: string;
  issueDate: string;
  dueDate: string;
  vatRate: number;
  lines: InvoiceLine[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  status: InvoiceStatus;
  sentAt?: string | null;
  paidAt?: string | null;
  missionIds: string[];
  notes?: string;
  notifyOwner?: boolean;
};

export type StockItem = {
  id: string;
  name: string;
  category: "LINGE" | "PRODUIT";
  unit: string;
  quantity: number;
  threshold: number;
  perVisit: number;
  updatedAt?: string;
};

export type Settings = {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  vatNumber: string;
  iban: string;
  bic: string;
  vatRate: number;
  invoicePrefix: string;
  invoiceSeq: Record<string, number>; // par année
  paymentDays: number;
  reminderDay1: number;
  reminderDay2: number;
  reminderEnabled: boolean;
  icalAutoConfirm: boolean;
  minNoticeHours: number;
  defaultPrice: number;
  lastReminderRun?: string;
  lastAutomationRun?: string;
  syncRequestedAt?: string | null;
};

export type MailItem = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  kind: string;
  status: "PENDING" | "SENT" | "FAILED" | "SIMULATED";
  createdAt: string;
  sentAt?: string;
  error?: string;
};

export type Activity = { id: string; at: string; by: string; message: string };

export const DEFAULT_SETTINGS: Settings = {
  companyName: "Les Petites Fées",
  companyAddress: "Avenue du Monument, 6 · B-6900 Marche-en-Famenne",
  companyEmail: "petitesfeesdemarche@gmail.com",
  companyPhone: "0470 62 77 49",
  vatNumber: "",
  iban: "",
  bic: "",
  vatRate: 21,
  invoicePrefix: "F",
  invoiceSeq: {},
  paymentDays: 15,
  reminderDay1: 20,
  reminderDay2: 25,
  reminderEnabled: true,
  icalAutoConfirm: true,
  minNoticeHours: 24,
  defaultPrice: 6500,
};
