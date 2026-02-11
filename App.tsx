
import React, { useState, useEffect } from 'react';
import { User, MembershipTier, Tour, Space, SiteAsset } from './types';
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [membershipConfigs, setMembershipConfigs] = useState<any>(INITIAL_MEMBERSHIP_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [emailToast, setEmailToast] = useState<{to: string, subject: string} | null>(null);
  
  const [pendingTier, setPendingTier] = useState<MembershipTier | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        const [fetchedTours, fetchedSpaces, fetchedAssets] = await Promise.all([
          GNM_API.tours.getAll(),
          GNM_API.spaces.getAll(),
          GNM_API.assets.getAll()
        ]);

        const customTours = localStorage.getItem('gnm_custom_tours');
        const customSpaces = localStorage.getItem('gnm_custom_spaces');
        const customAssets = localStorage.getItem('gnm_custom_assets');
        const customMemberships = localStorage.getItem('gnm_custom_memberships');

        setTours(customTours && JSON.parse(customTours).length > 0 ? JSON.parse(customTours) : fetchedTours);
        setSpaces(customSpaces && JSON.parse(customSpaces).length > 0 ? JSON.parse(customSpaces) : fetchedSpaces);
        setAssets(customAssets && JSON.parse(customAssets).length > 0 ? JSON.parse(customAssets) : fetchedAssets);
        
        if (customMemberships) {
          setMembershipConfigs(JSON.parse(customMemberships));
        }

        const savedUser = localStorage.getItem('gnm_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
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

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('gnm_custom_tours', JSON.stringify(tours));
      localStorage.setItem('gnm_custom_spaces', JSON.stringify(spaces));
      localStorage.setItem('gnm_custom_assets', JSON.stringify(assets));
      localStorage.setItem('gnm_custom_memberships', JSON.stringify(membershipConfigs));
    }
  }, [tours, spaces, assets, membershipConfigs, isLoading]);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedTour(null);
    window.scrollTo(0, 0);
  };

  const getAssetValue = (key: string, defaultValue: string) => {
    const found = assets.find(a => a.key === key);
    return (found && found.url) ? found.url : defaultValue;
  };

  const handleUpdateAsset = (key: string, value: string) => {
    const existing = assets.find(a => a.key === key);
    if (existing) {
      setAssets(assets.map(a => a.key === key ? { ...a, url: value } : a));
    } else {
      const newAsset: SiteAsset = {
        id: `as-${Math.random().toString(36).substr(2, 9)}`,
        key,
        label: key,
        url: value,
        category: 'HERO'
      };
      setAssets([...assets, newAsset]);
    }
  };

  const handleUpdateMembershipConfig = (tier: string, updates: any) => {
    setMembershipConfigs({
      ...membershipConfigs,
      [tier]: { ...membershipConfigs[tier], ...updates }
    });
  };

  const handleAddTour = () => {
    const newTour: Tour = {
      id: `t-${Math.random().toString(36).substr(2, 9)}`,
      destination: 'Nuevo Destino',
      price: 0,
      priceTicket: 0,
      priceLogistics: 0,
      km: 0,
      description: 'Descripción del nuevo viaje',
      images: ['https://images.unsplash.com/photo-1516496636080-14fb876e029d?auto=format&fit=crop&q=80&w=800'],
      dates: { start: '', end: '', deadline: '', openAtMembers: '', openAtPublic: '' },
      capacity: 20,
      minCapacity: 10,
      status: 'OPEN',
      itinerary: []
    };
    setTours([...tours, newTour]);
  };

  const handleUpdateTour = (id: string, updates: Partial<Tour>) => {
    setTours(tours.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTour = (id: string) => {
    setTours(tours.filter(t => t.id !== id));
  };

  const handleUpdateSpace = (id: string, updates: Partial<Space>) => {
    setSpaces(spaces.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('gnm_user', JSON.stringify(userData));
    setCurrentView('home');
  };

  const handleLogout = () => {
    setUser(null);
    setIsEditMode(false);
    localStorage.removeItem('gnm_user');
    setCurrentView('home');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('gnm_user', JSON.stringify(updatedUser));
  };

  const handleTourBooking = (tour: Tour) => {
    if (!user) return;
    
    // Simular actualización de kilómetros y contador de viajes
    const currentUsed = user.membership?.usedThisMonth || 0;
    const currentTrips = user.tripsCount || 0;

    const updatedUser: User = {
      ...user,
      tripsCount: currentTrips + 1,
      membership: user.membership ? {
        ...user.membership,
        usedThisMonth: currentUsed + tour.km
      } : undefined,
      notifications: [
        EmailService.createNotification(user, 'BOOKING', `Reserva Confirmada: ${tour.destination}`, `Has sumado ${tour.km} KM a tu historial.`),
        ...(user.notifications || [])
      ]
    };

    handleUpdateUser(updatedUser);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, onComplete: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onComplete(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaymentSuccess = (newTier: MembershipTier) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      membership: { tier: newTier, validUntil: '2027-01-01', usedThisMonth: 0 },
      notifications: [
        EmailService.createNotification(user, 'MEMBERSHIP', `Plan ${newTier} Activado`, `Ya podés disfrutar de tus beneficios exclusivos.`),
        ...(user.notifications || [])
      ]
    };
    setUser(updatedUser);
    localStorage.setItem('gnm_user', JSON.stringify(updatedUser));
    setPendingTier(null);
    setCurrentView('profile');
  };

  const EditableImage = ({ assetKey, className, defaultSrc, imgClassName = "" }: { assetKey: string, className: string, defaultSrc: string, imgClassName?: string }) => {
    const src = getAssetValue(assetKey, defaultSrc);
    return (
      <div className={`relative group/img ${className}`}>
        <img src={src} className={`w-full h-full object-cover ${imgClassName}`} alt="Banner GNM" />
        {isEditMode && user?.role === 'ADMIN' && (
          <label className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all z-20">
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, (url) => handleUpdateAsset(assetKey, url))} />
            <i className="fa-solid fa-camera text-3xl text-white mb-2"></i>
            <span className="bg-white text-blue-600 px-4 py-2 text-[10px] font-bold uppercase rounded-none">Cambiar Imagen</span>
          </label>
        )}
      </div>
    );
  };

  const EditableText = ({ assetKey, className = "", defaultText, multiline = false }: { assetKey: string, className?: string, defaultText: string, multiline?: boolean }) => {
    const value = getAssetValue(assetKey, defaultText);
    if (isEditMode && user?.role === 'ADMIN') {
      return multiline ? (
        <textarea 
          className={`${className} bg-blue-50/20 border border-blue-500 outline-none w-full p-2 min-h-[100px] rounded-none`}
          value={value}
          onChange={(e) => handleUpdateAsset(assetKey, e.target.value)}
        />
      ) : (
        <input 
          className={`${className} bg-blue-50/20 border border-blue-500 outline-none px-2 rounded-none`}
          value={value}
          onChange={(e) => handleUpdateAsset(assetKey, e.target.value)}
        />
      );
    }
    return <span className={className}>{value || defaultText}</span>;
  };

  const renderHome = () => (
    <div className="space-y-0">
      
      {/* Sección Hero Rediseñada - Sin Imagen de Fondo, Color Sólido */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-slate-950">
        
        {/* Contenedor del Mensaje Central - Full Width sin Card */}
        <div className="relative z-10 w-full container px-4 flex flex-col items-center text-center">
          
          <div className="w-full max-w-5xl mx-auto">
            
            <div className="inline-flex items-center gap-3 border border-blue-500/30 px-5 py-2 mb-8 bg-blue-900/20 rounded-none">
              <i className="fa-solid fa-map-location-dot text-blue-400"></i>
              <EditableText assetKey="hero_tag" defaultText="OPERADOR OFICIAL CORRIENTES" className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.3em]" />
            </div>
            
            <h1 className="flex flex-col items-center justify-center font-black text-white leading-none tracking-tight mb-8 w-full">
              <span className="text-2xl sm:text-3xl md:text-4xl mb-3 font-bold text-slate-300 uppercase tracking-widest block">
                <EditableText assetKey="hero_title_1" defaultText="Bienvenidos a" />
              </span>
              <span className="text-5xl sm:text-7xl md:text-8xl text-white block mt-2 drop-shadow-2xl">
                <EditableText assetKey="hero_title_2" defaultText="GEMY TOURS" />
              </span>
            </h1>
            
            <div className="w-full max-w-xl mx-auto space-y-8">
              <EditableText 
                assetKey="hero_desc" 
                defaultText="Experiencias exclusivas en Argentina. Comunicate conmigo y te cuento cómo viajar desde tu casa." 
                className="text-lg text-slate-300 font-medium leading-relaxed block" 
                multiline 
              />
              
              <button 
                onClick={() => window.open('https://wa.me/543794532196', '_blank')} 
                className="inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 font-bold text-xs uppercase tracking-[0.2em] transition-all border border-blue-500 hover:border-blue-400 shadow-xl rounded-none"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i> Contactar Ahora
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Salon Section Modificada */}
      <section className="container py-24 px-4">
        {/* Fondo oscuro y bordes azules sutiles */}
        <div className="bg-slate-950 text-white relative overflow-hidden shadow-2xl rounded-none border-y-4 border-blue-900/50">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Texto */}
            <div className="p-12 md:p-20 space-y-8 flex flex-col justify-center order-2 lg:order-1">
              <EditableText assetKey="salon_tag" defaultText="TU EVENTO EN CORRIENTES" className="text-blue-500 font-bold uppercase tracking-[0.3em] text-xs block" />
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                <EditableText assetKey="salon_title" defaultText="Salón & Kids GNM" className="block" />
                <span className="text-slate-500 font-medium block mt-2 text-2xl">
                   <EditableText assetKey="salon_address" defaultText="Niño Jesús 1252" className="" />
                </span>
              </h2>
              <EditableText assetKey="salon_desc" defaultText="El lugar perfecto para cumpleaños infantiles y fiestas sociales. Equipado para 60 personas." className="text-slate-400 text-lg font-normal leading-relaxed block" multiline />
              <div>
                <button onClick={() => setCurrentView('spaces')} className="w-full sm:w-auto bg-white text-slate-900 px-10 py-5 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors rounded-none">Ver Galería Real</button>
              </div>
            </div>
            {/* Imagen con Padding y Marco */}
            <div className="h-full min-h-[400px] p-6 lg:p-12 order-1 lg:order-2 bg-slate-900/50 flex items-center justify-center">
               <div className="relative w-full h-full border border-blue-500/20 shadow-2xl">
                  <EditableImage 
                    assetKey="salon_main" 
                    defaultSrc="https://images.unsplash.com/photo-1530103862676-de3c9a59af57?auto=format&fit=crop&q=80&w=1200" 
                    className="w-full h-full" 
                    imgClassName="object-cover" 
                  />
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderAbout = () => (
    <div className="container py-20 px-4 space-y-20 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-slate-900">
          <EditableText assetKey="about_title" defaultText="Nuestra Historia" />
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed">
          <EditableText assetKey="about_subtitle" defaultText="Conectando personas con la belleza de Argentina desde Corrientes." multiline />
        </p>
      </div>

      {/* Story & Images */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8 order-2 lg:order-1">
          <div className="prose prose-lg text-slate-600 font-medium leading-loose">
             <EditableText 
               assetKey="about_text_1" 
               defaultText="Todo comenzó con un sueño: acercar los paisajes más increíbles de nuestro país a la gente de Corrientes. GNM TOUR se fundó bajo la premisa de que viajar no es solo trasladarse, es vivir experiencias que transforman." 
               multiline 
               className="block mb-6"
             />
             <EditableText 
               assetKey="about_text_2" 
               defaultText="Con el tiempo, incorporamos nuestro propio salón de eventos, entendiendo que la celebración es otra forma de viaje. Hoy, somos una gran familia de viajeros y amigos que crece día a día." 
               multiline 
               className="block"
             />
          </div>
          <div className="flex gap-4 pt-4">
             <div className="bg-slate-100 p-4 border border-slate-200 text-center w-32 rounded-none">
                <p className="text-3xl font-black text-blue-600"><EditableText assetKey="about_stat_1" defaultText="+10" /></p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Años</p>
             </div>
             <div className="bg-slate-100 p-4 border border-slate-200 text-center w-32 rounded-none">
                <p className="text-3xl font-black text-blue-600"><EditableText assetKey="about_stat_2" defaultText="+5k" /></p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Viajeros</p>
             </div>
          </div>
        </div>

        <div className="order-1 lg:order-2 grid grid-cols-2 gap-4 h-[500px]">
           <div className="space-y-4 pt-12">
              <EditableImage 
                assetKey="about_img_1" 
                defaultSrc="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-[60%] shadow-xl" 
                imgClassName="object-cover" 
              />
              <EditableImage 
                assetKey="about_img_2" 
                defaultSrc="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-[40%] shadow-xl opacity-80" 
                imgClassName="object-cover" 
              />
           </div>
           <div className="space-y-4 pb-12">
              <EditableImage 
                assetKey="about_img_3" 
                defaultSrc="https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-[40%] shadow-xl opacity-80" 
                imgClassName="object-cover" 
              />
              <EditableImage 
                assetKey="about_img_4" 
                defaultSrc="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-[60%] shadow-xl" 
                imgClassName="object-cover" 
              />
           </div>
        </div>
      </div>
      
      {/* Team/Admin Section Preview (Optional or generic image) */}
       <div className="bg-slate-900 text-white p-12 md:p-20 relative overflow-hidden mt-20 border-y-4 border-blue-600">
          <div className="relative z-10 text-center max-w-2xl mx-auto space-y-6">
             <i className="fa-solid fa-quote-left text-4xl text-blue-500 opacity-50"></i>
             <h2 className="text-2xl md:text-3xl font-black italic tracking-tight leading-relaxed">
               <EditableText assetKey="about_quote" defaultText="Viajar es la única cosa que compras y te hace más rico. Gracias por elegirnos para ser parte de sus recuerdos." multiline />
             </h2>
             <div className="pt-6">
               <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Gerardo Ramón Lafuente</p>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Fundador GNM TOUR</p>
             </div>
          </div>
          <EditableImage 
             assetKey="about_banner_bg" 
             defaultSrc="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000" 
             className="absolute inset-0 opacity-10" 
             imgClassName="object-cover" 
          />
       </div>
    </div>
  );

  const renderTours = () => {
    if (selectedTour) {
      return (
        <TourDetail 
          tour={selectedTour} 
          user={user} 
          onBack={() => { setSelectedTour(null); window.scrollTo(0, 0); }}
          onNavigateLogin={() => handleNavigate('login')}
          onBookTour={handleTourBooking}
        />
      );
    }
    
    return (
      <div className="container py-12 px-4 space-y-12">
        <div className="mb-16 border-b border-slate-200 pb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 mb-2">Nuestros Destinos</h1>
          <p className="text-slate-500 text-lg">Explora Argentina con la garantía de Gerardo Ramón.</p>
        </div>
        <TourList 
          tours={tours} 
          user={user} 
          onSelect={(t) => { setSelectedTour(t); window.scrollTo(0, 0); }} 
          isEditMode={isEditMode} 
          onUpdateTour={handleUpdateTour} 
          onAddTour={handleAddTour}
          onDeleteTour={handleDeleteTour}
        />
      </div>
    );
  };

  const renderSpaces = () => (
    <div className="container py-12 px-4 space-y-16">
      <div className="border-b border-slate-200 pb-8">
        <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">Salón & Quincho</h1>
        <p className="text-slate-500 mt-2 text-lg">Ubicación exclusiva: Pasaje Niño Jesús 1252, Corrientes.</p>
      </div>
      {spaces.map(space => (
        <div key={space.id} className="bg-white border border-slate-200 shadow-sm relative rounded-none">
          {isEditMode && user?.role === 'ADMIN' && (
            <button 
              onClick={() => setSpaces(spaces.filter(s => s.id !== space.id))}
              className="absolute top-4 right-4 z-30 w-10 h-10 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 rounded-none"
              title="Eliminar Espacio"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative h-[400px] lg:h-full group/spimg">
              <img src={space.images[0]} className="w-full h-full object-cover" alt={space.name} />
              {isEditMode && user?.role === 'ADMIN' && (
                <label className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover/spimg:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all z-20">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, (url) => handleUpdateSpace(space.id, { images: [url] }))} />
                  <i className="fa-solid fa-camera text-3xl text-white mb-2"></i>
                  <span className="bg-white text-blue-600 px-4 py-2 text-[10px] font-bold uppercase rounded-none">Cambiar Foto Espacio</span>
                </label>
              )}
            </div>
            <div className="p-10 md:p-16 space-y-8 flex flex-col justify-center">
              {isEditMode ? (
                <input className="text-3xl font-black uppercase block w-full bg-slate-50 border border-slate-300 p-2 rounded-none" value={space.name} onChange={e => handleUpdateSpace(space.id, { name: e.target.value })} />
              ) : <h3 className="text-3xl font-black uppercase tracking-tight">{space.name}</h3>}
              
              {isEditMode ? (
                <textarea className="text-slate-500 font-medium block leading-relaxed w-full bg-slate-50 border border-slate-300 p-2 min-h-[100px] rounded-none" value={space.description} onChange={e => handleUpdateSpace(space.id, { description: e.target.value })} />
              ) : <p className="text-slate-500 font-medium leading-relaxed">{space.description}</p>}
              
              <div className="border border-slate-200 p-6 bg-slate-50 rounded-none">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Reserva Base</p>
                {isEditMode ? (
                  <input type="number" className="bg-transparent font-black text-2xl w-full outline-none text-blue-600" value={space.price} onChange={e => handleUpdateSpace(space.id, { price: Number(e.target.value) })} />
                ) : <p className="text-3xl font-black text-slate-900">{formatARS(space.price)}</p>}
              </div>
              
              <button onClick={() => window.open(`https://wa.me/543794532196`, '_blank')} className="w-full bg-slate-900 text-white py-5 font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-colors rounded-none">Consultar Fecha</button>
            </div>
          </div>
        </div>
      ))}
      
      {/* ADD SPACE BUTTON */}
      {isEditMode && user?.role === 'ADMIN' && (
        <div className="text-center pt-8">
          <button 
            onClick={() => {
              const newSpace: Space = {
                id: `s-${Math.random().toString(36).substr(2, 9)}`,
                name: 'Nuevo Espacio',
                type: 'QUINCHO',
                price: 0,
                capacity: 0,
                description: 'Descripción del nuevo espacio',
                rules: [],
                damageDeposit: 0,
                cleaningFee: 0,
                availability: [],
                images: ['https://images.unsplash.com/photo-1543823441-29651f0746aa?auto=format&fit=crop&q=80&w=1200']
              };
              setSpaces([...spaces, newSpace]);
            }}
            className="w-full sm:w-auto bg-white border border-blue-600 text-blue-600 px-10 py-5 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors rounded-none"
          >
            + Agregar Nuevo Espacio
          </button>
        </div>
      )}
    </div>
  );

  const renderMemberships = () => (
    <div className="container py-20 px-4 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-4xl font-black uppercase tracking-tight">
          <EditableText assetKey="mem_title" defaultText="Club de Socios GNM" className="" />
        </h2>
        <p className="text-slate-500 text-lg">
          <EditableText assetKey="mem_desc" defaultText="Unite a nuestra comunidad y accedé a descuentos masivos en cada tour por Argentina y beneficios exclusivos en el salón de Niño Jesús." className="" multiline />
        </p>
      </div>
      <div className="row g-0 border border-slate-200">
        {Object.entries(membershipConfigs).map(([tier, config]: [any, any], index) => {
          const isCurrent = user?.membership?.tier === tier;
          return (
            <div key={tier} className="col-12 col-md-6 col-lg-3">
              <div className={`h-full p-8 md:p-10 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col ${
                tier === 'ELITE' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-6 inline-block ${tier === 'ELITE' ? 'text-blue-400' : 'text-slate-400'}`}>{tier}</span>
                <div className="mb-8">
                  {isEditMode ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] font-bold uppercase opacity-40">Precio ARS</p>
                      <input 
                        type="number" 
                        className="text-2xl font-black bg-transparent border-b border-slate-300 w-full rounded-none" 
                        value={config.price} 
                        onChange={e => handleUpdateMembershipConfig(tier, { price: Number(e.target.value) })} 
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-black tracking-tight">{formatARS(config.price)}</p>
                      <p className="text-[10px] font-bold uppercase opacity-40 mt-1">Suscripción Mensual</p>
                    </>
                  )}
                </div>
                
                <div className="space-y-4 mb-10 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${tier === 'ELITE' ? 'text-slate-400' : 'text-blue-600'}`}>Beneficios</p>
                  <ul className="space-y-3">
                    {config.benefits.map((b: string, i: number) => (
                      <li key={i} className="flex gap-3 text-xs font-medium items-start">
                        <i className={`fa-solid fa-square-check mt-0.5 ${tier === 'ELITE' ? 'text-blue-400' : 'text-slate-800'}`}></i> 
                        {isEditMode ? (
                          <div className="flex-1 flex gap-2 items-center">
                            <input 
                              className="bg-transparent border border-slate-300 px-2 py-1 w-full text-[10px] rounded-none" 
                              value={b} 
                              onChange={e => {
                                const newBenefits = [...config.benefits];
                                newBenefits[i] = e.target.value;
                                handleUpdateMembershipConfig(tier, { benefits: newBenefits });
                              }}
                            />
                            <button 
                              onClick={() => {
                                const newBenefits = config.benefits.filter((_: any, idx: number) => idx !== i);
                                handleUpdateMembershipConfig(tier, { benefits: newBenefits });
                              }}
                              className="text-red-500"
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
                      onClick={() => {
                        handleUpdateMembershipConfig(tier, { benefits: [...config.benefits, "Nuevo beneficio"] });
                      }}
                      className="mt-4 w-full py-2 border border-dashed border-slate-400 text-[9px] font-bold uppercase hover:bg-slate-100 transition-colors rounded-none"
                    >
                      + Agregar Beneficio
                    </button>
                  )}
                </div>

                {!isEditMode && (
                  <button 
                    onClick={() => {
                      if (!user) { handleNavigate('login'); return; }
                      setPendingTier(tier as MembershipTier);
                    }}
                    disabled={isCurrent}
                    className={`w-full py-4 font-bold text-[10px] uppercase tracking-widest transition-colors rounded-none ${
                      isCurrent 
                        ? 'bg-green-100 text-green-800 cursor-default' 
                        : tier === 'ELITE' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isCurrent ? 'Plan Actual' : 'Suscribirme'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Layout user={user} currentView={currentView} onNavigate={handleNavigate} onLogout={handleLogout} isEditMode={isEditMode} setIsEditMode={setIsEditMode}>
      {emailToast && (
        <div className="fixed top-24 right-6 z-[250] bg-white border border-l-4 border-l-blue-600 border-slate-200 p-5 shadow-lg flex items-center gap-4 animate-in slide-in-from-right duration-500 rounded-none">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Notificación</p>
              <p className="text-xs font-bold text-slate-800">{emailToast.subject}</p>
           </div>
        </div>
      )}

      {currentView === 'home' && renderHome()}
      {currentView === 'login' && <Auth onAuthSuccess={handleAuthSuccess} onCancel={() => handleNavigate('home')} />}
      {currentView === 'profile' && user && <UserProfile user={user} onNavigate={handleNavigate} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />}
      {currentView === 'about' && renderAbout()}
      {currentView === 'tours' && renderTours()}
      {currentView === 'spaces' && renderSpaces()}
      {currentView === 'memberships' && renderMemberships()}
      {currentView === 'admin' && user?.role === 'ADMIN' && (
        <div className="container px-4 md:px-0">
          <AdminDashboard 
            tours={tours} 
            spaces={spaces} 
            onAddTour={(t) => setTours([...tours, t])}
            onDeleteTour={handleDeleteTour}
          />
        </div>
      )}
      
      {pendingTier && (
        <PaymentModal tier={pendingTier} onSuccess={handlePaymentSuccess} onCancel={() => setPendingTier(null)} />
      )}
      
      <FloatingContact />
    </Layout>
  );
};

export default App;
