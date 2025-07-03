import React, { useEffect, useState, useRef } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format as formatDate, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { addMonths, subMonths, startOfMonth } from 'date-fns';

interface Atividade {
  id: number;
  responsavel: string;
  atividade: string;
  cliente: string;
  data_pedido: string;
  data_realizacao: string;
  data_entrega: string;
  status: string;
  arquivo: string;
}

interface Cliente {
  id: number;
  nome: string;
}

const statusOptions = ['Pendente', 'Em Andamento', 'Em Aprovação', 'Aprovado'];

const locales = {
  'pt-BR': ptBR,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0, locale: ptBR }),
  getDay,
  locales,
});

const timeZone = 'America/Sao_Paulo';

// Função utilitária para converter datas para o formato do input datetime-local
function toInputDateTime(dt: string | undefined) {
  if (!dt) return '';
  // Aceita formatos com ou sem segundos
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  // Retorna no formato YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

export default function Agenda() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Atividade, 'id'>>({
    responsavel: '',
    atividade: '',
    cliente: '',
    data_pedido: '',
    data_realizacao: '',
    data_entrega: '',
    status: 'Pendente',
    arquivo: '',
  });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'tabela' | 'calendario'>('tabela');
  const [selected, setSelected] = useState<Atividade | null>(null);
  const [admins, setAdmins] = useState<{ id: number, name: string }[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<number | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));
  // Filtro de status
  const [statusFiltro, setStatusFiltro] = useState<string>('Todos');
  // Ordenação
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  // Paginação
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  useEffect(() => {
    fetchAtividades();
    fetchAdmins();
    fetchClientes();
  }, []);

  // Fecha o menu de status ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuId(null);
      }
    }
    if (statusMenuId !== null) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusMenuId]);

  async function fetchAtividades() {
    setLoading(true);
    const res = await fetch('/api/atividades');
    let data = [];
    try {
      data = await res.json();
      if (!Array.isArray(data)) data = [];
    } catch {
      data = [];
    }
    setAtividades(data);
    setLoading(false);
  }

  async function fetchAdmins() {
    try {
      const res = await fetch('/api/users?role=admin');
      const data = await res.json();
      setAdmins(data);
    } catch {
      setAdmins([]);
    }
  }

  async function fetchClientes() {
    try {
      const res = await fetch('/api/clientes');
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleEdit(atividade: Atividade) {
    setEditId(atividade.id);
    setForm({
      responsavel: atividade.responsavel,
      atividade: atividade.atividade,
      cliente: atividade.cliente,
      data_pedido: toInputDateTime(atividade.data_pedido),
      data_realizacao: toInputDateTime(atividade.data_realizacao),
      data_entrega: toInputDateTime(atividade.data_entrega),
      status: atividade.status,
      arquivo: atividade.arquivo || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editId) {
      await fetch(`/api/atividades/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    setEditId(null);
    setForm({ responsavel: '', atividade: '', cliente: '', data_pedido: '', data_realizacao: '', data_entrega: '', status: 'Pendente', arquivo: '' });
    fetchAtividades();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir esta atividade?')) return;
    setLoading(true);
    await fetch(`/api/atividades/${id}`, { method: 'DELETE' });
    fetchAtividades();
    setLoading(false);
  }

  // Eventos para o calendário
  const eventos = atividades.map(a => ({
    id: a.id,
    title: a.atividade + (a.cliente ? ` (${a.cliente})` : ''),
    start: new Date(a.data_pedido),
    end: new Date(a.data_entrega),
    resource: a,
  }));

  async function handleStatusChange(id: number, newStatus: string) {
    setLoading(true);
    const atividade = atividades.find(a => a.id === id);
    if (!atividade) return;
    const payload = {
      ...atividade,
      status: newStatus,
    };
    await fetch(`/api/atividades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setStatusMenuId(null);
    await fetchAtividades();
    setLoading(false);
  }

  // Filtrar atividades do mês selecionado e status
  let atividadesFiltradas = atividades.filter(a => {
    const datas = [a.data_pedido, a.data_realizacao, a.data_entrega]
      .map(dt => dt ? new Date(dt) : null)
      .filter(Boolean) as Date[];
    const noMes = datas.some(dt =>
      dt.getFullYear() === currentDate.getFullYear() &&
      dt.getMonth() === currentDate.getMonth()
    );
    const statusOk = statusFiltro === 'Todos' || a.status === statusFiltro;
    return noMes && statusOk;
  });

  // Ordenação
  if (sortKey) {
    atividadesFiltradas = [...atividadesFiltradas].sort((a, b) => {
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
  const totalPaginas = Math.ceil(atividadesFiltradas.length / porPagina);
  const atividadesPaginadas = atividadesFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Resumo de status para o mês selecionado
  const resumoStatus = {
    Pendente: 0,
    'Em Andamento': 0,
    'Em Aprovação': 0,
    Aprovado: 0,
  };
  atividadesFiltradas.forEach(a => {
    if (resumoStatus[a.status] !== undefined) {
      resumoStatus[a.status]++;
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black drop-shadow-sm">Agenda de Atividades</h1>
        <div className="flex gap-2 items-center">
          <button
            className={`px-4 py-2 rounded-xl shadow font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#b9936c]/50 bg-gradient-to-r from-[#b9936c] to-[#8a6a3b] text-white ${
              view === 'tabela' ? 'brightness-110' : 'opacity-80 hover:brightness-110'
            }`}
            onClick={() => { setView('tabela'); }}
          >
            Tabela
          </button>
          <button
            className={`px-4 py-2 rounded-xl shadow font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#b9936c]/50 bg-gradient-to-r from-[#b9936c] to-[#8a6a3b] text-white ${
              view === 'calendario' ? 'brightness-110' : 'opacity-80 hover:brightness-110'
            }`}
            onClick={() => { setView('calendario'); }}
          >
            Calendário
          </button>
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-[#b9936c] to-[#8a6a3b] text-white px-6 py-2 rounded-2xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#b9936c]/50 text-lg"
            onClick={() => setShowForm(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75M3 18.75V17.25M21 18.75V17.25M9.75 10.5h4.5" />
            </svg>
            Nova Atividade
          </button>
        </div>
      </div>
      {showForm && (
        <form className="bg-white p-6 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end border border-logo-light/30" onSubmit={handleSubmit}>
          <div className="w-full mb-2">
            <h2 className="text-xl font-bold text-logo mb-2">{editId ? 'Editar Atividade' : 'Nova Atividade'}</h2>
          </div>
          <div className="flex flex-col min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <select name="responsavel" value={form.responsavel} onChange={handleChange} className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required>
              <option value="">Selecione o responsável</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.name}>{admin.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Atividade</label>
            <input name="atividade" value={form.atividade} onChange={handleChange} placeholder="Atividade" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              name="cliente"
              value={form.cliente}
              onChange={handleChange}
              placeholder="Digite o nome do cliente"
              className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Data do Pedido</label>
            <input name="data_pedido" value={form.data_pedido} onChange={handleChange} type="datetime-local" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Data da Realização</label>
            <input name="data_realizacao" value={form.data_realizacao} onChange={handleChange} type="datetime-local" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Data da Entrega</label>
            <input name="data_entrega" value={form.data_entrega} onChange={handleChange} type="datetime-local" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400">
              {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1">Arquivo (Google Drive)</label>
            <input name="arquivo" value={form.arquivo} onChange={handleChange} placeholder="Link do Google Drive" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-gradient-to-r from-[#b9936c] to-[#8a6a3b] text-white px-5 py-2 rounded-xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#b9936c]/50">{editId ? 'Salvar Alterações' : 'Salvar'}</button>
            <button type="button" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#b9936c] to-[#8a6a3b] text-white hover:brightness-110 border-none" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {view === 'tabela' && (
        <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
          {/* Filtro de status */}
          <div className="flex flex-wrap gap-4 items-center px-4 pt-6 pb-2">
            <select
              className="border rounded px-3 py-2 text-sm"
              value={statusFiltro}
              onChange={e => { setStatusFiltro(e.target.value); setPagina(1); }}
            >
              <option value="Todos">Todos os status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Em Aprovação">Em Aprovação</option>
              <option value="Aprovado">Aprovadas</option>
            </select>
          </div>
          {/* Cards de resumo de status com tooltip CSS puro */}
          <div className="flex gap-4 px-4 pt-2 pb-2">
            <div className="flex-1 min-w-[120px] bg-red-500 text-white rounded-xl p-3 flex flex-col items-center shadow-sm relative group">
              <span className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {resumoStatus.Pendente}
              </span>
              <span className="text-xs font-semibold mt-1">Pendentes</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Tarefas pendentes neste mês</span>
            </div>
            <div className="flex-1 min-w-[120px] bg-yellow-400 text-white rounded-xl p-3 flex flex-col items-center shadow-sm relative group">
              <span className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11 3"/><polyline points="21 8 21 13 16 13"/></svg>
                {resumoStatus['Em Andamento']}
              </span>
              <span className="text-xs font-semibold mt-1">Em Andamento</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Tarefas em andamento neste mês</span>
            </div>
            <div className="flex-1 min-w-[120px] bg-blue-500 text-white rounded-xl p-3 flex flex-col items-center shadow-sm relative group">
              <span className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16.862 4.487a2.1 2.1 0 112.97 2.97L7.5 19.788l-4 1 1-4 12.362-12.3z"/></svg>
                {resumoStatus['Em Aprovação']}
              </span>
              <span className="text-xs font-semibold mt-1">Em Aprovação</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Tarefas em aprovação neste mês</span>
            </div>
            <div className="flex-1 min-w-[120px] bg-green-600 text-white rounded-xl p-3 flex flex-col items-center shadow-sm relative group">
              <span className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                {resumoStatus.Aprovado}
              </span>
              <span className="text-xs font-semibold mt-1">Aprovadas</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">Tarefas aprovadas neste mês</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4 px-4 pt-4">
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
              onClick={() => { setCurrentDate(prev => subMonths(prev, 1)); setPagina(1); }}
              title="Mês anterior"
            >
              {'<'}
            </button>
            <span className="font-semibold text-lg">
              {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
              onClick={() => { setCurrentDate(prev => addMonths(prev, 1)); setPagina(1); }}
              title="Próximo mês"
            >
              {'>'}
            </button>
          </div>
          <table className="min-w-fit text-base text-gray-800 w-full">
            <thead>
              <tr className="bg-white text-[#8a6a3b] border-b-2 border-[#b9936c] rounded-t-xl">
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('atividade'); setSortAsc(k => sortKey === 'atividade' ? !k : true); }}>Atividade {sortKey === 'atividade' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('responsavel'); setSortAsc(k => sortKey === 'responsavel' ? !k : true); }}>Responsável {sortKey === 'responsavel' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('cliente'); setSortAsc(k => sortKey === 'cliente' ? !k : true); }}>Cliente {sortKey === 'cliente' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('data_pedido'); setSortAsc(k => sortKey === 'data_pedido' ? !k : true); }}>Data do Pedido {sortKey === 'data_pedido' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('data_realizacao'); setSortAsc(k => sortKey === 'data_realizacao' ? !k : true); }}>Data da Realização {sortKey === 'data_realizacao' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('data_entrega'); setSortAsc(k => sortKey === 'data_entrega' ? !k : true); }}>Data da Entrega {sortKey === 'data_entrega' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left cursor-pointer" onClick={() => { setSortKey('status'); setSortAsc(k => sortKey === 'status' ? !k : true); }}>Status {sortKey === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-4 py-3 font-semibold text-left">Arquivo</th>
                <th className="px-4 py-3 font-semibold text-left"> </th>
              </tr>
            </thead>
            <tbody>
              {atividadesPaginadas.map(a => (
                <tr
                  key={a.id}
                  className={(() => {
                    let base = 'transition-all group ';
                    if (a.status === 'Pendente') base += 'bg-red-100 ';
                    if (a.status === 'Em Andamento') base += 'bg-yellow-100 ';
                    if (a.status === 'Em Aprovação') base += 'bg-blue-100 ';
                    if (a.status === 'Aprovado') base += 'bg-green-100 ';
                    base += 'hover:bg-gray-100';
                    return base;
                  })()}
                >
                  <td className="px-4 py-3 whitespace-normal break-words max-w-[220px]" title={a.atividade}>{a.atividade}</td>
                  <td className="px-4 py-3 whitespace-normal break-words max-w-[160px]" title={a.responsavel}>{a.responsavel}</td>
                  <td className="px-4 py-3 whitespace-normal break-words max-w-[160px]" title={a.cliente}>{a.cliente}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div>{a.data_pedido ? formatDate(toZonedTime(parseISO(a.data_pedido), timeZone), 'dd/MM/yyyy') : '-'}</div>
                    <div className="text-xs text-gray-500">{a.data_pedido ? formatDate(toZonedTime(parseISO(a.data_pedido), timeZone), 'HH:mm') : ''}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div>{a.data_realizacao ? formatDate(toZonedTime(parseISO(a.data_realizacao), timeZone), 'dd/MM/yyyy') : '-'}</div>
                    <div className="text-xs text-gray-500">{a.data_realizacao ? formatDate(toZonedTime(parseISO(a.data_realizacao), timeZone), 'HH:mm') : ''}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div>{a.data_entrega ? formatDate(toZonedTime(parseISO(a.data_entrega), timeZone), 'dd/MM/yyyy') : '-'}</div>
                    <div className="text-xs text-gray-500">{a.data_entrega ? formatDate(toZonedTime(parseISO(a.data_entrega), timeZone), 'HH:mm') : ''}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={
                        `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-2 ` +
                        (a.status === 'Pendente' ? 'bg-red-100 text-red-700 ' : '') +
                        (a.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800 ' : '') +
                        (a.status === 'Em Aprovação' ? 'bg-blue-100 text-blue-800 ' : '') +
                        (a.status === 'Aprovado' ? 'bg-green-100 text-green-700 ' : '')
                      }
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {a.arquivo ? (
                      <a href={a.arquivo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center justify-center gap-1" title="Abrir arquivo">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L18 9.828M7 7h.01" /></svg>
                        Arquivo
                      </a>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 bg-white shadow-sm transition-all duration-150 mr-2 hover:bg-green-100 group"
                      title="Editar"
                      onClick={() => handleEdit(a)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#0074D9" className="w-4 h-4 group-hover:scale-110 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.788l-4 1 1-4 12.362-12.3z" />
                      </svg>
                    </button>
                    <button
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 bg-white shadow-sm transition-all duration-150 hover:bg-red-100 group"
                      title="Excluir"
                      onClick={() => handleDelete(a.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#FF4136" className="w-4 h-4 group-hover:scale-110 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {atividadesPaginadas.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400">Nenhuma atividade cadastrada.</td></tr>
              )}
            </tbody>
          </table>
          {/* Paginação */}
          <div className="flex justify-center items-center gap-2 py-4">
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>{'<'}</button>
            <span className="font-semibold">Página {pagina} de {totalPaginas}</span>
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>{'>'}</button>
          </div>
        </div>
      )}
      {view === 'calendario' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
              onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
              title="Mês anterior"
            >
              {'<'}
            </button>
            <span className="font-semibold text-lg">
              {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
              onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
              title="Próximo mês"
            >
              {'>'}
            </button>
          </div>
          <BigCalendar
            localizer={localizer}
            culture="pt-BR"
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            date={currentDate}
            onNavigate={date => setCurrentDate(startOfMonth(date))}
            views={['month']}
            messages={{
              next: 'Próximo',
              previous: 'Anterior',
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              agenda: 'Agenda',
              date: 'Data',
              time: 'Hora',
              event: 'Atividade',
              noEventsInRange: 'Nenhuma atividade neste período.',
              showMore: (total: number) => `+${total} mais`,
              allDay: 'Dia todo',
              work_week: 'Dias úteis',
              weekdays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
              months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            }}
            eventPropGetter={(event: any) => {
              let bg = '#2563eb'; // azul padrão
              if (event.resource && event.resource.status === 'Pendente') bg = '#facc15'; // amarelo
              if (event.resource && event.resource.status === 'Em Andamento') bg = '#38bdf8'; // azul claro
              if (event.resource && event.resource.status === 'Em Aprovação') bg = '#f472b6'; // rosa
              if (event.resource && event.resource.status === 'Aprovado') bg = '#22c55e'; // verde
              return {
                style: {
                  backgroundColor: bg,
                  borderRadius: '8px',
                  color: '#fff',
                  border: 'none',
                },
              };
            }}
            onSelectEvent={event => setSelected(event.resource)}
          />
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[90vw]">
            <h2 className="text-xl font-bold mb-2">Detalhes da Atividade</h2>
            <div className="mb-2"><b>Atividade:</b> {selected.atividade}</div>
            <div className="mb-2"><b>Responsável:</b> {selected.responsavel}</div>
            <div className="mb-2"><b>Cliente:</b> {selected.cliente}</div>
            <div className="mb-2"><b>Data do Pedido:</b> {selected.data_pedido ? formatDate(toZonedTime(parseISO(selected.data_pedido), timeZone), 'dd/MM/yyyy HH:mm') : '-'}</div>
            <div className="mb-2"><b>Data da Realização:</b> {selected.data_realizacao ? formatDate(toZonedTime(parseISO(selected.data_realizacao), timeZone), 'dd/MM/yyyy HH:mm') : '-'}</div>
            <div className="mb-2"><b>Data da Entrega:</b> {selected.data_entrega ? formatDate(toZonedTime(parseISO(selected.data_entrega), timeZone), 'dd/MM/yyyy HH:mm') : '-'}</div>
            <div className="mb-2"><b>Status:</b> {selected.status}</div>
            <div className="mb-2"><b>Arquivo:</b> {selected.arquivo ? <a href={selected.arquivo} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Abrir</a> : '-'}</div>
            <button className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => setSelected(null)}>Fechar</button>
          </div>
        </div>
      )}
      {loading && <div className="mt-4 text-gray-500">Carregando...</div>}
    </div>
  );
} 