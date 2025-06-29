import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Hero } from '../components/landing/Hero';
import { Portfolio } from '../components/landing/Portfolio';
import { Services } from '../components/landing/Services';
import { Contact } from '../components/landing/Contact';
import { WhatsAppButton } from '../components/layout/WhatsAppButton';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { user, isLoading, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleNavClick = (section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-neutral-800">
        <div className="text-white text-lg font-semibold">Desconectando...</div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-neutral-800">
        <div className="text-white text-lg font-semibold">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header onNavClick={handleNavClick} isLandingPage={true} onShowLogin={() => setShowLogin(true)} />
      
      <main>
        <Hero />
        <Portfolio />
        <Services />
        <Contact />
      </main>

      <WhatsAppButton />

      {showLogin && (
        <LoginForm 
          onClose={() => setShowLogin(false)} 
          onShowRegister={() => { setShowLogin(false); setShowRegister(true); }}
        />
      )}
      {showRegister && (
        <RegisterForm onClose={() => setShowRegister(false)} />
      )}
    </div>
  );
}