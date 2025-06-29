import React, { useEffect, useState } from 'react';

interface AuditLog {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  detalhes: string;
  data_hora: string;
}

// Tradução de ações e entidades
const acaoLabel: Record<string, string> = {
  CREATE: 'Criou',
  UPDATE: 'Editou',
  DELETE: 'Excluiu',
};
const entidadeLabel: Record<string, string> = {
  categoria: 'Categoria Financeira',
  transacao: 'Transação Financeira',
  projeto: 'Projeto',
  usuario: 'Usuário',
};

function renderDetalhes(log: AuditLog) {
  try {
    const detalhes = JSON.parse(log.detalhes);
    if (log.entidade === 'transacao') {
      if (log.acao === 'CREATE') {
        return `Tipo: ${detalhes.tipo}, Valor: R$ ${detalhes.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Data: ${detalhes.data}`;
      }
      if (log.acao === 'UPDATE') {
        return (
          <span>
            <span className="block text-xs text-gray-500">De: Tipo: {detalhes.antes?.tipo}, Valor: R$ {detalhes.antes?.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="block text-xs text-gray-500">Para: Tipo: {detalhes.depois?.tipo}, Valor: R$ {detalhes.depois?.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </span>
        );
      }
      if (log.acao === 'DELETE') {
        return `Tipo: ${detalhes.removido?.tipo}, Valor: R$ ${detalhes.removido?.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (removido)`;
      }
    } else {
      if (log.acao === 'CREATE') {
        return `Nome: ${detalhes.nome || detalhes.removido?.nome || ''}, Tipo: ${detalhes.tipo || detalhes.removido?.tipo || ''}`;
      }
      if (log.acao === 'UPDATE') {
        return (
          <span>
            <span className="block text-xs text-gray-500">De: Nome: {detalhes.antes?.nome}, Tipo: {detalhes.antes?.tipo}</span>
            <span className="block text-xs text-gray-500">Para: Nome: {detalhes.depois?.nome}, Tipo: {detalhes.depois?.tipo}</span>
          </span>
        );
      }
      if (log.acao === 'DELETE') {
        return `Nome: ${detalhes.removido?.nome}, Tipo: ${detalhes.removido?.tipo} (removido)`;
      }
    }
    return JSON.stringify(detalhes);
  } catch {
    return log.detalhes;
  }
}

const acaoOptions = [
  { value: '', label: 'Todas as Ações' },
  { value: 'CREATE', label: 'Criou' },
  { value: 'UPDATE', label: 'Editou' },
  { value: 'DELETE', label: 'Excluiu' },
];
const entidadeOptions = [
  { value: '', label: 'Todas as Entidades' },
  { value: 'categoria', label: 'Categoria Financeira' },
  { value: 'transacao', label: 'Transação Financeira' },
  { value: 'projeto', label: 'Projeto' },
  { value: 'usuario', label: 'Usuário' },
];

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usuarioNome, setUsuarioNome] = useState('');
  const [acao, setAcao] = useState('');
  const [entidade, setEntidade] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (usuarioNome) params.append('usuario_nome', usuarioNome);
        if (acao) params.append('acao', acao);
        if (entidade) params.append('entidade', entidade);
        const res = await fetch(`/api/auditoria/logs?${params.toString()}`);
        if (!res.ok) throw new Error('Erro ao buscar logs');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError('Erro ao buscar logs de auditoria.');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [usuarioNome, acao, entidade]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Logs de Auditoria</h1>
      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Usuário</label>
          <input
            type="text"
            value={usuarioNome}
            onChange={e => setUsuarioNome(e.target.value)}
            placeholder="Pesquisar por usuário"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-logo-light"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Ação</label>
          <select
            value={acao}
            onChange={e => setAcao(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-logo-light"
          >
            {acaoOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Entidade</label>
          <select
            value={entidade}
            onChange={e => setEntidade(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-logo-light"
          >
            {entidadeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Carregando logs...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Nenhum log encontrado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entidade</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{new Date(log.data_hora).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{log.usuario_nome}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{acaoLabel[log.acao] || log.acao}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{entidadeLabel[log.entidade] || log.entidade}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate">{renderDetalhes(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 