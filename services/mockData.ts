
import { Tour, Space, User, MembershipTier, SiteAsset } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Gerardo Ramón Lafuente',
    email: 'gerardolaf71@gmail.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    isOnline: true,
    credits: 99999,
    tripsCount: 12,
    isVerified: true,
    lastConnection: 'Ahora mismo',
    membership: { tier: MembershipTier.ELITE, validUntil: '2030-12-31', usedThisMonth: 0, spaceBookingsThisMonth: 0 },
    travelHistory: [
      { id: 'th1', tourId: 't1', destination: 'Mendoza - Ruta del Vino', date: '2024-11-20', pax: 2, totalPaid: 150000, status: 'COMPLETED' },
      { id: 'th2', tourId: 't2', destination: 'Cataratas del Iguazú', date: '2025-01-15', pax: 1, totalPaid: 120000, status: 'COMPLETED' }
    ]
  },
  {
    id: 'u2',
    name: 'Juan Carlos Pereyra',
    email: 'juancp@gmail.com',
    role: 'USER',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    isOnline: false,
    credits: 500,
    tripsCount: 2,
    isVerified: true,
    lastConnection: 'Hace 2 horas',
    membership: { tier: MembershipTier.BASICO, validUntil: '2026-05-10', usedThisMonth: 500, spaceBookingsThisMonth: 0 },
    travelHistory: [
      { id: 'th3', tourId: 't1', destination: 'Mendoza - Ruta del Vino', date: '2024-12-05', pax: 1, totalPaid: 75000, status: 'COMPLETED' }
    ]
  },
  {
    id: 'u3',
    name: 'Maria Elena Valdez',
    email: 'mevaldez@yahoo.com',
    role: 'USER',
    status: 'PENDING_PAYMENT',
    verificationStatus: 'NONE',
    isOnline: true,
    credits: 0,
    tripsCount: 0,
    isVerified: false,
    lastConnection: 'En línea',
    membership: { tier: MembershipTier.PLUS, validUntil: '2026-04-01', usedThisMonth: 2800, spaceBookingsThisMonth: 0 }
  },
  {
    id: 'u4',
    name: 'Ricardo Fort',
    email: 'comandante@miami.com',
    role: 'USER',
    status: 'SUSPENDED',
    verificationStatus: 'VERIFIED',
    isOnline: false,
    credits: 0,
    tripsCount: 5,
    isVerified: true,
    lastConnection: 'Hace 1 año',
  }
];

export const MOCK_ASSETS: SiteAsset[] = [
  { id: 'a1', key: 'home_hero', label: 'Imagen Principal (Hero)', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000', category: 'HERO' },
  { id: 'a2', key: 'salon_main', label: 'Salón Niño Jesús Principal', url: 'https://images.unsplash.com/photo-1530103862676-de3c9a59af57?auto=format&fit=crop&q=80&w=1200', category: 'GALLERY' },
  { id: 'a3', key: 'quincho_ext', label: 'Exterior Quincho', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200', category: 'GALLERY' }
];

export const MOCK_TOURS: Tour[] = [
  {
    id: 't1',
    destination: 'Mendoza - Ruta del Vino',
    price: 85000,
    priceTicket: 25000,
    priceLogistics: 60000,
    km: 1100,
    description: 'Recorrido por las mejores bodegas de Luján de Cuyo y Valle de Uco.',
    images: ['https://images.unsplash.com/photo-1516496636080-14fb876e029d?auto=format&fit=crop&q=80&w=800'],
    dates: {
      start: '2026-03-15',
      end: '2026-03-18',
      deadline: '2026-03-10',
      openAtMembers: '2026-02-01',
      openAtPublic: '2026-02-02'
    },
    capacity: 20,
    minCapacity: 12,
    status: 'OPEN',
    itinerary: ['Día 1: Llegada y Bodega Catena Zapata', 'Día 2: Almuerzo en El Enemigo', 'Día 3: Termas de Cacheuta']
  },
  {
    id: 't2',
    destination: 'Cataratas del Iguazú',
    price: 120000,
    priceTicket: 40000,
    priceLogistics: 80000,
    km: 1300,
    description: 'Maravilla del mundo con guía especializado y traslados incluidos.',
    images: ['https://images.unsplash.com/photo-1580974852861-fb382833cdfc?auto=format&fit=crop&q=80&w=800'],
    dates: {
      start: '2026-04-10',
      end: '2026-04-14',
      deadline: '2026-04-01',
      openAtMembers: '2026-03-01',
      openAtPublic: '2026-03-02'
    },
    capacity: 30,
    minCapacity: 15,
    status: 'OPEN',
    itinerary: ['Día 1: Lado Argentino', 'Día 2: Lado Brasilero', 'Día 3: Gran Aventura']
  }
];

export const MOCK_SPACES: Space[] = [
  {
    id: 's1',
    name: 'Salón & Quincho GNM',
    type: 'QUINCHO',
    price: 45000,
    capacity: 60,
    description: 'Espacio premium para eventos sociales en Corrientes Capital.',
    rules: ['Máximo 60 personas', 'Cierre 02:00 hs'],
    damageDeposit: 15000,
    cleaningFee: 5000,
    availability: ['2026-03-15', '2026-03-21'],
    images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200']
  }
];
