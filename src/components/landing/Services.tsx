import React from 'react';
import { Palette, Megaphone, Monitor, FileText, ArrowRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const iconMap = {
  Palette,
  Megaphone,
  Monitor,
  FileText
};

type Service = {
  id: string;
  icon: keyof typeof iconMap;
  name: string;
  description: string;
  price?: string;
};

export function Services() {
  const { services } = { services: [] as Service[] };

  return (
    <section id="services" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Nossos Serviços
          </h2>
          <p className="text-xl text-white max-w-3xl mx-auto">
            Oferecemos soluções completas para elevar sua marca ao próximo nível
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => {
            const IconComponent = iconMap[service.icon as keyof typeof iconMap];
            
            return (
              <div
                key={service.id}
                className="group bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-logo to-logo-light rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{service.name}</h3>
                  <p className="text-gray-100 leading-relaxed">{service.description}</p>
                </div>

                <div className="flex justify-between items-center">
                  {service.price && (
                    <span className="text-white font-semibold">{service.price}</span>
                  )}
                  <button className="flex items-center space-x-1 text-black hover:text-black transition-colors group-hover:translate-x-1">
                    <span className="font-medium">Saiba mais</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-white mb-8">
            Não encontrou o que procura? Vamos conversar sobre seu projeto!
          </p>
          <button className="bg-gradient-to-r from-logo to-logo-light text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            Solicitar Orçamento Personalizado
          </button>
        </div>
      </div>
    </section>
  );
}