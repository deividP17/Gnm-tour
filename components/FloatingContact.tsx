
import React from 'react';

const FloatingContact: React.FC = () => {
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
    </div>
  );
};

export default FloatingContact;
