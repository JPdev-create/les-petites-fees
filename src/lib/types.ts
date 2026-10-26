export type Role = "ADMIN" | "OWNER";
export type MissionStatus = "REQUESTED" | "CONFIRMED" | "DONE" | "REFUSED" | "CANCELLED";
export type MissionSource = "OWNER" | "ADMIN" | "ICAL";

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
  notifyAdmin?: boolean; // inscription à signaler aux gestionnaires
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
  price: number; // centimes HTVA par passage (forfait, ou estimation si tarif horaire)
  pricingMode?: "FLAT" | "HOURLY"; // absent = forfait
  hourlyRate?: number; // centimes HTVA par heure
  durationMin: number;
  defaultTime?: string;
  color: string;
  icalFeeds: IcalFeed[];
  icalLastSync?: string;
  icalLastError?: string | null;
  active: boolean;
  pendingReview?: boolean; // ajouté par le client, tarif à vérifier
  notifyAdmin?: boolean;
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
  price: number; // centimes HTVA (à l'heure : estimation, puis durée réelle × tarif)
  workedMin?: number | null; // durée réelle (tarif horaire)
  hourlyRate?: number | null; // tarif horaire appliqué
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
  legalForm: string; // ex. « SRL », « Personne physique »
  bceNumber: string; // n° d'entreprise (BCE)
  reminderDay1: number;
  reminderDay2: number;
  reminderEnabled: boolean;
  icalAutoConfirm: boolean;
  minNoticeHours: number;
  defaultPrice: number;
  defaultHourlyRate: number;
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
  legalForm: "",
  bceNumber: "",
  reminderDay1: 20,
  reminderDay2: 25,
  reminderEnabled: true,
  icalAutoConfirm: true,
  minNoticeHours: 24,
  defaultPrice: 6500,
  defaultHourlyRate: 3000,
};
