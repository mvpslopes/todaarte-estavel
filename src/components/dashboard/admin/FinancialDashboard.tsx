import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  LineController
} from 'chart.js';
import { saveAs } from 'file-saver';
// @ts-ignore
import ChartDataLabels from 'chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.esm.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, LineController, ChartDataLabels);

interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  receitasPagas: number;
  despesasPagas: number;
  receitasPendentes: number;
  despesasPendentes: number;
}

export default function FinancialDashboard() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [dadosGrafico, setDadosGrafico] = useState<any>(null);
  const [dadosRosace, setDadosRosace] = useState<any>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'mes' | 'ano' | 'personalizado' | 'todos'>('mes');
  const [periodo, setPeriodo] = useState<{inicio: string, fim: string}>(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: inicio.toISOString().slice(0,10), fim: fim.toISOString().slice(0,10) };
  });
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroFavorecido, setFiltroFavorecido] = useState<string>('todos');
  const [dadosFiltrados, setDadosFiltrados] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [favorecidos, setFavorecidos] = useState<string[]>([]);
  const [periodoComparar, setPeriodoComparar] = useState<{inicio: string, fim: string} | null>(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: inicio.toISOString().slice(0,10), fim: fim.toISOString().slice(0,10) };
  });
  const [dadosComparar, setDadosComparar] = useState<any[]>([]);
  const [dadosTodos, setDadosTodos] = useState<any[]>([]);

  useEffect(() => {
    async function fetchResumo() {
      setLoading(true);
      const res = await fetch('/api/transacoes-financeiras');
      const data = await res.json();
      // Processar os dados para gerar o resumo
      const receitas = data.filter((t: any) => t.tipo === 'receita');
      const despesas = data.filter((t: any) => t.tipo === 'despesa');
      const receitasPagas = receitas.filter((t: any) => t.status === 'pago');
      const despesasPagas = despesas.filter((t: any) => t.status === 'pago');
      const receitasPendentes = receitas.filter((t: any) => t.status !== 'pago');
      const despesasPendentes = despesas.filter((t: any) => t.status !== 'pago');

      // Garantir que os valores são números
      const totalReceitas = receitas.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
      const totalDespesas = despesas.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
      const receitasPagasValor = receitasPagas.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
      const despesasPagasValor = despesasPagas.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
      const receitasPendentesValor = receitasPendentes.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
      const despesasPendentesValor = despesasPendentes.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
      const saldo = totalReceitas - totalDespesas;

      setResumo({
        totalReceitas,
        totalDespesas,
        saldo,
        receitasPagas: receitasPagasValor,
        despesasPagas: despesasPagasValor,
        receitasPendentes: receitasPendentesValor,
        despesasPendentes: despesasPendentesValor,
      });
      setDadosGrafico(getReceitasDespesasPorMes(data));
      setDadosRosace(getDespesasPorCategoria(data));
      setLoading(false);
    }
    fetchResumo();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch('/api/transacoes-financeiras');
      const data = await res.json();
      setDadosTodos(data); // Salva todos os lançamentos
      // LOG para depuração:
      console.log('Todos os dados recebidos:', data);
      // LOG para depuração dos favorecidos/clientes
      console.log('Dados recebidos para favorecidos:', data.map((t: any) => ({ favorecido_nome: t.favorecido_nome, cliente_nome: t.cliente_nome, nome_favorecido: t.nome_favorecido, nome_cliente: t.nome_cliente })));
      // Filtros principais
      let filtrados = data.filter((t: any) => {
        // Usar data_pagamento para pagos, data_vencimento/data para pendentes
        const dataRef = t.status === 'pago'
          ? t.data_pagamento || t.data_vencimento || t.data
          : t.data_vencimento || t.data;
        const dataLanc = new Date(dataRef);
        const dentroPeriodo = dataLanc >= new Date(periodo.inicio) && dataLanc <= new Date(periodo.fim);
        const statusOk = filtroStatus === 'todos' || t.status === filtroStatus;
        const categoriaOk = filtroCategoria === 'todos' || (t.categoria_nome || t.categoria) === filtroCategoria;
        const favorecidoOk = filtroFavorecido === 'todos' || t.pessoa_nome === filtroFavorecido;
        // LOG de cada filtro aplicado
        if (!dentroPeriodo) console.log('Fora do período:', t);
        if (!statusOk) console.log('Status não bate:', t);
        if (!categoriaOk) console.log('Categoria não bate:', t);
        if (!favorecidoOk) console.log('Favorecido não bate:', t);
        return dentroPeriodo && statusOk && categoriaOk && favorecidoOk;
      });
      setDadosFiltrados(filtrados);
      // LOG para depuração:
      console.log('Despesas filtradas:', filtrados.filter(t => t.tipo === 'despesa'));
      setCategorias(Array.from(new Set(data.map((t: any) => t.categoria_nome || t.categoria).filter(Boolean))) as string[]);
      setFavorecidos(Array.from(new Set(data.map((t: any) => t.pessoa_nome).filter(Boolean))) as string[]);
      // Dados para comparação de período
      if (periodoComparar) {
        const comparar = data.filter((t: any) => {
          const dataRef = t.status === 'pago'
            ? t.data_pagamento || t.data_vencimento || t.data
            : t.data_vencimento || t.data;
          const dataLanc = new Date(dataRef);
          return dataLanc >= new Date(periodoComparar.inicio) && dataLanc <= new Date(periodoComparar.fim);
        });
        setDadosComparar(comparar);
      } else {
        setDadosComparar([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [periodo, filtroStatus, filtroCategoria, filtroFavorecido, periodoComparar]);

  // Função para agrupar receitas e despesas por mês
  function getReceitasDespesasPorMes(data: any[]) {
    // Filtrar apenas pagos ou vencidos
    const hoje = new Date();
    const filtrados = data.filter((t: any) => {
      if (t.status === 'pago') return true;
      const dataVenc = t.data_vencimento ? new Date(t.data_vencimento) : (t.data ? new Date(t.data) : null);
      return dataVenc && dataVenc <= hoje;
    });
    const meses: { [key: string]: { receitas: number; despesas: number } } = {};
    filtrados.forEach((t: any) => {
      const mes = new Date(t.data_vencimento || t.data).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (!meses[mes]) meses[mes] = { receitas: 0, despesas: 0 };
      if (t.tipo === 'receita') meses[mes].receitas += Number(t.valor || 0);
      if (t.tipo === 'despesa') meses[mes].despesas += Number(t.valor || 0);
    });
    // Ordenar meses cronologicamente
    const mesesPt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mesesOrdenados = Object.keys(meses).sort((a, b) => {
      const [ma] = a.split('.');
      const [mb] = b.split('.');
      const ya = a.slice(-2);
      const yb = b.slice(-2);
      const dateA = new Date(2000 + Number(ya), mesesPt.indexOf(ma.trim()), 1);
      const dateB = new Date(2000 + Number(yb), mesesPt.indexOf(mb.trim()), 1);
      return dateA.getTime() - dateB.getTime();
    });
    return {
      labels: mesesOrdenados,
      receitas: mesesOrdenados.map(m => meses[m].receitas),
      despesas: mesesOrdenados.map(m => meses[m].despesas),
    };
  }

  // Função para agrupar despesas por categoria
  function getDespesasPorCategoria(data: any[]) {
    const categorias: { [key: string]: number } = {};
    data.filter((t: any) => t.tipo === 'despesa').forEach((t: any) => {
      const cat = t.categoria_nome || t.categoria || 'Outros';
      categorias[cat] = (categorias[cat] || 0) + Number(t.valor || 0);
    });
    return {
      labels: Object.keys(categorias),
      valores: Object.values(categorias),
    };
  }

  function getPorCategoria(data: any[], tipo: 'receita' | 'despesa') {
    const categorias: { [key: string]: number } = {};
    data.filter((t: any) => t.tipo === tipo).forEach((t: any) => {
      const cat = t.categoria_nome || t.categoria || 'Outros';
      categorias[cat] = (categorias[cat] || 0) + Number(t.valor || 0);
    });
    return {
      labels: Object.keys(categorias),
      valores: Object.values(categorias),
      total: Object.values(categorias).reduce((a, b) => a + b, 0),
      quantidades: Object.keys(categorias).map(cat => data.filter((t: any) => (t.categoria_nome || t.categoria || 'Outros') === cat && t.tipo === tipo).length)
    };
  }

  function getEvolucao(data: any[]) {
    // Descobrir o ano do filtro
    let anoFiltro = new Date().getFullYear();
    if (filtroPeriodo === 'ano') {
      anoFiltro = new Date(periodo.inicio).getFullYear();
    } else if (filtroPeriodo === 'personalizado') {
      anoFiltro = new Date(periodo.inicio).getFullYear();
    }
    const mesesPt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    // Inicializar todos os meses do ano com zero
    const meses: { [key: string]: { receitas: number; despesas: number; saldo: number } } = {};
    for (let i = 0; i < 12; i++) {
      const label = `${mesesPt[i]}. de ${String(anoFiltro).slice(-2)}`;
      meses[label] = { receitas: 0, despesas: 0, saldo: 0 };
    }
    data.forEach((t: any) => {
      // Usar data_pagamento para pagos, data_vencimento/data para pendentes
      const d = new Date(
        t.status === 'pago'
          ? t.data_pagamento || t.data_vencimento || t.data
          : t.data_vencimento || t.data
      );
      const mes = `${mesesPt[d.getMonth()]}. de ${String(d.getFullYear()).slice(-2)}`;
      if (!meses[mes]) meses[mes] = { receitas: 0, despesas: 0, saldo: 0 };
      if (t.tipo === 'receita') meses[mes].receitas += Number(t.valor || 0);
      if (t.tipo === 'despesa') meses[mes].despesas += Number(t.valor || 0);
      meses[mes].saldo = meses[mes].receitas - meses[mes].despesas;
    });
    // LOG para depuração:
    console.log('Meses agrupados:', meses);
    const mesesOrdenados = Object.keys(meses).sort((a, b) => {
      const [ma] = a.split('.');
      const [mb] = b.split('.');
      const ya = a.slice(-2);
      const yb = b.slice(-2);
      const dateA = new Date(2000 + Number(ya), mesesPt.indexOf(ma.trim()), 1);
      const dateB = new Date(2000 + Number(yb), mesesPt.indexOf(mb.trim()), 1);
      return dateA.getTime() - dateB.getTime();
    });
    return {
      labels: mesesOrdenados,
      receitas: mesesOrdenados.map(m => meses[m].receitas),
      despesas: mesesOrdenados.map(m => meses[m].despesas),
      saldo: mesesOrdenados.map(m => meses[m].saldo),
    };
  }

  function exportarCSV() {
    const linhas = [
      ['Data', 'Tipo', 'Categoria', 'Favorecido/Cliente', 'Valor', 'Status'],
      ...dadosFiltrados.map((t: any) => [
        t.data_vencimento || t.data,
        t.tipo,
        t.categoria_nome || t.categoria,
        t.pessoa_nome,
        t.valor,
        t.status
      ])
    ];
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'transacoes_financeiras.csv');
  }

  // --- NOVO RESUMO DO PERÍODO ---
  // Resumo do período filtrado
  const receitasPeriodo = dadosFiltrados.filter((t: any) => t.tipo === 'receita');
  const despesasPeriodo = dadosFiltrados.filter((t: any) => t.tipo === 'despesa');
  const receitasPagasPeriodo = receitasPeriodo.filter((t: any) => t.status === 'pago');
  const despesasPagasPeriodo = despesasPeriodo.filter((t: any) => t.status === 'pago');
  const receitasPendentesPeriodo = receitasPeriodo.filter((t: any) => t.status !== 'pago');
  const despesasPendentesPeriodo = despesasPeriodo.filter((t: any) => t.status !== 'pago');
  const totalReceitasPeriodo = receitasPeriodo.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const totalDespesasPeriodo = despesasPeriodo.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const totalReceitasPagasPeriodo = receitasPagasPeriodo.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const totalDespesasPagasPeriodo = despesasPagasPeriodo.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const totalReceitasPendentesPeriodo = receitasPendentesPeriodo.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const totalDespesasPendentesPeriodo = despesasPendentesPeriodo.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const saldoPeriodo = totalReceitasPeriodo - totalDespesasPeriodo;
  const saldoRealizadoPeriodo = totalReceitasPagasPeriodo - totalDespesasPagasPeriodo;

  // --- RESUMO GERAL (ACUMULADO) ---
  const receitasGeral = dadosTodos.filter((t: any) => t.tipo === 'receita');
  const despesasGeral = dadosTodos.filter((t: any) => t.tipo === 'despesa');
  const totalReceitasGeral = receitasGeral.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const totalDespesasGeral = despesasGeral.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
  const saldoGeral = totalReceitasGeral - totalDespesasGeral;

  // --- CARDS DE RESUMO ---
  // Cards do período
  const cardsPeriodo = [
    {
      label: 'Saldo do Período',
      value: saldoPeriodo,
      color: saldoPeriodo >= 0 ? 'text-green-600' : 'text-red-600',
      bg: saldoPeriodo >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      label: 'Receitas',
      value: totalReceitasPeriodo,
      color: 'text-green-700',
      bg: 'bg-green-100',
    },
    {
      label: 'Despesas',
      value: totalDespesasPeriodo,
      color: 'text-red-700',
      bg: 'bg-red-100',
    },
    {
      label: 'Receitas Pagas',
      value: totalReceitasPagasPeriodo,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      label: 'Despesas Pagas',
      value: totalDespesasPagasPeriodo,
      color: 'text-red-700',
      bg: 'bg-red-50',
    },
    {
      label: 'Receitas Pendentes',
      value: totalReceitasPendentesPeriodo,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Despesas Pendentes',
      value: totalDespesasPendentesPeriodo,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Saldo Realizado',
      value: saldoRealizadoPeriodo,
      color: saldoRealizadoPeriodo >= 0 ? 'text-green-600' : 'text-red-600',
      bg: saldoRealizadoPeriodo >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ];
  // Card do resumo geral
  const cardGeral = {
    label: 'Saldo Geral (Histórico)',
    value: saldoGeral,
    color: saldoGeral >= 0 ? 'text-green-700' : 'text-red-700',
    bg: saldoGeral >= 0 ? 'bg-green-100' : 'bg-red-100',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Financeiro</h1>
      {/* Barra de filtros no topo */}
      <div className="bg-gray-50 rounded-xl p-4 mb-8 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Período</label>
              <select value={filtroPeriodo} onChange={e => {
                setFiltroPeriodo(e.target.value as any);
                if (e.target.value === 'mes') {
                  const hoje = new Date();
                  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                  setPeriodo({ inicio: inicio.toISOString().slice(0,10), fim: fim.toISOString().slice(0,10) });
                }
              }} className="border rounded px-2 py-1">
                <option value="mes">Mês atual</option>
                <option value="ano">Ano atual</option>
                <option value="personalizado">Personalizado</option>
                <option value="todos">Todos os períodos</option>
              </select>
            </div>
            {filtroPeriodo === 'mes' && (
              <>
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-base font-bold"
                  title="Mês anterior"
                  onClick={() => {
                    const ini = new Date(periodo.inicio);
                    ini.setMonth(ini.getMonth() - 1);
                    const firstDay = new Date(ini.getFullYear(), ini.getMonth(), 1);
                    const lastDay = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
                    setPeriodo({ inicio: firstDay.toISOString().slice(0,10), fim: lastDay.toISOString().slice(0,10) });
                    // Atualiza comparar com período para o mês anterior ao novo mês exibido
                    const prevIni = new Date(firstDay);
                    prevIni.setMonth(prevIni.getMonth() - 1);
                    const prevFirst = new Date(prevIni.getFullYear(), prevIni.getMonth(), 1);
                    const prevLast = new Date(prevIni.getFullYear(), prevIni.getMonth() + 1, 0);
                    setPeriodoComparar({ inicio: prevFirst.toISOString().slice(0,10), fim: prevLast.toISOString().slice(0,10) });
                  }}
                >{'<'}</button>
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-base font-bold"
                  title="Próximo mês"
                  onClick={() => {
                    const ini = new Date(periodo.inicio);
                    ini.setMonth(ini.getMonth() + 1);
                    const firstDay = new Date(ini.getFullYear(), ini.getMonth(), 1);
                    const lastDay = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
                    setPeriodo({ inicio: firstDay.toISOString().slice(0,10), fim: lastDay.toISOString().slice(0,10) });
                    // Atualiza comparar com período para o mês seguinte ao novo mês exibido
                    const nextIni = new Date(firstDay);
                    nextIni.setMonth(nextIni.getMonth() + 1);
                    const nextFirst = new Date(nextIni.getFullYear(), nextIni.getMonth(), 1);
                    const nextLast = new Date(nextIni.getFullYear(), nextIni.getMonth() + 1, 0);
                    setPeriodoComparar({ inicio: nextFirst.toISOString().slice(0,10), fim: nextLast.toISOString().slice(0,10) });
                  }}
                >{'>'}</button>
              </>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="todos">Todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Categoria</label>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="border rounded px-2 py-1">
              <option value="todos">Todas</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Favorecido/Cliente</label>
            <select value={filtroFavorecido} onChange={e => setFiltroFavorecido(e.target.value)} className="border rounded px-2 py-1">
              <option value="todos">Todos</option>
              {favorecidos.map(fav => <option key={fav} value={fav}>{fav}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comparar com período</label>
            <input type="date" value={periodoComparar?.inicio || ''} onChange={e => setPeriodoComparar(p => ({...p, inicio: e.target.value, fim: p?.fim || ''}))} className="border rounded px-2 py-1 mr-1" />
            <input type="date" value={periodoComparar?.fim || ''} onChange={e => setPeriodoComparar(p => ({...p, fim: e.target.value, inicio: p?.inicio || ''}))} className="border rounded px-2 py-1" />
            <button
              onClick={() => {
                setPeriodoComparar(null);
                // Forçar atualização dos campos de data
                setTimeout(() => {
                  const inputs = document.querySelectorAll('input[type="date"]');
                  inputs.forEach(input => ((input as HTMLInputElement).value = ''));
                }, 0);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-100 rounded hover:bg-blue-50 transition ml-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8m0-8L4 12"/></svg>
              Limpar
            </button>
          </div>
        </div>
        <button onClick={exportarCSV} className="bg-gradient-to-r from-[#b9936c] to-[#8a6a3b] text-white px-4 py-2 rounded-xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#b9936c]/50">Exportar CSV</button>
      </div>
      {/* Cards de resumo do período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cardsPeriodo.map((card, i) => (
          <div key={i} className={`rounded-2xl shadow border ${card.bg} p-4 flex flex-col items-center`}>
            <span className="text-xs font-semibold text-gray-500 mb-1 text-center">{card.label}</span>
            <span className={`text-2xl font-bold ${card.color}`}>R$ {Number(card.value).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
          </div>
        ))}
      </div>
      {/* Card de resumo geral */}
      <div className="mb-8">
        <div className={`rounded-2xl shadow border ${cardGeral.bg} p-4 flex flex-col items-center max-w-xs mx-auto`}>
          <span className="text-xs font-semibold text-gray-500 mb-1 text-center">{cardGeral.label}</span>
          <span className={`text-2xl font-bold ${cardGeral.color}`}>R$ {Number(cardGeral.value).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
        </div>
      </div>
      {loading || !resumo ? (
        <div className="text-center text-gray-500 py-8">Carregando resumo financeiro...</div>
      ) : (
        <>
          {/* Resumo do período filtrado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 flex flex-col justify-center">
              <div className="text-gray-500 text-xs mb-1">Receitas (período selecionado)</div>
              <div className="text-2xl font-bold text-green-700">R$ {totalReceitasPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Pagas: R$ {totalReceitasPagasPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pendentes: R$ {totalReceitasPendentesPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 flex flex-col justify-center">
              <div className="text-gray-500 text-xs mb-1">Despesas (período selecionado)</div>
              <div className="text-2xl font-bold text-red-700">R$ {totalDespesasPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Pagas: R$ {totalDespesasPagasPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pendentes: R$ {totalDespesasPendentesPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 flex flex-col justify-center">
              <div className="text-gray-500 text-xs mb-1">Saldo (período selecionado)</div>
              <div className={`text-2xl font-bold ${saldoPeriodo >= 0 ? 'text-green-700' : 'text-red-700'}`}>R$ {saldoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          {/* Resumo geral */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 flex flex-col justify-center">
              <div className="text-gray-500 text-xs mb-1">Receitas (geral)</div>
              <div className="text-2xl font-bold text-green-700">R$ {totalReceitasGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Pagas: R$ {resumo.receitasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pendentes: R$ {resumo.receitasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 flex flex-col justify-center">
              <div className="text-gray-500 text-xs mb-1">Despesas (geral)</div>
              <div className="text-2xl font-bold text-red-700">R$ {totalDespesasGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Pagas: R$ {resumo.despesasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pendentes: R$ {resumo.despesasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 flex flex-col justify-center">
              <div className="text-gray-500 text-xs mb-1">Saldo (geral)</div>
              <div className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </>
      )}
      {dadosGrafico && filtroPeriodo !== 'todos' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4">Receitas vs Despesas por Mês</h2>
          <Bar
            data={{
              labels: dadosGrafico.labels,
              datasets: [
                {
                  label: 'Receitas',
                  data: dadosGrafico.receitas,
                  backgroundColor: 'rgba(16, 185, 129, 0.7)',
                },
                {
                  label: 'Despesas',
                  data: dadosGrafico.despesas,
                  backgroundColor: 'rgba(239, 68, 68, 0.7)',
                },
                {
                  label: 'Saldo',
                  data: dadosGrafico.labels.map((_, i: number) => (dadosGrafico.receitas[i] || 0) - (dadosGrafico.despesas[i] || 0)),
                  backgroundColor: 'rgba(59, 130, 246, 0.7)',
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' as const },
                title: { display: false },
              },
              scales: {
                y: { beginAtZero: true },
              },
            }}
            height={80}
          />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center">
          <span className="text-gray-500 text-xs mb-2">Receitas por Categoria</span>
          <Doughnut
            data={{
              labels: getPorCategoria(dadosFiltrados, 'receita').labels,
              datasets: [{
                data: getPorCategoria(dadosFiltrados, 'receita').valores,
                backgroundColor: [
                  '#10b981', '#3b82f6', '#6366f1', '#a21caf', '#db2777', '#64748b', '#6d28d9', '#eab308', '#14b8a6', '#f43f5e', '#84cc16', '#0ea5e9', '#f472b6', '#facc15', '#22d3ee', '#a3e635', '#f87171'
                ],
              }],
            }}
            options={{
              plugins: {
                legend: { position: 'bottom' as const },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) => {
                      const total = getPorCategoria(dadosFiltrados, 'receita').total;
                      const valor = ctx.parsed;
                      const percent = total ? ((valor / total) * 100).toFixed(1) : 0;
                      const qtd = getPorCategoria(dadosFiltrados, 'receita').quantidades[ctx.dataIndex];
                      return `${ctx.label}: R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits:2})} (${percent}%) - ${qtd} lançamento(s)`;
                    }
                  }
                }
              },
              cutout: '70%',
            }}
            width={120}
            height={120}
          />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center">
          <span className="text-gray-500 text-xs mb-2">Despesas por Categoria</span>
          {getPorCategoria(dadosFiltrados, 'despesa').valores.length > 0 && getPorCategoria(dadosFiltrados, 'despesa').valores.some(v => v > 0) ? (
            <Doughnut
              data={{
                labels: getPorCategoria(dadosFiltrados, 'despesa').labels,
                datasets: [{
                  data: getPorCategoria(dadosFiltrados, 'despesa').valores,
                  backgroundColor: [
                    '#ef4444', '#f59e42', '#fbbf24', '#10b981', '#3b82f6', '#6366f1', '#a21caf', '#db2777', '#64748b', '#6d28d9', '#eab308', '#14b8a6', '#f43f5e', '#84cc16', '#0ea5e9', '#f472b6', '#facc15', '#22d3ee', '#a3e635', '#f87171'
                  ],
                }],
              }}
              options={{
                plugins: {
                  legend: { position: 'bottom' as const },
                  tooltip: {
                    callbacks: {
                      label: (ctx: any) => {
                        const total = getPorCategoria(dadosFiltrados, 'despesa').total;
                        const valor = ctx.parsed;
                        const percent = total ? ((valor / total) * 100).toFixed(1) : 0;
                        const qtd = getPorCategoria(dadosFiltrados, 'despesa').quantidades[ctx.dataIndex];
                        return `${ctx.label}: R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits:2})} (${percent}%) - ${qtd} lançamento(s)`;
                      }
                    }
                  }
                },
                cutout: '70%',
              }}
              width={120}
              height={120}
            />
          ) : (
            <span className="text-gray-400 text-xs mt-8">Sem despesas para exibir</span>
          )}
        </div>
      </div>
      {periodoComparar && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center">
            <span className="text-gray-500 text-xs mb-2">Receitas por Categoria (Período 1)</span>
            <Doughnut
              data={{
                labels: getPorCategoria(dadosFiltrados, 'receita').labels,
                datasets: [{
                  data: getPorCategoria(dadosFiltrados, 'receita').valores,
                  backgroundColor: [
                    '#10b981', '#3b82f6', '#6366f1', '#a21caf', '#db2777', '#64748b', '#6d28d9', '#eab308', '#14b8a6', '#f43f5e', '#84cc16', '#0ea5e9', '#f472b6', '#facc15', '#22d3ee', '#a3e635', '#f87171'
                  ],
                }],
              }}
              options={{ plugins: { legend: { position: 'bottom' as const } }, cutout: '70%' }}
              width={120}
              height={120}
            />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center">
            <span className="text-gray-500 text-xs mb-2">Receitas por Categoria (Período 2)</span>
            <Doughnut
              data={{
                labels: getPorCategoria(dadosComparar, 'receita').labels,
                datasets: [{
                  data: getPorCategoria(dadosComparar, 'receita').valores,
                  backgroundColor: [
                    '#10b981', '#3b82f6', '#6366f1', '#a21caf', '#db2777', '#64748b', '#6d28d9', '#eab308', '#14b8a6', '#f43f5e', '#84cc16', '#0ea5e9', '#f472b6', '#facc15', '#22d3ee', '#a3e635', '#f87171'
                  ],
                }],
              }}
              options={{ plugins: { legend: { position: 'bottom' as const } }, cutout: '70%' }}
              width={120}
              height={120}
            />
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
        {/* Gráfico de Evolução Financeira removido conforme solicitado */}
      </div>
      {/* Gráfico de Evolução Financeira Anual - Todos os meses do ano, todas as receitas e despesas */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4">Evolução Financeira (Ano Completo)</h2>
        <Bar
          data={{
            labels: getEvolucao(dadosTodos).labels,
            datasets: [
              {
                type: 'bar',
                label: 'Receitas',
                data: getEvolucao(dadosTodos).receitas,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderRadius: 4,
                barPercentage: 0.5,
                categoryPercentage: 0.5,
              },
              {
                type: 'bar',
                label: 'Despesas',
                data: getEvolucao(dadosTodos).despesas,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderRadius: 4,
                barPercentage: 0.5,
                categoryPercentage: 0.5,
              },
              {
                type: 'line',
                label: 'Saldo',
                data: getEvolucao(dadosTodos).saldo,
                borderColor: 'rgba(59, 130, 246, 0.7)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointRadius: 3,
                datalabels: {
                  display: false,
                },
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { position: 'top' as const },
              title: { display: false },
              datalabels: {
                display: (ctx: any) => ctx.dataset.type === 'bar',
                anchor: 'end',
                align: 'top',
                color: (ctx: any) => ctx.dataset.label === 'Receitas' ? '#10b981' : '#ef4444',
                font: { weight: 'bold' },
                formatter: (value: number) => value > 0 ? value.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '',
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: (ctx: any) => {
                    let label = ctx.dataset.label || '';
                    if (label) label += ': ';
                    if (ctx.parsed.y !== undefined) label += `R$ ${ctx.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
                    return label;
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true },
            },
          }}
          height={80}
          plugins={[ChartDataLabels]}
        />
      </div>
    </div>
  );
} 