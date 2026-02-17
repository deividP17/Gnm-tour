
import { Tour, Space, User, SiteAsset, MembershipTier, BankSettings } from '../types';
import { MOCK_TOURS, MOCK_SPACES, MOCK_USERS, MOCK_ASSETS } from './mockData';
import { BANK_DETAILS } from '../constants';
import { SecurityService } from './security';

// Lógica de URL Dinámica para Producción (Hostinger)
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  // 1. Entorno Local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // 2. Ngrok o Túneles
  if (hostname.includes('ngrok-free.app')) {
    return `https://${hostname}/api`;
  }

  // 3. Producción (Hostinger)
  // En producción, el frontend y backend suelen servirse desde el mismo origen.
  // Usamos una ruta relativa para evitar problemas de CORS y Protocolo (http vs https).
  return '/api';
};

const API_URL = getApiUrl();

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
    
    // Validación: Si el backend devuelve 404 en /api/xxx, es probable que no esté corriendo
    // o que el servidor web no esté redirigiendo bien.
    if (!res.ok) {
        console.warn(`Error API (${res.status}): ${url}`);
        return null;
    }
    
    // Verificar que sea JSON real
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        // A veces los errores de servidor web vienen en HTML
        return null; 
    }

    return await res.json();
  } catch (e) {
    console.warn(`API no disponible (${url}). Usando mocks si es posible.`);
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
              mpAccessToken: data.mpAccessToken,
              subscriptionLinks: data.subscriptionLinks,
              cancellationHours: data.cancellationHours || 72 // Added default to fix missing property error
          };
      }
      
      // 2. Intentar LocalStorage
      const localSettings = localStorage.getItem('gnm_admin_settings');
      if (localSettings) {
          const parsed = JSON.parse(localSettings);
          return {
            ...parsed,
            cancellationHours: parsed.cancellationHours || 72
          };
      }

      // 3. Fallback
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
      // Intentar obtener del backend
      const data = await safeFetch(`${API_URL}/assets`);
      if (data && Array.isArray(data) && data.length > 0) return data;
      
      // Fallback a mocks si falla
      return [...MOCK_ASSETS];
    },
    update: async (id: string, newUrl: string): Promise<void> => {
       await safeFetch(`${API_URL}/assets/${id}`, {
           method: 'PUT',
           body: JSON.stringify({ url: newUrl })
       });
    }
  },
  mercadopago: {
    createPreference: async (item: { title: string, price: number }, payer: { email: string }, metadata: { userId: string, type: string, itemId: string }): Promise<string> => {
      
      // Intentar procesar por Backend (ÚNICA FORMA SEGURA)
      const data = await safeFetch(`${API_URL}/mercadopago/create_preference`, {
          method: 'POST',
          body: JSON.stringify({
              title: item.title,
              price: item.price,
              payer_email: payer.email,
              userId: metadata.userId,
              type: metadata.type,
              itemId: metadata.itemId
          })
      });

      if (data && data.init_point) return data.init_point;
      
      console.log("Modo Cliente: Backend no disponible o error en MP. Simulación activada.");
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

      // Fallback Mock (Solo si backend falla o no existe el usuario en DB pero sí en mocks)
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
      throw new Error('Credenciales inválidas o usuario no encontrado.');
    },
    register: async (name: string, email: string, pass: string, birthDate: string): Promise<User> => {
      const data = await safeFetch(`${API_URL}/auth/register`, {
          method: 'POST',
          body: JSON.stringify({ name, email, password: pass, birthDate })
      });

      if (data) return GNM_API.auth.login(email, pass);

      throw new Error("No se pudo conectar con el servidor de registro."); 
    },
    verifyEmail: async (email: string): Promise<User> => {
      await delay(1000);
      throw new Error("Verificación requiere backend activo.");
    }
  }
};
