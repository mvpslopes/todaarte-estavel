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

// Toast simples
function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed top-6 right-6 z-50 bg-black/90 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">{message}</div>;
}

export function FinancialTransactions() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const getMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      ini: firstDay.toISOString().slice(0, 10),
      fim: lastDay.toISOString().slice(0, 10)
    };
  };
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterDataIni, setFilterDataIni] = useState(getMonthRange().ini);
  const [filterDataFim, setFilterDataFim] = useState(getMonthRange().fim);

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

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  // Paginação e ordenação
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

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
      let data = await res.json();
      // Ordenar do mais antigo para o mais novo
      data = Array.isArray(data)
        ? data.sort((a, b) => new Date(a.data_vencimento || a.data || 0).getTime() - new Date(b.data_vencimento || b.data || 0).getTime())
        : data;
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

  // Ordenação
  let transOrdenadas = [...transactions];
  if (sortKey) {
    transOrdenadas.sort((a, b) => {
      let va = a[sortKey as keyof typeof a];
      let vb = b[sortKey as keyof typeof b];
      if (va && typeof va === 'string') va = va.toLowerCase();
      if (vb && typeof vb === 'string') vb = vb.toLowerCase();
      if (va === vb) return 0;
      if (sortAsc) return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });
  }
  // Paginação
  const totalPaginas = Math.ceil(transOrdenadas.length / porPagina);
  const transPaginadas = transOrdenadas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Toast helpers
  function showToast(msg: string) { setToast(msg); }

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
      showToast(editId ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!');
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
      showToast('Transação excluída com sucesso!');
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
    showToast(status === 'pago' ? 'Transação marcada como paga!' : 'Status alterado!');
  }

  // Resumo financeiro
  const totalReceitas = transactions.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const totalDespesas = transactions.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  // Resumo financeiro detalhado
  const receitasPagas = transactions.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const receitasPendentes = transactions.filter(t => t.tipo === 'receita' && t.status !== 'pago').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const despesasPagas = transactions.filter(t => t.tipo === 'despesa' && t.status === 'pago').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const despesasPendentes = transactions.filter(t => t.tipo === 'despesa' && t.status !== 'pago').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const saldoRealizado = receitasPagas - despesasPagas;

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
      <div className="flex flex-wrap gap-4 mb-6 items-end bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <div className="flex flex-col min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all">
            <option value="">Todos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div className="flex flex-col min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all">
            <option value="">Todas</option>
            {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
          </select>
        </div>
        <div className="flex flex-col min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente</label>
          <input value={filterCliente} onChange={e => setFilterCliente(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all" placeholder="Nome ou referência" />
        </div>
        <div className="flex flex-wrap items-end gap-2 max-w-full overflow-x-auto">
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filterDataIni}
              onChange={e => setFilterDataIni(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-[120px] focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Final</label>
            <input
              type="date"
              value={filterDataFim}
              onChange={e => setFilterDataFim(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-[120px] focus:ring-2 focus:ring-logo focus:border-logo outline-none bg-white transition-all"
            />
          </div>
          <div className="flex items-end gap-1 mb-1">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200 hover:bg-gray-300 text-base font-bold transition-all"
              title="Mês anterior"
              onClick={() => {
                const ini = new Date(filterDataIni);
                ini.setMonth(ini.getMonth() - 1);
                const firstDay = new Date(ini.getFullYear(), ini.getMonth(), 1);
                const lastDay = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
                setFilterDataIni(firstDay.toISOString().slice(0, 10));
                setFilterDataFim(lastDay.toISOString().slice(0, 10));
              }}
            >
              {'<'}
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200 hover:bg-gray-300 text-base font-bold transition-all"
              title="Próximo mês"
              onClick={() => {
                const [ano, mes] = filterDataIni.split('-').map(Number);
                const firstDay = new Date(ano, mes, 1);
                const lastDay = new Date(ano, mes + 1, 0);
                setFilterDataIni(firstDay.toISOString().slice(0, 10));
                setFilterDataFim(lastDay.toISOString().slice(0, 10));
              }}
            >
              {'>'}
            </button>
          </div>
        </div>
        {(filterTipo || filterCategoria || filterCliente || filterDataIni || filterDataFim) && (
          <button
            className="ml-2 text-xs text-logo underline font-semibold hover:text-logo/80 transition-all mt-6"
            onClick={() => { setFilterTipo(''); setFilterCategoria(''); setFilterCliente(''); setFilterDataIni(''); setFilterDataFim(''); }}
          >Limpar filtros</button>
        )}
      </div>
      
      {/* Resumo financeiro */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Card Saldo */}
        <div className="flex-1 min-w-[220px] flex items-center gap-4 bg-white rounded-2xl shadow-lg p-6">
          <div className="bg-green-100 text-green-700 rounded-full p-3 flex items-center justify-center">
            {/* Ícone carteira */}
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M2 11h20"/></svg>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Saldo do mês</div>
            <div className={`text-2xl font-extrabold ${saldo < 0 ? 'text-red-600' : 'text-green-700'}`}>R$ {saldo.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
            <div className="text-xs text-gray-500 mt-1">Saldo realizado: <span className="font-bold text-green-600">R$ {saldoRealizado.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span></div>
          </div>
        </div>
        {/* Card Receitas */}
        <div className="flex-1 min-w-[220px] flex items-center gap-4 bg-white rounded-2xl shadow-lg p-6">
          <div className="bg-green-200 text-green-700 rounded-full p-3 flex items-center justify-center">
            {/* Ícone seta para cima */}
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total de receitas</div>
            <div className="text-2xl font-extrabold text-green-700">R$ {totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Pagas: R$ {receitasPagas.toLocaleString('pt-BR', {minimumFractionDigits:2})}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-gray-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Pendentes: R$ {receitasPendentes.toLocaleString('pt-BR', {minimumFractionDigits:2})}
              </span>
            </div>
          </div>
        </div>
        {/* Card Despesas */}
        <div className="flex-1 min-w-[220px] flex items-center gap-4 bg-white rounded-2xl shadow-lg p-6">
          <div className="bg-red-200 text-red-700 rounded-full p-3 flex items-center justify-center">
            {/* Ícone seta para baixo */}
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total de despesas</div>
            <div className="text-2xl font-extrabold text-red-600">R$ {totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Pagas: R$ {despesasPagas.toLocaleString('pt-BR', {minimumFractionDigits:2})}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-gray-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Pendentes: R$ {despesasPendentes.toLocaleString('pt-BR', {minimumFractionDigits:2})}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Carregando transações...</div>
        ) : (
          <>
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead>
              <tr className="bg-white text-[#8a6a3b] border-b-2 border-[#b9936c] rounded-t-xl">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => { setSortKey('tipo'); setSortAsc(k => sortKey === 'tipo' ? !k : true); }}>Tipo {sortKey === 'tipo' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => { setSortKey('valor'); setSortAsc(k => sortKey === 'valor' ? !k : true); }}>Valor {sortKey === 'valor' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => { setSortKey('data_vencimento'); setSortAsc(k => sortKey === 'data_vencimento' ? !k : true); }}>Vencimento {sortKey === 'data_vencimento' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => { setSortKey('categoria_nome'); setSortAsc(k => sortKey === 'categoria_nome' ? !k : true); }}>Categoria {sortKey === 'categoria_nome' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => { setSortKey('pessoa_nome'); setSortAsc(k => sortKey === 'pessoa_nome' ? !k : true); }}>Favorecido / Cliente {sortKey === 'pessoa_nome' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => { setSortKey('descricao'); setSortAsc(k => sortKey === 'descricao' ? !k : true); }}>Descrição {sortKey === 'descricao' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase w-[110px] max-w-[120px] text-center cursor-pointer" onClick={() => { setSortKey('status'); setSortAsc(k => sortKey === 'status' ? !k : true); }}>Status {sortKey === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase w-[90px] max-w-[100px] text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transPaginadas.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-8">Nenhuma transação encontrada.</td></tr>
              ) : transPaginadas.map(tx => {
                // Destaque visual para vencidas/próximas do vencimento
                const hoje = new Date();
                const venc = tx.data_vencimento ? new Date(tx.data_vencimento) : null;
                let rowClass = 'border-b last:border-b-0 hover:bg-gray-50 transition-colors ';
                if (tx.status !== 'pago' && venc) {
                  if (venc < hoje) rowClass += 'bg-red-100 ';
                  else if ((venc.getTime() - hoje.getTime())/(1000*60*60*24) <= 3) rowClass += 'bg-yellow-100 ';
                }
                if (tx.status === 'pago') rowClass += 'bg-green-100 ';
                return (
                  <tr key={tx.id} className={rowClass}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-700 relative group">
                      <span className="cursor-help" tabIndex={0} aria-label="Tipo da transação">
                        {tx.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">{tx.tipo === 'receita' ? 'Entrada de valor' : 'Saída de valor'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 relative group">
                      <span className="cursor-help" tabIndex={0} aria-label="Valor da transação">
                        R$ {tx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Valor da transação</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 relative group">
                      <span className="cursor-help" tabIndex={0} aria-label="Data de vencimento">
                        {tx.data_vencimento ? new Date(tx.data_vencimento).toLocaleDateString('pt-BR') : '-'}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Data de vencimento</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 break-words whitespace-pre-line max-w-[160px] relative group">
                      <span className="cursor-help" tabIndex={0} aria-label="Categoria">
                        {tx.categoria_nome}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Categoria financeira</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 align-middle break-words relative group">
                      <span className="cursor-help" tabIndex={0} aria-label="Favorecido ou cliente">
                        {tx.pessoa_tipo === 'fornecedor'
                          ? fornecedores.find(f => String(f.id) === String(tx.pessoa))?.nome
                          : clientes.find(c => String(c.id) === String(tx.pessoa))?.nome
                        || '-'}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Favorecido/Cliente</span>
                      </span>
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
                    <td className="px-4 py-2 text-sm text-gray-700 break-words whitespace-pre-line max-w-[220px] relative group">
                      <span className="cursor-help" tabIndex={0} aria-label="Descrição">
                        {tx.descricao || '-'}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Descrição da transação</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center w-[110px] max-w-[120px] overflow-hidden align-middle relative group">
                      {(() => {
                        const hoje = new Date();
                        const venc = tx.data_vencimento ? new Date(tx.data_vencimento) : null;
                        if (tx.status === 'pago') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white" tabIndex={0} aria-label="Transação paga">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              Pago
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Transação paga</span>
                            </span>
                          );
                        } else if (tx.status === 'pendente' && venc && venc < hoje) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white" tabIndex={0} aria-label="Transação vencida">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Vencido
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Transação vencida</span>
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-gray-900" tabIndex={0} aria-label="Transação pendente">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                              Pendente
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Transação pendente</span>
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-2 py-2 text-center w-[90px] max-w-[100px] overflow-hidden align-middle">
                      <div className="flex gap-3 justify-center items-center">
                        <button
                          className="bg-white border border-gray-200 rounded-full w-9 aspect-square flex items-center justify-center shadow-sm hover:bg-blue-50 hover:border-blue-400 text-blue-600 hover:text-blue-800 transition-all min-w-0 hover:scale-105"
                          title="Editar"
                          onClick={() => handleEdit(tx)}
                          style={{lineHeight:1}}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M17.414 2.586a2 2 0 0 0-2.828 0l-8.5 8.5A2 2 0 0 0 5 12.914V15a1 1 0 0 0 1 1h2.086a2 2 0 0 0 1.414-.586l8.5-8.5a2 2 0 0 0 0-2.828l-2.5-2.5zM6 14v-1.586l8-8L16.586 6l-8 8H6zm2.293-2.293l8-8L17.414 4.586l-8 8L8.293 11.707z" />
                          </svg>
                        </button>
                        <button
                          className="bg-white border border-gray-200 rounded-full w-9 aspect-square flex items-center justify-center shadow-sm hover:bg-red-50 hover:border-red-400 text-red-500 hover:text-red-700 transition-all min-w-0 hover:scale-105"
                          title="Excluir"
                          onClick={() => handleDelete(tx.id)}
                          style={{lineHeight:1}}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M6.293 6.293a1 1 0 0 1 1.414 0L10 8.586l2.293-2.293a1 1 0 1 1 1.414 1.414L11.414 10l2.293 2.293a1 1 0 0 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          className={`bg-white border border-gray-200 rounded-full w-9 aspect-square flex items-center justify-center shadow-sm transition-all min-w-0 hover:scale-105 ${tx.status === 'pago' ? 'hover:bg-yellow-50 hover:border-yellow-400 text-yellow-600 hover:text-yellow-800' : 'hover:bg-green-50 hover:border-green-400 text-green-600 hover:text-green-800'}`}
                          title={tx.status === 'pago' ? 'Marcar como pendente' : 'Marcar como pago'}
                          onClick={() => handleStatusChange(tx.id, tx.status === 'pago' ? 'pendente' : 'pago')}
                          style={{lineHeight:1}}
                        >
                          {tx.status === 'pago' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Paginação */}
          <div className="flex justify-center items-center gap-2 py-4">
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>{'<'}</button>
            <span className="font-semibold">Página {pagina} de {totalPaginas}</span>
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>{'>'}</button>
          </div>
          </>
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
                <label className="font-semibold text-gray-800 tracking-wide">
                  {tipo === 'despesa' ? 'Fornecedor' : 'Cliente'}
                </label>
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="input input-bordered w-full border-gray-300 shadow-sm focus:border-logo focus:ring-2 focus:ring-logo-light transition-all"
                  required
                >
                  <option value="">
                    {tipo === 'despesa' ? 'Selecione o fornecedor' : 'Selecione o cliente'}
                  </option>
                  {(tipo === 'despesa' ? fornecedores : clientes).map(pessoa => (
                    <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
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
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
} 