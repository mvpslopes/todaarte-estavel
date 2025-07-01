import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface Transaction {
  id: number;
  tipo: 'receita' | 'despesa';
  valor: number;
  data?: string;
  categoria_nome: string;
  categoria_id?: number;
  cliente_nome?: string;
  name?: string;
  descricao?: string;
  usuario_id: number;
  data_criacao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  pessoa?: string;
  pessoa_nome?: string;
  pessoa_tipo?: 'cliente' | 'fornecedor';
  status: string;
}

interface CategoriaFinanceira {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa';
}

interface User {
  id: number;
  name: string;
}

interface Fornecedor {
  id: number;
  nome: string;
}

interface Cliente {
  id: number;
  nome: string;
}

const API_TRANSACOES = '/api/transacoes-financeiras';
const API_CATEGORIAS = '/api/categorias-financeiras';

export function FinancialTransactions() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterDataIni, setFilterDataIni] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  // Formulário
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [cliError, setCliError] = useState<string | null>(null);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornLoading, setFornLoading] = useState(false);
  const [fornError, setFornError] = useState<string | null>(null);
  const [pessoaTipo, setPessoaTipo] = useState<'cliente' | 'fornecedor'>('cliente');

  const [editId, setEditId] = useState<number | null>(null);

  // Buscar transações
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterTipo) params.append('tipo', filterTipo);
      if (filterCategoria) params.append('categoria', filterCategoria);
      if (filterCliente) params.append('cliente', filterCliente);
      if (filterDataIni) params.append('data_inicio', filterDataIni);
      if (filterDataFim) params.append('data_fim', filterDataFim);
      
      const res = await fetch(`${API_TRANSACOES}?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar transações');
      const data = await res.json();
      setTransactions(data);
      console.log('Transações recebidas:', data); // Debug
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar transações');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    fetchTransactions();
  }, [filterTipo, filterCategoria, filterCliente, filterDataIni, filterDataFim]);

  function resetForm() {
    setTipo('receita');
    setValor('');
    setData('');
    setDataPagamento('');
    setCategoriaId('');
    setClienteId('');
    setDescricao('');
    setFormError('');
    setEditId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Validação detalhada
    if (!tipo) {
      setFormError('Selecione o tipo da transação.');
      return;
    }
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      setFormError('Informe um valor válido.');
      return;
    }
    if (!data) {
      setFormError('Informe a data de vencimento.');
      return;
    }
    if (!categoriaId) {
      setFormError('Selecione a categoria.');
      return;
    }
    if (!clienteId) {
      setFormError('Selecione a pessoa.');
      return;
    }
    setFormError('');
    setFormLoading(true);
    try {
      const payload = {
        tipo,
        valor: Number(valor),
        data_vencimento: data,
        data_pagamento: dataPagamento || null,
        categoria_id: Number(categoriaId),
        pessoa: Number(clienteId),
        pessoa_tipo: pessoaTipo,
        descricao,
        usuario_id: user?.id,
        usuario_nome: user?.name
      };
      let res;
      if (editId) {
        res = await fetch(`${API_TRANSACOES}/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(API_TRANSACOES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) {
        const errorData = await res.json();
        setFormError(errorData.error || 'Erro ao salvar transação');
        return;
      }
      await fetchTransactions();
      setShowModal(false);
      resetForm();
      setEditId(null);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar transação');
    } finally {
      setFormLoading(false);
    }
  }

  // Buscar categorias ao carregar
  useEffect(() => {
    setCatLoading(true);
    fetch(API_CATEGORIAS)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategorias(data);
          setCatError(null);
        } else {
          setCategorias([]);
          setCatError(data?.error || 'Erro ao buscar categorias.');
        }
      })
      .catch(() => setCatError('Erro ao buscar categorias.'))
      .finally(() => setCatLoading(false));
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

  // Buscar fornecedores ao carregar
  useEffect(() => {
    setFornLoading(true);
    fetch('/api/fornecedores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFornecedores(data);
          setFornError(null);
        } else {
          setFornecedores([]);
          setFornError(data?.error || 'Erro ao buscar fornecedores.');
        }
      })
      .catch(() => setFornError('Erro ao buscar fornecedores.'))
      .finally(() => setFornLoading(false));
  }, []);

  // Atualizar pessoaTipo conforme tipo selecionado
  useEffect(() => {
    setPessoaTipo(tipo === 'despesa' ? 'fornecedor' : 'cliente');
    setClienteId('');
    // Garantir que não retorna nada
    return undefined;
  }, [tipo]);

  // Função utilitária para pegar o nome do cliente
  function getClienteNome(tx: any) {
    return tx.cliente_nome || tx.name || tx.pessoa_nome || tx.pessoa || '-';
  }

  function formatDateInput(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  // Função para abrir modal de edição
  function handleEdit(tx: Transaction) {
    setEditId(tx.id);
    setTipo(tx.tipo);
    setValor(String(tx.valor));
    setData(formatDateInput(tx.data_vencimento));
    setDataPagamento(formatDateInput(tx.data_pagamento));
    setCategoriaId(String(tx.categoria_id || ''));
    setClienteId(String(tx.pessoa || ''));
    setPessoaTipo(tx.pessoa_tipo || (tx.tipo === 'despesa' ? 'fornecedor' : 'cliente'));
    setDescricao(tx.descricao || '');
    setShowModal(true);
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      const res = await fetch(`${API_TRANSACOES}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir transação');
      await fetchTransactions();
    } catch (err) {
      alert('Erro ao excluir transação.');
    }
  }

  async function handleStatusChange(id: number, status: string) {
    await fetch(`/api/transacoes-financeiras/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchTransactions();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transações Financeiras</h1>
        <button
          className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          onClick={() => setShowModal(true)}
        >
          Nova Transação
        </button>
      </div>
      
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium">
          {error}
        </div>
      )}
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="input input-bordered w-full">
            <option value="">Todos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} className="input input-bordered w-full">
            <option value="">Todas</option>
            {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente</label>
          <input value={filterCliente} onChange={e => setFilterCliente(e.target.value)} className="input input-bordered w-full" placeholder="Nome ou referência" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Data Inicial</label>
          <input type="date" value={filterDataIni} onChange={e => setFilterDataIni(e.target.value)} className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Data Final</label>
          <input type="date" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} className="input input-bordered w-full" />
        </div>
        {(filterTipo || filterCategoria || filterCliente || filterDataIni || filterDataFim) && (
          <button
            className="ml-2 text-xs text-logo underline"
            onClick={() => { setFilterTipo(''); setFilterCategoria(''); setFilterCliente(''); setFilterDataIni(''); setFilterDataFim(''); }}
          >Limpar filtros</button>
        )}
      </div>
      
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Carregando transações...</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-white text-[#8a6a3b] border-b-2 border-[#b9936c] rounded-t-xl">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Favorecido / Cliente</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhuma transação encontrada.</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${tx.status === 'pago' ? 'bg-green-200' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-700">
                    {tx.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    R$ {tx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{tx.data_vencimento ? new Date(tx.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{tx.categoria_nome}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 align-middle break-words">
                    {clientes.find(cli => String(cli.id) === String(tx.pessoa))?.nome || '-'}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center
                        ${tx.pessoa_tipo === 'fornecedor'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                        }`}
                      style={{ verticalAlign: 'middle' }}
                    >
                      {tx.pessoa_tipo === 'fornecedor' ? 'Fornecedor' : 'Cliente'}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{tx.descricao || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    <select
                      value={tx.status}
                      onChange={e => handleStatusChange(tx.id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs bg-white"
                      style={{ minWidth: 80 }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                    </select>
                    {tx.status === 'pago' && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-green-700 text-white text-xs font-bold inline-flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Pago
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => handleEdit(tx)}
                      title="Editar"
                    >Editar</button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(tx.id)}
                      title="Excluir"
                    >Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Modal de nova transação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-50 via-white to-logo-light rounded-2xl p-10 shadow-2xl w-full max-w-2xl relative border border-gray-200">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-black text-2xl"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-logo">Nova Transação</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as 'receita' | 'despesa')} className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all">
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Valor</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor"
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Data de Vencimento</label>
                <input
                  type="date"
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Data de Pagamento</label>
                <input
                  type="date"
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  value={dataPagamento}
                  onChange={e => setDataPagamento(e.target.value)}
                  placeholder="Data de Pagamento"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Categoria</label>
                <select
                  value={categoriaId}
                  onChange={e => setCategoriaId(e.target.value)}
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  required
                  disabled={catLoading}
                >
                  <option value="">Categoria</option>
                  {categorias.filter(cat => cat.tipo === tipo).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                {catLoading && <span className="text-xs text-gray-400 ml-2">Carregando categorias...</span>}
                {catError && <span className="text-xs text-red-500 ml-2">{catError}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Cliente</label>
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map(cli => (
                    <option key={cli.id} value={cli.id}>{cli.nome}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="font-semibold text-gray-800 tracking-wide">Descrição (opcional)</label>
                <textarea
                  placeholder="Descrição (opcional)"
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  rows={2}
                />
              </div>
              {formError && <div className="md:col-span-2 text-red-600 text-sm font-medium">{formError}</div>}
              <button
                type="submit"
                disabled={formLoading}
                className="md:col-span-2 bg-gradient-to-r from-logo to-logo-light text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-lg"
              >
                {formLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 