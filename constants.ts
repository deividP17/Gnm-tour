
import { MembershipTier } from './types';

export const BANK_DETAILS = {
  owner: "GERARDO RAMON LAFUENTE",
  cuit: "20-37327496-7",
  bank: "Banco de Corrientes",
  cbu: "0940001000123456789012",
  alias: "GNM.TOUR.ARG",
  accountType: "Caja de Ahorro $",
  
  // --- ÁREA DE CONFIGURACIÓN DE PAGO ---
  // 1. Pega aquí tu Access Token de Producción de Mercado Pago.
  // Debe empezar con "APP_USR-..."
  mpAccessToken: "", 

  // 2. Pega aquí los links de pago ("init_point") generados en Mercado Pago 
  // para las suscripciones mensuales de cada plan.
  subscriptionLinks: {
    [MembershipTier.BASICO]: "",     // Link para Plan Básico
    [MembershipTier.INTERMEDIO]: "", // Link para Plan Intermedio
    [MembershipTier.PLUS]: "",       // Link para Plan Plus
    [MembershipTier.ELITE]: ""       // Link para Plan Elite
  }
};

export const MEMBERSHIP_CONFIG = {
  [MembershipTier.BASICO]: {
    price: 5000,
    discount: 0.15,
    kmLimit: 1000,
    priority: 0,
    benefits: ["15% OFF hasta 1000 km"],
    spaceConfig: { discount: 0, limit: 0, decoration: null }
  },
  [MembershipTier.INTERMEDIO]: {
    price: 10000,
    discount: 0.20,
    kmLimit: 2000,
    priority: 0,
    benefits: ["20% OFF hasta 2000 km", "10% OFF en Espacios (1 vez/mes)"],
    spaceConfig: { discount: 0.10, limit: 1, decoration: null }
  },
  [MembershipTier.PLUS]: {
    price: 15000,
    discount: 0.25,
    kmLimit: 3000,
    priority: 1,
    benefits: ["25% OFF hasta 3000 km", "15% OFF en Espacios (2 veces/mes)", "Decoración Básica Incluida"],
    spaceConfig: { discount: 0.15, limit: 2, decoration: "Decoración Básica" }
  },
  [MembershipTier.ELITE]: {
    price: 20000,
    discount: 0.30,
    kmLimit: 4500,
    priority: 2,
    benefits: ["30% OFF hasta 4500 km", "15% OFF en Espacios (3 veces/mes)", "Decoración Premium Incluida"],
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
  terms: `
    TÉRMINOS Y CONDICIONES GNM TOUR
    1. RESERVAS: Las reservas de tours y espacios se confirman únicamente con el pago de la seña o el total.
    2. CANCELACIONES: Las cancelaciones deben realizarse con 48hs de anticipación para reembolso o reprogramación.
    3. MEMBRESÍAS: Los beneficios de membresía son personales e intransferibles. El uso indebido puede causar la baja.
    4. ESPACIOS: El alquiler del quincho/salón requiere un depósito de garantía. El cliente es responsable por daños.
  `,
  privacy: `
    POLÍTICA DE PRIVACIDAD
    Sus datos personales (nombre, email, fecha de nacimiento) se utilizan únicamente para la gestión de reservas y verificación de identidad.
    No compartimos información con terceros salvo requerimiento legal.
  `
};
