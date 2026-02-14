
import React, { useState } from 'react';
import { Space, User } from '../../types';
import { formatARS, getLocalDateFromISO } from '../../services/logic';
import { GNM_API } from '../../services/api';

interface SpacePaymentModalProps {
  space: Space;
  date: string;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SpacePaymentModal: React.FC<SpacePaymentModalProps> = ({ space, date, user, onClose, onSuccess }) => {
  const [method, setMethod] = useState<'mp' | 'transfer'>('mp');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const initPoint = await GNM_API.mercadopago.createPreference(
        { title: `Reserva GNM: ${space.name} - Fecha: ${date}`, price: space.price },
        { email: user?.email || 'invitado@gnm.com' },
        { userId: user?.id || 'guest', type: 'SPACE', itemId: space.id }
      );

      if (initPoint.startsWith('#')) {
        alert('Simulación exitosa: Reserva confirmada.');
        onSuccess();
      } else {
        window.location.href = initPoint;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 rounded-none border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center rounded-none">
           <div>
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Checkout Seguro</p>
             <h3 className="text-xl font-black uppercase">{space.name}</h3>
           </div>
           <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="p-8 space-y-8">
           <div className="bg-blue-50 p-6 border border-blue-100 flex justify-between items-center rounded-none">
              <div>
                 <p className="text-[10px] font-bold uppercase text-blue-600 tracking-widest">Día Seleccionado</p>
                 <p className="text-lg font-black text-slate-900 mt-1">{getLocalDateFromISO(date).toLocaleDateString('es-AR', { dateStyle: 'full' })}</p>
              </div>
              <i className="fa-regular fa-calendar-check text-2xl text-blue-600"></i>
           </div>

           <div className="flex border border-slate-200">
              <button onClick={() => setMethod('mp')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${method === 'mp' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                <i className="fa-regular fa-credit-card"></i> Mercado Pago
              </button>
              <button onClick={() => setMethod('transfer')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${method === 'transfer' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                <i className="fa-solid fa-money-bill-transfer"></i> Transferencia
              </button>
           </div>

           {method === 'mp' ? (
             <div className="space-y-6 text-center">
               <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                  <div>
                     <p className="text-[10px] font-bold uppercase text-slate-400">Total a Pagar</p>
                     <p className="text-3xl font-black text-slate-900 leading-none">{formatARS(space.price)}</p>
                  </div>
               </div>
               
               <div className="space-y-2">
                 <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Aceptamos</p>
                 <div className="flex justify-center gap-4 text-2xl text-slate-400">
                    <i className="fa-brands fa-cc-visa"></i>
                    <i className="fa-brands fa-cc-mastercard"></i>
                    <i className="fa-brands fa-cc-amex"></i>
                 </div>
               </div>

               <button onClick={handlePayment} disabled={isProcessing} 
                  className="w-full bg-[#009EE3] text-white px-10 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#008ac7] transition-colors disabled:bg-slate-300 rounded-none shadow-lg">
                  {isProcessing ? 'Procesando...' : 'Pagar con Tarjeta'}
               </button>
             </div>
           ) : (
             <div className="text-center py-6 text-slate-500 text-xs uppercase font-bold">
               Seleccione Transferencia para ver los datos bancarios.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SpacePaymentModal;
