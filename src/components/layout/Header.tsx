import React, { useState } from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png';

interface HeaderProps {
  onNavClick?: (section: string) => void;
  isLandingPage?: boolean;
  onShowLogin?: () => void;
}

export function Header({ onNavClick, isLandingPage = false, onShowLogin }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = isLandingPage 
    ? [
        { label: 'Início', section: 'hero' },
        { label: 'Portfólio', section: 'portfolio' },
        { label: 'Serviços', section: 'services' },
        { label: 'Contato', section: 'contact' }
      ]
    : [];

  const handleNavClick = (section: string) => {
    if (onNavClick) {
      onNavClick(section);
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Logo Toda Arte" className="h-24 w-24 object-contain" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* Navegação centralizada na landing page */}
            {isLandingPage && (
              <div className="flex-1 flex justify-center space-x-8">
                {navItems.map((item) => (
                  <button
                    key={item.section}
                    onClick={() => handleNavClick(item.section)}
                    className="text-gray-700 hover:text-black transition-colors font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Se for landing page, mostrar botão 'Ir para o painel' se logado, senão botão de login */}
            {isLandingPage ? (
              user ? (
                <a
                  href="/dashboard"
                  className="ml-8 bg-black text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Ir para o painel
                </a>
              ) : (
                <button
                  onClick={onShowLogin}
                  className="ml-8 bg-gradient-to-r from-logo to-logo-light text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Área do Cliente
                </button>
              )
            ) : (
              user ? (
              <div className="flex items-center space-x-4 ml-8 pl-8 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  {user.avatar && (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onShowLogin}
                className="ml-8 bg-gradient-to-r from-logo to-logo-light text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Área do Cliente
              </button>
              )
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-700"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-200 mt-4 pt-4">
            {navItems.map((item) => (
              <button
                key={item.section}
                onClick={() => handleNavClick(item.section)}
                className="block w-full text-left py-2 text-gray-700 hover:text-black transition-colors"
              >
                {item.label}
              </button>
            ))}
            
            {/* Se for landing page, mostrar botão 'Ir para o painel' se logado, senão botão de login */}
            {isLandingPage ? (
              user ? (
                <a
                  href="/dashboard"
                  className="mt-4 w-full bg-black text-white px-5 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl block text-center"
                >
                  Ir para o painel
                </a>
              ) : (
                <button
                  onClick={onShowLogin}
                  className="mt-4 w-full bg-gradient-to-r from-logo to-logo-light text-white px-5 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Área do Cliente
                </button>
              )
            ) : (
              user ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  {user.avatar && (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onShowLogin}
                className="mt-4 w-full bg-gradient-to-r from-logo to-logo-light text-white px-5 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Área do Cliente
              </button>
              )
            )}
          </nav>
        )}
      </div>
    </header>
  );
}