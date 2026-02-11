
import { Tour, User, MembershipTier } from '../types';
import { MEMBERSHIP_CONFIG } from '../constants';

/**
 * Calculates final price for a tour based on user membership and distance
 */
export const calculateTourPrice = (tour: Tour, user: User | null): { finalPrice: number, discountApplied: boolean } => {
  const breakdown = calculateTourCostBreakdown(tour, user);
  return { finalPrice: breakdown.finalTotal, discountApplied: breakdown.discountAmount > 0 };
};

export interface TourCostBreakdown {
  basePrice: number;
  logisticsCost: number; // Valor definido manualmente
  serviceFee: number; // Valor Boleto definido manualmente
  discountAmount: number;
  finalServiceFee: number;
  finalTotal: number;
  isDiscountApplied: boolean;
  memberTier: MembershipTier;
  discountPercentage: number;
  logisticsPercentage: number; // Para la barra visual
  ticketPercentage: number; // Para la barra visual
  reason?: string; // Explicación de si aplicó o no
}

/**
 * Nueva lógica con valores manuales.
 * LogisticsCost = tour.priceLogistics
 * ServiceFee (Ticket) = tour.priceTicket
 * 
 * LOGICA DE KM ACUMULABLES:
 * Se descuenta el % solo si (KM_USADOS + KM_TOUR) <= KM_LIMITE
 * Si el cliente realiza 3 viajes de 1500km (Total 4500) cumple tope.
 * El 4to viaje de 500km es NETO (sin descuento).
 */
export const calculateTourCostBreakdown = (tour: Tour, user: User | null): TourCostBreakdown => {
  // Usamos los valores definidos manualmente en el tour
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
    
    // Obtener km usados este mes (simulado)
    const usedKm = user.membership.usedThisMonth || 0;
    const limit = config.kmLimit;
    const remainingKm = limit - usedKm;

    // REGLA DE ORO: Si el viaje cabe en los KM restantes, aplica descuento.
    // Si no cabe (ej. quedan 500km y el viaje es de 1000km), el viaje es NETO.
    if (tour.km <= remainingKm) {
      discountPercentage = config.discount;
      // EL DESCUENTO SOLO APLICA AL VALOR DEL BOLETO/TICKET
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

  // Calculo de porcentajes para la barra visual
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

/**
 * Checks if a cancellation is within the 48hs window
 */
export const isCancellationRefundable = (startDate: string): boolean => {
  const start = new Date(startDate).getTime();
  const now = new Date().getTime();
  const hoursDiff = (start - now) / (1000 * 60 * 60);
  return hoursDiff >= 48;
};

/**
 * Format currency to ARS
 */
export const formatARS = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
};
