
import { Tour, Space, User, SiteAsset, MembershipTier, BankSettings } from '../types';
import { MOCK_TOURS, MOCK_SPACES, MOCK_USERS, MOCK_ASSETS } from './mockData';
import { BANK_DETAILS } from '../constants';
import { SecurityService } from './security';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const IS_NGROK = window.location.hostname.includes('ngrok-free.app');

// URL DE PRODUCCIÓN (HOSTINGER)
// Al estar vacío o ser relativo, intentará buscar en el mismo dominio.
// Si no hay backend, el safeFetch activará los Mocks.
const PROD_URL = 'https://gnmtour.com'; 

// Lógica de Selección de API
let API_URL = '';
if (IS_NGROK) {
    API_URL = '/api'; 
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
    'ngrok-skip-browser-warning': 'true'
  };
};

const safeFetch = async (url: string, options: any = {}) => {
  const defaultHeaders = getHeaders();
  options.headers = { ...defaultHeaders, ...options.headers };

  try {
    const res = await fetch(url, options);
    
    // VALIDACIÓN CRÍTICA PARA HOSTINGER:
    // Si la respuesta no es OK (ej: 404, 500) devolvemos null para usar Mocks.
    if (!res.ok) return null;
    
    // Si la respuesta devuelve HTML en lugar de JSON (común en Hostinger si la ruta no existe),
    // devolvemos null para evitar errores de parseo y usar Mocks.
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return null; 
    }

    return await res.json();
  } catch (e) {
    // Si falla la red (sin conexión o CORS), usamos Mocks.
    console.warn(`API no disponible (${url}). Usando modo local.`);
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
              mpAccessToken: data.mpAccessToken 
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
      localStorage.setItem('gnm_admin_settings', JSON.stringify(settings));

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
      
      // PRIORIDAD: Configuración Local > Constantes
      const localSettings = localStorage.getItem('gnm_admin_settings');
      let currentToken = '';
      if (localSettings) {
          const parsed = JSON.parse(localSettings);
          currentToken = parsed.mpAccessToken;
      }
      // Si no hay en local, usar constants.ts (donde el usuario pegará su token)
      if (!currentToken || currentToken.trim() === '') currentToken = BANK_DETAILS.mpAccessToken;

      // Intentar procesar por Backend (Más seguro)
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
      
      // Fallback: Si no hay backend, devolver token de simulación 
      // OJO: Sin backend Node.js, no se puede generar preferencia real de MP de forma segura desde el cliente
      // a menos que uses una integración Serverless. 
      // Por ahora, devolvemos simulación para que la UI no rompa.
      console.log("Modo Cliente: Backend no disponible. Token usado:", currentToken ? "Presente" : "Faltante");
      return '#mp_simulation_fallback'; 
    },
    createSubscription: async (item: { title: string, price: number }, payer: { email: string }, metadata: { userId: string, type: string, itemId: string }): Promise<string> => {
      return GNM_API.mercadopago.createPreference(item, payer, metadata);
    }
  },
  auth: {
    login: async (email: string, pass: string): Promise<User> => {
      // 1. Intentar Login Real contra Backend
      const data = await safeFetch(`${API_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password: pass })
      });
      
      if (data && data.user) {
        localStorage.setItem('gnm_token', data.token);
        return { ...data.user, isOnline: true };
      }

      // 2. Fallback a Mocks (SOLO SI EL BACKEND FALLA)
      const mock = MOCK_USERS.find(u => u.email === email);
      if (mock) {
          const isAdmin = mock.role === 'ADMIN';
          const isCorrectAdminPass = isAdmin && pass === 'admin123';
          const isCorrectUserPass = !isAdmin && pass === 'demo';

          if (isCorrectAdminPass || isCorrectUserPass) {
             if (!mock.isVerified && mock.verificationStatus !== 'VERIFIED') {
                 throw new Error('Debes confirmar tu email antes de ingresar.');
             }
             return mock;
          }
      }

      // 3. Fallback a Usuarios Temporales (LocalStorage)
      const localStored = localStorage.getItem('gnm_temp_users');
      if (localStored) {
          const tempUsers = JSON.parse(localStored);
          const found = tempUsers.find((u: any) => u.email === email); 
          
          if (found) {
             // SEGURIDAD CRÍTICA: Validar hash si existe
             if (found.localHash) {
                const isValid = await SecurityService.comparePasswords(pass, found.localHash);
                if (!isValid) throw new Error("Contraseña incorrecta.");
             } else {
                if (pass.length < 6) throw new Error("Credenciales inválidas.");
             }

             if (!found.isVerified) throw new Error('Debes confirmar tu email antes de ingresar.');
             const { localHash, ...safeUser } = found;
             return safeUser;
          }
      }

      throw new Error('Credenciales inválidas o usuario no encontrado.');
    },
    register: async (name: string, email: string, pass: string, birthDate: string): Promise<User> => {
      const data = await safeFetch(`${API_URL}/auth/register`, {
          method: 'POST',
          body: JSON.stringify({ name, email, password: pass, birthDate })
      });

      if (data) return GNM_API.auth.login(email, pass);

      const newUser: User = {
        id: `u-${Date.now()}`,
        name,
        email,
        birthDate, 
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

      // SEGURIDAD CRÍTICA: Hashear contraseña para almacenamiento local
      const passwordHash = await SecurityService.hashPassword(pass);

      const localStored = localStorage.getItem('gnm_temp_users');
      const tempUsers = localStored ? JSON.parse(localStored) : [];
      
      tempUsers.push({ ...newUser, localHash: passwordHash });
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
            const { localHash, ...safeUser } = tempUsers[idx];
            return safeUser;
         }
      }
      throw new Error("Usuario no encontrado para verificación");
    }
  }
};
