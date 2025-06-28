import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setIsSubmitted(false), 3000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section id="contact" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Vamos Conversar?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Estamos prontos para transformar suas ideias em realidade. Entre em contato conosco!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Informações de Contato</h3>
              <div className="space-y-6">
                {[
                  {
                    icon: Mail,
                    title: 'E-mail',
                    content: 'contato@todaarte.com.br',
                    link: 'mailto:contato@todaarte.com.br'
                  },
                  {
                    icon: Phone,
                    title: 'Telefone',
                    content: '+55 31 9610-1939',
                    link: 'tel:+553196101939'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="bg-gradient-to-br from-logo to-logo-light p-3 rounded-lg">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                      {item.link ? (
                        <a 
                          href={item.link} 
                          className="text-gray-300 hover:text-black transition-colors"
                        >
                          {item.content}
                        </a>
                      ) : (
                        <p className="text-gray-300">{item.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-logo/10 to-logo-light/10 backdrop-blur-sm border border-logo/20 rounded-2xl p-6">
              <h4 className="text-white font-semibold mb-3">Horário de Atendimento</h4>
              <table className="w-full text-gray-300">
                <tbody>
                  <tr>
                    <td className="pr-4">Domingo:</td>
                    <td className="italic">Fechada</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Segunda-feira:</td>
                    <td>14:00 – 19:00</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Terça-feira:</td>
                    <td>14:00 – 19:00</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Quarta-feira:</td>
                    <td>14:00 – 19:00</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Quinta-feira:</td>
                    <td>14:00 – 19:00</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Sexta-feira:</td>
                    <td>14:00 – 17:00</td>
                  </tr>
                  <tr>
                    <td className="pr-4">Sábado:</td>
                    <td className="italic">Fechada</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gradient-to-br from-logo to-logo-light border border-logo rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">Envie sua Mensagem</h3>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-white mb-2">Mensagem Enviada!</h4>
                <p className="text-gray-300">Entraremos em contato em breve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-white font-medium mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/30 border border-logo-light rounded-lg text-black placeholder-gray-700 focus:outline-none focus:border-logo focus:ring-2 focus:ring-logo-light/20 transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-white font-medium mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/30 border border-logo-light rounded-lg text-black placeholder-gray-700 focus:outline-none focus:border-logo focus:ring-2 focus:ring-logo-light/20 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-white font-medium mb-2">
                    Assunto *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/30 border border-logo-light rounded-lg text-black placeholder-gray-700 focus:outline-none focus:border-logo focus:ring-2 focus:ring-logo-light/20 transition-all"
                    placeholder="Como podemos ajudar?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-white font-medium mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/30 border border-logo-light rounded-lg text-black placeholder-gray-700 focus:outline-none focus:border-logo focus:ring-2 focus:ring-logo-light/20 transition-all resize-none"
                    placeholder="Conte-nos sobre seu projeto..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 border border-black hover:border-yellow-400 hover:text-yellow-300"
                >
                  <Send className="h-5 w-5" />
                  <span>Enviar Mensagem</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}