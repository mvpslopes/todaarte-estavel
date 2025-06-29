import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'client';
  company?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<'admin' | 'client'>('client');
  const [company, setCompany] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'client'>('client');
  const [editCompany, setEditCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Usuário logado para auditoria
  const { user, setUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/usuarios-lista');
      if (!res.ok) throw new Error('Erro ao buscar usuários');
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setFeedback({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          name: nome,
          email,
          senha,
          role,
          company: company || undefined,
          usuario_id: user?.id,
          usuario_nome: user?.name
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar usuário.');
      }
      setFeedback({ type: 'success', message: 'Usuário cadastrado com sucesso!' });
      setNome(''); setEmail(''); setSenha(''); setRole('client'); setCompany('');
      // Atualiza lista
      const data = await res.json();
      setUsers(prev => [...prev, { ...data, name: data.name || data.nome }]);
      // Se o usuário cadastrado for o mesmo que está logado, atualiza contexto e localStorage
      if (user && String(data.id) === String(user.id)) {
        const updatedUser = { ...user, name: data.name, email: data.email, role: data.role, company: data.company };
        setUser(updatedUser);
        localStorage.setItem('todaarte_user', JSON.stringify(updatedUser));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro desconhecido.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setEditNome(user.name);
    setEditEmail(user.email);
    setEditSenha('');
    setEditRole(user.role);
    setEditCompany(user.company || '');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNome.trim() || !editEmail.trim()) {
      setFeedback({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${editUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editNome,
          email: editEmail,
          senha: editSenha || undefined,
          role: editRole,
          company: editCompany || undefined,
          usuario_id: user?.id,
          usuario_nome: user?.name
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao editar usuário.');
      }
      setFeedback({ type: 'success', message: 'Usuário editado com sucesso!' });
      setEditUser(null);
      await fetchUsers();
      // Se o usuário editado for o mesmo que está logado, atualiza contexto e localStorage
      if (user && editUser && String(editUser.id) === String(user.id)) {
        const updatedUser = { ...user, name: editNome, email: editEmail, role: editRole, company: editCompany };
        setUser(updatedUser);
        localStorage.setItem('todaarte_user', JSON.stringify(updatedUser));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro desconhecido.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm('Deseja realmente excluir este usuário?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: user.id, usuario_nome: user.name })
      });
      if (!res.ok) throw new Error('Erro ao excluir usuário.');
      setUsers(users.filter(u => u.id !== user.id));
      await fetchUsers();
      setFeedback({ type: 'success', message: 'Usuário excluído com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro desconhecido.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="text-3xl font-bold mb-8 text-center w-full">Cadastro de Usuários</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10 flex flex-col gap-4 max-w-4xl w-full mx-auto"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Nome completo"
            className="input input-bordered w-full bg-blue-50"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="E-mail"
            className="input input-bordered w-full bg-blue-50"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              className="input input-bordered w-full bg-blue-50 pr-10"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <select
            className="input input-bordered w-full"
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'client')}
          >
            <option value="client">Cliente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Empresa"
          className="input input-bordered w-full"
          value={company}
          onChange={e => setCompany(e.target.value)}
        />
        <button
          type="submit"
          className="btn bg-gradient-to-r from-logo to-logo-light text-white text-lg font-semibold mt-2 shadow-md rounded-lg hover:from-logo-dark hover:to-logo-light transition-all"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
        </button>
      </form>
      <h2 className="text-xl font-bold mb-4 text-center w-full">Usuários Cadastrados</h2>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 max-w-4xl w-full mx-auto mt-6">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 font-medium">{u.name}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{u.email}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{u.role === 'admin' ? 'Administrador' : 'Cliente'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{u.company || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right flex gap-2 justify-end items-center">
                  <button
                    onClick={() => openEditModal(u)}
                    className="px-3 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold text-xs transition-all"
                  >Editar</button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="px-3 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 font-semibold text-xs transition-all"
                  >Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-black"
              onClick={() => setEditUser(null)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Editar Usuário</h2>
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={editNome}
                onChange={e => setEditNome(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
                required
              />
              <input
                type="email"
                placeholder="E-mail"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="Nova senha (opcional)"
                value={editSenha}
                onChange={e => setEditSenha(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
              />
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value as 'admin' | 'client')}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="client">Cliente</option>
                <option value="admin">Administrador</option>
              </select>
              <input
                type="text"
                placeholder="Empresa (opcional)"
                value={editCompany}
                onChange={e => setEditCompany(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={loading}
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 