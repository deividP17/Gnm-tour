import React, { useState, useEffect } from 'react';
import { MembershipTier, BankSettings } from '../../types';
import { MEMBERSHIP_CONFIG } from '../../constants';
import { formatARS } from '../../services/logic';
import { GNM_API } from '../../services/api';

interface PaymentModalProps {
  tier: MembershipTier;
  onSuccess: (tier: MembershipTier) => void;
  onCancel: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ tier, onSuccess, onCancel }) => {
  const [method, setMethod] = useState<'mp' | 'transfer'>('mp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankSettings | null>(null);
  
  const config = MEMBERSHIP_CONFIG[tier];

  useEffect(() => {
    GNM_API.settings.getBank().then(setBankDetails);
  }, []);

  const handleMercadoPagoFlow = async () => {
    setIsProcessing(true);
    try {
      const userStr = localStorage.getItem('gnm_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userEmail = user ? user.email : 'invitado@gnm.com';
      const userId = user ? user.id : 'unknown';

      const initPoint = await GNM_API.mercadopago.createSubscription(
        { title: `Suscripción GNM - Plan ${tier}`, price: config.price },
        { email: userEmail },
        { userId: userId, type: 'MEMBERSHIP', itemId: tier } // Metadatos para Webhook
      );

      if (initPoint === '#mp_simulation_subscription_success' || initPoint === '#mp_simulation_fallback') {
        alert('MODO PRUEBA: Simulando autorización de Débito Automático...');
        setIsProcessing(false);
        setShowSuccess(true);
        setTimeout(() => onSuccess(tier), 2000);
      } else {
        window.location.href = initPoint;
      }
    } catch (error) {
      alert('Error al conectar con Mercado Pago.');
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado');
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
        <div className="relative bg-white w-full max-w-md p-12 text-center space-y-6 animate-in zoom-in duration-300 border border-slate-200 rounded-none shadow-xl">
           <div className="w-20 h-20 bg-green-600 flex items-center justify-center text-white text-3xl mx-auto rounded-none">
              <i className="fa-solid fa-check"></i>
           </div>
           <h3 className="text-3xl font-black uppercase tracking-tight">Suscripción Activada</h3>
           <p className="text-slate-500 font-medium">Nivel <span className="text-blue-600 font-bold">{tier}</span> activo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel}></div>
      
      <div className="relative bg-white w-full max-w-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 rounded-none border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center rounded-none">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Checkout</p>
            <h3 className="text-xl font-black uppercase tracking-tight">Suscripción {tier}</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white tracking-tight">{formatARS(config.price)}</p>
            <p className="text-[9px] font-bold uppercase opacity-60">Mensual</p>
          </div>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-200">
          <button
            onClick={() => setMethod('mp')}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none ${
              method === 'mp' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Débito Automático
          </button>
          <button
            onClick={() => setMethod('transfer')}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none ${
              method === 'transfer' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Transferencia
          </button>
        </div>

        <div className="p-8 md:p-12">
          {method === 'transfer' && bankDetails ? (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-none">
                  <p className="text-xs font-bold text-blue-800 text-center uppercase">
                    Transferencia manual mensual requerida.
                  </p>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-slate-300 rounded-none">
                     <div><p className="text-[9px] font-bold text-slate-500 uppercase">Titular</p><p className="font-bold text-slate-900 uppercase">{bankDetails.owner}</p></div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-300 rounded-none">
                     <div><p className="text-[9px] font-bold text-slate-500 uppercase">Alias</p><p className="font-bold text-slate-900 uppercase">{bankDetails.alias}</p></div>
                     <button onClick={() => copyToClipboard(bankDetails.alias)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold rounded-none">Copiar</button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-300 rounded-none">
                     <div><p className="text-[9px] font-bold text-slate-500 uppercase">CBU</p><p className="font-bold text-slate-900">{bankDetails.cbu}</p></div>
                     <button onClick={() => copyToClipboard(bankDetails.cbu)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold rounded-none">Copiar</button>
                  </div>
               </div>
               <button onClick={() => window.open(`https://wa.me/543794532196?text=Gerardo, ya transferí para la membresía ${tier}`, '_blank')} className="w-full bg-green-600 text-white py-4 font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-colors rounded-none">
                  Enviar Comprobante
               </button>
            </div>
          ) : (
            <div className="py-6 text-center space-y-6 animate-in fade-in duration-300">
               <div className="w-16 h-16 bg-[#009EE3] text-white flex items-center justify-center text-3xl mx-auto rounded-none">
                  <i className="fa-solid fa-rotate"></i>
               </div>
               
               <div className="space-y-2">
                 <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Suscripción Recurrente</h4>
                 <p className="text-sm text-slate-500 font-medium">
                    Autorización segura vía Mercado Pago. Cancela cuando quieras.
                 </p>
               </div>

               <button 
                onClick={handleMercadoPagoFlow} 
                disabled={isProcessing}
                className="w-full bg-[#009EE3] text-white py-5 font-bold text-xs uppercase tracking-widest hover:bg-[#008ac7] transition-colors rounded-none"
               >
                 {isProcessing ? 'Procesando...' : 'Suscribirme Ahora'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;