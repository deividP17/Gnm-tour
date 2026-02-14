
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
  type: 'BOOKING' | 'MEMBERSHIP' | 'VERIFICATION' | 'SYSTEM' | 'SPACE_BOOKING' | 'CANCELLATION' | 'BIRTHDAY';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface TravelHistoryItem {
  id: string;
  tourId: string;
  destination: string;
  date: string;
  pax: number;
  totalPaid: number;
  km?: number; // Nuevo campo para saber cuántos km descontar al cancelar
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  cancellationReason?: string;
}

export interface SpaceBooking {
  id: string;
  spaceId: string;
  date: string;
  userId: string;
  userName: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  cancellationReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  birthDate?: string; // Nuevo campo para cumpleaños
  role: 'USER' | 'ADMIN';
  status: UserStatus;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  membership?: {
    tier: MembershipTier;
    validUntil: string;
    usedThisMonth: number;
    spaceBookingsThisMonth?: number; // Nuevo campo para controlar el límite de descuentos en espacios
    cancellationReason?: string;
  };
  tripsCount: number;
  credits: number;
  isVerified: boolean;
  lastConnection: string;
  travelHistory?: TravelHistoryItem[];
  notifications?: Notification[];
}

export interface BankSettings {
  owner: string;
  cuit: string;
  bank: string;
  cbu: string;
  alias: string;
  accountType: string;
  mpAccessToken?: string;
  // Nuevos campos para links de suscripción automática
  subscriptionLinks?: {
    [key in MembershipTier]?: string;
  };
}

export interface Tour {
  id: string;
  destination: string;
  price: number;
  priceTicket: number;
  priceLogistics: number;
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
  availability: string[]; // Lista de fechas ocupadas (YYYY-MM-DD)
  images: string[];
}

export interface SiteAsset {
  id: string;
  key: string;
  label: string;
  url: string;
  category: 'HERO' | 'GALLERY' | 'BRAND' | 'PAGE_BANNER';
}
