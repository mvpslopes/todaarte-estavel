import React, { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
}
interface ContaFixa {
  id: number;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria_id: number;
  categoria_nome?: string;
  pessoa?: number;
  pessoa_nome?: string;
  dia_vencimento: number;
  status: 'ativa' | 'inativa';
  data_inicio: string;
  data_fim?: string;
}
interface Fornecedor {
  id: number;
  nome: string;
}
interface Cliente {
  id: number;
  nome: string;
}
interface CategoriaFinanceira {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa';
}

const API = '/api/contas-fixas';
const API_CATEGORIAS = '/api/categorias-financeiras';
const API_USUARIOS = '/api/usuarios-lista';

export default function FixedAccounts() {
  const [contas, setContas] = useState<ContaFixa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [cliError, setCliError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo: 'despesa', categoria_id: '', pessoa: '', dia_vencimento: '', status: 'ativa', data_inicio: '', data_fim: ''
  });
  const [formError, setFormError] = useState('');
  const [filters, setFilters] = useState({
    tipo: '', status: '', categoria_id: '', pessoa: '', descricao: ''
  });

  // Buscar contas fixas
  const fetchContas = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setContas(data);
    } catch (error) {
      console.error('Erro ao buscar contas fixas:', error);
    }
    setLoading(false);
  };
  useEffect(() => { 
    fetchContas(); 
  }, []);

  // Buscar categorias
  useEffect(() => {
    fetch(API_CATEGORIAS)
      .then(res => res.json())
      .then(data => setCategorias(data));
  }, []);
  // Buscar usuários
  useEffect(() => {
    fetch(API_USUARIOS)
      .then(res => res.json())
      .then(data => setUsuarios(data));
  }, []);
  // Buscar fornecedores
  useEffect(() => {
    fetch('/api/fornecedores')
      .then(res => res.json())
      .then(data => setFornecedores(data));
    return undefined;
  }, []);

  // Buscar clientes ao carregar
  useEffect(() => {
    setCliLoading(true);
    fetch('/api/clientes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClientes(data);
          setCliError(null);
        } else {
          setClientes([]);
          setCliError('Erro ao buscar clientes.');
        }
      })
      .catch(() => setCliError('Erro ao buscar clientes.'))
      .finally(() => setCliLoading(false));
  }, []);

  // Filtrar contas
  const filteredContas = contas.filter(conta => {
    if (filters.tipo && conta.tipo !== filters.tipo) return false;
    if (filters.status && conta.status !== filters.status) return false;
    if (filters.categoria_id && conta.categoria_id !== Number(filters.categoria_id)) return false;
    if (filters.pessoa && conta.pessoa !== Number(filters.pessoa)) return false;
    if (filters.descricao && !conta.descricao.toLowerCase().includes(filters.descricao.toLowerCase())) return false;
    return true;
  });

  function openModal(conta?: ContaFixa) {
    if (conta) {
      setEditId(conta.id);
      setForm({
        descricao: conta.descricao,
        valor: String(conta.valor),
        tipo: conta.tipo,
        categoria_id: String(conta.categoria_id),
        pessoa: conta.pessoa ? String(conta.pessoa) : '',
        dia_vencimento: String(conta.dia_vencimento),
        status: conta.status,
        data_inicio: conta.data_inicio.slice(0, 10),
        data_fim: conta.data_fim ? conta.data_fim.slice(0, 10) : ''
      });
    } else {
      setEditId(null);
      setForm({ descricao: '', valor: '', tipo: 'despesa', categoria_id: '', pessoa: '', dia_vencimento: '', status: 'ativa', data_inicio: '', data_fim: '' });
    }
    setFormError('');
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setFormError('');
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  function clearFilters() {
    setFilters({ tipo: '', status: '', categoria_id: '', pessoa: '', descricao: '' });
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.tipo || !form.categoria_id || !form.dia_vencimento || !form.data_inicio) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (Number(form.valor) <= 0) {
      setFormError('O valor deve ser maior que zero.');
      return;
    }
    if (Number(form.dia_vencimento) < 1 || Number(form.dia_vencimento) > 31) {
      setFormError('O dia de vencimento deve estar entre 1 e 31.');
      return;
    }
    setFormError('');
    setLoading(true);
    const payload = {
      descricao: form.descricao,
      valor: Number(form.valor),
      tipo: form.tipo,
      categoria_id: Number(form.categoria_id),
      pessoa: form.pessoa ? Number(form.pessoa) : null,
      dia_vencimento: Number(form.dia_vencimento),
      status: form.status,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      pessoa_tipo: form.tipo === 'despesa' ? 'fornecedor' : 'cliente',
    };
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
    await fetchContas();
    closeModal();
    setLoading(false);
  }
  async function handleDelete(id: number) {
    if (!window.confirm('Deseja realmente excluir esta conta fixa?')) return;
    setLoading(true);
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    await fetchContas();
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contas Fixas</h1>
        <button className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => openModal()}>Nova Conta Fixa</button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex flex-wrap gap-4 items-end mb-6">
        <div className="flex flex-col min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
          <input
            name="descricao"
            value={filters.descricao}
            onChange={handleFilterChange}
            placeholder="Buscar por descrição"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all"
          />
        </div>
        <div className="flex flex-col min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
          <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all">
            <option value="">Todos os tipos</option>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>
        <div className="flex flex-col min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all">
            <option value="">Todos os status</option>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </select>
        </div>
        <div className="flex flex-col min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
          <select name="categoria_id" value={filters.categoria_id} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all">
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente</label>
          <select name="pessoa" value={filters.pessoa} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all">
            <option value="">Todos os clientes</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <button onClick={clearFilters} className="ml-2 text-xs text-logo underline font-semibold hover:text-logo/80 transition-all mt-6">Limpar Filtros</button>
      </div>

      {loading && <div className="mb-4 text-gray-500">Carregando...</div>}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-white text-[#8a6a3b] border-b-2 border-[#b9936c] rounded-t-xl">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase max-w-xs break-words">Descrição</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase max-w-xs break-words">Categoria</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fim</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase max-w-xs break-words">Cliente</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredContas.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-gray-400 py-8">
                {contas.length === 0 ? 'Nenhuma conta fixa cadastrada.' : 'Nenhuma conta encontrada com os filtros aplicados.'}
              </td></tr>
            ) : filteredContas.map(conta => (
              <tr key={conta.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-sm text-gray-700 font-medium max-w-xs break-words">{conta.descricao}</td>
                <td className="px-4 py-2 text-sm text-gray-700">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    conta.tipo === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {conta.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 max-w-xs break-words">{conta.categoria_nome || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">Dia {conta.dia_vencimento}</td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {conta.status === 'ativa' ? 
                    <span className="text-green-600 font-semibold">Ativa</span> : 
                    <span className="text-gray-400">Inativa</span>
                  }
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">{conta.data_inicio ? new Date(conta.data_inicio).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{conta.data_fim ? new Date(conta.data_fim).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700 max-w-xs break-words">
                  {conta.tipo === 'receita'
                    ? clientes.find(cli => String(cli.id) === String(conta.pessoa))?.nome || '-'
                    : fornecedores.find(f => String(f.id) === String(conta.pessoa))?.nome || '-'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 flex gap-2">
                  <button
                    className="rounded-full p-1.5 bg-white border border-gray-200 shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center w-7 h-7"
                    title="Editar"
                    onClick={() => openModal(conta)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 21h4.586a1 1 0 0 0 .707-.293l10.414-10.414a2 2 0 0 0 0-2.828l-2.172-2.172a2 2 0 0 0-2.828 0L4.293 15.707A1 1 0 0 0 4 16.414V21z" />
                      <path d="M15 6l3 3" />
                    </svg>
                  </button>
                  <button
                    className="rounded-full p-1.5 bg-white border border-gray-200 shadow-sm hover:bg-red-50 transition-colors flex items-center justify-center w-7 h-7"
                    title="Excluir"
                    onClick={() => handleDelete(conta.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
              <h2 className="text-2xl font-bold text-gray-900">{editId ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}</h2>
            </div>
            <button className="absolute top-4 right-6 text-gray-400 hover:text-black text-2xl" onClick={closeModal}>×</button>
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
              {/* Grupo 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição *</label>
                  <input name="descricao" value={form.descricao} onChange={handleChange} placeholder="Ex: Aluguel, Internet" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor *</label>
                  <input name="valor" type="number" min="0" step="0.01" value={form.valor} onChange={handleChange} placeholder="0,00" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required />
                </div>
              </div>
              {/* Grupo 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required>
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria *</label>
                  <select name="categoria_id" value={form.categoria_id} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required>
                    <option value="">Selecione uma categoria</option>
                    {categorias.filter(cat => cat.tipo === form.tipo).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Grupo 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente/Fornecedor</label>
                  {form.tipo === 'receita' ? (
                    <select
                      name="pessoa"
                      value={form.pessoa}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      required
                    >
                      <option value="">Selecione o cliente</option>
                      {clientes.map(cli => (
                        <option key={cli.id} value={cli.id}>{cli.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <select name="pessoa" value={form.pessoa} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm">
                      <option value="">Selecione o fornecedor</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dia de Vencimento *</label>
                  <input name="dia_vencimento" type="number" min="1" max="31" value={form.dia_vencimento} onChange={handleChange} placeholder="1-31" className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required />
                </div>
              </div>
              {/* Grupo 4 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm">
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data de Início *</label>
                  <input name="data_inicio" type="date" value={form.data_inicio} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data de Fim</label>
                  <input name="data_fim" type="date" value={form.data_fim} onChange={handleChange} className="input input-bordered w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-logo/30 shadow-sm" />
                </div>
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