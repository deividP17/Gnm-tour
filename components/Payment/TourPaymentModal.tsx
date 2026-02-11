
import React, { useState, useEffect } from 'react';
import { Tour, User, BankSettings } from '../../types';
import { TourCostBreakdown, formatARS } from '../../services/logic';
import { GNM_API } from '../../services/api';

interface TourPaymentModalProps {
  tour: Tour;
  breakdown: TourCostBreakdown;
  user: User | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const TourPaymentModal: React.FC<TourPaymentModalProps> = ({ tour, breakdown, user, onClose, onSuccess }) => {
  const [method, setMethod] = useState<'mp' | 'transfer'>('mp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankSettings | null>(null);

  useEffect(() => {
    GNM_API.settings.getBank().then(setBankDetails);
  }, []);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const userEmail = user ? user.email : 'invitado@gnm.com';
      
      const initPoint = await GNM_API.mercadopago.createPreference(
        { title: `Reserva: ${tour.destination}`, price: breakdown.finalTotal },
        { email: userEmail }
      );

      if (initPoint.startsWith('#')) {
        alert('MODO SIMULACIÓN: Redirigiendo a éxito...');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          else onClose();
        }, 1500);
      } else {
        window.location.href = initPoint;
      }
    } catch (e) {
      alert('Error al iniciar el pago.');
      setIsProcessing(false);
    }
  };

  const handleTransferNotification = () => {
     window.open(`https://wa.me/543794532196?text=Reserva ${tour.destination}, envío comprobante.`, '_blank');
     // Simulamos que al notificar también se guarda (para la demo)
     if (onSuccess) setTimeout(onSuccess, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] rounded-none border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0 rounded-none">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Confirmar Reserva</p>
            <h3 className="text-xl font-black uppercase tracking-tight truncate max-w-[200px] sm:max-w-xs">{tour.destination}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-none">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
          <button
            onClick={() => setMethod('mp')}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none ${
              method === 'mp' ? 'bg-white text-[#009EE3] border-b-2 border-[#009EE3]' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Mercado Pago
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

        <div className="p-8 md:p-12 overflow-y-auto">
          {method === 'mp' ? (
            <div className="text-center space-y-8">
               <div className="bg-blue-50 border border-blue-200 p-6 rounded-none">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-slate-600 uppercase">Total a Pagar</span>
                     <span className="text-2xl font-black text-slate-900">{formatARS(breakdown.finalTotal)}</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 text-right uppercase">Impuestos Incluidos</div>
               </div>

               <div className="flex justify-center gap-6 text-3xl text-[#009EE3] opacity-60 py-4">
                  <i className="fa-brands fa-cc-visa"></i>
                  <i className="fa-brands fa-cc-mastercard"></i>
                  <i className="fa-brands fa-cc-amex"></i>
               </div>

               <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-[#009EE3] text-white py-5 font-bold text-xs uppercase tracking-widest hover:bg-[#008ac7] transition-colors rounded-none"
               >
                 {isProcessing ? 'Procesando...' : 'Pagar Ahora'}
               </button>
            </div>
          ) : (
            <div className="space-y-6">
              {bankDetails && (
                <>
                   <div className="p-4 border border-slate-300 flex justify-between items-center rounded-none">
                      <div><p className="text-[9px] font-bold text-slate-500 uppercase">Alias</p><p className="font-bold text-slate-900 uppercase">{bankDetails.alias}</p></div>
                      <button onClick={() => copyToClipboard(bankDetails.alias)} className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800">Copiar</button>
                   </div>
                   <div className="p-4 border border-slate-300 flex justify-between items-center rounded-none">
                      <div><p className="text-[9px] font-bold text-slate-500 uppercase">CBU</p><p className="font-bold text-slate-900">{bankDetails.cbu}</p></div>
                      <button onClick={() => copyToClipboard(bankDetails.cbu)} className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800">Copiar</button>
                   </div>
                   <button onClick={handleTransferNotification} className="w-full bg-green-600 text-white py-5 font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-colors rounded-none mt-4">
                      Notificar Pago
                   </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourPaymentModal;
