
import React, { useState, useEffect } from 'react';
import { User, MembershipTier, Tour, Space, SiteAsset, TravelHistoryItem, Notification, SpaceBooking } from './types';
import { MEMBERSHIP_CONFIG as INITIAL_MEMBERSHIP_CONFIG } from './constants';
import { formatARS } from './services/logic';
import { GNM_API } from './services/api';
import { EmailService } from './services/notificationService';
import Layout from './components/Layout';
import TourList from './components/TourList';
import TourDetail from './components/TourDetail';
import AdminDashboard from './components/Admin/Dashboard';
import Auth from './components/Auth';
import UserProfile from './components/Profile/UserProfile';
import FloatingContact from './components/FloatingContact';
import PaymentModal from './components/Payment/PaymentModal';
import SpaceCard from './components/SpaceCard';
import About from './components/About';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [emailToast, setEmailToast] = useState<{to: string, subject: string} | null>(null);
  const [pendingTier, setPendingTier] = useState<MembershipTier | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  const [membershipConfig, setMembershipConfig] = useState(INITIAL_MEMBERSHIP_CONFIG);
  
  const [homeContent, setHomeContent] = useState({
    heroSubtitle: 'Explora Argentina con GNM',
    heroTitle: 'Tours Grupales & Espacios Premium',
    collageTitle: 'Momentos Inolvidables',
    collageImages: [
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'
    ],
    aboutContent: {
      title: 'Pasión por Argentina',
      story: 'GNM TOUR nace de la visión de Gerardo Ramón Lafuente para profesionalizar los viajes grupales y el alquiler de espacios de calidad en la provincia de Corrientes. Con años de experiencia en logística, ofrecemos un servicio que combina el confort premium con la calidez del trato personalizado.',
      mission: 'Brindar experiencias de viaje seguras, exclusivas y memorables, optimizando el tiempo de nuestros socios a través de un sistema de membresías innovador.',
      vision: 'Ser el operador turístico de referencia en el NEA, expandiendo nuestras rutas y espacios hacia los destinos más prestigiosos del país.'
    }
  });

  const loadAssets = async () => {
    const fetchedAssets = await GNM_API.assets.getAll();
    setAssets(fetchedAssets);
  };

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        const [fetchedTours, fetchedSpaces] = await Promise.all([
          GNM_API.tours.getAll(),
          GNM_API.spaces.getAll(),
        ]);
        await loadAssets(); // Cargar Assets
        
        setTours(fetchedTours);
        setSpaces(fetchedSpaces);
        
        const savedUser = localStorage.getItem('gnm_user');
        if (savedUser) {
           const parsedUser = JSON.parse(savedUser);
           setUser(parsedUser);
           checkBirthday(parsedUser);
        }
      } finally {
        setIsLoading(false);
      }
    };
    initApp();

    const handleEmailEvent = (e: any) => {
      setEmailToast(e.detail);
      setTimeout(() => setEmailToast(null), 5000);
    };
    window.addEventListener('gnm-email-sent', handleEmailEvent);
    return () => window.removeEventListener('gnm-email-sent', handleEmailEvent);
  }, []);

  const checkBirthday = (userData: User) => {
      if (!userData.birthDate) return;
      
      const today = new Date();
      const birth = new Date(userData.birthDate);
      
      if (today.getDate() === birth.getDate() + 1 && today.getMonth() === birth.getMonth()) {
         const tStr = `${today.getMonth()+1}-${today.getDate()}`;
         const bStr = `${birth.getMonth()+1}-${birth.getDate()+1}`;
         
         const sentKey = `gnm_bday_sent_${userData.id}_${today.getFullYear()}`;
         if (!sessionStorage.getItem(sentKey)) {
             EmailService.sendEmail(
                 userData.email,
                 "¡Feliz Cumpleaños te desea GNM TOUR! 🎉",
                 `Hola ${userData.name}, ¡esperamos que tengas un día increíble! Gracias por elegirnos para tus aventuras.`
             );
             sessionStorage.setItem(sentKey, 'true');
         }
      }
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedTour(null);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gnm_user');
    setCurrentView('home');
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsEditMode(false);
    setIsLoading(false);
    alert('¡Cambios guardados permanentemente en el servidor!');
  };

  const handleBookSpace = (spaceId: string, date: string, finalPrice: number) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space || !user) return;
    
    // 1. Crear Objeto de Reserva
    const newBooking: SpaceBooking = {
      id: `sb-${Date.now()}`,
      spaceId: space.id,
      spaceName: space.name,
      date: date,
      price: finalPrice,
      status: 'CONFIRMED'
    };

    // 2. Actualizar Disponibilidad del Espacio
    const updatedSpaces = spaces.map(s => s.id === spaceId ? { ...s, availability: [...(s.availability || []), date] } : s);
    setSpaces(updatedSpaces);
    
    // 3. Notificación
    const notif = EmailService.createNotification(user, 'SPACE_BOOKING', `Reserva Confirmada: ${space.name}`, `Tu reserva para el día ${date} ha sido procesada exitosamente. Total abonado: ${formatARS(finalPrice)}`);
    
    // 4. Actualizar Usuario (Membresía + Historial + Notificaciones)
    let updatedMembership = user.membership;
    if (updatedMembership) {
        updatedMembership = {
            ...updatedMembership,
            spaceBookingsThisMonth: (updatedMembership.spaceBookingsThisMonth || 0) + 1
        };
    }

    const updatedUser = { 
        ...user, 
        membership: updatedMembership, 
        notifications: [notif, ...(user.notifications || [])],
        spaceBookings: [newBooking, ...(user.spaceBookings || [])] // Guardamos historial
    };
    
    handleUserUpdate(updatedUser);
    handleNavigate('profile');
  };

  const handleUpdateSpace = (id: string, updates: Partial<Space>) => {
    setSpaces(spaces.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleUpdateTour = (id: string, updates: Partial<Tour>) => {
    setTours(tours.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleAddTour = (tour: Tour) => {
    setTours([...tours, tour]);
  };

  const handleDeleteTour = (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este viaje?")) {
      setTours(tours.filter(t => t.id !== id));
    }
  };

  const updateMembership = (tier: MembershipTier, key: string, value: any) => {
    setMembershipConfig({
        ...membershipConfig,
        [tier]: { ...membershipConfig[tier], [key]: value }
    });
  };

  const handleAddBenefit = (tier: MembershipTier) => {
    const currentBenefits = [...membershipConfig[tier].benefits];
    currentBenefits.push("Nuevo Beneficio...");
    updateMembership(tier, 'benefits', currentBenefits);
  };

  const handleRemoveBenefit = (tier: MembershipTier, index: number) => {
    const currentBenefits = [...membershipConfig[tier].benefits];
    currentBenefits.splice(index, 1);
    updateMembership(tier, 'benefits', currentBenefits);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('gnm_user', JSON.stringify(updatedUser));
  };

  const handleCollageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if(ev.target?.result) {
          setHomeContent(prev => ({
            ...prev,
            collageImages: [...prev.collageImages, ev.target!.result as string]
          }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemoveCollageImage = (index: number) => {
    setHomeContent(prev => ({
      ...prev,
      collageImages: prev.collageImages.filter((_, i) => i !== index)
    }));
  };

  const handleSubscribeClick = (tier: MembershipTier) => {
      if (!user) {
          alert("Debes crear una cuenta o iniciar sesión para suscribirte.");
          setCurrentView('login');
          return;
      }
      if (!user.isVerified) {
          alert("Por favor verifica tu email antes de realizar pagos.");
          return;
      }
      setPendingTier(tier);
  };

  const handleBookTour = (t: Tour) => {
    if (!user) return;
    
    const newTrip: TravelHistoryItem = {
      id: `th-${Date.now()}`,
      tourId: t.id,
      destination: t.destination,
      date: t.dates.start,
      pax: 1, 
      totalPaid: t.price,
      status: 'CONFIRMED',
      km: t.km 
    };

    let updatedMembership = user.membership;
    if (updatedMembership) {
      updatedMembership = {
        ...updatedMembership,
        usedThisMonth: (updatedMembership.usedThisMonth || 0) + t.km
      };
    }

    const notif = EmailService.createNotification(user, 'BOOKING', `Viaje Confirmado: ${t.destination}`, `Te esperamos el ${t.dates.start}. Se han acumulado/descontado ${t.km} KM de tu membresía.`);

    handleUserUpdate({
      ...user,
      travelHistory: [newTrip, ...(user.travelHistory || [])],
      membership: updatedMembership,
      notifications: [notif, ...(user.notifications || [])]
    });

    handleNavigate('profile');
  };

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      onNavigate={handleNavigate} 
      onLogout={handleLogout} 
      isEditMode={isEditMode} 
      setIsEditMode={setIsEditMode}
      onSaveChanges={handleSaveChanges}
    >
      {emailToast && (
        <div className="fixed top-24 right-6 z-[250] bg-white border-l-4 border-blue-600 p-5 shadow-lg animate-in slide-in-from-right duration-500 rounded-none border border-slate-200">
           <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Email Enviado</p>
           <p className="text-xs font-bold text-slate-800">{emailToast.subject}</p>
        </div>
      )}

      {currentView === 'home' && (
        <div className="space-y-0 pb-24">
          <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-slate-900">
             {/* IMAGEN HERO DINÁMICA CONECTADA AL BACKEND */}
             <img 
                src={assets.find(a => a.key === 'home_hero')?.url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000'} 
                className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-1000" 
                alt="Argentina" 
             />
             <div className="relative container text-center text-white space-y-8 px-4">
                {isEditMode ? (
                  <input 
                    className="bg-blue-600/30 border-2 border-dashed border-blue-400 text-xs font-black uppercase tracking-[0.5em] text-blue-100 p-2 outline-none text-center mx-auto"
                    value={homeContent.heroSubtitle}
                    onChange={e => setHomeContent({...homeContent, heroSubtitle: e.target.value})}
                  />
                ) : (
                  <p className="text-xs font-black uppercase tracking-[0.5em] text-blue-400">Explora Argentina con GNM</p>
                )}
                
                {isEditMode ? (
                  <textarea 
                    className="bg-transparent border-2 border-dashed border-white/20 text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none w-full text-center outline-none h-40"
                    value={homeContent.heroTitle}
                    onChange={e => setHomeContent({...homeContent, heroTitle: e.target.value})}
                  />
                ) : (
                  <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">{homeContent.heroTitle}</h1>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                   <button onClick={() => handleNavigate('tours')} className="bg-blue-600 px-10 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Ver Catálogo</button>
                   <button onClick={() => handleNavigate('spaces')} className="bg-white text-slate-900 px-10 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Reservar Quincho</button>
                </div>
             </div>
          </section>

          <section className="bg-white py-20 border-b border-slate-200">
             <div className="container px-4">
                <div className="text-center mb-12">
                   {isEditMode ? (
                     <input 
                        className="text-4xl font-black uppercase italic leading-none text-center outline-none border-b-2 border-dashed border-blue-300 w-full max-w-xl mx-auto"
                        value={homeContent.collageTitle}
                        onChange={(e) => setHomeContent({...homeContent, collageTitle: e.target.value})}
                     />
                   ) : (
                     <h2 className="text-4xl font-black uppercase italic leading-none">{homeContent.collageTitle}</h2>
                   )}
                   <div className="w-16 h-1 bg-blue-600 mx-auto mt-6"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {homeContent.collageImages.map((img, idx) => (
                      <div key={idx} className={`relative group overflow-hidden aspect-[4/5] ${idx === 0 ? 'col-span-2 row-span-2' : ''}`}>
                         <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Travel Collage" />
                         {isEditMode && (
                            <button 
                               onClick={() => handleRemoveCollageImage(idx)}
                               className="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 flex items-center justify-center hover:bg-red-700 z-10"
                            >
                               <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                         )}
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 pointer-events-none"></div>
                      </div>
                   ))}
                   
                   {isEditMode && (
                      <label className="flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 aspect-[4/5] cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
                         <i className="fa-solid fa-plus text-3xl text-slate-400 mb-2"></i>
                         <span className="text-[10px] font-bold uppercase text-slate-500">Agregar Foto</span>
                         <input type="file" className="hidden" accept="image/*" onChange={handleCollageUpload} />
                      </label>
                   )}
                </div>
             </div>
          </section>

          <section className="container px-4 py-20">
             <div className="flex justify-between items-end mb-12">
                <div>
                   <h2 className="text-4xl font-black uppercase italic leading-none">Próximas Salidas</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Nuestras experiencias más populares</p>
                </div>
                <button onClick={() => handleNavigate('tours')} className="text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-900 pb-1">Ver Todo</button>
             </div>
             <TourList 
              tours={tours.slice(0, 3)} 
              user={user} 
              onSelect={(t) => { setSelectedTour(t); setCurrentView('tour_detail'); }} 
              isEditMode={isEditMode} 
              onUpdateTour={handleUpdateTour} 
              onAddTour={handleAddTour}
              onDeleteTour={handleDeleteTour}
            />
          </section>
        </div>
      )}

      {currentView === 'about' && (
        <About 
          isEditMode={isEditMode} 
          content={homeContent.aboutContent} 
          onUpdate={(upd) => setHomeContent({...homeContent, aboutContent: {...homeContent.aboutContent, ...upd}})} 
        />
      )}

      {currentView === 'tour_detail' && selectedTour && (
        <TourDetail 
          tour={selectedTour} 
          user={user} 
          onBack={() => handleNavigate('tours')} 
          onNavigateLogin={() => handleNavigate('login')} 
          onBookTour={handleBookTour} 
        />
      )}

      {currentView === 'tours' && (
        <div className="container py-12 px-4">
          <h2 className="text-4xl font-black uppercase italic mb-12">Catálogo de Viajes</h2>
          <TourList 
            tours={tours} 
            user={user} 
            onSelect={(t) => { setSelectedTour(t); setCurrentView('tour_detail'); }} 
            isEditMode={isEditMode} 
            onUpdateTour={handleUpdateTour} 
            onAddTour={handleAddTour} 
            onDeleteTour={handleDeleteTour} 
          />
        </div>
      )}

      {currentView === 'login' && (
        <div className="py-12">
          <Auth onAuthSuccess={(u) => { setUser(u); localStorage.setItem('gnm_user', JSON.stringify(u)); setCurrentView('home'); checkBirthday(u); }} onCancel={() => handleNavigate('home')} />
        </div>
      )}
      
      {currentView === 'profile' && user && (
        <UserProfile user={user} tours={tours} onNavigate={handleNavigate} onLogout={handleLogout} onUpdateUser={handleUserUpdate} />
      )}

      {currentView === 'spaces' && (
        <div className="container py-12 px-4 space-y-16">
           <div className="max-w-2xl">
              <h2 className="text-4xl font-black uppercase italic leading-none">Alquiler de Espacios</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Disfrutá del Salón & Quincho GNM en Pasaje Niño Jesús 1252. Seleccioná tu fecha y reservá al instante.</p>
           </div>
           {spaces.map(space => (
            <SpaceCard 
              key={space.id} 
              space={space} 
              user={user} 
              isEditMode={isEditMode} 
              onUpdate={handleUpdateSpace} 
              onDelete={() => {}} 
              onBookSpace={handleBookSpace} 
            />
           ))}
        </div>
      )}

      {currentView === 'memberships' && (
        <div className="container py-12 px-4">
           <h2 className="text-4xl font-black uppercase italic mb-12 text-center">Membresías GNM</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(membershipConfig).map(([tier, config]: [any, any]) => (
                <div key={tier} className="bg-white border border-slate-200 p-8 flex flex-col justify-between space-y-8 hover:border-blue-600 transition-colors">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Plan Mensual</p>
                      <h3 className="text-3xl font-black uppercase">{tier}</h3>
                      {isEditMode ? (
                        <div className="flex items-center gap-2 bg-slate-50 border border-dashed border-slate-300 p-2">
                           <span className="text-xs font-bold">$</span>
                           <input 
                              type="number" 
                              className="w-full bg-transparent font-black text-2xl outline-none"
                              value={config.price}
                              onChange={e => updateMembership(tier, 'price', Number(e.target.value))}
                           />
                        </div>
                      ) : (
                        <p className="text-4xl font-black">{formatARS(config.price)}</p>
                      )}
                      <ul className="space-y-3 pt-6 border-t border-slate-100">
                         {config.benefits.map((b: string, i: number) => (
                           <li key={i} className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-2">
                             <i className="fa-solid fa-check text-blue-600"></i>
                             {isEditMode ? (
                               <div className="flex items-center gap-2 w-full">
                                   <input 
                                      className="w-full bg-transparent border-b border-dashed border-slate-200 outline-none text-[9px]"
                                      value={b}
                                      onChange={e => {
                                        const newB = [...config.benefits];
                                        newB[i] = e.target.value;
                                        updateMembership(tier, 'benefits', newB);
                                      }}
                                   />
                                   <button 
                                      onClick={() => handleRemoveBenefit(tier as MembershipTier, i)}
                                      className="text-red-500 hover:text-red-700 p-1"
                                      title="Eliminar beneficio"
                                   >
                                      <i className="fa-solid fa-trash-can"></i>
                                   </button>
                               </div>
                             ) : b}
                           </li>
                         ))}
                      </ul>
                      {isEditMode && (
                        <button 
                          onClick={() => handleAddBenefit(tier as MembershipTier)}
                          className="w-full py-2 text-[9px] font-bold uppercase tracking-widest text-blue-600 border border-dashed border-blue-300 hover:bg-blue-50 mt-2"
                        >
                          + Agregar Beneficio
                        </button>
                      )}
                   </div>
                   <button 
                     onClick={() => handleSubscribeClick(tier as MembershipTier)} 
                     className="w-full bg-slate-900 text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                   >
                     Suscribirme
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {currentView === 'admin' && user?.role === 'ADMIN' && (
        <AdminDashboard 
          tours={tours} 
          spaces={spaces} 
          onAddTour={() => {}} 
          onDeleteTour={() => {}} 
          onUpdateSpace={handleUpdateSpace} 
          onRefreshAssets={loadAssets} // PASAMOS LA FUNCIÓN DE RECARGA
        />
      )}

      {pendingTier && <PaymentModal tier={pendingTier} onSuccess={(t, months) => { 
        if(user) {
          const now = new Date();
          now.setMonth(now.getMonth() + months);
          const validUntil = now.toISOString().split('T')[0];

          const updated = { 
            ...user, 
            membership: { 
              tier: t, 
              validUntil: validUntil, 
              usedThisMonth: 0 
            } 
          };
          handleUserUpdate(updated);
        }
        setPendingTier(null); 
        handleNavigate('profile');
      }} onCancel={() => setPendingTier(null)} />}
      
      <FloatingContact />
    </Layout>
  );
};

export default App;
