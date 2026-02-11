
import { MembershipTier } from './types';

export const BANK_DETAILS = {
  owner: "GERARDO RAMON LAFUENTE",
  cuit: "20-37327496-7",
  bank: "Banco de Corrientes",
  cbu: "0940001000123456789012",
  alias: "GNM.TOUR.ARG",
  accountType: "Caja de Ahorro $",
  mpAccessToken: "" // Token vacío por defecto
};

export const MEMBERSHIP_CONFIG = {
  [MembershipTier.BASICO]: {
    price: 10000,
    discount: 0.15,
    kmLimit: 1000,
    priority: 0,
    benefits: ["15% OFF hasta 1000 km", "Acceso a catálogo"]
  },
  [MembershipTier.INTERMEDIO]: {
    price: 15000,
    discount: 0.20,
    kmLimit: 2000,
    priority: 0,
    benefits: ["20% OFF hasta 2000 km", "Salidas especiales", "Soporte 24/7"]
  },
  [MembershipTier.PLUS]: {
    price: 20000,
    discount: 0.25,
    kmLimit: 3000,
    priority: 1,
    benefits: ["25% OFF hasta 3000 km", "Prioridad reservas", "Upgrades exclusivos"]
  },
  [MembershipTier.ELITE]: {
    price: 25000,
    discount: 0.30,
    kmLimit: 4500,
    priority: 2,
    benefits: ["30% OFF hasta 4500 km", "Asiento Cama S/Cargo", "Prioridad Máxima", "Acceso a Salón VIP"]
  }
};

export const CANCELLATION_LIMIT_HOURS = 48;

export const DEFAULT_LEGAL: any = {
  version: "01/01/2026",
  businessData: {
    razonSocial: "GERARDO RAMON LAFUENTE",
    cuit: "20-37327496-7",
    domicilio: "Pasaje Niño Jesús 1262, Corrientes, República Argentina",
    emailSoporte: "gerardolaf71@gmail.com",
    whatsapp: "+543794532196",
    jurisdiccion: "Corrientes, Argentina"
  },
  terms: `... (Términos legales previos) ...`,
  privacy: `... (Privacidad previa) ...`
};
