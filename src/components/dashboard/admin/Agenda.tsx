import React, { useEffect, useState } from 'react';
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
  data_entrega: string;
  status: string;
  arquivo: string;
}

const statusOptions = ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'];

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

export default function Agenda() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Atividade, 'id'>>({
    responsavel: '',
    atividade: '',
    cliente: '',
    data_pedido: '',
    data_entrega: '',
    status: 'Pendente',
    arquivo: '',
  });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'tabela' | 'calendario'>('tabela');
  const [selected, setSelected] = useState<Atividade | null>(null);
  const [admins, setAdmins] = useState<{ id: number, name: string }[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    fetchAtividades();
    fetchAdmins();
  }, []);

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
      data_pedido: atividade.data_pedido ? atividade.data_pedido.slice(0, 10) : '',
      data_entrega: atividade.data_entrega ? atividade.data_entrega.slice(0, 10) : '',
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
    setForm({ responsavel: '', atividade: '', cliente: '', data_pedido: '', data_entrega: '', status: 'Pendente', arquivo: '' });
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black drop-shadow-sm">Agenda de Atividades</h1>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-xl shadow font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-logo/50 ${view === 'tabela' ? 'bg-gradient-to-r from-logo to-logo-light text-white' : 'bg-white text-logo border border-logo-light hover:bg-logo-light/10'}`}
              onClick={() => setView('tabela')}
            >Tabela</button>
            <button
              className={`px-4 py-2 rounded-xl shadow font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-logo/50 ${view === 'calendario' ? 'bg-gradient-to-r from-logo to-logo-light text-white' : 'bg-white text-logo border border-logo-light hover:bg-logo-light/10'}`}
              onClick={() => setView('calendario')}
            >Calendário</button>
          </div>
          <button className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-2 rounded-xl shadow font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-logo/50" onClick={() => setShowForm(true)}>
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
            <input name="data_pedido" value={form.data_pedido} onChange={handleChange} type="date" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Data da Entrega</label>
            <input name="data_entrega" value={form.data_entrega} onChange={handleChange} type="date" className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-400" required />
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
        <div className="overflow-x-auto bg-white rounded-xl shadow border border-logo-light/30">
          <table className="min-w-full text-sm text-gray-800">
            <thead>
              <tr className="bg-gradient-to-r from-logo to-logo-light text-white rounded-t-xl">
                <th className="px-4 py-3 border-b font-semibold">Responsável</th>
                <th className="px-4 py-3 border-b font-semibold">Atividade</th>
                <th className="px-4 py-3 border-b font-semibold">Cliente</th>
                <th className="px-4 py-3 border-b font-semibold">Data do Pedido</th>
                <th className="px-4 py-3 border-b font-semibold">Data da Entrega</th>
                <th className="px-4 py-3 border-b font-semibold">Status</th>
                <th className="px-4 py-3 border-b font-semibold">Arquivo</th>
                <th className="px-4 py-3 border-b font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {atividades.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{a.responsavel}</td>
                  <td className="px-4 py-2 border-b">{a.atividade}</td>
                  <td className="px-4 py-2 border-b">{a.cliente}</td>
                  <td className="px-4 py-2 border-b">{a.data_pedido ? formatDate(toZonedTime(parseISO(a.data_pedido), timeZone), 'dd/MM/yyyy HH:mm:ss') : '-'}</td>
                  <td className="px-4 py-2 border-b">{a.data_entrega ? formatDate(toZonedTime(parseISO(a.data_entrega), timeZone), 'dd/MM/yyyy HH:mm:ss') : '-'}</td>
                  <td className="px-4 py-2 border-b">{a.status}</td>
                  <td className="px-4 py-2 border-b">{a.arquivo ? <a href={a.arquivo} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Arquivo</a> : '-'}</td>
                  <td className="px-4 py-2 border-b flex gap-2">
                    <button className="text-blue-600 hover:underline" onClick={() => handleEdit(a)}>Editar</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(a.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
              {atividades.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">Nenhuma atividade cadastrada.</td></tr>
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
              if (event.resource.status === 'Em andamento') bg = '#2563eb'; // azul
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
            <div className="mb-2"><b>Data do Pedido:</b> {selected.data_pedido}</div>
            <div className="mb-2"><b>Data da Entrega:</b> {selected.data_entrega}</div>
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