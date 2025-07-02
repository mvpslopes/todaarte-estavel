import React from 'react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { AdminDashboard } from '../components/dashboard/admin/AdminDashboard';
import { ProjectManagement } from '../components/dashboard/admin/ProjectManagement';
import { ClientDashboard } from '../components/dashboard/client/ClientDashboard';
import { ClientProjects } from '../components/dashboard/client/ClientProjects';
import { useAuth } from '../contexts/AuthContext';
import { FinancialCategories } from '../components/dashboard/admin/FinancialCategories';
import { UserManagement } from '../components/dashboard/admin/UserManagement';
import { FinancialTransactions } from '../components/dashboard/admin/FinancialTransactions';
import FixedAccounts from '../components/dashboard/admin/FixedAccounts';
import Suppliers from '../components/dashboard/admin/Suppliers';
import { Routes, Route, Navigate } from 'react-router-dom';
import Chat from '../components/dashboard/Chat';
import FinancialDashboard from '../components/dashboard/admin/FinancialDashboard';
import FinancialReceipts from '../components/dashboard/admin/FinancialReceipts';
import Agenda from '../components/dashboard/admin/Agenda';
import Clientes from '../components/dashboard/admin/Clientes';

export function Dashboard() {
  const { user } = useAuth();
  console.log('Usuário no Dashboard:', user);

  if (!user) return <div>Carregando usuário...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Routes>
          {/* Rotas para admin */}
          {user?.role === 'admin' && <>
            <Route path="" element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="projects" element={<ProjectManagement />} />
            <Route path="clients" element={<div className="p-8"><h1 className="text-2xl font-bold">Gerenciar Clientes</h1><p>Em desenvolvimento...</p></div>} />
            <Route path="portfolio" element={<div className="p-8"><h1 className="text-2xl font-bold">Gerenciar Portfólio</h1><p>Em desenvolvimento...</p></div>} />
            <Route path="financials-categories" element={<FinancialCategories />} />
            <Route path="financial-transactions" element={<FinancialTransactions />} />
            <Route path="financial-accounts" element={<FixedAccounts />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Configurações</h1><p>Em desenvolvimento...</p></div>} />
            <Route path="users" element={<UserManagement />} />
            <Route path="fornecedores" element={<Suppliers />} />
            <Route path="messages" element={user ? <Chat usuarioId={Number(user.id)} /> : null} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>}
          {/* Rotas para cliente */}
          {user?.role === 'client' && <>
            <Route path="" element={<ClientDashboard />} />
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="projects" element={<ClientProjects />} />
            <Route path="messages" element={<div className="p-8"><h1 className="text-2xl font-bold">Mensagens</h1><p>Em desenvolvimento...</p></div>} />
            <Route path="settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Configurações</h1><p>Em desenvolvimento...</p></div>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>}
        </Routes>
      </div>
    </div>
  );
}