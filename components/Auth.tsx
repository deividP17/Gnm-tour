
import React, { useState } from 'react';
import { User, MembershipTier } from '../types';
import { GNM_API } from '../services/api';
import { EmailService } from '../services/notificationService';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  onCancel: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingVerification, setWaitingVerification] = useState(false); // Nuevo estado

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validaciones Básicas
    if (!formData.email.includes('@')) {
      setError('Formato de email inválido.');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isLogin) {
        if (!formData.name.trim()) throw new Error('El nombre es obligatorio.');
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        
        // REGISTRO
        const user = await GNM_API.auth.register(formData.name, formData.email, formData.password);
        
        // Simular envío de email
        EmailService.sendEmail(
            user.email, 
            "Confirma tu cuenta GNM TOUR", 
            `Hola ${user.name}, haz click en el enlace para activar tu cuenta.`
        );

        setWaitingVerification(true); // Cambiar a vista de "Email Enviado"
        setIsSubmitting(false);

      } else {
        // LOGIN
        const user = await GNM_API.auth.login(formData.email, formData.password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación.');
      setIsSubmitting(false);
    }
  };

  const handleSimulatedVerification = async () => {
      setIsSubmitting(true);
      try {
          const user = await GNM_API.auth.verifyEmail(formData.email);
          onAuthSuccess(user);
      } catch (e) {
          setError('Error al verificar.');
      } finally {
          setIsSubmitting(false);
      }
  };

  const loginAsDemo = (role: 'ADMIN' | 'USER') => {
    setIsLogin(true);
    const email = role === 'ADMIN' ? 'gerardolaf71@gmail.com' : 'juancp@gmail.com';
    setFormData({
      ...formData,
      email: email,
      password: 'demo',
      confirmPassword: 'demo'
    });
    
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    }, 200);
  };

  if (waitingVerification) {
      return (
        <div className="max-w-md mx-auto bg-white border border-slate-200 animate-in zoom-in duration-300 rounded-none shadow-lg p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto rounded-full animate-pulse">
               <i className="fa-regular fa-envelope"></i>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Confirma tu Email</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Hemos enviado un enlace de confirmación a <strong>{formData.email}</strong>. 
                Por favor, revisa tu bandeja de entrada (y spam) para activar tu cuenta.
            </p>
            
            <div className="bg-slate-50 p-4 border border-slate-200 mt-6">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Simulación de Entorno (Solo Demo)</p>
                <button 
                    onClick={handleSimulatedVerification}
                    disabled={isSubmitting}
                    className="text-blue-600 font-bold text-xs uppercase underline hover:text-blue-800"
                >
                    {isSubmitting ? 'Verificando...' : 'Hacer click aquí para simular confirmación'}
                </button>
            </div>
            
            <button onClick={() => setWaitingVerification(false)} className="text-slate-400 text-xs font-bold uppercase hover:text-slate-600 mt-4">
                Volver
            </button>
        </div>
      );
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 animate-in fade-in duration-300 rounded-none shadow-lg">
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(''); }}
          className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none ${isLogin ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 bg-white'}`}
        >
          Acceso Socio
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(''); }}
          className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none ${!isLogin ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 bg-white'}`}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 rounded-none">G</div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
          </h2>
        </div>

        {!isLogin && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</label>
            <input
              required
              disabled={isSubmitting}
              type="text"
              className="w-full p-3 bg-white border border-slate-300 focus:border-blue-600 outline-none transition-colors font-medium rounded-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Email</label>
          <input
            required
            disabled={isSubmitting}
            type="email"
            className="w-full p-3 bg-white border border-slate-300 focus:border-blue-600 outline-none transition-colors font-medium rounded-none"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-500">Contraseña</label>
          <input
            required
            disabled={isSubmitting}
            type="password"
            className="w-full p-3 bg-white border border-slate-300 focus:border-blue-600 outline-none transition-colors font-medium rounded-none"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>

        {!isLogin && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold uppercase text-slate-500">Confirmar Contraseña</label>
            <input
              required
              disabled={isSubmitting}
              type="password"
              className="w-full p-3 bg-white border border-slate-300 focus:border-blue-600 outline-none transition-colors font-medium rounded-none"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-3 border border-red-200 rounded-none">
            <p className="text-red-600 text-[10px] font-bold text-center uppercase tracking-widest">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-colors disabled:bg-slate-300 rounded-none"
        >
          {isSubmitting ? 'Procesando...' : (isLogin ? 'Ingresar' : 'Registrarme')}
        </button>

        {isLogin && (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => loginAsDemo('ADMIN')}
              className="bg-slate-50 text-slate-600 py-3 text-[9px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200 rounded-none"
            >
              Demo Admin
            </button>
            <button
              type="button"
              onClick={() => loginAsDemo('USER')}
              className="bg-slate-50 text-slate-600 py-3 text-[9px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200 rounded-none"
            >
              Demo Socio
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="w-full text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors rounded-none"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
};

export default Auth;
