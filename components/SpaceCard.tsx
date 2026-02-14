
import React, { useState } from 'react';
import { Space, User } from '../types';
import { formatARS, calculateSpaceCostBreakdown, toLocalISOString, getLocalDateFromISO } from '../services/logic';
import SpacePaymentModal from './Payment/SpacePaymentModal';

interface SpaceCardProps {
  space: Space;
  user: User | null;
  isEditMode: boolean;
  onUpdate: (id: string, data: Partial<Space>) => void;
  onDelete: (id: string) => void;
  onBookSpace: (spaceId: string, date: string, finalPrice: number) => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({ space, user, isEditMode, onUpdate, onDelete, onBookSpace }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const images = space.images || ['https://images.unsplash.com/photo-1543823441-29651f0746aa?auto=format&fit=crop&q=80&w=1200'];

  // Lógica de Precios y Beneficios
  const breakdown = calculateSpaceCostBreakdown(space, user);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  const getDaysInMonth = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const days = getDaysInMonth(viewDate.getMonth(), viewDate.getFullYear());
  const today = new Date();
  today.setHours(0,0,0,0);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    if (date < today) return;
    const dateStr = toLocalISOString(date); // USO DE HELPER LOCAL
    if (space.availability?.includes(dateStr)) return;
    setSelectedDate(dateStr);
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImages = [...images, reader.result as string];
      onUpdate(space.id, { images: newImages });
      setCurrentImgIdx(newImages.length - 1);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (idx: number) => {
    if (images.length <= 1) return;
    const newImages = images.filter((_, i) => i !== idx);
    onUpdate(space.id, { images: newImages });
    setCurrentImgIdx(0);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm relative rounded-none overflow-hidden group/card hover:shadow-xl transition-all duration-500">
      
      {/* FULLSCREEN OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setIsFullscreen(false)} className="absolute top-8 right-8 text-white text-3xl z-[1010] hover:scale-125 transition-transform"><i className="fa-solid fa-xmark"></i></button>
          
          <img src={images[currentImgIdx]} className="max-w-full max-h-full object-contain" alt="Full Screen" />
          
          <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none">
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev - 1 + images.length) % images.length); }}
              className="w-16 h-16 bg-white/10 text-white flex items-center justify-center text-2xl hover:bg-white/20 transition-all pointer-events-auto rounded-full"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev + 1) % images.length); }}
              className="w-16 h-16 bg-white/10 text-white flex items-center justify-center text-2xl hover:bg-white/20 transition-all pointer-events-auto rounded-full"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          
          <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
            {images.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === currentImgIdx ? 'bg-white scale-125' : 'bg-white/30'}`}></div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* GALERÍA / CARRUSEL */}
        <div className="relative h-[500px] lg:h-auto bg-slate-900 overflow-hidden group/gallery">
          <img 
            src={images[currentImgIdx]} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-105 opacity-80" 
            alt={space.name} 
          />
          
          {/* BOTONES DE NAVEGACIÓN */}
          <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-500">
            <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev - 1 + images.length) % images.length); }} 
                className="w-12 h-12 bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all"
            >
                <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev + 1) % images.length); }} 
                className="w-12 h-12 bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all"
            >
                <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* BOTÓN PANTALLA COMPLETA */}
          <button 
            onClick={() => setIsFullscreen(true)}
            className="absolute top-6 right-6 w-12 h-12 bg-black/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-blue-600 transition-all z-20"
            title="Ver Pantalla Completa"
          >
            <i className="fa-solid fa-expand"></i>
          </button>

          {/* INDICADORES CARRUSEL */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, i) => (
                <button 
                    key={i} 
                    onClick={() => setCurrentImgIdx(i)}
                    className={`w-6 h-1 transition-all ${i === currentImgIdx ? 'bg-blue-500 w-10' : 'bg-white/30 hover:bg-white/60'}`}
                ></button>
            ))}
          </div>

          <div className="absolute bottom-14 left-10 text-white z-10 space-y-2 pr-10">
             <div className="flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-500"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Premium Location</span>
             </div>
             {isEditMode ? (
               <input 
                  className="text-4xl font-black uppercase tracking-tighter bg-blue-900/40 border-b border-dashed border-white outline-none w-full p-1"
                  value={space.name}
                  onChange={e => onUpdate(space.id, { name: e.target.value })}
               />
             ) : (
               <h3 className="text-5xl font-black uppercase tracking-tighter leading-none">{space.name}</h3>
             )}
          </div>

          {/* MODO EDICIÓN - GESTIÓN DE IMÁGENES */}
          {isEditMode && (
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-30 animate-in slide-in-from-left duration-300">
                <label className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                    <i className="fa-solid fa-plus"></i>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAddImage} />
                </label>
                <button 
                    onClick={() => handleRemoveImage(currentImgIdx)}
                    className="w-12 h-12 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                >
                    <i className="fa-solid fa-trash-can"></i>
                </button>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
        </div>

        {/* CONTENIDO Y CALENDARIO */}
        <div className="p-10 lg:p-14 space-y-12 flex flex-col justify-between">
          <div className="space-y-6">
             {isEditMode ? (
               <textarea 
                  className="w-full p-4 bg-slate-50 border border-dashed border-blue-400 text-slate-500 font-medium italic outline-none h-32"
                  value={space.description}
                  onChange={e => onUpdate(space.id, { description: e.target.value })}
               />
             ) : (
               <p className="text-slate-500 font-medium leading-relaxed text-base italic">"{space.description}"</p>
             )}
             
             {/* BENEFICIOS SOCIOS */}
             {breakdown.decorationPerk && (
                <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Beneficio {breakdown.memberTier}</p>
                        <p className="text-sm font-bold text-amber-900 uppercase">{breakdown.decorationPerk}</p>
                    </div>
                </div>
             )}

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacidad</p>
                   {isEditMode ? (
                     <input 
                        type="number"
                        className="bg-slate-50 border-b border-dashed border-slate-300 font-black text-sm w-full outline-none"
                        value={space.capacity}
                        onChange={e => onUpdate(space.id, { capacity: Number(e.target.value) })}
                     />
                   ) : (
                     <p className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2"><i className="fa-solid fa-user-group text-blue-600"></i> {space.capacity} PERSONAS</p>
                   )}
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Climatización</p>
                   <p className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2"><i className="fa-solid fa-snowflake text-blue-600"></i> AIRE CENTRAL</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conectividad</p>
                   <p className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2"><i className="fa-solid fa-wifi text-blue-600"></i> WIFI FIBRA</p>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 pb-6 gap-4">
                <div className="flex items-center gap-6">
                   <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center border border-slate-200 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900"><i className="fa-solid fa-chevron-left text-[10px]"></i></button>
                   <div className="text-center">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Periodo</p>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 min-w-[140px]">
                         {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                      </h4>
                   </div>
                   <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center border border-slate-200 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900"><i className="fa-solid fa-chevron-right text-[10px]"></i></button>
                </div>
                <div className="flex gap-4 text-[9px] font-black uppercase tracking-tighter">
                   <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-100 border border-red-200"></div> Reservado</span>
                   <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-slate-100 border border-slate-200"></div> Pasado</span>
                </div>
             </div>
             
             <div className="grid grid-cols-7 gap-1">
                {['D','L','M','X','J','V','S'].map(d => (
                    <div key={d} className="text-center text-[9px] font-black text-slate-300 py-2 uppercase">{d}</div>
                ))}
                
                {Array.from({ length: days[0].getDay() }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square"></div>
                ))}

                {days.map((date, i) => {
                  const dateStr = toLocalISOString(date); // USO DE HELPER LOCAL
                  const isOccupied = space.availability?.includes(dateStr);
                  const isPast = date < today;
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button 
                      key={i} 
                      disabled={isOccupied || isPast} 
                      onClick={() => handleDateClick(date)}
                      className={`aspect-square flex flex-col items-center justify-center text-[11px] font-black transition-all border relative ${
                        isPast ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed opacity-50 grayscale' :
                        isOccupied ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed' : 
                        isSelected ? 'bg-blue-600 text-white border-blue-700 z-10 scale-110 shadow-xl shadow-blue-500/20' : 
                        isToday ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-white text-slate-900 border-slate-100 hover:border-blue-400 hover:text-blue-600 hover:z-10'
                      }`}
                    >
                      {date.getDate()}
                      {isOccupied && !isPast && <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-red-400 rounded-full"></div>}
                      {isToday && !isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                    </button>
                  );
                })}
             </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-10 border-t border-slate-100">
             <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Costo de Jornada</p>
               {isEditMode ? (
                 <div className="flex items-center gap-2">
                    <span className="text-2xl font-black">$</span>
                    <input 
                        type="number"
                        className="bg-slate-50 border-b border-dashed border-slate-300 font-black text-4xl w-48 outline-none"
                        value={space.price}
                        onChange={e => onUpdate(space.id, { price: Number(e.target.value) })}
                    />
                 </div>
               ) : (
                 <div className="flex flex-col">
                    {breakdown.isDiscountApplied && (
                        <span className="text-sm font-bold text-slate-400 line-through decoration-red-500">{formatARS(breakdown.originalPrice)}</span>
                    )}
                    <p className={`text-4xl font-black tracking-tighter ${breakdown.isDiscountApplied ? 'text-blue-600' : 'text-slate-900'}`}>
                        {formatARS(breakdown.finalPrice)}
                    </p>
                    {breakdown.isDiscountApplied && (
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">
                            Quedan {breakdown.remainingUses} usos este mes
                        </p>
                    )}
                 </div>
               )}
             </div>
             <button disabled={!selectedDate} onClick={() => setShowPayment(true)}
               className="w-full sm:w-auto bg-slate-900 text-white px-12 py-6 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:bg-slate-100 disabled:text-slate-300 shadow-2xl shadow-slate-200 active:scale-95">
               {/* USO DE HELPER LOCAL PARA VISUALIZACIÓN EN BOTÓN */}
               {selectedDate ? `Reservar ${getLocalDateFromISO(selectedDate).toLocaleDateString('es-AR')}` : 'Selecciona un día'}
             </button>
          </div>
        </div>
      </div>

      {showPayment && selectedDate && (
        <SpacePaymentModal 
            space={{...space, price: breakdown.finalPrice}} // Pasar precio final calculado
            date={selectedDate} 
            user={user} 
            onClose={() => setShowPayment(false)}
            onSuccess={() => { onBookSpace(space.id, selectedDate, breakdown.finalPrice); setShowPayment(false); setSelectedDate(null); }} />
      )}
    </div>
  );
};

export default SpaceCard;
