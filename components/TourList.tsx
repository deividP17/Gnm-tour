
import React, { useState } from 'react';
import { Tour, User } from '../types';
import { calculateTourCostBreakdown, formatARS } from '../services/logic';
import TourEditorModal from './Admin/TourEditorModal';

interface TourListProps {
  tours: Tour[];
  user: User | null;
  onSelect: (tour: Tour) => void;
  isEditMode: boolean;
  onUpdateTour: (id: string, updates: Partial<Tour>) => void;
  onAddTour?: (tour: Tour) => void; // Actualizado para recibir el tour completo
  onDeleteTour?: (id: string) => void;
}

const TourList: React.FC<TourListProps> = ({ tours, user, onSelect, isEditMode, onUpdateTour, onAddTour, onDeleteTour }) => {
  const [editingTour, setEditingTour] = useState<Tour | null | undefined>(undefined); // undefined = cerrado, null = nuevo, objeto = editar

  const handleSaveModal = (tourData: Tour) => {
    if (editingTour === null && onAddTour) {
      // Creando nuevo
      onAddTour(tourData);
    } else {
      // Editando existente
      onUpdateTour(tourData.id, tourData);
    }
    setEditingTour(undefined);
  };

  return (
    <>
      <div className="row g-0 border-t border-l border-slate-200">
        {tours.map(tour => {
          const breakdown = calculateTourCostBreakdown(tour, user);
          
          return (
            <div key={tour.id} className="col-12 col-md-6 col-lg-4 border-r border-b border-slate-200">
              <div 
                onClick={() => isEditMode ? setEditingTour(tour) : onSelect(tour)}
                className={`group bg-white flex flex-col h-full relative ${!isEditMode ? 'cursor-pointer hover:bg-slate-50 transition-colors' : 'cursor-pointer ring-inset hover:ring-2 ring-blue-500 transition-all'}`}
              >
                
                {/* Imagen */}
                <div className="relative h-64 overflow-hidden">
                  <img src={tour.images[0]} className="w-full h-full object-cover" />
                  
                  {isEditMode && onDeleteTour && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteTour(tour.id); }}
                      className="absolute top-2 right-2 z-30 w-8 h-8 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 rounded-none shadow-md"
                      title="Eliminar Viaje"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  )}

                  {isEditMode && (
                     <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white text-blue-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg">Editar Viaje</span>
                     </div>
                  )}

                  <div className="absolute top-0 left-0 bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-none">
                    {tour.km} km
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-4">
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight line-clamp-1">{tour.destination}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          <i className="fa-regular fa-calendar mr-1"></i> Salida: {new Date(tour.dates.start).toLocaleDateString('es-AR')}
                       </p>
                  </div>
                  
                  <div className="flex-1">
                      <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-8 leading-relaxed">{tour.description}</p>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="space-y-1 w-full">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {breakdown.isDiscountApplied ? 'Precio Socio' : 'Precio Final'}
                        </p>
                        <div className="flex flex-col">
                          {breakdown.isDiscountApplied && (
                            <span className="text-xs font-bold text-slate-400 line-through leading-none mb-1">{formatARS(breakdown.basePrice)}</span>
                          )}
                          <p className={`text-2xl font-black tracking-tight leading-none ${breakdown.isDiscountApplied ? 'text-blue-600' : 'text-slate-900'}`}>
                            {formatARS(breakdown.finalTotal)}
                          </p>
                        </div>
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
              onClick={() => setEditingTour(null)}
              className="group bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center h-full min-h-[400px] cursor-pointer"
            >
              <div className="w-16 h-16 bg-white border border-slate-300 text-slate-400 flex items-center justify-center text-2xl mb-4 rounded-none shadow-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-plus"></i>
              </div>
              <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Agregar Nuevo Viaje</span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDITOR */}
      {editingTour !== undefined && (
        <TourEditorModal 
          tour={editingTour} 
          onSave={handleSaveModal} 
          onCancel={() => setEditingTour(undefined)} 
        />
      )}
    </>
  );
};

export default TourList;
