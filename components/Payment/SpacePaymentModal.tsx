
import React, { useState, useEffect } from 'react';
import { Space, User, BankSettings } from '../../types';
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
  const [bankDetails, setBankDetails] = useState<BankSettings | null>(null);

  useEffect(() => {
    // Cargar datos bancarios al abrir el modal
    GNM_API.settings.getBank().then(setBankDetails);
  }, []);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const handleTransferNotification = () => {
     const dateStr = getLocalDateFromISO(date).toLocaleDateString('es-AR');
     const message = `Hola! Quiero confirmar mi reserva para el Quincho/Espacio: *${space.name}*.\n\n📅 Fecha: ${dateStr}\n💰 Total Transferido: ${formatARS(space.price)}\n\nAdjunto comprobante.`;
     const encoded = encodeURIComponent(message);
     window.open(`https://wa.me/543794532196?text=${encoded}`, '_blank');
     onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 rounded-none border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center rounded-none sticky top-0 z-10">
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
                 <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Aceptamos</p>
                 <div className="flex justify-center gap-4 text-2xl text-slate-400">
                    <i className="fa-brands fa-cc-visa"></i>
                    <i className="fa-brands fa-cc-mastercard"></i>
                    <i className="fa-brands fa-cc-amex"></i>
                 </div>
               </div>

               <button onClick={handlePayment} disabled={isProcessing} 
                  className="w-full bg-[#009EE3] text-white px-10 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#008ac7] transition-colors disabled:bg-slate-300 rounded-none shadow-lg">
                  {isProcessing ? 'Procesando...' : 'Pagar con Tarjeta o Saldo'}
               </button>
             </div>
           ) : (
             <div className="space-y-6 animate-in fade-in duration-300">
               {bankDetails ? (
                <>
                   <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-4">
                      <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Banco</p>
                          <p className="font-bold text-slate-900 uppercase">{bankDetails.bank}</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                          <div><p className="text-[9px] font-bold text-slate-500 uppercase">Titular</p><p className="font-bold text-slate-900 uppercase">{bankDetails.owner}</p></div>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                          <div><p className="text-[9px] font-bold text-slate-500 uppercase">Alias</p><p className="font-bold text-slate-900 uppercase">{bankDetails.alias}</p></div>
                          <button onClick={() => copyToClipboard(bankDetails.alias)} className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800">Copiar</button>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                          <div><p className="text-[9px] font-bold text-slate-500 uppercase">CBU</p><p className="font-bold text-slate-900">{bankDetails.cbu}</p></div>
                          <button onClick={() => copyToClipboard(bankDetails.cbu)} className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800">Copiar</button>
                      </div>
                   </div>
                   
                   <div className="bg-amber-50 border border-amber-200 p-4 text-[10px] font-bold text-amber-800 uppercase rounded-none text-center">
                      IMPORTANTE: Envía el comprobante para confirmar tu fecha.
                   </div>
                   
                   <button onClick={handleTransferNotification} className="w-full bg-green-600 text-white py-5 font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-colors rounded-none shadow-lg">
                      <i className="fa-brands fa-whatsapp mr-2"></i> Notificar Pago y Reservar
                   </button>
                </>
               ) : (
                 <div className="text-center py-10">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold uppercase text-slate-400 mt-4">Cargando datos bancarios...</p>
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SpacePaymentModal;
