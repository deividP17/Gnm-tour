import { Tour, Space, User, Booking, SiteAsset, MembershipTier, BankSettings } from '../types';
import { MOCK_TOURS, MOCK_SPACES, MOCK_USERS, MOCK_ASSETS } from './mockData';
import { BANK_DETAILS } from '../constants';

// --- CONFIGURACIÓN DE URL ---
// Si el navegador dice "localhost", usamos el puerto 3001.
// Si no, asumimos que es producción y usamos tu dominio real.
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// CAMBIA "https://tudominio.com" POR TU URL REAL DE HOSTINGER (sin barra al final)
const PROD_URL = 'https://gnmtour.com'; 

const API_URL = IS_LOCAL ? 'http://localhost:3001/api' : `${PROD_URL}/api`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getHeaders = () => {
  const token = localStorage.getItem('gnm_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const GNM_API = {
  tours: {
    getAll: async (): Promise<Tour[]> => {
      try {
        const res = await fetch(`${API_URL}/tours`);
        if (!res.ok) throw new Error('Error fetching tours');
        const data = await res.json();
        if (Array.isArray(data) && data.length === 0) return [...MOCK_TOURS];
        return data;
      } catch (error) {
        return [...MOCK_TOURS];
      }
    },
    create: async (tour: Tour): Promise<void> => {
        await fetch(`${API_URL}/tours`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(tour)
        });
    }
  },
  spaces: {
    getAll: async (): Promise<Space[]> => {
      await delay(200);
      return [...MOCK_SPACES];
    }
  },
  settings: {
    getBank: async (): Promise<BankSettings> => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        if (res.ok) {
            const data = await res.json();
            return {
                owner: data.owner,
                cuit: data.cuit,
                bank: data.bank,
                cbu: data.cbu,
                alias: data.alias,
                accountType: 'Caja de Ahorro',
                mpAccessToken: data.mp_access_token
            };
        }
        return { ...BANK_DETAILS };
      } catch (e) {
        return { ...BANK_DETAILS };
      }
    },
    updateBank: async (settings: BankSettings): Promise<boolean> => {
      try {
          const res = await fetch(`${API_URL}/settings`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify(settings)
          });
          return res.ok;
      } catch (e) { return false; }
    }
  },
  users: {
    getAll: async (): Promise<User[]> => {
      try {
        const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
        if (res.ok) return await res.json();
        return [...MOCK_USERS]; 
      } catch (e) {
        return [...MOCK_USERS];
      }
    }
  },
  assets: {
    getAll: async (): Promise<SiteAsset[]> => {
      await delay(200);
      return [...MOCK_ASSETS];
    }
  },
  mercadopago: {
    // metadata: { userId: string, type: 'MEMBERSHIP'|'TOUR', itemId: string }
    createPreference: async (item: { title: string, price: number }, payer: { email: string }, metadata: { userId: string, type: string, itemId: string }): Promise<string> => {
      try {
        const res = await fetch(`${API_URL}/mercadopago/create_preference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: item.title,
                price: item.price,
                payer_email: payer.email,
                userId: metadata.userId,
                type: metadata.type,
                itemId: metadata.itemId
            })
        });

        if (res.ok) {
            const data = await res.json();
            return data.init_point; // URL de pago real
        } else {
            console.error("Error MP Backend", await res.text());
        }
      } catch (e) { console.error(e); }
      
      // Fallback simulación si falla backend
      return '#mp_simulation_fallback'; 
    },
    createSubscription: async (item: { title: string, price: number }, payer: { email: string }, metadata: { userId: string, type: string, itemId: string }): Promise<string> => {
      // Reutilizamos createPreference por ahora
      return GNM_API.mercadopago.createPreference(item, payer, metadata);
    }
  },
  auth: {
    login: async (email: string, pass: string): Promise<User> => {
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al ingresar');

        localStorage.setItem('gnm_token', data.token);
        return { ...data.user, isOnline: true };
      } catch (error: any) {
        if (pass === 'demo') {
            const mock = MOCK_USERS.find(u => u.email === email);
            if (mock) return mock;
        }
        throw new Error(error.message);
      }
    },
    register: async (name: string, email: string, pass: string): Promise<User> => {
      try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: pass })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al registrar');

        return GNM_API.auth.login(email, pass);
      } catch (error: any) {
        throw new Error(error.message);
      }
    }
  }
};