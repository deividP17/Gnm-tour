
import React, { useState } from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  currentView: string;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  onSaveChanges?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onNavigate, onLogout, currentView, isEditMode, setIsEditMode, onSaveChanges }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { view: 'home', label: 'Inicio', icon: 'fa-house' },
    { view: 'about', label: 'Nosotros', icon: 'fa-users' },
    { view: 'tours', label: 'Catálogo', icon: 'fa-bus' },
    { view: 'spaces', label: 'Espacios', icon: 'fa-building-user' },
    { view: 'memberships', label: 'Membresías', icon: 'fa-crown' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* HEADER */}
      <nav className="sticky top-0 z-[150] bg-white border-b border-slate-200">
        <div className="container h-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => {onNavigate('home'); setIsMobileMenuOpen(false);}}>
            <div className="w-10 h-10 bg-slate-900 flex items-center justify-center text-white text-xl font-bold rounded-none">G</div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">GNM TOUR</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 mt-1">Argentina</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <button
                key={link.view}
                onClick={() => onNavigate(link.view)}
                className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors rounded-none ${
                  currentView === link.view ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
            
            {user?.role === 'ADMIN' && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
                <button 
                  onClick={() => onNavigate('admin')}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors rounded-none border border-blue-600 ${
                    currentView === 'admin' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <i className="fa-solid fa-gauge-high mr-2"></i> Admin
                </button>
                <div className="flex flex-col items-center ml-2">
                   <span className="text-[9px] font-bold uppercase text-slate-400 mb-1">Edición</span>
                   <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`w-10 h-5 transition-colors relative rounded-none ${isEditMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all rounded-none ${isEditMode ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isEditMode && user?.role === 'ADMIN' && (
              <button 
                onClick={onSaveChanges}
                className="bg-orange-500 text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg animate-pulse"
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i> Guardar Cambios
              </button>
            )}

            {!user ? (
              <button 
                onClick={() => onNavigate('login')}
                className="hidden sm:flex bg-slate-900 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors rounded-none"
              >
                Ingresar
              </button>
            ) : (
              <div onClick={() => onNavigate('profile')} title="Ver Perfil" className="hidden sm:flex items-center gap-3 border border-slate-200 p-1 pr-4 cursor-pointer hover:bg-slate-50 transition-colors rounded-none">
                <div className="w-8 h-8 bg-slate-100 flex items-center justify-center text-slate-700 font-bold rounded-none">
                   {user.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">{user.name.split(' ')[0]}</span>
                </div>
              </div>
            )}
            
            <button 
              className="lg:hidden w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-900 text-lg rounded-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-0 flex flex-col shadow-lg">
            {isEditMode && (
               <button onClick={onSaveChanges} className="w-full bg-orange-500 text-white p-6 font-black uppercase tracking-widest text-xs">Guardar Cambios Ahora</button>
            )}
            {user?.role === 'ADMIN' && (
              <div className="flex flex-col gap-2 p-4 bg-slate-50 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Admin</span>
                  <button onClick={() => {onNavigate('admin'); setIsMobileMenuOpen(false);}} className="bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase rounded-none">Panel</button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Edición</span>
                  <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`w-10 h-5 transition-colors relative rounded-none ${isEditMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all rounded-none ${isEditMode ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>
            )}
            {navLinks.map(link => (
              <button
                key={link.view}
                onClick={() => { onNavigate(link.view); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 p-5 text-xs font-bold uppercase tracking-widest border-b border-slate-100 last:border-0 rounded-none ${
                  currentView === link.view ? 'bg-slate-50 text-slate-900' : 'bg-white text-slate-500'
                }`}
              >
                <i className={`fa-solid ${link.icon} w-5 text-center`}></i> {link.label}
              </button>
            ))}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              {!user ? (
                <button 
                  onClick={() => {onNavigate('login'); setIsMobileMenuOpen(false);}}
                  className="w-full bg-slate-900 text-white p-4 text-xs font-bold uppercase tracking-widest rounded-none"
                >
                  Iniciar Sesión
                </button>
              ) : (
                <div className="space-y-2">
                   <button onClick={() => {onNavigate('profile'); setIsMobileMenuOpen(false);}} className="w-full bg-white border border-slate-300 text-slate-900 p-3 text-xs font-bold uppercase tracking-widest flex items-center gap-3 rounded-none justify-center">
                       <i className="fa-solid fa-user"></i> Mi Perfil
                   </button>
                   <button onClick={() => {onLogout(); setIsMobileMenuOpen(false);}} className="w-full bg-red-600 text-white p-3 text-xs font-bold uppercase tracking-widest flex items-center gap-3 rounded-none justify-center">
                     <i className="fa-solid fa-power-off"></i> Salir
                   </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className={`flex-1 ${currentView === 'home' ? 'pb-0' : 'py-12'}`}>
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="container px-4">
          <div className="row g-5">
            <div className="col-12 col-md-4 space-y-6 text-center text-md-start">
              <div className="flex items-center justify-center md:justify-start gap-4 text-white">
                <div className="w-10 h-10 bg-white text-slate-900 flex items-center justify-center text-xl font-bold rounded-none">G</div>
                <span className="text-xl font-bold tracking-tight">GNM TOUR</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mx-auto md:mx-0 font-medium">Experiencias turísticas profesionales en Argentina.</p>
            </div>
            <div className="col-6 col-md-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-6">Mapa del Sitio</h4>
              <ul className="text-xs space-y-4 font-medium">
                <li onClick={() => onNavigate('home')} className="hover:text-white cursor-pointer transition-colors">Inicio</li>
                <li onClick={() => onNavigate('tours')} className="hover:text-white cursor-pointer transition-colors">Catálogo</li>
                <li onClick={() => onNavigate('spaces')} className="hover:text-white cursor-pointer transition-colors">Espacios</li>
                <li onClick={() => onNavigate('memberships')} className="hover:text-white cursor-pointer transition-colors">Membresías</li>
              </ul>
            </div>
            <div className="col-12 col-md-4 text-center text-md-end space-y-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-6">Contacto</h4>
              <p className="text-white font-bold text-lg">+54 379 453-2196</p>
              <p className="text-xs font-medium">gerardolaf71@gmail.com</p>
              <p className="text-xs opacity-60 mt-4">Corrientes, Argentina</p>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest">© 2026 GNM TOUR. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
