import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Hero } from '../components/landing/Hero';
import { Portfolio } from '../components/landing/Portfolio';
import { Services } from '../components/landing/Services';
import { Contact } from '../components/landing/Contact';
import { WhatsAppButton } from '../components/layout/WhatsAppButton';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { user } = useAuth();

  const handleNavClick = (section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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