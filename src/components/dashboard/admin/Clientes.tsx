import React, { useEffect, useState } from 'react';

interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  observacoes: string;
  cpf_cnpj: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Cliente, 'id'>>({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    observacoes: '',
    cpf_cnpj: '',
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    setLoading(true);
    const res = await fetch('/api/clientes');
    let data = [];
    try {
      data = await res.json();
      if (!Array.isArray(data)) data = [];
    } catch {
      data = [];
    }
    setClientes(data);
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleEdit(cliente: Cliente) {
    setEditId(cliente.id);
    setForm({
      nome: cliente.nome,
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      empresa: cliente.empresa || '',
      observacoes: cliente.observacoes || '',
      cpf_cnpj: cliente.cpf_cnpj || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editId) {
      await fetch(`/api/clientes/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    setEditId(null);
    setForm({ nome: '', email: '', telefone: '', empresa: '', observacoes: '', cpf_cnpj: '' });
    fetchClientes();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    setLoading(true);
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    fetchClientes();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black drop-shadow-sm">Clientes</h1>
        <button className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-2 rounded-xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-logo/50" onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', email: '', telefone: '', empresa: '', observacoes: '', cpf_cnpj: '' }); }}>
          Novo Cliente
        </button>
      </div>
      {showForm && (
        <form className="bg-white p-6 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end border border-logo-light/30" onSubmit={handleSubmit}>
          <div className="w-full mb-2">
            <h2 className="text-xl font-bold text-logo mb-2">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          </div>
          <div className="flex flex-col min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
          </div>
          <div className="flex flex-col min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" type="email" />
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" />
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input name="empresa" value={form.empresa} onChange={handleChange} placeholder="Empresa" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" />
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
            <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="CPF ou CNPJ" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" />
          </div>
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" rows={2} />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-gradient-to-r from-logo to-logo-light text-white px-5 py-2 rounded-xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-logo/50">{editId ? 'Salvar Alterações' : 'Salvar'}</button>
            <button type="button" className="px-5 py-2 rounded-xl border border-logo-light bg-white text-logo hover:bg-logo-light/10" onClick={() => { setShowForm(false); setEditId(null); setForm({ nome: '', email: '', telefone: '', empresa: '', observacoes: '', cpf_cnpj: '' }); }}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto bg-white rounded-xl shadow border border-logo-light/30">
        <table className="min-w-full text-sm text-gray-800">
          <thead>
            <tr className="bg-gradient-to-r from-logo to-logo-light text-white rounded-t-xl">
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">Nome</th>
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">Email</th>
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">Telefone</th>
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">Empresa</th>
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">CPF/CNPJ</th>
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">Observações</th>
              <th className="px-4 py-3 border-b font-semibold whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis">{c.nome}</td>
                <td className="px-4 py-2 border-b whitespace-nowrap max-w-[220px] overflow-hidden text-ellipsis">{c.email}</td>
                <td className="px-4 py-2 border-b whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis">{c.telefone}</td>
                <td className="px-4 py-2 border-b whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis">{c.empresa}</td>
                <td className="px-4 py-2 border-b whitespace-nowrap max-w-[130px] overflow-hidden text-ellipsis">{c.cpf_cnpj}</td>
                <td className="px-4 py-2 border-b max-w-[200px] overflow-hidden text-ellipsis">{c.observacoes}</td>
                <td className="px-4 py-2 border-b flex gap-2 whitespace-nowrap">
                  <button className="text-blue-600 hover:underline" onClick={() => handleEdit(c)}>Editar</button>
                  <button className="text-red-600 hover:underline" onClick={() => handleDelete(c.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-gray-500">Nenhum cliente cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <div className="mt-4 text-gray-500">Carregando...</div>}
    </div>
  );
} 