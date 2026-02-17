
import React, { useState, useEffect } from 'react';
import { Tour } from '../../types';

interface TourEditorModalProps {
  tour?: Tour | null; // Si es null, es modo creación
  onSave: (tour: Tour) => void;
  onCancel: () => void;
}

const TourEditorModal: React.FC<TourEditorModalProps> = ({ tour, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Tour>>({
    id: `t-${Date.now()}`,
    destination: '',
    description: '',
    priceTicket: 0,
    priceLogistics: 0,
    price: 0,
    km: 0,
    capacity: 20,
    dates: {
      start: '',
      end: '',
      deadline: '',
      openAtMembers: '',
      openAtPublic: ''
    },
    images: [],
    itinerary: [''],
    status: 'OPEN'
  });

  useEffect(() => {
    if (tour) {
      setFormData(JSON.parse(JSON.stringify(tour))); // Deep copy
    }
  }, [tour]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (type: 'ticket' | 'logistics', value: number) => {
    // Evitar negativos
    const safeValue = Math.max(0, value);
    setFormData(prev => {
      const ticket = type === 'ticket' ? safeValue : (prev.priceTicket || 0);
      const logistics = type === 'logistics' ? safeValue : (prev.priceLogistics || 0);
      return {
        ...prev,
        priceTicket: ticket,
        priceLogistics: logistics,
        price: ticket + logistics
      };
    });
  };

  const handleItineraryChange = (index: number, value: string) => {
    const newItinerary = [...(formData.itinerary || [])];
    newItinerary[index] = value;
    setFormData(prev => ({ ...prev, itinerary: newItinerary }));
  };

  const addItineraryDay = () => {
    setFormData(prev => ({ ...prev, itinerary: [...(prev.itinerary || []), ''] }));
  };

  const removeItineraryDay = (index: number) => {
    const newItinerary = [...(formData.itinerary || [])];
    newItinerary.splice(index, 1);
    setFormData(prev => ({ ...prev, itinerary: newItinerary }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // VALIDACIÓN IMPORTANTE: Límite de 4MB para no saturar MySQL ni el navegador
      if (file.size > 4 * 1024 * 1024) {
          alert("La imagen es demasiado grande (Máx 4MB). Por favor, comprímela antes de subirla.");
          e.target.value = ''; // Reset input
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, images: [reader.result as string] }));
      };
      
      try {
        reader.readAsDataURL(file);
      } catch(err) {
        alert("Error al procesar la imagen.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination || !formData.destination.trim()) {
      alert("El destino es obligatorio.");
      return;
    }
    if (!formData.dates?.start) {
      alert("La fecha de salida es obligatoria.");
      return;
    }
    // Validación Fechas
    if (formData.dates.end && new Date(formData.dates.end) < new Date(formData.dates.start)) {
        alert("La fecha de regreso no puede ser anterior a la de salida.");
        return;
    }
    // Validación Precios
    if ((formData.price || 0) <= 0) {
        alert("El precio final del viaje debe ser mayor a 0.");
        return;
    }

    onSave(formData as Tour);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Gestor de Catálogo</p>
            <h3 className="text-xl font-black uppercase">{tour ? 'Editar Viaje' : 'Crear Nuevo Viaje'}</h3>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
          
          {/* 1. Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Destino del Viaje</label>
              <input 
                type="text" 
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 text-sm font-bold uppercase outline-none focus:border-blue-600 invalid:border-red-300"
                placeholder="Ej: Cataratas del Iguazú"
                value={formData.destination}
                onChange={e => handleChange('destination', e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Imagen de Portada</label>
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  {formData.images?.[0] && <img src={formData.images[0]} className="w-full h-full object-cover" />}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <p className="text-[9px] text-slate-400">Máximo 4MB. Se recomienda JPG optimizado.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descripción Comercial</label>
            <textarea 
              className="w-full p-4 bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:border-blue-600 h-24"
              placeholder="Describe la experiencia..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
            />
          </div>

          {/* 2. Logística y Fechas */}
          <div className="bg-slate-50 p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fecha de Salida</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-3 bg-white border border-slate-200 text-sm font-bold uppercase outline-none"
                  value={formData.dates?.start}
                  onChange={e => handleChange('dates', { ...formData.dates, start: e.target.value })}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Kilómetros (Total)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-3 bg-white border border-slate-200 text-sm font-bold uppercase outline-none"
                  value={formData.km}
                  onChange={e => handleChange('km', Math.max(0, Number(e.target.value)))}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cupo / Capacidad</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full p-3 bg-white border border-slate-200 text-sm font-bold uppercase outline-none"
                  value={formData.capacity}
                  onChange={e => handleChange('capacity', Math.max(1, Number(e.target.value)))}
                />
             </div>
          </div>

          {/* 3. Costos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Costo Logística</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 px-3">
                   <span className="font-bold text-slate-400">$</span>
                   <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 bg-transparent text-sm font-bold outline-none"
                    value={formData.priceLogistics}
                    onChange={e => handlePriceChange('logistics', Number(e.target.value))}
                  />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Valor Boleto (Desc.)</label>
                <div className="flex items-center bg-blue-50 border border-blue-100 px-3">
                   <span className="font-bold text-blue-400">$</span>
                   <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 bg-transparent text-sm font-bold outline-none text-blue-900"
                    value={formData.priceTicket}
                    onChange={e => handlePriceChange('ticket', Number(e.target.value))}
                  />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Precio Final</label>
                <div className="w-full p-3 bg-slate-900 text-white text-sm font-black text-center">
                   $ {formData.price}
                </div>
             </div>
          </div>

          {/* 4. Itinerario */}
          <div className="space-y-4">
             <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Itinerario Día por Día</label>
                <button type="button" onClick={addItineraryDay} className="text-[10px] font-black uppercase text-blue-600 hover:underline">+ Agregar Día</button>
             </div>
             {formData.itinerary?.map((day, index) => (
               <div key={index} className="flex gap-4 items-start animate-in slide-in-from-left-2 duration-300">
                  <span className="bg-slate-200 text-slate-600 px-3 py-3 text-xs font-bold uppercase min-w-[60px] text-center">Día {index + 1}</span>
                  <input 
                    type="text"
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:border-blue-600"
                    placeholder={`Actividad del día ${index + 1}...`}
                    value={day}
                    onChange={e => handleItineraryChange(index, e.target.value)}
                  />
                  <button type="button" onClick={() => removeItineraryDay(index)} className="p-3 text-red-400 hover:text-red-600">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
               </div>
             ))}
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-4 shrink-0">
           <button onClick={onCancel} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
           <button onClick={handleSubmit} className="px-8 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg">
             {tour ? 'Guardar Cambios' : 'Publicar Viaje'}
           </button>
        </div>

      </div>
    </div>
  );
};

export default TourEditorModal;
