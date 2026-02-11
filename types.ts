
export enum MembershipTier {
  NONE = 'NONE',
  BASICO = 'BASICO',
  INTERMEDIO = 'INTERMEDIO',
  PLUS = 'PLUS',
  ELITE = 'ELITE'
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_PAYMENT';
export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Notification {
  id: string;
  type: 'BOOKING' | 'MEMBERSHIP' | 'VERIFICATION' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: UserStatus;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  membership?: {
    tier: MembershipTier;
    validUntil: string;
    usedThisMonth: number; // Kilómetros usados
  };
  tripsCount: number; // Cantidad de viajes realizados
  credits: number;
  isVerified: boolean;
  lastConnection: string;
  dniFront?: string;
  dniBack?: string;
  notifications?: Notification[];
}

export interface BankSettings {
  owner: string;
  cuit: string;
  bank: string;
  cbu: string;
  alias: string;
  accountType: string;
  mpPublicKey?: string;
  mpAccessToken?: string; // Nuevo token privado para Checkout Pro
}

export interface Tour {
  id: string;
  destination: string;
  price: number; // Total price (calculated or sum)
  priceTicket: number; // Costo del boleto (Aplica descuento)
  priceLogistics: number; // Costo de logística (No aplica descuento)
  km: number;
  description: string;
  images: string[];
  dates: {
    start: string;
    end: string;
    deadline: string;
    openAtMembers: string;
    openAtPublic: string;
  };
  capacity: number;
  minCapacity: number;
  status: 'OPEN' | 'CONFIRMED' | 'REPROGRAMMED' | 'CANCELLED';
  itinerary: string[];
  upgrades?: Array<{ name: string; price: number }>;
}

export interface Space {
  id: string;
  name: string;
  type: 'DEPTO' | 'QUINCHO';
  price: number;
  capacity: number;
  description: string;
  rules: string[];
  damageDeposit: number;
  cleaningFee: number;
  availability: string[]; // Dates
  images: string[];
}

export interface SiteAsset {
  id: string;
  key: string;
  label: string;
  url: string;
  category: 'HERO' | 'GALLERY' | 'BRAND';
}

export interface Booking {
  id: string;
  userId: string;
  entityId: string;
  entityType: 'TOUR' | 'SPACE';
  totalPaid: number;
  deposit: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  isMemberBenefitApplied: boolean;
}
