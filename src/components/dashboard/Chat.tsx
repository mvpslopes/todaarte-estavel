import React, { useEffect, useRef, useState } from 'react';

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  unread_count: number;
}
interface Mensagem {
  id: number;
  remetente_id: number;
  destinatario_id: number;
  mensagem: string;
  lida: boolean;
  criada_em: string;
}

const API_USUARIOS = '/api/chat/usuarios';
const API_MENSAGENS = '/api/chat/mensagens';

export default function Chat({ usuarioId }: { usuarioId: number }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [contatoId, setContatoId] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [erro, setErro] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Buscar usuários
  useEffect(() => {
    fetch(`${API_USUARIOS}?usuario_id=${usuarioId}`)
      .then(res => res.json())
      .then(data => setUsuarios(data.filter((u: Usuario) => u.id !== usuarioId)));
  }, [usuarioId]);

  // Buscar mensagens
  useEffect(() => {
    if (!contatoId) return;
    setLoading(true);
    fetch(`${API_MENSAGENS}?usuario_id=${usuarioId}&com=${contatoId}`)
      .then(res => res.json())
      .then(data => setMensagens(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [contatoId, usuarioId]);

  // Scroll automático para o fim do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if (!novaMensagem.trim() || !contatoId) return;
    setLoadingMsg(true);
    setErro('');
    try {
      const res = await fetch(API_MENSAGENS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remetente_id: usuarioId, destinatario_id: contatoId, mensagem: novaMensagem })
      });
      if (!res.ok) {
        const err = await res.json();
        setErro(err.error || 'Erro ao enviar mensagem.');
        setLoadingMsg(false);
        return;
      }
      setNovaMensagem('');
      // Recarregar mensagens
      fetch(`${API_MENSAGENS}?usuario_id=${usuarioId}&com=${contatoId}`)
        .then(res => res.json())
        .then(data => setMensagens(Array.isArray(data) ? data : []));
    } catch (error) {
      setErro('Erro ao enviar mensagem.');
    }
    setLoadingMsg(false);
  }

  return (
    <div className="flex h-[70vh] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-w-4xl mx-auto">
      {/* Lista de contatos */}
      <div className="w-72 border-r border-gray-100 bg-gradient-to-b from-logo/5 to-white flex flex-col">
        <div className="p-5 font-bold text-lg border-b border-gray-100 bg-white sticky top-0 z-10">Contatos</div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {usuarios.length === 0 && <div className="text-gray-400 p-4">Nenhum contato disponível.</div>}
          {usuarios.map(u => (
            <button
              key={u.id}
              onClick={() => setContatoId(u.id)}
              className={`w-full text-left px-5 py-4 flex items-center gap-3 border-b border-gray-50 hover:bg-logo-light/10 transition-all ${contatoId === u.id ? 'bg-logo-light/20 font-semibold' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-logo-light flex items-center justify-center text-lg font-bold text-logo uppercase">
                {u.name.slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-base font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{u.role === 'admin' ? 'Admin' : 'Cliente'}</div>
              </div>
              {u.unread_count > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[22px] min-h-[22px]">
                  {u.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* Chat */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-logo/5 to-white">
        {/* Cabeçalho do chat */}
        <div className="p-5 border-b border-gray-100 font-bold text-lg flex items-center gap-3 bg-white sticky top-0 z-10 min-h-[64px]">
          {contatoId ? (
            <>
              <div className="w-10 h-10 rounded-full bg-logo-light flex items-center justify-center text-lg font-bold text-logo uppercase">
                {usuarios.find(u => u.id === contatoId)?.name.slice(0,2)}
              </div>
              <div>
                <div className="text-base font-semibold">{usuarios.find(u => u.id === contatoId)?.name || 'Contato'}</div>
                <div className="text-xs text-gray-500">{usuarios.find(u => u.id === contatoId)?.role === 'admin' ? 'Admin' : 'Cliente'}</div>
              </div>
            </>
          ) : <span className="text-gray-700">Selecione um contato</span>}
        </div>
        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50 custom-scrollbar">
          {loading ? (
            <div className="text-gray-400">Carregando mensagens...</div>
          ) : mensagens.length === 0 ? (
            <div className="text-gray-400">Nenhuma mensagem.</div>
          ) : (
            mensagens.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.remetente_id === usuarioId ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] px-5 py-3 rounded-2xl shadow text-base break-words ${
                  msg.remetente_id === usuarioId
                    ? 'bg-gradient-to-r from-logo to-logo-light text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-line">{msg.mensagem}</div>
                  <div className={`mt-2 text-xs font-medium text-right select-none ${
                    msg.remetente_id === usuarioId
                      ? 'text-white/70'
                      : 'text-gray-500'
                  }`}>
                    {new Date(msg.criada_em).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Input de mensagem */}
        {contatoId && (
          <form onSubmit={enviarMensagem} className="flex gap-2 p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10">
            <input
              type="text"
              value={novaMensagem}
              onChange={e => setNovaMensagem(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="input input-bordered flex-1 text-base px-4 py-3 shadow-sm"
              disabled={loadingMsg}
              maxLength={1000}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-logo to-logo-light text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all text-base"
              disabled={loadingMsg || !novaMensagem.trim()}
            >Enviar</button>
          </form>
        )}
        {erro && <div className="text-red-600 text-sm font-medium p-2">{erro}</div>}
      </div>
    </div>
  );
}

/* Adicione ao seu CSS global para scrollbar customizada:
.custom-scrollbar::-webkit-scrollbar { width: 8px; background: #f3f3f3; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 8px; }
*/ 