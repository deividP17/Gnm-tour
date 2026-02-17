
import React, { useState, useEffect } from 'react';
import { Tour, Space, User, MembershipTier, SiteAsset, BankSettings } from '../../types';
import { formatARS, toLocalISOString } from '../../services/logic'; 
import { GNM_API } from '../../services/api';
import { MEMBERSHIP_CONFIG } from '../../constants';

interface AdminDashboardProps {
  tours: Tour[];
  spaces: Space[];
  onAddTour: (tour: Tour) => void;
  onDeleteTour: (id: string) => void;
  onUpdateSpace: (id: string, updates: Partial<Space>) => void;
  onRefreshAssets?: () => void; // Callback para avisar a App.tsx que recargue imágenes
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tours, spaces, onAddTour, onDeleteTour, onUpdateSpace, onRefreshAssets }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'media' | 'spaces_control' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);

  const [adminViewDate, setAdminViewDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'users') {
          const data = await GNM_API.users.getAll();
          setUsers(data);
        } else if (activeTab === 'media') {
          const data = await GNM_API.assets.getAll();
          setAssets(data);
        } else if (activeTab === 'settings') {
          const data = await GNM_API.settings.getBank();
          setBankSettings(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  const handleSaveSettings = async () => {
    if (!bankSettings) return;
    setIsLoading(true);
    try {
        await GNM_API.settings.updateBank(bankSettings);
        alert('Configuración maestra guardada correctamente.');
    } catch (e) {
        alert('Error al guardar configuración.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateUserTier = (userId: string, newTier: MembershipTier) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          membership: {
            ...(u.membership || { usedThisMonth: 0, validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }),
            tier: newTier,
            cancellationReason: undefined
          }
        };
      }
      return u;
    }));
    if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { 
            ...prev, 
            membership: { 
                ...(prev.membership || { usedThisMonth: 0, validUntil: "" }), 
                tier: newTier,
                cancellationReason: undefined
            } 
        } : null);
    }
  };

  const toggleSpaceDate = (spaceId: string, date: string) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;
    const currentDates = space.availability || [];
    const newDates = currentDates.includes(date) 
      ? currentDates.filter(d => d !== date)
      : [...currentDates, date];
    onUpdateSpace(spaceId, { availability: newDates });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, assetId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de seguridad de archivo
    if (!file.type.startsWith('image/')) {
        alert("Solo se permiten archivos de imagen.");
        return;
    }
    // Límite de 4MB para consistencia y seguridad
    if (file.size > 4 * 1024 * 1024) { 
        alert("La imagen es demasiado grande. Máximo 4MB para asegurar la estabilidad.");
        return;
    }

    setUploadingAssetId(assetId);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64Url = reader.result as string;
        
        try {
            // 1. Actualizar estado local para feedback inmediato
            setAssets(assets.map(a => a.id === assetId ? { ...a, url: base64Url } : a));
            
            // 2. Guardar en Backend (CRÍTICO)
            await GNM_API.assets.update(assetId, base64Url);
            
            // 3. Avisar a la App principal para que actualice la imagen de fondo
            if (onRefreshAssets) onRefreshAssets();

        } catch (error) {
            console.error("Error al subir imagen:", error);
            alert("Error al guardar la imagen en el servidor.");
        } finally {
            setUploadingAssetId(null);
        }
    };
    reader.readAsDataURL(file);
  };

  const getDaysInMonth = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const adminDays = getDaysInMonth(adminViewDate.getMonth(), adminViewDate.getFullYear());
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const UserFicha = ({ user }: { user: User }) => {
    return (
      <div className="space-y-8 animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center">
            <button onClick={() => setSelectedUser(null)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-arrow-left"></i> Volver a Socios
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">ID: {user.id}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-8 border border-slate-200 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-900 text-white flex items-center justify-center text-4xl font-bold mb-4">{user.name.charAt(0)}</div>
            <h3 className="text-xl font-black uppercase text-slate-900">{user.name}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 mb-6">{user.email}</p>
            
            <div className="w-full pt-6 border-t border-slate-200 space-y-4">
               <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Gestión de Membresía</p>
               <div className="grid grid-cols-1 gap-2">
                  {Object.values(MembershipTier).map(tier => (
                    <button 
                      key={tier}
                      onClick={() => handleUpdateUserTier(user.id, tier)}
                      className={`py-3 text-[9px] font-black uppercase tracking-widest border transition-all ${user.membership?.tier === tier ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-600'}`}
                    >
                      {tier}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-slate-200 p-8">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 border-b pb-4">Historial de Reservas</h4>
               <div className="space-y-4">
                  {/* VIAJES */}
                  {user.travelHistory?.map(trip => (
                    <div key={trip.id} className={`flex justify-between items-center p-5 border text-xs ${trip.status === 'CANCELLED' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center text-lg ${trip.status === 'CANCELLED' ? 'text-red-300' : 'text-blue-300'}`}>
                             <i className="fa-solid fa-bus"></i>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 uppercase">{trip.destination}</p>
                            <p className="text-slate-400 mt-0.5">{trip.date} • {trip.pax} Pax</p>
                            {trip.cancellationReason && (
                              <p className="text-[9px] text-red-500 font-bold uppercase mt-1">CANCELADO: {trip.cancellationReason}</p>
                            )}
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-slate-900">{formatARS(trip.totalPaid)}</p>
                          <span className={`text-[8px] font-black uppercase px-3 py-1 mt-1 inline-block ${trip.status === 'CANCELLED' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{trip.status}</span>
                       </div>
                    </div>
                  ))}
                  
                  {/* ESPACIOS */}
                  {user.spaceBookings?.map(sb => (
                     <div key={sb.id} className={`flex justify-between items-center p-5 border text-xs ${sb.status === 'CANCELLED' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 flex items-center justify-center text-lg ${sb.status === 'CANCELLED' ? 'text-red-300' : 'text-amber-500'}`}>
                              <i className="fa-solid fa-house-chimney"></i>
                           </div>
                           <div>
                             <p className="font-bold text-slate-900 uppercase">{sb.spaceName}</p>
                             <p className="text-slate-400 mt-0.5">{sb.date}</p>
                             {sb.cancellationReason && (
                               <p className="text-[9px] text-red-500 font-bold uppercase mt-1">CANCELADO: {sb.cancellationReason}</p>
                             )}
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-900">{formatARS(sb.price)}</p>
                           <span className={`text-[8px] font-black uppercase px-3 py-1 mt-1 inline-block ${sb.status === 'CANCELLED' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{sb.status}</span>
                        </div>
                     </div>
                  ))}

                  {(!user.travelHistory?.length && !user.spaceBookings?.length) && <p className="text-center text-slate-300 py-10 font-bold uppercase text-[10px]">Sin reservas registradas</p>}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm min-h-[700px]">
      {/* NAVBAR ADMIN */}
      <div className="flex flex-col md:flex-row bg-slate-900 text-white">
        <div className="p-8 border-r border-slate-800 min-w-[240px] flex items-center justify-between md:block">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Panel Maestro</p>
              <h3 className="text-xl font-black italic uppercase">GNM ADMIN</h3>
           </div>
           <i className="fa-solid fa-shield-halved text-2xl text-slate-700 md:mt-4 md:block"></i>
        </div>
        <div className="flex flex-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'users', label: 'Socios', icon: 'fa-users' },
            { id: 'media', label: 'Media', icon: 'fa-images' },
            { id: 'spaces_control', label: 'Espacios', icon: 'fa-calendar-check' },
            { id: 'settings', label: 'Ajustes', icon: 'fa-gears' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id as any); setSelectedUser(null); }} 
              className={`flex-1 min-w-[140px] py-8 text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${activeTab === tab.id ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <i className={`fa-solid ${tab.icon} text-lg`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 md:p-12">
        {isLoading && (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando con Servidor GNM...</p>
            </div>
        )}
        
        {!isLoading && activeTab === 'users' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {selectedUser ? <UserFicha user={selectedUser} /> : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                   <div>
                      <h2 className="text-3xl font-black uppercase italic leading-none">Auditoría de Socios</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gestiona la base de datos de usuarios y membresías.</p>
                   </div>
                   <div className="relative w-full md:w-72">
                      <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre o email..." 
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase outline-none focus:border-blue-600 transition-colors" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                      />
                   </div>
                </div>

                <div className="border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-6 py-5">Nombre y Contacto</th>
                        <th className="px-6 py-5">Nivel Membresía</th>
                        <th className="px-6 py-5">Alertas / Estado</th>
                        <th className="px-6 py-5 text-right">Gestión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 text-xs transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase">{u.name.charAt(0)}</div>
                               <div>
                                  <p className="font-black text-slate-900 uppercase">{u.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold">{u.email}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                             <span className={`px-3 py-1 font-black uppercase text-[8px] border ${u.membership?.tier === 'ELITE' ? 'bg-slate-900 text-white border-slate-900' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{u.membership?.tier || 'NONE'}</span>
                          </td>
                          <td className="px-6 py-5">
                             {u.membership?.cancellationReason ? (
                               <span className="flex items-center gap-1.5 text-red-600 font-black uppercase text-[8px] animate-pulse">
                                 <i className="fa-solid fa-triangle-exclamation"></i> Solicita Baja
                               </span>
                             ) : (
                               <span className="text-slate-300 text-[9px] font-bold uppercase flex items-center gap-1.5">
                                 <i className="fa-solid fa-circle-check text-green-500"></i> Al día
                               </span>
                             )}
                          </td>
                          <td className="px-6 py-5 text-right">
                             <button onClick={() => setSelectedUser(u)} className="bg-slate-900 text-white px-5 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Ver Ficha</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'media' && (
            <div className="space-y-6">
                <h2 className="text-3xl font-black uppercase italic">Biblioteca de Medios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {assets.map(asset => (
                        <div key={asset.id} className="bg-white border border-slate-200 p-6 space-y-6 shadow-sm group">
                            <div className="relative aspect-video bg-slate-100 overflow-hidden border border-slate-200">
                                <img src={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={asset.label} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black uppercase text-xs text-slate-900">{asset.label}</h4>
                            </div>
                            <label className={`block w-full text-center text-white py-4 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors ${uploadingAssetId === asset.id ? 'bg-blue-400' : 'bg-slate-900 hover:bg-blue-600'}`}>
                                <i className={`fa-solid ${uploadingAssetId === asset.id ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`}></i> 
                                {uploadingAssetId === asset.id ? 'Guardando...' : 'Subir Nueva Foto'}
                                <input type="file" className="hidden" accept="image/*" disabled={uploadingAssetId === asset.id} onChange={(e) => handleFileUpload(e, asset.id)} />
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {!isLoading && activeTab === 'spaces_control' && (
          <div className="space-y-12 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-50 p-10 border border-slate-200">
                <div className="space-y-2">
                   <h2 className="text-3xl font-black uppercase italic leading-none">Ocupación Mensual</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control maestro de fechas.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-3 border border-slate-200 shadow-sm">
                   <button onClick={() => setAdminViewDate(new Date(adminViewDate.getFullYear(), adminViewDate.getMonth() - 1, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 transition-colors"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                   <p className="text-sm font-black uppercase tracking-widest min-w-[180px] text-center text-slate-900">{monthNames[adminViewDate.getMonth()]} {adminViewDate.getFullYear()}</p>
                   <button onClick={() => setAdminViewDate(new Date(adminViewDate.getFullYear(), adminViewDate.getMonth() + 1, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 transition-colors"><i className="fa-solid fa-chevron-right text-xs"></i></button>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {spaces.map(space => (
                  <div key={space.id} className="bg-white border border-slate-200 p-10 shadow-sm">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                        <h3 className="text-xl font-black uppercase flex items-center gap-3">
                          <i className="fa-solid fa-building-user text-blue-600"></i> {space.name}
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1.5">
                      {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-300 py-3 uppercase">{d}</div>)}
                      {Array.from({ length: adminDays[0].getDay() }).map((_, i) => <div key={i} className="aspect-square"></div>)}
                      {adminDays.map((date, i) => {
                        const dateStr = toLocalISOString(date); 
                        const isOccupied = space.availability?.includes(dateStr);
                        return (
                          <button 
                            key={i} 
                            onClick={() => toggleSpaceDate(space.id, dateStr)}
                            className={`aspect-square flex flex-col items-center justify-center text-[11px] font-black border transition-all relative ${
                              isOccupied ? 'bg-red-500 text-white border-red-600 z-10 shadow-lg' : 'bg-white text-slate-900 border-slate-100 hover:border-blue-400 hover:text-blue-600'
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {!isLoading && activeTab === 'settings' && bankSettings && (
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
             <div className="text-center space-y-2">
                <i className="fa-solid fa-sliders text-4xl text-blue-600 mb-4"></i>
                <h2 className="text-3xl font-black uppercase italic leading-none">Configuración Maestra GNM</h2>
             </div>
             
             <div className="bg-slate-50 p-10 md:p-14 border border-slate-200 space-y-10 shadow-sm">
                
                {/* CONFIGURACIÓN DE CANCELACIONES */}
                <div className="bg-white border border-slate-200 p-8 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3 text-red-600">
                        <i className="fa-solid fa-clock-rotate-left text-2xl"></i>
                        <h4 className="font-black uppercase tracking-tight text-lg">Política de Reembolso</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                        Define con cuántas horas de anticipación se permite cancelar recibiendo el 100% del dinero.
                        Si cancelan después de este límite (último momento), recibirán el 50% y tú te quedas con el resto.
                    </p>
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" 
                            min="0"
                            className="w-24 p-3 border border-slate-300 font-black text-center text-lg outline-none focus:border-red-600"
                            value={bankSettings.cancellationHours || 72}
                            onChange={(e) => setBankSettings({...bankSettings, cancellationHours: Number(e.target.value)})}
                        />
                        <span className="text-xs font-bold uppercase text-slate-700">Horas (Equivale a {((bankSettings.cancellationHours || 72) / 24).toFixed(1)} días)</span>
                    </div>
                </div>

                {/* SUBSCRIPTION LINKS */}
                <div className="bg-white border border-blue-200 p-8 space-y-6 shadow-sm">
                   <h4 className="font-black uppercase tracking-tight text-lg text-blue-700">Links de Suscripción</h4>
                   <div className="grid grid-cols-1 gap-6">
                      {[MembershipTier.BASICO, MembershipTier.INTERMEDIO, MembershipTier.PLUS, MembershipTier.ELITE].map(tier => (
                           <div key={tier} className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-slate-500">Plan {tier}</label>
                              <input 
                                type="text" 
                                value={bankSettings.subscriptionLinks?.[tier] || ''}
                                className="w-full p-3 bg-slate-50 border border-slate-200 text-xs outline-none focus:bg-white transition-colors"
                                onChange={(e) => setBankSettings({
                                   ...bankSettings,
                                   subscriptionLinks: { ...(bankSettings.subscriptionLinks || {}), [tier]: e.target.value }
                                })}
                              />
                           </div>
                      ))}
                   </div>
                </div>

                {/* DATOS BANCARIOS */}
                <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm">
                   <h4 className="font-black uppercase tracking-tight text-lg text-slate-900 border-b pb-2">Datos Bancarios para Transferencias</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Titular de Cuenta</label>
                        <input type="text" value={bankSettings.owner} className="w-full p-4 bg-slate-50 border border-slate-200 text-xs font-black uppercase outline-none focus:bg-white transition-colors" onChange={(e) => setBankSettings({...bankSettings, owner: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Banco</label>
                        <input type="text" value={bankSettings.bank} className="w-full p-4 bg-slate-50 border border-slate-200 text-xs font-black uppercase outline-none focus:bg-white transition-colors" onChange={(e) => setBankSettings({...bankSettings, bank: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Alias</label>
                        <input type="text" value={bankSettings.alias} className="w-full p-4 bg-slate-50 border border-slate-200 text-xs font-black uppercase outline-none focus:bg-white transition-colors" onChange={(e) => setBankSettings({...bankSettings, alias: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CBU / CVU</label>
                        <input type="text" value={bankSettings.cbu} className="w-full p-4 bg-slate-50 border border-slate-200 text-xs font-black uppercase outline-none focus:bg-white transition-colors" onChange={(e) => setBankSettings({...bankSettings, cbu: e.target.value})} />
                    </div>
                   </div>
                </div>

                <div className="pt-6">
                    <button 
                      onClick={handleSaveSettings}
                      className="w-full bg-slate-900 text-white py-6 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-300"
                    >
                      Sincronizar Ajustes Maestro
                    </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
