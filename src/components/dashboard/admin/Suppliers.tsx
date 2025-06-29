import React, { useEffect, useState } from 'react';

interface Fornecedor {
  id: number;
  nome: string;
  tipo: 'pf' | 'pj';
  documento?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
}

const API = '/api/fornecedores';

export default function Suppliers() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nome: '', tipo: 'pf', documento: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '', observacoes: ''
  });
  const [formError, setFormError] = useState('');
  const [filters, setFilters] = useState({ nome: '', tipo: '', documento: '' });

  // Buscar fornecedores
  const fetchFornecedores = async () => {
    setLoading(true);
    let url = API;
    const params = [];
    if (filters.nome) params.push(`nome=${encodeURIComponent(filters.nome)}`);
    if (filters.tipo) params.push(`tipo=${encodeURIComponent(filters.tipo)}`);
    if (filters.documento) params.push(`documento=${encodeURIComponent(filters.documento)}`);
    if (params.length) url += '?' + params.join('&');
    try {
      const res = await fetch(url);
      const data = await res.json();
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      setFornecedores([]);
    }
    setLoading(false);
  };
  useEffect(() => { fetchFornecedores(); }, [filters]);

  function openModal(f?: Fornecedor) {
    if (f) {
      setEditId(f.id);
      setForm({
        nome: f.nome,
        tipo: f.tipo,
        documento: f.documento || '',
        email: f.email || '',
        telefone: f.telefone || '',
        endereco: f.endereco || '',
        cidade: f.cidade || '',
        estado: f.estado || '',
        cep: f.cep || '',
        observacoes: f.observacoes || ''
      });
    } else {
      setEditId(null);
      setForm({ nome: '', tipo: 'pf', documento: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '', observacoes: '' });
    }
    setFormError('');
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setFormError('');
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  function clearFilters() {
    setFilters({ nome: '', tipo: '', documento: '' });
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.tipo) {
      setFormError('Nome e tipo são obrigatórios.');
      return;
    }
    setFormError('');
    setLoading(true);
    const payload = { ...form };
    let res;
    if (editId) {
      res = await fetch(`${API}/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.error || 'Erro ao salvar.');
      setLoading(false);
      return;
    }
    await fetchFornecedores();
    closeModal();
    setLoading(false);
  }
  async function handleDelete(id: number) {
    if (!window.confirm('Deseja realmente excluir este fornecedor?')) return;
    setLoading(true);
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    await fetchFornecedores();
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <button className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => openModal()}>Novo Fornecedor</button>
      </div>
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input name="nome" value={filters.nome} onChange={handleFilterChange} placeholder="Buscar por nome" className="input input-bordered w-full" />
          <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="input input-bordered w-full">
            <option value="">Todos os tipos</option>
            <option value="pf">Pessoa Física</option>
            <option value="pj">Pessoa Jurídica</option>
          </select>
          <input name="documento" value={filters.documento} onChange={handleFilterChange} placeholder="CPF ou CNPJ" className="input input-bordered w-full" />
          <button onClick={clearFilters} className="btn btn-outline w-full">Limpar Filtros</button>
        </div>
        {Object.values(filters).some(f => f !== '') && (
          <div className="mt-4 text-sm text-gray-600">
            {fornecedores.length} fornecedores encontrados
          </div>
        )}
      </div>
      {loading && <div className="mb-4 text-gray-500">Carregando...</div>}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cidade</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Nenhum fornecedor cadastrado.</td></tr>
            ) : fornecedores.map(f => (
              <tr key={f.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 font-medium">{f.nome}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{f.tipo === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{f.documento || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{f.email || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{f.telefone || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{f.cidade || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  <button className="text-blue-600 hover:text-blue-800 hover:underline mr-3 font-medium" onClick={() => openModal(f)}>Editar</button>
                  <button className="text-red-600 hover:text-red-800 hover:underline font-medium" onClick={() => handleDelete(f.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-0 shadow-2xl w-full max-w-2xl relative border border-gray-100">
            <div className="bg-gradient-to-r from-logo/10 to-logo-light/10 rounded-t-2xl px-8 py-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">{editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            </div>
            <button className="absolute top-4 right-6 text-gray-400 hover:text-black text-2xl" onClick={closeModal}>×</button>
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome *</label>
                  <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome do fornecedor" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required>
                    <option value="pf">Pessoa Física</option>
                    <option value="pj">Pessoa Jurídica</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Documento</label>
                  <input name="documento" value={form.documento} onChange={handleChange} placeholder="CPF ou CNPJ" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input name="email" value={form.email} onChange={handleChange} placeholder="E-mail" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone</label>
                  <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço</label>
                  <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Endereço" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cidade</label>
                  <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Cidade" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                  <input name="estado" value={form.estado} onChange={handleChange} placeholder="UF" maxLength={2} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CEP</label>
                  <input name="cep" value={form.cep} onChange={handleChange} placeholder="CEP" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" rows={2} />
              </div>
              {formError && <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">{formError}</div>}
              <div className="flex gap-4 mt-2">
                <button type="submit" className="bg-gradient-to-r from-logo to-logo-light text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex-1 text-lg">
                  {editId ? 'Salvar Alterações' : 'Salvar'}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-outline px-8 py-3 text-base">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 