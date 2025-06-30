import React, { useEffect, useState, useRef } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format as formatDate, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

const statusOptions = ['Pendente', 'Em Andamento', 'Em Aprovação', 'Aprovado'];

const locales = {
  'pt-BR': ptBR,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
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

  useEffect(() => {
    fetchAtividades();
    fetchAdmins();
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
    await fetch(`/api/atividades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...atividades.find(a => a.id === id), status: newStatus }),
    });
    setStatusMenuId(null);
    fetchAtividades();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black drop-shadow-sm">Agenda de Atividades</h1>
        <div className="flex gap-2 items-center">
          <button
            className={`px-4 py-2 rounded-xl shadow font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-logo/50 ${
              view === 'tabela'
                ? 'bg-gradient-to-r from-logo to-logo-light text-white'
                : 'bg-white text-logo border border-logo-light hover:bg-logo-light/10'
            }`}
            onClick={() => setView('tabela')}
          >
            Tabela
          </button>
          <button
            className={`px-4 py-2 rounded-xl shadow font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-logo/50 ${
              view === 'calendario'
                ? 'bg-gradient-to-r from-logo to-logo-light text-white'
                : 'bg-white text-logo border border-logo-light hover:bg-logo-light/10'
            }`}
            onClick={() => setView('calendario')}
          >
            Calendário
          </button>
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-[#b9936c] to-[#e6d3c6] text-white px-6 py-2 rounded-2xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#b9936c]/50 text-lg"
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
            <input name="cliente" value={form.cliente} onChange={handleChange} placeholder="Cliente" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
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
            <button type="submit" className="bg-gradient-to-r from-logo to-logo-light text-white px-5 py-2 rounded-xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-logo/50">{editId ? 'Salvar Alterações' : 'Salvar'}</button>
            <button type="button" className="px-5 py-2 rounded-xl border border-logo-light bg-white text-logo hover:bg-logo-light/10" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {view === 'tabela' && (
        <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
          <table className="min-w-full text-base text-gray-800">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-4 py-3 font-semibold text-left">Atividade</th>
                <th className="px-4 py-3 font-semibold text-left">Cliente</th>
                <th className="px-4 py-3 font-semibold text-left">Data do Pedido</th>
                <th className="px-4 py-3 font-semibold text-left">Data da Realização</th>
                <th className="px-4 py-3 font-semibold text-left">Data da Entrega</th>
                <th className="px-4 py-3 font-semibold text-left">Status</th>
                <th className="px-4 py-3 font-semibold text-left">Arquivo</th>
                <th className="px-4 py-3 font-semibold text-left"> </th>
              </tr>
            </thead>
            <tbody>
              {atividades.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-all group">
                  <td className="px-4 py-3 whitespace-nowrap flex items-center gap-2 font-medium">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-logo mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75M3 18.75V17.25M21 18.75V17.25M9.75 10.5h4.5" />
                      </svg>
                    </span>
                    <span className="truncate max-w-[220px]" title={a.atividade}>{a.atividade}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap max-w-[160px] truncate" title={a.cliente}>{a.cliente}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{a.data_pedido ? formatDate(toZonedTime(parseISO(a.data_pedido), timeZone), 'dd/MM/yyyy HH:mm') : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{a.data_realizacao ? formatDate(toZonedTime(parseISO(a.data_realizacao), timeZone), 'dd/MM/yyyy HH:mm') : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{a.data_entrega ? formatDate(toZonedTime(parseISO(a.data_entrega), timeZone), 'dd/MM/yyyy HH:mm') : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap relative">
                    <button
                      type="button"
                      className={
                        `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-logo/30 ` +
                        (a.status === 'Pendente' ? 'bg-red-100 text-red-700 ' : '') +
                        (a.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800 ' : '') +
                        (a.status === 'Em Aprovação' ? 'bg-blue-100 text-blue-800 ' : '') +
                        (a.status === 'Aprovado' ? 'bg-green-100 text-green-700 ' : '')
                      }
                      onClick={() => setStatusMenuId(a.id)}
                    >
                      <span className={
                        'w-2 h-2 rounded-full inline-block mr-1 ' +
                        (a.status === 'Pendente' ? 'bg-red-500 ' : '') +
                        (a.status === 'Em Andamento' ? 'bg-yellow-400 ' : '') +
                        (a.status === 'Em Aprovação' ? 'bg-blue-500 ' : '') +
                        (a.status === 'Aprovado' ? 'bg-green-500 ' : '')
                      }></span>
                      {a.status}
                    </button>
                    {statusMenuId === a.id && (
                      <div ref={statusMenuRef} className="absolute z-20 left-0 mt-2 bg-white border border-gray-200 rounded shadow-lg min-w-[140px]">
                        {statusOptions.map(opt => (
                          <button
                            key={opt}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${opt === a.status ? 'font-bold text-logo' : ''}`}
                            onClick={() => handleStatusChange(a.id, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {a.arquivo ? <a href={a.arquivo} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Arquivo</a> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button className="text-gray-400 hover:text-logo p-1" title="Editar" onClick={() => handleEdit(a)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.788l-4 1 1-4 12.362-12.3z" />
                      </svg>
                    </button>
                    <button className="text-gray-400 hover:text-red-500 p-1 ml-1" title="Excluir" onClick={() => handleDelete(a.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {atividades.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400">Nenhuma atividade cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {view === 'calendario' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <BigCalendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
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
              noEventsInRange: 'Nenhuma atividade neste período.'
            }}
            eventPropGetter={(event: any) => {
              let bg = '#2563eb'; // azul padrão
              if (event.resource.status === 'Pendente') bg = '#facc15'; // amarelo
              if (event.resource.status === 'Em Andamento') bg = '#2563eb'; // azul
              if (event.resource.status === 'Concluída') bg = '#22c55e'; // verde
              if (event.resource.status === 'Cancelada') bg = '#ef4444'; // vermelho
              return {
                style: { backgroundColor: bg, color: 'white', borderRadius: 6, border: 0 }
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