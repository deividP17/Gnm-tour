
import React, { useState } from 'react';
import LegalAgent from './LegalAgent';

const FloatingContact: React.FC = () => {
  const [showLegal, setShowLegal] = useState(false);

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Hola Gerardo! Consulta desde GNM TOUR.");
    window.open(`https://wa.me/543794532196?text=${message}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3">
      <div className="relative group">
        <button 
          onClick={handleWhatsApp}
          className="w-14 h-14 bg-[#25D366] text-white flex items-center justify-center text-2xl hover:bg-[#20bd5a] transition-colors rounded-none shadow-lg"
          title="WhatsApp"
        >
          <i className="fa-brands fa-whatsapp"></i>
        </button>
      </div>

      <div className="relative group">
        <button 
          onClick={() => setShowLegal(!showLegal)}
          className={`w-14 h-14 flex items-center justify-center text-xl transition-colors rounded-none shadow-lg border border-slate-200 ${
            showLegal ? 'bg-slate-900 text-white' : 'bg-white text-blue-600 hover:bg-slate-100'
          }`}
          title="Legal"
        >
          <i className={`fa-solid ${showLegal ? 'fa-xmark' : 'fa-scale-balanced'}`}></i>
        </button>
      </div>

      {showLegal && (
        <div className="absolute bottom-20 right-0 animate-in fade-in duration-200">
           <LegalAgent isEmbedded={true} onClose={() => setShowLegal(false)} />
        </div>
      )}
    </div>
  );
};

export default FloatingContact;
