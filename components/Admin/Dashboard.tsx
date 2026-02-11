
import React, { useState, useEffect, useRef } from 'react';
import { Tour, Space, User, MembershipTier, SiteAsset, BankSettings } from '../../types';
import { formatARS } from '../../services/logic';
import { GNM_API } from '../../services/api';
import { MEMBERSHIP_CONFIG } from '../../constants';

interface AdminDashboardProps {
  tours: Tour[];
  spaces: Space[];
  onAddTour: (tour: Tour) => void;
  onDeleteTour: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tours, spaces, onAddTour, onDeleteTour }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'media' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'USER' as 'USER' | 'ADMIN' });

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

  const handleUpdateUserStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUsers(users.map(u => u.id === id ? { ...u, status: nextStatus as any } : u));
    alert(`Estado de usuario actualizado a: ${nextStatus}`);
  };

  const handleChangeUserPlan = async (id: string, tier: MembershipTier) => {
    setUsers(users.map(u => u.id === id ? { 
      ...u, 
      membership: { tier, validUntil: '2027-01-01', usedThisMonth: 0 } 
    } : u));
    alert(`Plan del usuario cambiado a: ${tier}`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `u-${Math.random().toString(36).substr(2, 9)}`;
    const createdUser: User = {
      id,
      ...newUser,
      status: 'ACTIVE',
      verificationStatus: 'NONE',
      isOnline: false,
      credits: 0,
      tripsCount: 0,
      isVerified: false,
      lastConnection: 'Nunca',
      membership: { tier: MembershipTier.NONE, validUntil: '', usedThisMonth: 0 }
    };
    setUsers([createdUser, ...users]);
    setShowAddUserModal(false);
    setNewUser({ name: '', email: '', role: 'USER' });
    alert('Usuario creado correctamente.');
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario? Esta acción es irreversible.')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleSaveBankSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankSettings) return;
    if (bankSettings.cbu.length !== 22) {
      alert('El CBU debe tener exactamente 22 dígitos.');
      return;
    }
    setIsLoading(true);
    await GNM_API.settings.updateBank(bankSettings);
    setIsLoading(false);
    alert('Configuración actualizada correctamente.');
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm min-h-[600px] rounded-none">
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row bg-slate-900 text-white border-b border-slate-800">
         <div className="p-8 md:p-10 flex items-center gap-6 border-b md:border-b-0 md:border-r border-slate-700">
            <div className="w-12 h-12 bg-blue-600 flex items-center justify-center text-xl rounded-none">
              <i className="fa-solid fa-gauge-high"></i>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Panel Maestro</p>
              <h3 className="text-xl font-bold tracking-tight">GNM CORE v3.0</h3>
            </div>
         </div>
         <div className="flex flex-1 overflow-x-auto">
           {(['users', 'media', 'settings'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 min-w-[140px] py-8 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors rounded-none ${
                 activeTab === tab ? 'bg-white text-slate-900 border-t-4 border-blue-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'
               }`}
             >
               <i className={`fa-solid ${tab === 'users' ? 'fa-users-gear' : tab === 'media' ? 'fa-images' : 'fa-building-columns'} mb-2 block text-lg`}></i>
               {tab === 'users' ? 'Socios & Acceso' : tab === 'media' ? 'Multimedia' : 'Cobros & CBU'}
             </button>
           ))}
         </div>
      </div>

      <div className="p-6 md:p-12">
        {isLoading ? (
          <div className="py-20 text-center animate-pulse">
            <i className="fa-solid fa-spinner animate-spin text-4xl text-blue-600 mb-4"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sincronizando base de datos...</p>
          </div>
        ) : (
          <>
            {/* VISTA DE USUARIOS */}
            {activeTab === 'users' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                   <div>
                     <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Gestión de Socios</h2>
                     <p className="text-slate-500 font-medium text-sm mt-1">Administra roles, suspende accesos o cambia planes de suscripción.</p>
                   </div>
                   <div className="flex flex-wrap gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                          type="text" 
                          placeholder="Buscar por nombre..." 
                          className="w-full bg-white border border-slate-300 pl-10 pr-6 py-3 text-xs font-bold outline-none focus:border-blue-600 transition-colors rounded-none"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={() => setShowAddUserModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-3 rounded-none"
                      >
                         <i className="fa-solid fa-plus"></i> Nuevo Socio
                      </button>
                   </div>
                </div>

                <div className="overflow-x-auto border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <th className="px-6 py-4">Identidad</th>
                        <th className="px-6 py-4">Consumo</th>
                        <th className="px-6 py-4">Membresía</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(u => {
                        const tier = u.membership?.tier || MembershipTier.NONE;
                        const config = tier !== MembershipTier.NONE ? MEMBERSHIP_CONFIG[tier] : null;
                        const used = u.membership?.usedThisMonth || 0;
                        const limit = config ? config.kmLimit : 0;
                        
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 flex items-center justify-center font-bold uppercase text-sm rounded-none ${u.role === 'ADMIN' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{u.name.charAt(0)}</div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm mb-0.5">{u.name}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500 uppercase">{u.email}</span>
                                      {u.role === 'ADMIN' && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-none">Admin</span>}
                                    </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="text-xs font-medium">
                                 <p className="font-bold text-slate-900">{u.tripsCount || 0} Viajes</p>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className="w-20 h-1.5 bg-slate-200 rounded-none overflow-hidden">
                                       <div className="h-full bg-blue-600" style={{ width: limit > 0 ? `${Math.min((used/limit)*100, 100)}%` : '0%' }}></div>
                                    </div>
                                    <span className="text-[10px] text-slate-500">{used}/{limit} km</span>
                                 </div>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                className="bg-white border border-slate-300 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 outline-none focus:border-blue-600 rounded-none cursor-pointer"
                                value={u.membership?.tier || MembershipTier.NONE}
                                onChange={(e) => handleChangeUserPlan(u.id, e.target.value as MembershipTier)}
                              >
                                  <option value={MembershipTier.NONE}>Sin Plan</option>
                                  <option value={MembershipTier.BASICO}>Básico</option>
                                  <option value={MembershipTier.INTERMEDIO}>Intermedio</option>
                                  <option value={MembershipTier.PLUS}>Plus</option>
                                  <option value={MembershipTier.ELITE}>Elite</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => handleUpdateUserStatus(u.id, u.status)}
                                    className={`w-8 h-8 flex items-center justify-center transition-colors border rounded-none ${u.status === 'ACTIVE' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                    title={u.status === 'ACTIVE' ? 'Suspender Socio' : 'Habilitar Socio'}
                                  >
                                    <i className={`fa-solid ${u.status === 'ACTIVE' ? 'fa-ban' : 'fa-check'}`}></i>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="w-8 h-8 border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded-none"
                                    title="Eliminar permanentemente"
                                  >
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                  </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA DE COBROS Y CBU */}
            {activeTab === 'settings' && bankSettings && (
              <div className="max-w-3xl mx-auto space-y-10 py-8 animate-in fade-in duration-300">
                <div className="text-center space-y-2 border-b border-slate-200 pb-8">
                   <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Pasarela de Recepción</h2>
                   <p className="text-slate-500 font-medium">Configura Mercado Pago y los datos de transferencia.</p>
                </div>

                <form onSubmit={handleSaveBankSettings} className="bg-white border border-slate-200 p-8 md:p-12 space-y-8 shadow-sm rounded-none">
                   
                   <div className="bg-blue-50/50 p-6 border border-blue-100 space-y-3 rounded-none">
                      <div className="flex items-center gap-2">
                         <i className="fa-solid fa-bolt text-blue-600"></i>
                         <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Integración Mercado Pago</p>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                        <p>Access Token (APP_USR...):</p>
                      </div>
                      <input 
                        type="password" 
                        placeholder="APP_USR-..." 
                        className="w-full bg-white border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 font-bold text-slate-700 transition-colors rounded-none" 
                        value={bankSettings.mpAccessToken || ''} 
                        onChange={e => setBankSettings({...bankSettings, mpAccessToken: e.target.value})} 
                      />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Titular de Cuenta</label>
                         <input required type="text" className="w-full bg-white border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 font-bold uppercase transition-colors rounded-none" value={bankSettings.owner} onChange={e => setBankSettings({...bankSettings, owner: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">CUIT / CUIL</label>
                         <input required type="text" className="w-full bg-white border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 font-bold transition-colors rounded-none" value={bankSettings.cuit} onChange={e => setBankSettings({...bankSettings, cuit: e.target.value})} />
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Entidad / Banco</label>
                      <input required type="text" className="w-full bg-white border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 font-bold transition-colors rounded-none" value={bankSettings.bank} onChange={e => setBankSettings({...bankSettings, bank: e.target.value})} />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">CBU (22 Dígitos)</label>
                         <input required type="text" maxLength={22} minLength={22} className="w-full bg-white border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 font-bold transition-colors tracking-widest rounded-none" value={bankSettings.cbu} onChange={e => setBankSettings({...bankSettings, cbu: e.target.value.replace(/\D/g, '')})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Alias GNM</label>
                         <input required type="text" className="w-full bg-white border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 font-bold uppercase transition-colors rounded-none" value={bankSettings.alias} onChange={e => setBankSettings({...bankSettings, alias: e.target.value})} />
                      </div>
                   </div>

                   <button type="submit" className="w-full bg-slate-900 text-white py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-colors rounded-none">
                      <i className="fa-solid fa-floppy-disk mr-3"></i> Guardar Cambios
                   </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL AGREGAR USUARIO */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddUserModal(false)}></div>
           <form onSubmit={handleCreateUser} className="relative bg-white w-full max-w-lg p-10 space-y-8 animate-in zoom-in duration-200 shadow-xl rounded-none">
              <div className="text-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Nuevo Socio</h3>
                 <p className="text-slate-500 font-medium text-xs mt-1 uppercase tracking-widest">Registro Manual</p>
              </div>

              <div className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</label>
                    <input required className="w-full bg-white border border-slate-300 px-4 py-3 font-bold outline-none focus:border-blue-600 rounded-none" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Ej: Maria Elena" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Email Oficial</label>
                    <input required type="email" className="w-full bg-white border border-slate-300 px-4 py-3 font-bold outline-none focus:border-blue-600 rounded-none" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="maria@email.com" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Rol del Usuario</label>
                    <select className="w-full bg-white border border-slate-300 px-4 py-3 font-bold outline-none focus:border-blue-600 rounded-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                       <option value="USER">Cliente / Socio</option>
                       <option value="ADMIN">Administrador</option>
                    </select>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button type="button" onClick={() => setShowAddUserModal(false)} className="flex-1 py-4 font-bold text-[10px] uppercase text-slate-500 hover:text-slate-800 transition-colors rounded-none">Cancelar</button>
                 <button type="submit" className="flex-2 bg-blue-600 text-white px-8 py-4 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors rounded-none">Crear Cuenta</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
