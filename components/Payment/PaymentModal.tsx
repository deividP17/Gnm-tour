
import React, { useState, useEffect } from 'react';
import { MembershipTier, BankSettings } from '../../types';
import { MEMBERSHIP_CONFIG } from '../../constants';
import { formatARS } from '../../services/logic';
import { GNM_API } from '../../services/api';

interface PaymentModalProps {
  tier: MembershipTier;
  onSuccess: (tier: MembershipTier, months: number) => void;
  onCancel: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ tier, onSuccess, onCancel }) => {
  const [method, setMethod] = useState<'mp' | 'transfer'>('mp');
  const [months, setMonths] = useState<number>(1); // 1, 3, or 6
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankSettings | null>(null);
  
  const config = MEMBERSHIP_CONFIG[tier];

  // Cálculo de Precios
  const basePrice = config.price;
  const rawTotal = basePrice * months;
  const discount = months >= 3 ? rawTotal * 0.10 : 0; // 10% descuento si es 3 o más meses
  const finalTotal = rawTotal - discount;

  useEffect(() => {
    GNM_API.settings.getBank().then(setBankDetails);
  }, []);

  const handleMercadoPagoFlow = async () => {
    setIsProcessing(true);
    try {
      // 1. SI ES SUSCRIPCIÓN MENSUAL AUTOMÁTICA
      if (months === 1) {
        // Verificar si existe un link configurado para este tier
        const subscriptionLink = bankDetails?.subscriptionLinks?.[tier];
        
        if (subscriptionLink && subscriptionLink.trim() !== '') {
            // REDIRECCIÓN DIRECTA A LA SUSCRIPCIÓN REAL DE MP
            window.location.href = subscriptionLink;
            return;
        } else {
            console.warn("No hay link de suscripción configurado, usando fallback de pago único.");
        }
      }

      // 2. SI ES PAGO ADELANTADO (3/6 MESES) O NO HAY LINK CONFIGURADO
      const userStr = localStorage.getItem('gnm_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userEmail = user ? user.email : 'invitado@gnm.com';
      const userId = user ? user.id : 'unknown';
      
      const title = months === 1 
        ? `Suscripción GNM - Plan ${tier} (Mensual - Pago Único)` 
        : `Suscripción GNM - Plan ${tier} (${months} Meses Adelantados)`;

      const initPoint = await GNM_API.mercadopago.createPreference(
        { title: title, price: finalTotal },
        { email: userEmail },
        { userId: userId, type: 'MEMBERSHIP', itemId: tier } 
      );

      if (initPoint.startsWith('#')) {
        alert('MODO PRUEBA: Simulando pago aprobado...');
        setIsProcessing(false);
        setShowSuccess(true);
        setTimeout(() => onSuccess(tier, months), 2000);
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
           <h3 className="text-3xl font-black uppercase tracking-tight">Membresía Activada</h3>
           <p className="text-slate-500 font-medium">
             Disfruta tu plan <span className="text-blue-600 font-bold">{tier}</span> por {months} mes{months > 1 ? 'es' : ''}.
           </p>
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
            <p className="text-2xl font-black text-white tracking-tight">{formatARS(finalTotal)}</p>
            <p className="text-[9px] font-bold uppercase opacity-60">Total a Pagar</p>
          </div>
        </div>

        {/* SELECTOR DE DURACIÓN */}
        <div className="bg-blue-50 p-6 border-b border-blue-100">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Selecciona Duración</p>
           <div className="grid grid-cols-3 gap-4">
              {[1, 3, 6].map((m) => {
                 const isSelected = months === m;
                 return (
                    <button
                       key={m}
                       onClick={() => setMonths(m)}
                       className={`relative py-4 px-2 border transition-all rounded-none flex flex-col items-center justify-center gap-1 ${
                          isSelected 
                            ? 'bg-white border-blue-600 text-blue-600 shadow-md ring-1 ring-blue-600' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'
                       }`}
                    >
                       {m >= 3 && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 uppercase tracking-widest rounded-sm">
                             10% OFF
                          </span>
                       )}
                       <span className="text-sm font-black uppercase">{m} Mes{m > 1 ? 'es' : ''}</span>
                       <span className="text-[10px] font-bold">
                          {m === 1 ? formatARS(basePrice) : formatARS(basePrice * m * 0.90)}
                       </span>
                    </button>
                 );
              })}
           </div>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-200">
          <button
            onClick={() => setMethod('mp')}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2 ${
              method === 'mp' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fa-regular fa-credit-card"></i> Tarjetas
          </button>
          <button
            onClick={() => setMethod('transfer')}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2 ${
              method === 'transfer' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fa-solid fa-money-bill-transfer"></i> Transferencia
          </button>
        </div>

        <div className="p-8 md:p-12">
          {method === 'transfer' && bankDetails ? (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-none text-center">
                  <p className="text-xs font-bold text-blue-800 uppercase mb-1">
                    Pago único por {months} mes{months > 1 ? 'es' : ''}
                  </p>
                  <p className="text-2xl font-black text-blue-900">{formatARS(finalTotal)}</p>
                  {discount > 0 && <p className="text-[10px] font-bold text-green-600 uppercase mt-1">Ahorraste {formatARS(discount)}</p>}
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
               <button onClick={() => window.open(`https://wa.me/543794532196?text=Gerardo, ya transferí ${formatARS(finalTotal)} para la membresía ${tier} por ${months} meses`, '_blank')} className="w-full bg-green-600 text-white py-4 font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-colors rounded-none">
                  Enviar Comprobante
               </button>
            </div>
          ) : (
            <div className="py-6 text-center space-y-6 animate-in fade-in duration-300">
               <div className="w-16 h-16 bg-[#009EE3] text-white flex items-center justify-center text-3xl mx-auto rounded-none">
                  <i className="fa-solid fa-rotate"></i>
               </div>
               
               <div className="space-y-2">
                 <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {months === 1 ? 'Suscripción Automática' : 'Pago Adelantado'}
                 </h4>
                 <p className="text-sm text-slate-500 font-medium">
                    {months === 1 
                        ? 'Se te redirigirá a Mercado Pago para confirmar el débito mensual.' 
                        : `Pago único por ${months} meses con descuento aplicado.`
                    }
                 </p>
               </div>

               {/* Iconos de tarjetas */}
               <div className="flex justify-center gap-4 text-3xl text-slate-300 py-2">
                  <i className="fa-brands fa-cc-visa hover:text-[#1434CB] transition-colors"></i>
                  <i className="fa-brands fa-cc-mastercard hover:text-[#EB001B] transition-colors"></i>
                  <i className="fa-brands fa-cc-amex hover:text-[#006FCF] transition-colors"></i>
               </div>

               <button 
                onClick={handleMercadoPagoFlow} 
                disabled={isProcessing}
                className="w-full bg-[#009EE3] text-white py-5 font-bold text-xs uppercase tracking-widest hover:bg-[#008ac7] transition-colors rounded-none shadow-lg shadow-blue-200"
               >
                 {isProcessing ? 'Procesando...' : (months === 1 ? 'Ir a Suscripción' : `Pagar ${formatARS(finalTotal)}`)}
               </button>
               
               <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">
                  Procesado de forma segura por Mercado Pago
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
