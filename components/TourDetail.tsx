
import React, { useState } from 'react';
import { Tour, User } from '../types';
import { calculateTourCostBreakdown, formatARS } from '../services/logic';
import TourPaymentModal from './Payment/TourPaymentModal';

interface TourDetailProps {
  tour: Tour;
  user: User | null;
  onBack: () => void;
  onNavigateLogin: () => void;
  onBookTour?: (tour: Tour) => void;
}

const TourDetail: React.FC<TourDetailProps> = ({ tour, user, onBack, onNavigateLogin, onBookTour }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [pax, setPax] = useState<number>(1);

  // La fecha es FIJA y definida por el Administrador
  const startDate = tour.dates.start;
  const breakdown = calculateTourCostBreakdown(tour, user);
  
  const durationDays = tour.itinerary.length > 0 ? tour.itinerary.length : 1;
  
  const getEndDate = (start: string) => {
    if (!start) return '';
    const date = new Date(start);
    date.setDate(date.getDate() + (durationDays - 1));
    return date.toISOString().split('T')[0];
  };

  const endDate = getEndDate(startDate);
  const totalAmount = breakdown.finalTotal * pax;

  return (
    <div className="animate-in fade-in duration-300">
      {/* HERO SECTION */}
      <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={tour.images[0]} className="w-full h-full object-cover" alt={tour.destination} />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        <div className="absolute top-0 left-0 p-6 md:p-12 z-20">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-colors rounded-none"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-20 container mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex gap-2">
                 <span className="bg-blue-600 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-none">
                    {tour.km} KM Ida y Vuelta
                 </span>
                 {breakdown.isDiscountApplied && (
                   <span className="bg-amber-400 text-amber-950 px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-none">
                      <i className="fa-solid fa-crown"></i> Beneficio {breakdown.memberTier}
                   </span>
                 )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
                {tour.destination}
              </h1>
              <p className="text-lg text-slate-200 font-medium leading-relaxed">
                {tour.description}
              </p>
            </div>
            
            <div className="bg-black/30 backdrop-blur-md border border-white/10 p-6 text-white min-w-[280px] rounded-none">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Salida Confirmada</p>
              <div className="flex items-center gap-4">
                 <div className="text-5xl font-black">{new Date(startDate).getDate()}</div>
                 <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold uppercase">{new Date(startDate).toLocaleDateString('es-AR', {month: 'long'})}</span>
                    <span className="text-sm opacity-60">{new Date(startDate).getFullYear()}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* ITINERARIO */}
          <div className="lg:col-span-7 space-y-12">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-8 text-slate-900 border-b border-slate-200 pb-4">
                <i className="fa-solid fa-route text-blue-600 mr-3"></i> Itinerario del Viaje
              </h3>
              <div className="space-y-0 relative border-l border-slate-300 ml-2 pl-8 pb-4">
                {tour.itinerary.map((item, index) => (
                  <div key={index} className="mb-10 relative">
                    <div className="absolute -left-[37px] top-1.5 w-4 h-4 bg-blue-600 border-2 border-white rounded-none"></div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2 uppercase">Día {index + 1}</h4>
                    <p className="text-slate-600 font-medium leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 border border-slate-200 rounded-none">
               <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-slate-900">Servicios Incluidos</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {['Transporte 5 Estrellas', 'Coordinación Permanente', 'Seguro de Viajero', 'Refrigerio a Bordo', 'Guías Locales', 'Gestión de Entradas'].map((item, i) => (
                   <div key={i} className="flex items-center gap-3">
                     <i className="fa-solid fa-check text-green-600"></i>
                     <span className="text-xs font-bold text-slate-700 uppercase">{item}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* TARJETA DE RESERVA */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 bg-white border border-slate-200 p-8 shadow-sm rounded-none">
               
               <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-center border-b border-slate-100 pb-4">Detalles de Reserva</h3>

               <div className="space-y-6 mb-8">
                  {/* Fecha Fija Visual */}
                  <div className="bg-blue-50 border border-blue-100 p-6 flex flex-col justify-center items-center rounded-none text-center space-y-2">
                      <p className="text-[10px] font-bold uppercase text-blue-500 tracking-widest">Fecha de Salida</p>
                      <p className="text-2xl font-black text-blue-900 uppercase">
                         {new Date(startDate).toLocaleDateString('es-AR', {dateStyle: 'full'})}
                      </p>
                      <p className="text-xs font-bold text-slate-400 uppercase">Regreso: {new Date(endDate).toLocaleDateString('es-AR', {day: 'numeric', month: 'short'})}</p>
                  </div>

                  {/* Pasajeros */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest block">Pasajeros</label>
                     <div className="flex border border-slate-200 rounded-none">
                        <button 
                           onClick={() => setPax(Math.max(1, pax - 1))}
                           className="w-12 bg-slate-50 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                        >-</button>
                        <div className="flex-1 text-center py-3 font-black text-slate-900 bg-white">
                           {pax} <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">{pax === 1 ? 'Persona' : 'Personas'}</span>
                        </div>
                        <button 
                           onClick={() => setPax(Math.min(tour.capacity, pax + 1))}
                           className="w-12 bg-slate-50 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                        >+</button>
                     </div>
                     <p className="text-[9px] text-right font-bold text-slate-400 uppercase">Cupo Máximo: {tour.capacity}</p>
                  </div>
               </div>

               <div className="space-y-4 border-t border-slate-100 pt-6">
                 <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-bold uppercase">Precio por persona</span>
                    <span className="font-bold">{formatARS(breakdown.finalTotal)}</span>
                 </div>
                 
                 {breakdown.isDiscountApplied && (
                   <div className="flex justify-between items-center text-xs text-blue-600">
                      <span className="font-bold uppercase flex items-center gap-1"><i className="fa-solid fa-tag"></i> Descuento Socio</span>
                      <span className="font-bold">Aplicado</span>
                   </div>
                 )}

                 <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold uppercase text-slate-400">Total Final</p>
                    <p className="text-4xl font-black text-slate-900 leading-none tracking-tight">
                      {formatARS(totalAmount)}
                    </p>
                 </div>
               </div>
              
              {!user ? (
                <button 
                  onClick={onNavigateLogin}
                  className="mt-8 w-full bg-slate-900 text-white py-4 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors rounded-none"
                >
                  Iniciar Sesión para Reservar
                </button>
              ) : (
                <button 
                  onClick={() => setShowPayment(true)}
                  className="mt-8 w-full bg-blue-600 text-white py-4 font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 rounded-none"
                >
                  <i className="fa-solid fa-credit-card"></i> Reservar Ahora
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <TourPaymentModal 
          tour={tour} 
          breakdown={breakdown} 
          user={user}
          onClose={() => setShowPayment(false)}
          pax={pax}
          startDate={startDate}
          totalAmount={totalAmount}
          onSuccess={() => {
            onBookTour?.(tour);
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
};

export default TourDetail;
