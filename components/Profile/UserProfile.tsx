
import React, { useState } from 'react';
import { User, MembershipTier, VerificationStatus, Notification } from '../../types';
import { MEMBERSHIP_CONFIG } from '../../constants';
import { formatARS } from '../../services/logic';
import { GNM_API } from '../../services/api';

interface UserProfileProps {
  user: User;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onNavigate, onLogout, onUpdateUser }) => {
  const [vStatus, setVStatus] = useState<VerificationStatus>(user.verificationStatus);
  const currentTier = user.membership?.tier || MembershipTier.NONE;
  const config = currentTier !== MembershipTier.NONE ? MEMBERSHIP_CONFIG[currentTier] : null;

  const usedKm = user.membership?.usedThisMonth || 0;
  const maxKm = config ? config.kmLimit : 0;
  const remainingKm = maxKm - usedKm;
  const kmPercentage = maxKm > 0 ? Math.min((usedKm / maxKm) * 100, 100) : 0;

  const handleCancelMembership = () => {
    if (window.confirm('¿Confirmar cancelación de suscripción?')) {
      onUpdateUser({
        ...user,
        membership: { tier: MembershipTier.NONE, validUntil: '', usedThisMonth: 0 }
      });
    }
  };

  const handleDownloadCarnet = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const isElite = currentTier === MembershipTier.ELITE;
    ctx.fillStyle = isElite ? '#000000' : '#1e3a8a';
    ctx.fillRect(0, 0, 800, 480);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('GNM TOUR', 60, 90);
    ctx.fillStyle = isElite ? '#fbbf24' : '#93c5fd';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(currentTier, 740, 100);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(user.name.toUpperCase(), 60, 340);
    const link = document.createElement('a');
    link.download = `Carnet-GNM.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20 px-4 md:px-0">
      {/* 1. Header del Perfil - Identidad */}
      <div className="bg-white p-8 md:p-12 border border-slate-200 shadow-sm rounded-none">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-900 flex items-center justify-center text-white text-5xl font-bold rounded-none">
            {user.name.charAt(0)}
          </div>
          <div className="text-center md:text-left space-y-4 flex-1">
             <div className="flex flex-wrap justify-center md:justify-start gap-4 items-center">
               <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">{user.name}</h2>
               <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-none ${
                 vStatus === 'VERIFIED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'
               }`}>
                  {vStatus === 'VERIFIED' ? 'Verificado' : 'Sin Verificar'}
               </span>
             </div>
             <p className="text-slate-500 font-bold uppercase text-sm">
               {user.email}
             </p>
          </div>
          {/* Contador de Viajes Global */}
          <div className="flex flex-col items-center bg-slate-50 p-6 border border-slate-200 rounded-none min-w-[140px]">
             <span className="text-4xl font-black text-slate-900">{user.tripsCount || 0}</span>
             <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Viajes Totales</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA PRINCIPAL */}
        <div className="lg:col-span-8 space-y-8">
           {/* Card Membresía & Kilómetros */}
           <div className="bg-slate-900 text-white p-10 md:p-12 rounded-none shadow-md">
              <div className="flex justify-between items-start mb-8">
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2">Plan Activo</p>
                   <h3 className="text-5xl font-black uppercase tracking-tight">{currentTier}</h3>
                 </div>
                 <div className="w-16 h-16 border border-slate-700 flex items-center justify-center text-3xl text-white rounded-none">
                    <i className={`fa-solid ${currentTier === MembershipTier.NONE ? 'fa-user' : 'fa-crown'}`}></i>
                 </div>
              </div>

              {config ? (
                <div className="space-y-10">
                  {/* MONITOR DE KILOMETROS */}
                  <div className="bg-slate-800 p-6 border border-slate-700 rounded-none">
                     <div className="flex justify-between items-end mb-4">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-widest">Consumo Mensual</span>
                        <span className="text-2xl font-black">{remainingKm > 0 ? remainingKm : 0} <span className="text-sm font-bold text-slate-500">KM RESTANTES</span></span>
                     </div>
                     <div className="h-4 w-full bg-slate-950 rounded-none border border-slate-700 relative overflow-hidden">
                        <div className={`h-full ${kmPercentage >= 100 ? 'bg-red-600' : 'bg-blue-600'} transition-all duration-1000`} style={{ width: `${kmPercentage}%` }}></div>
                     </div>
                     <div className="flex justify-between mt-3 text-[10px] font-bold uppercase text-slate-500">
                        <span>{usedKm} km usados</span>
                        <span>Tope {maxKm} km</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 border-t border-slate-800 pt-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Descuento</p>
                      <p className="text-3xl font-black">{(config.discount * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Tope</p>
                      <p className="text-3xl font-black">{config.kmLimit} KM</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-8 border-t border-slate-800">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Beneficios</p>
                     <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {config.benefits.map((b, i) => (
                          <li key={i} className="flex gap-3 text-xs font-bold items-center uppercase">
                            <div className="w-4 h-4 bg-blue-600 flex items-center justify-center text-[8px] text-white rounded-none">
                              <i className="fa-solid fa-check"></i>
                            </div>
                            {b}
                          </li>
                        ))}
                     </ul>
                  </div>
                  
                  <div className="pt-8 flex flex-col sm:flex-row gap-4">
                     <button onClick={() => onNavigate('memberships')} className="flex-1 bg-white text-slate-900 py-4 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors rounded-none">Cambiar Plan</button>
                     <button onClick={handleDownloadCarnet} className="px-8 py-4 border border-slate-700 hover:bg-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest text-white rounded-none">
                        Descargar Carnet
                     </button>
                  </div>
                   <div className="mt-4 text-left">
                       <button onClick={handleCancelMembership} className="text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest underline decoration-red-900/50 underline-offset-4">Cancelar Suscripción</button>
                   </div>
                </div>
              ) : (
                <div className="py-8 space-y-6 border-t border-slate-800 pt-8">
                   <p className="text-slate-400 font-medium">No tienes un plan activo.</p>
                   <button onClick={() => onNavigate('memberships')} className="bg-blue-600 text-white px-8 py-4 font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors rounded-none">Ver Planes</button>
                </div>
              )}
           </div>

           {/* 3. MI BUZÓN */}
           <div className="bg-white p-10 border border-slate-200 rounded-none shadow-sm space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Buzón</h3>
              <div className="space-y-0 border border-slate-200">
                 {user.notifications && user.notifications.length > 0 ? (
                    user.notifications.map((notif) => (
                       <div key={notif.id} className="p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                             <h4 className="font-bold text-slate-900 text-sm uppercase">{notif.title}</h4>
                             <span className="text-[9px] font-bold uppercase text-slate-400">{new Date(notif.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                       </div>
                    ))
                 ) : (
                    <div className="py-12 text-center opacity-50">
                       <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin mensajes</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* COLUMNA LATERAL */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-slate-200 p-8 rounded-none shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Acciones</h4>
              <div className="space-y-0 border border-slate-200">
                 <button onClick={() => onNavigate('tours')} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors border-b border-slate-200">
                    <span className="text-xs font-bold uppercase text-slate-700">Ir al Catálogo</span>
                    <i className="fa-solid fa-arrow-right text-slate-300"></i>
                 </button>
                 <button 
                   onClick={onLogout} 
                   className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 text-red-600 transition-colors"
                 >
                    <span className="text-xs font-bold uppercase">Cerrar Sesión</span>
                    <i className="fa-solid fa-power-off"></i>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
