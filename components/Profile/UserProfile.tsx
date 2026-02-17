
import React, { useState, useEffect } from 'react';
import { User, MembershipTier, VerificationStatus, Notification, TravelHistoryItem, Tour, BankSettings } from '../../types';
import { MEMBERSHIP_CONFIG } from '../../constants';
import { formatARS, calculateRefundAmount } from '../../services/logic';
import { EmailService } from '../../services/notificationService';
import { GNM_API } from '../../services/api';

interface UserProfileProps {
  user: User;
  tours: Tour[]; 
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, tours, onNavigate, onLogout, onUpdateUser }) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'info' | 'history' | 'mailbox'>('info');
  const [vStatus, setVStatus] = useState<VerificationStatus>(user.verificationStatus);
  const [showCancelModal, setShowCancelModal] = useState<'MEMBERSHIP' | 'TRIP' | 'SPACE' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [adminSettings, setAdminSettings] = useState<BankSettings | null>(null);
  const [refundData, setRefundData] = useState<{amount: number, percentage: number, message: string} | null>(null);
  
  const currentTier = user.membership?.tier || MembershipTier.NONE;
  const config = currentTier !== MembershipTier.NONE ? MEMBERSHIP_CONFIG[currentTier] : null;

  const usedKm = user.membership?.usedThisMonth || 0;
  const maxKm = config ? config.kmLimit : 0;
  const remainingKm = maxKm - usedKm;
  const kmPercentage = maxKm > 0 ? Math.min((usedKm / maxKm) * 100, 100) : 0;

  useEffect(() => {
    // Obtener configuración para saber límite de horas de cancelación
    GNM_API.settings.getBank().then(setAdminSettings);
  }, []);

  const calculatePotentialRefund = (type: 'TRIP' | 'SPACE', id: string) => {
    if (!adminSettings) return;
    
    let dateStr = '';
    let totalPaid = 0;

    if (type === 'TRIP') {
        const trip = user.travelHistory?.find(t => t.id === id);
        if (trip) {
            dateStr = trip.date;
            totalPaid = trip.totalPaid;
        }
    } else {
        const space = user.spaceBookings?.find(s => s.id === id);
        if (space) {
            dateStr = space.date;
            totalPaid = space.price;
        }
    }

    if (dateStr) {
        const result = calculateRefundAmount(dateStr, totalPaid, adminSettings.cancellationHours || 72);
        setRefundData(result);
    }
  };

  const handleOpenCancelModal = (type: 'MEMBERSHIP' | 'TRIP' | 'SPACE', id?: string) => {
    setShowCancelModal(type);
    setTargetId(id || null);
    setCancelReason('');
    setRefundData(null);
    if (id && (type === 'TRIP' || type === 'SPACE')) {
        calculatePotentialRefund(type, id);
    }
  };

  const handleContactAdmin = (subject: string, detail: string) => {
    const message = `Hola Gerardo! Soy ${user.name}. ${subject}. ${detail}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/543794532196?text=${encoded}`, '_blank');
  };

  const handleConfirmCancellation = () => {
    if (!cancelReason) return;

    // --- LÓGICA MEMBRESÍA ---
    if (showCancelModal === 'MEMBERSHIP') {
      const notif = EmailService.createNotification(user, 'CANCELLATION', 'Baja de Membresía', `Has cancelado tu membresía ${currentTier}. Motivo: ${cancelReason}`);
      onUpdateUser({
        ...user,
        membership: { tier: MembershipTier.NONE, validUntil: '', usedThisMonth: 0, cancellationReason: cancelReason },
        notifications: [notif, ...(user.notifications || [])]
      });
      setShowCancelModal(null);
      return;
    }

    // --- LÓGICA VIAJES Y ESPACIOS ---
    if ((showCancelModal === 'TRIP' || showCancelModal === 'SPACE') && targetId && refundData) {
      
      let updatedUser = { ...user };
      let notificationTitle = '';
      let notificationMsg = '';
      let itemName = '';
      let dateStr = '';

      if (showCancelModal === 'TRIP') {
        // Restaurar KM
        const trip = user.travelHistory?.find(t => t.id === targetId);
        itemName = trip?.destination || 'Viaje';
        dateStr = trip?.date || '';

        let updatedMembership = user.membership;
        const tourData = tours.find(t => t.id === trip?.tourId);
        const kmToRestore = trip?.km || (tourData ? tourData.km : 0);

        if (updatedMembership && kmToRestore > 0) {
            const currentUsed = updatedMembership.usedThisMonth || 0;
            updatedMembership = { ...updatedMembership, usedThisMonth: Math.max(0, currentUsed - kmToRestore) };
        }

        const updatedHistory = user.travelHistory?.map(t => 
          t.id === targetId ? { ...t, status: 'CANCELLED' as const, cancellationReason: cancelReason } : t
        );

        updatedUser = { ...updatedUser, travelHistory: updatedHistory, membership: updatedMembership };
        notificationTitle = 'Cancelación de Viaje';
        notificationMsg = `Viaje a ${trip?.destination} cancelado. Motivo: ${cancelReason}. Reembolso estimado: ${formatARS(refundData.amount)}.`;

      } else {
        // Cancelar Espacio
        const space = user.spaceBookings?.find(s => s.id === targetId);
        itemName = space?.spaceName || 'Espacio';
        dateStr = space?.date || '';

        const updatedSpaceBookings = user.spaceBookings?.map(s => 
           s.id === targetId ? { ...s, status: 'CANCELLED' as const, cancellationReason: cancelReason } : s
        );

        updatedUser = { ...updatedUser, spaceBookings: updatedSpaceBookings };
        notificationTitle = 'Cancelación de Espacio';
        notificationMsg = `Reserva de ${space?.spaceName} cancelada. Motivo: ${cancelReason}. Reembolso estimado: ${formatARS(refundData.amount)}.`;
      }

      // Notificación Interna
      const notif = EmailService.createNotification(user, 'CANCELLATION', notificationTitle, notificationMsg);
      onUpdateUser({ ...updatedUser, notifications: [notif, ...(user.notifications || [])] });

      // REDIRECCIÓN A WHATSAPP (MANDATORIO PARA REEMBOLSO)
      const waMsg = `Hola Gerardo. He cancelado mi reserva de ${showCancelModal === 'TRIP' ? 'Viaje' : 'Quincho/Espacio'} en *${itemName}* para la fecha *${dateStr}*. \n\nMotivo: ${cancelReason}. \n\nEl sistema indica que corresponde una devolución del ${refundData.percentage}% (${formatARS(refundData.amount)}). Quedo a la espera de la transferencia.`;
      
      window.open(`https://wa.me/543794532196?text=${encodeURIComponent(waMsg)}`, '_blank');
    }

    setShowCancelModal(null);
    setCancelReason('');
    setTargetId(null);
    setRefundData(null);
  };

  const handleDownloadCarnet = () => {
    alert("Descargando carnet...");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20 px-4 md:px-0">
      
      {/* MODAL DE CANCELACIÓN */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowCancelModal(null)}></div>
          <div className="relative bg-white w-full max-w-lg p-10 shadow-2xl space-y-6 animate-in zoom-in duration-300">
             <div className="text-center space-y-2">
                <i className="fa-solid fa-circle-exclamation text-4xl text-red-600 mb-2"></i>
                <h3 className="text-2xl font-black uppercase italic">¿Confirmar Cancelación?</h3>
             </div>

             {refundData && (
                 <div className="bg-blue-50 border border-blue-200 p-4 text-center space-y-2">
                     <p className="text-[10px] font-bold uppercase text-blue-600 tracking-widest">Política de Reembolso Aplicada</p>
                     <p className="text-3xl font-black text-slate-900">{refundData.percentage}%</p>
                     <p className="text-xs font-medium text-slate-600 italic">"{refundData.message}"</p>
                     <p className="text-[10px] font-bold text-red-500 uppercase mt-2 border-t border-blue-100 pt-2">
                        La devolución de {formatARS(refundData.amount)} se realizará por transferencia manual del administrador.
                     </p>
                 </div>
             )}

             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Motivo de la cancelación:</label>
                <textarea 
                  placeholder="Escribe el motivo aquí..."
                  className="w-full p-4 border border-slate-200 text-xs font-bold uppercase outline-none focus:border-blue-600 bg-slate-50 h-24"
                  onChange={(e) => setCancelReason(e.target.value)}
                />
             </div>

             <div className="grid grid-cols-2 gap-4 pt-4">
                <button onClick={() => setShowCancelModal(null)} className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Volver</button>
                <button 
                  disabled={!cancelReason}
                  onClick={handleConfirmCancellation} 
                  className="bg-green-600 text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all disabled:bg-slate-200 shadow-lg"
                >
                  <i className="fa-brands fa-whatsapp mr-2"></i> Confirmar y Notificar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Header del Perfil */}
      <div className="bg-white p-8 md:p-12 border border-slate-200 shadow-sm rounded-none">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-900 text-white flex items-center justify-center text-5xl font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="text-center md:text-left space-y-4 flex-1">
             <div className="flex flex-wrap justify-center md:justify-start gap-4 items-center">
               <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">{user.name}</h2>
               <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                 vStatus === 'VERIFIED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'
               }`}>
                  {vStatus === 'VERIFIED' ? 'Verificado' : 'Sin Verificar'}
               </span>
             </div>
             <p className="text-slate-500 font-bold uppercase text-sm">{user.email}</p>
          </div>
          <div className="flex flex-col items-center bg-slate-50 p-6 border border-slate-200 min-w-[140px]">
             <span className="text-4xl font-black text-slate-900">{user.tripsCount || 0}</span>
             <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Viajes Totales</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
           <div className="flex border-b border-slate-200 bg-white">
              {['info', 'history', 'mailbox'].map((tab: any) => (
                <button 
                  key={tab}
                  onClick={() => setActiveProfileTab(tab)}
                  className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeProfileTab === tab ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab === 'info' ? 'Membresía' : tab === 'history' ? 'Mis Reservas' : 'Buzón'}
                </button>
              ))}
           </div>

           {activeProfileTab === 'info' && (
             <div className="bg-slate-900 text-white p-10 md:p-12 shadow-md animate-in fade-in duration-300">
                <div className="flex justify-between items-start mb-8">
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2">Plan Activo</p>
                     <h3 className="text-5xl font-black uppercase tracking-tight">{currentTier}</h3>
                   </div>
                   <div className="w-16 h-16 border border-slate-700 flex items-center justify-center text-3xl text-white">
                      <i className={`fa-solid ${currentTier === MembershipTier.NONE ? 'fa-user' : 'fa-crown'}`}></i>
                   </div>
                </div>

                {config ? (
                  <div className="space-y-10">
                    <div className="bg-slate-800 p-6 border border-slate-700">
                       <div className="flex justify-between items-end mb-4">
                          <span className="text-xs font-bold uppercase text-slate-400 tracking-widest">Consumo Mensual</span>
                          <span className="text-2xl font-black">{remainingKm > 0 ? remainingKm : 0} <span className="text-sm font-bold text-slate-500">KM</span></span>
                       </div>
                       <div className="h-4 w-full bg-slate-950 border border-slate-700 relative overflow-hidden">
                          <div className={`h-full ${kmPercentage >= 100 ? 'bg-red-600' : 'bg-blue-600'} transition-all duration-1000`} style={{ width: `${kmPercentage}%` }}></div>
                       </div>
                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row gap-4">
                       <button onClick={() => onNavigate('memberships')} className="flex-1 bg-white text-slate-900 py-4 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Cambiar Plan</button>
                       <button onClick={handleDownloadCarnet} className="px-8 py-4 border border-slate-700 hover:bg-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest text-white">Descargar Carnet</button>
                    </div>
                    <div className="mt-6">
                        <button onClick={() => handleOpenCancelModal('MEMBERSHIP')} className="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-[0.2em] flex items-center gap-2 group">
                          <i className="fa-solid fa-ban group-hover:rotate-12 transition-transform"></i> Solicitar Baja de Suscripción
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-6 border-t border-slate-800 pt-8">
                     <p className="text-slate-400 font-medium">No tienes un plan activo.</p>
                     <button onClick={() => onNavigate('memberships')} className="bg-blue-600 text-white px-8 py-4 font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors">Ver Planes</button>
                  </div>
                )}
             </div>
           )}

           {activeProfileTab === 'history' && (
             <div className="bg-white p-10 border border-slate-200 shadow-sm space-y-12 animate-in fade-in duration-300">
                
                {/* SECCIÓN VIAJES */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                        <i className="fa-solid fa-bus text-blue-600"></i> Viajes y Tours
                    </h3>
                    <div className="space-y-4">
                    {user.travelHistory && user.travelHistory.length > 0 ? (
                        user.travelHistory.map((trip) => (
                            <div key={trip.id} className="border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-slate-50 transition-all group relative">
                                <div className="flex items-center gap-6 flex-1 w-full">
                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                                        <i className="fa-solid fa-map-location-dot"></i>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900 uppercase text-sm">{trip.destination}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {trip.date} • {trip.pax} Pasajero{trip.pax > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto items-end">
                                    <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest border text-center w-fit ${
                                        trip.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                        trip.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                        'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        {trip.status === 'COMPLETED' ? 'Hecho' : trip.status === 'CONFIRMED' ? 'Activo' : 'Cancelado'}
                                    </div>
                                    
                                    {trip.status === 'CONFIRMED' && (
                                        <div className="flex gap-2">
                                            <button 
                                            onClick={() => handleContactAdmin('Consulta sobre Viaje', `Reserva: ${trip.destination} (${trip.date})`)}
                                            className="w-8 h-8 flex items-center justify-center bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm"
                                            title="Contactar Dueño"
                                            >
                                                <i className="fa-brands fa-whatsapp"></i>
                                            </button>
                                            <button 
                                            onClick={() => handleOpenCancelModal('TRIP', trip.id)}
                                            className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                            title="Cancelar Reserva"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-xs font-bold text-slate-400 py-6 uppercase border border-dashed border-slate-200">Sin viajes registrados</p>
                    )}
                    </div>
                </div>

                {/* SECCIÓN ESPACIOS (NUEVA) */}
                <div className="space-y-6 pt-8 border-t border-slate-100">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                        <i className="fa-solid fa-house-chimney text-amber-500"></i> Espacios y Quinchos
                    </h3>
                    <div className="space-y-4">
                    {user.spaceBookings && user.spaceBookings.length > 0 ? (
                        user.spaceBookings.map((sb) => (
                            <div key={sb.id} className="border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-amber-50/30 transition-all group relative">
                                <div className="flex items-center gap-6 flex-1 w-full">
                                    <div className="w-14 h-14 bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
                                        <i className="fa-solid fa-champagne-glasses"></i>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900 uppercase text-sm">{sb.spaceName}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Fecha: {sb.date} • {formatARS(sb.price)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto items-end">
                                    <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest border text-center w-fit ${
                                        sb.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                                        'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        {sb.status === 'CONFIRMED' ? 'Reservado' : 'Cancelado'}
                                    </div>
                                    
                                    {sb.status === 'CONFIRMED' && (
                                        <div className="flex gap-2">
                                            <button 
                                            onClick={() => handleContactAdmin('Consulta sobre Espacio', `Reserva: ${sb.spaceName} (${sb.date})`)}
                                            className="w-8 h-8 flex items-center justify-center bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm"
                                            title="Contactar Dueño"
                                            >
                                                <i className="fa-brands fa-whatsapp"></i>
                                            </button>
                                            <button 
                                            onClick={() => handleOpenCancelModal('SPACE', sb.id)}
                                            className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                            title="Cancelar Reserva"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-xs font-bold text-slate-400 py-6 uppercase border border-dashed border-slate-200">Sin alquileres registrados</p>
                    )}
                    </div>
                </div>
             </div>
           )}

           {activeProfileTab === 'mailbox' && (
             <div className="bg-white p-10 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Actividad Reciente</h3>
                <div className="space-y-0 border border-slate-200">
                   {user.notifications && user.notifications.length > 0 ? (
                      user.notifications.map((notif) => (
                         <div key={notif.id} className="p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                               <h4 className={`font-bold text-sm uppercase ${notif.type === 'CANCELLATION' ? 'text-red-600' : 'text-slate-900'}`}>{notif.title}</h4>
                               <span className="text-[9px] font-bold uppercase text-slate-400">{new Date(notif.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{notif.message}"</p>
                         </div>
                      ))
                   ) : (
                      <p className="text-center text-xs font-bold text-slate-400 py-12 uppercase">Buzón vacío</p>
                   )}
                </div>
             </div>
           )}
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-slate-200 p-8 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Cuenta Socio</h4>
              <div className="space-y-0 border border-slate-200">
                 <button onClick={() => onNavigate('tours')} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors border-b border-slate-200">
                    <span className="text-xs font-bold uppercase text-slate-700">Explorar Destinos</span>
                    <i className="fa-solid fa-arrow-right text-slate-300 text-xs"></i>
                 </button>
                 <button 
                   onClick={onLogout} 
                   className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 text-red-600 transition-colors"
                 >
                    <span className="text-xs font-bold uppercase">Cerrar Sesión</span>
                    <i className="fa-solid fa-power-off text-xs"></i>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
