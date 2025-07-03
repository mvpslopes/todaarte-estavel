import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  DollarSign, 
  Settings,
  Palette,
  Briefcase,
  MessageSquare,
  LogOut,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export function Sidebar() {
  const { user, logout } = useAuth();
  const [financeOpen, setFinanceOpen] = useState(true);
  const location = useLocation();

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { id: 'agenda', label: 'Agenda', icon: Calendar, to: '/dashboard/agenda' },
    { id: 'clientes', label: 'Clientes', icon: Users, to: '/dashboard/clientes' },
    { id: 'users', label: 'Usuários', icon: Users, to: '/dashboard/users' },
    { id: 'projects', label: 'Projetos', icon: FolderOpen, to: '/dashboard/projects' },
    { id: 'portfolio', label: 'Portfólio', icon: Palette, to: '/dashboard/portfolio' },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare, to: '/dashboard/messages' },
    { id: 'audit-logs', label: 'Logs de Auditoria', icon: LogOut, to: '/dashboard/audit-logs' },
    { id: 'settings', label: 'Configurações', icon: Settings, to: '/dashboard/settings' },
    { id: 'fornecedores', label: 'Fornecedores', icon: Users, to: '/dashboard/fornecedores' },
  ];

  const financeMenu = [
    { id: 'financial-dashboard', label: 'Dashboard Financeiro', to: '/dashboard/financials-dashboard' },
    { id: 'financial-transactions', label: 'Transações', to: '/dashboard/financial-transactions' },
    { id: 'financial-accounts', label: 'Contas Fixas', to: '/dashboard/financial-accounts' },
    { id: 'financials-categories', label: 'Categorias Financeiras', to: '/dashboard/financials-categories' },
    { id: 'financial-receipts', label: 'Recibos', to: '/dashboard/financial-receipts' },
  ];

  const clientMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { id: 'projects', label: 'Meus Projetos', icon: Briefcase, to: '/dashboard/projects' },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare, to: '/dashboard/messages' },
    { id: 'settings', label: 'Configurações', icon: Settings, to: '/dashboard/settings' },
  ];

  const userMenuItems = [
    { id: 'agenda', label: 'Agenda', icon: Calendar, to: '/dashboard/agenda' },
    { id: 'projects', label: 'Projetos', icon: FolderOpen, to: '/dashboard/projects' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : user?.role === 'user' ? userMenuItems : clientMenuItems;

  return (
    <div className="bg-white h-screen w-64 shadow-lg border-r border-gray-200 flex flex-col overflow-y-auto">
      <div>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Palette className="h-8 w-8 text-logo" />
          <span className="text-xl font-bold bg-gradient-to-r from-logo to-logo-light bg-clip-text text-transparent">
            Toda Arte
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Painel {user?.role === 'admin' ? 'Administrativo' : 'do Cliente'}
        </p>
      </div>
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.filter(item => !['fornecedores'].includes(item.id)).map((item) => (
            item.id !== 'audit-logs' && item.id !== 'settings' ? (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 no-underline ${
                    location.pathname === item.to
                      ? 'bg-gradient-to-r from-logo to-logo-light text-white shadow-lg'
                      : 'text-gray-700 hover:bg-logo-light/60'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ) : null
          ))}

          {user?.role === 'admin' && (
            <li>
              <button
                onClick={() => setFinanceOpen(open => !open)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  financeMenu.some(f => location.pathname === f.to)
                    ? 'bg-gradient-to-r from-logo to-logo-light text-white shadow-lg'
                    : 'text-gray-700 hover:bg-logo-light/60'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Financeiro</span>
                <span className="ml-auto">{financeOpen ? '▲' : '▼'}</span>
              </button>
              {financeOpen && (
                <ul className="ml-6 mt-3 space-y-3">
                  {financeMenu.map(f => (
                    <li key={f.id}>
                      <Link
                        to={f.to}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 no-underline ${
                          location.pathname === f.to
                            ? 'bg-logo-light/50 text-logo font-semibold'
                            : 'text-gray-700 hover:bg-logo-light/20'
                        }`}
                      >{f.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {user?.role === 'admin' && (
            <li>
              <Link
                to="/dashboard/fornecedores"
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 no-underline ${
                  location.pathname === '/dashboard/fornecedores'
                    ? 'bg-gradient-to-r from-logo to-logo-light text-white shadow-lg'
                    : 'text-gray-700 hover:bg-logo-light/60'
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Fornecedores</span>
              </Link>
            </li>
          )}

          {menuItems.filter(item => ['audit-logs', 'settings'].includes(item.id)).map(item => (
            <li key={item.id}>
              <Link
                to={item.to}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 no-underline ${
                  location.pathname === item.to
                    ? 'bg-gradient-to-r from-logo to-logo-light text-white shadow-lg'
                    : 'text-gray-700 hover:bg-logo-light/60'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      </div>
      <div className="p-4 border-t border-gray-200 mt-4 bg-white">
        <div className="flex items-center space-x-3 mb-2">
          {user?.avatar && (
            <img 
              src={user.avatar} 
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full flex items-center justify-center space-x-2 text-red-600 hover:text-red-700 font-medium py-2 rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}