
import React from 'react';

interface AboutProps {
  isEditMode: boolean;
  content: {
    title: string;
    story: string;
    mission: string;
    vision: string;
  };
  onUpdate: (updates: any) => void;
}

const About: React.FC<AboutProps> = ({ isEditMode, content, onUpdate }) => {
  return (
    <div className="container mx-auto px-4 py-20 space-y-24">
      <section className="max-w-4xl mx-auto text-center space-y-8">
        {isEditMode ? (
          <input 
            className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-center w-full bg-blue-50 border-2 border-dashed border-blue-200 p-2 outline-none"
            value={content.title}
            onChange={e => onUpdate({ title: e.target.value })}
          />
        ) : (
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{content.title}</h2>
        )}
        <div className="w-24 h-2 bg-blue-600 mx-auto"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h3 className="text-2xl font-black uppercase italic text-blue-600">Nuestra Historia</h3>
          {isEditMode ? (
            <textarea 
              className="w-full h-64 p-4 bg-blue-50 border-2 border-dashed border-blue-200 text-slate-600 font-medium leading-relaxed outline-none"
              value={content.story}
              onChange={e => onUpdate({ story: e.target.value })}
            />
          ) : (
            <p className="text-lg text-slate-600 font-medium leading-relaxed">{content.story}</p>
          )}
        </div>
        <div className="relative aspect-square bg-slate-100 overflow-hidden border border-slate-200">
           <img src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" alt="GNM Team" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-slate-900 text-white p-12 space-y-6">
           <i className="fa-solid fa-rocket text-4xl text-blue-400"></i>
           <h4 className="text-2xl font-black uppercase">Misión</h4>
           {isEditMode ? (
             <textarea 
               className="w-full h-32 bg-slate-800 border border-slate-700 p-2 text-sm outline-none"
               value={content.mission}
               onChange={e => onUpdate({ mission: e.target.value })}
             />
           ) : (
             <p className="text-slate-400 font-medium leading-relaxed">{content.mission}</p>
           )}
        </div>
        <div className="bg-blue-600 text-white p-12 space-y-6 shadow-xl shadow-blue-500/20">
           <i className="fa-solid fa-eye text-4xl text-white"></i>
           <h4 className="text-2xl font-black uppercase">Visión</h4>
           {isEditMode ? (
             <textarea 
               className="w-full h-32 bg-blue-700 border border-blue-500 p-2 text-sm outline-none"
               value={content.vision}
               onChange={e => onUpdate({ vision: e.target.value })}
             />
           ) : (
             <p className="text-blue-100 font-medium leading-relaxed">{content.vision}</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default About;
