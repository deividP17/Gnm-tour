
import React from 'react';
import { Tour, User } from '../types';
import { calculateTourCostBreakdown, formatARS } from '../services/logic';

interface TourListProps {
  tours: Tour[];
  user: User | null;
  onSelect: (tour: Tour) => void;
  isEditMode: boolean;
  onUpdateTour: (id: string, updates: Partial<Tour>) => void;
  onAddTour?: () => void;
  onDeleteTour?: (id: string) => void;
}

const TourList: React.FC<TourListProps> = ({ tours, user, onSelect, isEditMode, onUpdateTour, onAddTour, onDeleteTour }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tourId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpdateTour(tourId, { images: [reader.result as string] });
    reader.readAsDataURL(file);
  };

  return (
    <div className="row g-0 border-t border-l border-slate-200">
      {tours.map(tour => {
        const breakdown = calculateTourCostBreakdown(tour, user);
        
        return (
          <div key={tour.id} className="col-12 col-md-6 col-lg-4 border-r border-b border-slate-200">
            <div 
              onClick={() => !isEditMode && onSelect(tour)}
              className={`group bg-white flex flex-col h-full relative ${!isEditMode ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
            >
              
              {/* Imagen Editable */}
              <div className="relative h-64 overflow-hidden">
                <img src={tour.images[0]} className="w-full h-full object-cover" />
                
                {isEditMode && onDeleteTour && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteTour(tour.id); }}
                    className="absolute top-2 right-2 z-30 w-8 h-8 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 rounded-none"
                    title="Eliminar Viaje"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                )}

                {isEditMode && (
                  <label className="absolute inset-0 bg-blue-600/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, tour.id)} />
                    <span className="bg-white text-blue-600 px-3 py-1 text-[10px] font-bold uppercase rounded-none">Cambiar Foto</span>
                  </label>
                )}
                <div className="absolute top-0 left-0 bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-none">
                  {isEditMode ? (
                    <input type="number" className="bg-transparent w-12 outline-none text-white" value={tour.km} onChange={e => onUpdateTour(tour.id, { km: Number(e.target.value) })} />
                  ) : tour.km} km
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-4">
                   {isEditMode ? (
                     <input 
                      className="text-xl font-black text-slate-900 uppercase tracking-tight bg-slate-100 border border-slate-300 p-1 w-full rounded-none"
                      value={tour.destination}
                      onChange={e => onUpdateTour(tour.id, { destination: e.target.value })}
                     />
                   ) : (
                     <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight line-clamp-1">{tour.destination}</h3>
                   )}
                </div>
                
                <div className="flex-1">
                  {isEditMode ? (
                    <textarea 
                      className="text-sm text-slate-500 font-medium leading-relaxed bg-slate-100 border border-slate-300 p-2 w-full h-24 rounded-none"
                      value={tour.description}
                      onChange={e => onUpdateTour(tour.id, { description: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-8 leading-relaxed">{tour.description}</p>
                  )}
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-1 w-full">
                    {isEditMode ? (
                      <div className="space-y-2 w-full">
                        <div className="flex justify-between items-center bg-blue-50 p-2 border border-blue-100 rounded-none">
                           <span className="text-[9px] font-bold uppercase text-blue-600">Boleto (Desc)</span>
                           <input 
                            type="number"
                            className="bg-white w-20 text-right px-2 py-1 text-xs font-bold outline-none border border-blue-200 rounded-none"
                            value={tour.priceTicket}
                            onChange={e => {
                              const val = Number(e.target.value);
                              onUpdateTour(tour.id, { priceTicket: val, price: val + (tour.priceLogistics || 0) });
                            }}
                           />
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded-none">
                           <span className="text-[9px] font-bold uppercase text-slate-500">Logística</span>
                           <input 
                            type="number"
                            className="bg-white w-20 text-right px-2 py-1 text-xs font-bold outline-none border border-slate-200 rounded-none"
                            value={tour.priceLogistics}
                            onChange={e => {
                              const val = Number(e.target.value);
                              onUpdateTour(tour.id, { priceLogistics: val, price: val + (tour.priceTicket || 0) });
                            }}
                           />
                        </div>
                        <p className="text-[9px] text-right font-bold text-slate-400 uppercase">Total: {formatARS(tour.price)}</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {breakdown.isDiscountApplied ? 'Precio Socio' : 'Desde'}
                        </p>
                        <div className="flex flex-col">
                          {breakdown.isDiscountApplied && (
                            <span className="text-xs font-bold text-slate-400 line-through leading-none mb-1">{formatARS(breakdown.basePrice)}</span>
                          )}
                          <p className={`text-2xl font-black tracking-tight leading-none ${breakdown.isDiscountApplied ? 'text-blue-600' : 'text-slate-900'}`}>
                            {formatARS(breakdown.finalTotal)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditMode && (
                    <div className="w-10 h-10 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors rounded-none">
                      <i className="fa-solid fa-arrow-right"></i>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Botón Añadir Viaje */}
      {isEditMode && onAddTour && (
        <div className="col-12 col-md-6 col-lg-4 border-r border-b border-slate-200">
          <div 
            onClick={onAddTour}
            className="group bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center h-full min-h-[400px] cursor-pointer"
          >
            <div className="w-16 h-16 bg-white border border-slate-300 text-slate-400 flex items-center justify-center text-2xl mb-4 rounded-none">
              <i className="fa-solid fa-plus"></i>
            </div>
            <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Agregar Nuevo Viaje</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourList;
