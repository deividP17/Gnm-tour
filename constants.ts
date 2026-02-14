
import { MembershipTier } from './types';

export const BANK_DETAILS = {
  owner: "GERARDO RAMON LAFUENTE",
  cuit: "20-37327496-7",
  bank: "Banco de Corrientes",
  cbu: "0940001000123456789012",
  alias: "GNM.TOUR.ARG",
  accountType: "Caja de Ahorro $",
  // PEGA TU TOKEN AQUI SI QUIERES USARLO DIRECTAMENTE SIN EL PANEL DE ADMIN
  // Ejemplo: "APP_USR-12345678-1234-1234-1234-1234567890"
  mpAccessToken: "",
  subscriptionLinks: {
    [MembershipTier.BASICO]: "",
    [MembershipTier.INTERMEDIO]: "",
    [MembershipTier.PLUS]: "",
    [MembershipTier.ELITE]: ""
  }
};

export const MEMBERSHIP_CONFIG = {
  [MembershipTier.BASICO]: {
    price: 5000, // Bajado de 10000
    discount: 0.15,
    kmLimit: 1000,
    priority: 0,
    benefits: ["15% OFF hasta 1000 km", "Acceso a catálogo"],
    spaceConfig: { discount: 0, limit: 0, decoration: null }
  },
  [MembershipTier.INTERMEDIO]: {
    price: 10000, // Bajado de 15000
    discount: 0.20,
    kmLimit: 2000,
    priority: 0,
    benefits: ["20% OFF hasta 2000 km", "10% OFF en Espacios (1 vez/mes)", "Soporte 24/7"],
    spaceConfig: { discount: 0.10, limit: 1, decoration: null }
  },
  [MembershipTier.PLUS]: {
    price: 15000, // Bajado de 20000
    discount: 0.25,
    kmLimit: 3000,
    priority: 1,
    benefits: ["25% OFF hasta 3000 km", "15% OFF en Espacios (2 veces/mes)", "Decoración Básica Incluida"],
    spaceConfig: { discount: 0.15, limit: 2, decoration: "Decoración Básica" }
  },
  [MembershipTier.ELITE]: {
    price: 20000, // Bajado de 25000
    discount: 0.30,
    kmLimit: 4500,
    priority: 2,
    benefits: ["30% OFF hasta 4500 km", "15% OFF en Espacios (3 veces/mes)", "Decoración Premium Incluida", "Acceso a Salón VIP"],
    spaceConfig: { discount: 0.15, limit: 3, decoration: "Decoración Premium" }
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
