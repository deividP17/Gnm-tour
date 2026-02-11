
import { Tour, Space, User, Booking, SiteAsset, MembershipTier, BankSettings } from '../types';
import { MOCK_TOURS, MOCK_SPACES, MOCK_USERS, MOCK_ASSETS } from './mockData';
import { BANK_DETAILS } from '../constants';
import { SecurityService } from './security';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let currentBankSettings: BankSettings = { ...BANK_DETAILS };

export const GNM_API = {
  tours: {
    getAll: async (): Promise<Tour[]> => {
      await delay(400);
      return [...MOCK_TOURS];
    }
  },
  spaces: {
    getAll: async (): Promise<Space[]> => {
      await delay(400);
      return [...MOCK_SPACES];
    }
  },
  settings: {
    getBank: async (): Promise<BankSettings> => {
      await delay(300);
      return { ...currentBankSettings };
    },
    updateBank: async (settings: BankSettings): Promise<boolean> => {
      await delay(600);
      currentBankSettings = { ...settings };
      return true;
    }
  },
  users: {
    getAll: async (): Promise<User[]> => {
      await delay(500);
      return [...MOCK_USERS];
    }
  },
  assets: {
    getAll: async (): Promise<SiteAsset[]> => {
      await delay(300);
      return [...MOCK_ASSETS];
    }
  },
  mercadopago: {
    /**
     * Crea una preferencia de pago UNICO (Para reservas de tours, etc).
     */
    createPreference: async (item: { title: string, price: number }, payer: { email: string }): Promise<string> => {
      await delay(1000);
      
      const { mpAccessToken } = currentBankSettings;

      if (mpAccessToken && mpAccessToken.startsWith('APP_USR')) {
        try {
          const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              items: [
                {
                  title: item.title,
                  quantity: 1,
                  currency_id: 'ARS',
                  unit_price: item.price
                }
              ],
              payer: { email: payer.email },
              back_urls: {
                success: window.location.href,
                failure: window.location.href,
                pending: window.location.href
              },
              auto_return: 'approved'
            })
          });

          if (response.ok) {
            const data = await response.json();
            return data.init_point;
          }
        } catch (e) {
          console.error(e);
        }
      }
      return '#mp_simulation_success'; 
    },

    /**
     * Crea una SUSCRIPCIÓN (Débito Automático Mensual).
     * Endpoint: /preapproval
     */
    createSubscription: async (item: { title: string, price: number }, payer: { email: string }): Promise<string> => {
      await delay(1500); // Un poco mas de delay para simular proceso complejo
      
      const { mpAccessToken } = currentBankSettings;

      if (mpAccessToken && mpAccessToken.startsWith('APP_USR')) {
        try {
          // Payload específico para Suscripciones (Auto-recurring)
          const response = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reason: item.title,
              auto_recurring: {
                frequency: 1,
                frequency_type: "months",
                transaction_amount: item.price,
                currency_id: "ARS"
              },
              payer_email: payer.email,
              back_url: window.location.href,
              status: "authorized"
            })
          });

          if (response.ok) {
            const data = await response.json();
            // Para suscripciones, MP devuelve 'init_point' donde el usuario acepta el débito
            return data.init_point; 
          } else {
            console.error("Error MP Subscription:", await response.json());
            throw new Error('Error al crear suscripción');
          }
        } catch (e) {
          console.error(e);
        }
      }

      console.log(`[MP MOCK] Creando SUSCRIPCIÓN MENSUAL para: ${item.title} - $${item.price}/mes`);
      return '#mp_simulation_subscription_success'; 
    }
  },
  auth: {
    login: async (email: string, pass: string): Promise<User> => {
      await delay(800);
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        throw new Error('Credenciales inválidas o usuario no registrado.');
      }

      if (pass !== 'demo') {
        console.log("Validando seguridad de sesión...");
      }

      return { ...user, isOnline: true };
    },
    register: async (name: string, email: string, pass: string): Promise<User> => {
      await delay(1000);
      const existing = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        throw new Error('El email ya está registrado.');
      }
      
      const passwordHash = await SecurityService.hashPassword(pass);
      console.log(`[BACKEND] Usuario registrado con éxito. Password Hash: ${passwordHash}`);

      const newUser: User = {
        id: `u${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        role: 'USER',
        status: 'ACTIVE',
        verificationStatus: 'NONE',
        isOnline: true,
        credits: 0,
        tripsCount: 0,
        isVerified: false,
        lastConnection: 'Recién registrado',
        membership: { 
          tier: MembershipTier.NONE, 
          validUntil: '', 
          usedThisMonth: 0 
        }
      };
      
      MOCK_USERS.push(newUser);
      return newUser;
    }
  }
};
