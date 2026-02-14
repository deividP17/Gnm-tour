
import { Tour, Space, User, SiteAsset, MembershipTier, BankSettings } from '../types';
import { MOCK_TOURS, MOCK_SPACES, MOCK_USERS, MOCK_ASSETS } from './mockData';
import { BANK_DETAILS } from '../constants';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const IS_NGROK = window.location.hostname.includes('ngrok-free.app');

// CAMBIA "https://tudominio.com" POR TU URL REAL DE HOSTINGER (sin barra al final)
const PROD_URL = 'https://gnmtour.com'; 

// Opcional: Si quieres forzar una URL específica de Ngrok mientras desarrollas en localhost
const MANUAL_NGROK_URL = ""; 

// Lógica de Selección de API
let API_URL = '';
if (IS_NGROK) {
    // Si estamos visitando la web desde ngrok, la API está en el mismo dominio
    API_URL = '/api'; 
} else if (MANUAL_NGROK_URL) {
    API_URL = `${MANUAL_NGROK_URL}/api`;
} else if (IS_LOCAL) {
    API_URL = 'http://localhost:3001/api';
} else {
    API_URL = `${PROD_URL}/api`;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getHeaders = () => {
  const token = localStorage.getItem('gnm_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    'ngrok-skip-browser-warning': 'true' // Vital para que ngrok no bloquee las peticiones
  };
};

const safeFetch = async (url: string, options: any = {}) => {
  // Inyectar headers por defecto para manejar Ngrok y Auth
  const defaultHeaders = getHeaders();
  options.headers = { ...defaultHeaders, ...options.headers };

  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`API Error: ${url} not available. Using mocks.`);
    return null;
  }
};

export const GNM_API = {
  tours: {
    getAll: async (): Promise<Tour[]> => {
      const data = await safeFetch(`${API_URL}/tours`);
      if (data && Array.isArray(data) && data.length > 0) return data;
      return [...MOCK_TOURS];
    },
    create: async (tour: Tour): Promise<void> => {
        await safeFetch(`${API_URL}/tours`, {
            method: 'POST',
            body: JSON.stringify(tour)
        });
    },
    delete: async (id: string): Promise<void> => {
        await safeFetch(`${API_URL}/tours/${id}`, {
            method: 'DELETE'
        });
    }
  },
  spaces: {
    getAll: async (): Promise<Space[]> => {
      const data = await safeFetch(`${API_URL}/spaces`);
      if (data && Array.isArray(data) && data.length > 0) return data;
      return [...MOCK_SPACES];
    },
    create: async (space: Space): Promise<void> => {
        await safeFetch(`${API_URL}/spaces`, {
            method: 'POST',
            body: JSON.stringify(space)
        });
    },
    delete: async (id: string): Promise<void> => {
        await safeFetch(`${API_URL}/spaces/${id}`, {
            method: 'DELETE'
        });
    }
  },
  settings: {
    getBank: async (): Promise<BankSettings> => {
      // 1. Intentar Backend
      const data = await safeFetch(`${API_URL}/settings`);
      if (data && data.owner) {
          return {
              owner: data.owner,
              cuit: data.cuit,
              bank: data.bank,
              cbu: data.cbu,
              alias: data.alias,
              accountType: 'Caja de Ahorro',
              mpAccessToken: data.mpAccessToken // Si el backend lo devuelve (solo admin)
          };
      }
      
      // 2. Intentar LocalStorage (Persistencia Frontend)
      const localSettings = localStorage.getItem('gnm_admin_settings');
      if (localSettings) {
          return JSON.parse(localSettings);
      }

      // 3. Fallback a Constantes (Hardcode)
      return { ...BANK_DETAILS };
    },
    updateBank: async (settings: BankSettings): Promise<boolean> => {
      // Guardar en LocalStorage primero para asegurar persistencia visual inmediata
      localStorage.setItem('gnm_admin_settings', JSON.stringify(settings));

      // Intentar guardar en Backend
      const res = await safeFetch(`${API_URL}/settings`, {
          method: 'PUT',
          body: JSON.stringify(settings)
      });
      
      return !!res || true; 
    }
  },
  users: {
    getAll: async (): Promise<User[]> => {
      const data = await safeFetch(`${API_URL}/users`);
      if (data) return data;
      return [...MOCK_USERS];
    }
  },
  assets: {
    getAll: async (): Promise<SiteAsset[]> => {
      await delay(100);
      return [...MOCK_ASSETS];
    }
  },
  mercadopago: {
    createPreference: async (item: { title: string, price: number }, payer: { email: string }, metadata: { userId: string, type: string, itemId: string }): Promise<string> => {
      
      const localSettings = localStorage.getItem('gnm_admin_settings');
      let currentToken = '';
      if (localSettings) {
          const parsed = JSON.parse(localSettings);
          currentToken = parsed.mpAccessToken;
      }
      if (!currentToken) currentToken = BANK_DETAILS.mpAccessToken;

      const data = await safeFetch(`${API_URL}/mercadopago/create_preference`, {
          method: 'POST',
          body: JSON.stringify({
              title: item.title,
              price: item.price,
              payer_email: payer.email,
              userId: metadata.userId,
              type: metadata.type,
              itemId: metadata.itemId,
              tempToken: currentToken 
          })
      });

      if (data && data.init_point) return data.init_point;
      
      console.log("Token presente pero sin backend activo:", currentToken);
      return '#mp_simulation_fallback'; 
    },
    createSubscription: async (item: { title: string, price: number }, payer: { email: string }, metadata: { userId: string, type: string, itemId: string }): Promise<string> => {
      return GNM_API.mercadopago.createPreference(item, payer, metadata);
    }
  },
  auth: {
    login: async (email: string, pass: string): Promise<User> => {
      const data = await safeFetch(`${API_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password: pass })
      });
      
      if (data && data.user) {
        localStorage.setItem('gnm_token', data.token);
        return { ...data.user, isOnline: true };
      }

      // Fallback a Mocks
      if (pass === 'demo' || pass === 'admin123' || pass.length > 3) {
          const mock = MOCK_USERS.find(u => u.email === email);
          if (mock) {
            if (!mock.isVerified && mock.verificationStatus !== 'VERIFIED') {
                throw new Error('Debes confirmar tu email antes de ingresar.');
            }
            return mock;
          }
          const localStored = localStorage.getItem('gnm_temp_users');
          if (localStored) {
             const tempUsers = JSON.parse(localStored);
             const found = tempUsers.find((u: User) => u.email === email);
             if (found) {
                if (!found.isVerified) throw new Error('Debes confirmar tu email antes de ingresar.');
                return found;
             }
          }
      }
      throw new Error('Credenciales inválidas o usuario no encontrado.');
    },
    register: async (name: string, email: string, pass: string): Promise<User> => {
      const data = await safeFetch(`${API_URL}/auth/register`, {
          method: 'POST',
          body: JSON.stringify({ name, email, password: pass })
      });

      if (data) return GNM_API.auth.login(email, pass);

      const newUser: User = {
        id: `u-${Date.now()}`,
        name,
        email,
        role: 'USER',
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        isOnline: true,
        credits: 0,
        tripsCount: 0,
        isVerified: false, 
        lastConnection: 'Ahora',
        membership: { tier: MembershipTier.NONE, validUntil: '', usedThisMonth: 0 }
      };

      const localStored = localStorage.getItem('gnm_temp_users');
      const tempUsers = localStored ? JSON.parse(localStored) : [];
      tempUsers.push(newUser);
      localStorage.setItem('gnm_temp_users', JSON.stringify(tempUsers));

      return newUser; 
    },
    verifyEmail: async (email: string): Promise<User> => {
      await delay(1000);
      const localStored = localStorage.getItem('gnm_temp_users');
      if (localStored) {
         const tempUsers = JSON.parse(localStored);
         const idx = tempUsers.findIndex((u: User) => u.email === email);
         if (idx !== -1) {
            tempUsers[idx].isVerified = true;
            tempUsers[idx].verificationStatus = 'VERIFIED';
            localStorage.setItem('gnm_temp_users', JSON.stringify(tempUsers));
            return tempUsers[idx];
         }
      }
      throw new Error("Usuario no encontrado para verificación");
    }
  }
};
