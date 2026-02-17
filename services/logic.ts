
import { Tour, User, MembershipTier, Space } from '../types';
import { MEMBERSHIP_CONFIG } from '../constants';

/**
 * Convierte un string "YYYY-MM-DD" a un objeto Date en hora LOCAL (00:00:00).
 */
export const getLocalDateFromISO = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
};

export const toLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculates final price for a tour based on user membership and distance
 */
export const calculateTourPrice = (tour: Tour, user: User | null): { finalPrice: number, discountApplied: boolean } => {
  const breakdown = calculateTourCostBreakdown(tour, user);
  return { finalPrice: breakdown.finalTotal, discountApplied: breakdown.discountAmount > 0 };
};

export interface TourCostBreakdown {
  basePrice: number;
  logisticsCost: number;
  serviceFee: number;
  discountAmount: number;
  finalServiceFee: number;
  finalTotal: number;
  isDiscountApplied: boolean;
  memberTier: MembershipTier;
  discountPercentage: number;
  logisticsPercentage: number;
  ticketPercentage: number;
  reason?: string;
}

export const calculateTourCostBreakdown = (tour: Tour, user: User | null): TourCostBreakdown => {
  const logisticsCost = tour.priceLogistics !== undefined ? tour.priceLogistics : (tour.price * 0.8);
  const serviceFee = tour.priceTicket !== undefined ? tour.priceTicket : (tour.price * 0.2);
  
  const basePrice = logisticsCost + serviceFee;
  
  let discountAmount = 0;
  let isDiscountApplied = false;
  let memberTier = MembershipTier.NONE;
  let discountPercentage = 0;
  let reason = "";

  if (user && user.membership && user.membership.tier !== MembershipTier.NONE) {
    const config = MEMBERSHIP_CONFIG[user.membership.tier];
    memberTier = user.membership.tier;
    
    const usedKm = user.membership.usedThisMonth || 0;
    const limit = config.kmLimit;
    const remainingKm = limit - usedKm;

    if (tour.km <= remainingKm) {
      discountPercentage = config.discount;
      discountAmount = serviceFee * discountPercentage;
      isDiscountApplied = true;
      reason = `Cubierto por cupo mensual (${remainingKm} km disponibles)`;
    } else {
      reason = `Supera tu cupo mensual disponible (${remainingKm} km restantes)`;
    }
  } else {
    reason = "No eres socio o plan sin beneficios";
  }

  const finalServiceFee = serviceFee - discountAmount;
  const finalTotal = logisticsCost + finalServiceFee;

  const totalBase = logisticsCost + serviceFee;
  const logisticsPercentage = totalBase > 0 ? (logisticsCost / totalBase) * 100 : 80;
  const ticketPercentage = totalBase > 0 ? (serviceFee / totalBase) * 100 : 20;

  return {
    basePrice,
    logisticsCost,
    serviceFee,
    discountAmount,
    finalServiceFee,
    finalTotal,
    isDiscountApplied,
    memberTier,
    discountPercentage,
    logisticsPercentage,
    ticketPercentage,
    reason
  };
};

export interface SpaceCostBreakdown {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  isDiscountApplied: boolean;
  memberTier: MembershipTier;
  decorationPerk: string | null;
  remainingUses: number;
}

export const calculateSpaceCostBreakdown = (space: Space, user: User | null): SpaceCostBreakdown => {
  const originalPrice = space.price;
  let finalPrice = originalPrice;
  let discountAmount = 0;
  let isDiscountApplied = false;
  let memberTier = MembershipTier.NONE;
  let decorationPerk = null;
  let remainingUses = 0;

  if (user && user.membership && user.membership.tier !== MembershipTier.NONE) {
    memberTier = user.membership.tier;
    const config = MEMBERSHIP_CONFIG[memberTier];
    const spaceConfig = config.spaceConfig || { discount: 0, limit: 0, decoration: null };

    const usedCount = user.membership.spaceBookingsThisMonth || 0;
    
    if (usedCount < spaceConfig.limit) {
      if (spaceConfig.discount > 0) {
        discountAmount = originalPrice * spaceConfig.discount;
        finalPrice = originalPrice - discountAmount;
        isDiscountApplied = true;
      }
    }

    remainingUses = Math.max(0, spaceConfig.limit - usedCount);
    decorationPerk = spaceConfig.decoration;
  }

  return {
    originalPrice,
    finalPrice,
    discountAmount,
    isDiscountApplied,
    memberTier,
    decorationPerk,
    remainingUses
  };
};

/**
 * Calcula el monto a devolver basado en la política de cancelación.
 * > límite de horas configurado = 100%
 * <= límite de horas configurado = 50%
 */
export const calculateRefundAmount = (dateStr: string, totalPaid: number, limitHours: number): { amount: number, percentage: number, message: string } => {
    const tripDate = getLocalDateFromISO(dateStr);
    const now = new Date();
    
    // Diferencia en horas
    const diffMs = tripDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > limitHours) {
        return {
            amount: totalPaid,
            percentage: 100,
            message: "Reembolso Completo (Cancelación anticipada)"
        };
    } else {
        return {
            amount: totalPaid * 0.5,
            percentage: 50,
            message: `Reembolso 50% (Cancelación dentro de las ${limitHours}hs previas)`
        };
    }
};

export const formatARS = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
};
