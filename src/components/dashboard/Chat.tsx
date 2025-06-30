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
  arquivo_url?: string;
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
  const [busca, setBusca] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [notificacao, setNotificacao] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [pagina, setPagina] = useState(1);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [digitando, setDigitando] = useState(false);
  const [contatoDigitando, setContatoDigitando] = useState(false);

  // Buscar usuários
  useEffect(() => {
    fetch(`${API_USUARIOS}?usuario_id=${usuarioId}`)
      .then(res => res.json())
      .then(data => setUsuarios(data.filter((u: Usuario) => u.id !== usuarioId)));
  }, [usuarioId]);

  // Buscar mensagens (com paginação)
  useEffect(() => {
    if (!contatoId) return;
    setLoading(true);
    fetch(`${API_MENSAGENS}?usuario_id=${usuarioId}&com=${contatoId}&pagina=${pagina}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          if (pagina === 1) setMensagens(data);
          else setMensagens(msgs => [...data, ...msgs]);
        }
      })
      .finally(() => setLoading(false));
    // Polling para atualização automática
    const interval = setInterval(() => {
      fetch(`${API_MENSAGENS}?usuario_id=${usuarioId}&com=${contatoId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            if (mensagens.length > 0 && data.length > mensagens.length) {
              const ultimas = data.slice(-1)[0];
              if (ultimas.remetente_id === contatoId) {
                setNotificacao(true);
                audioRef.current?.play();
              }
            }
            setMensagens(data);
          }
        });
    }, 5000);
    return () => clearInterval(interval);
  }, [contatoId, usuarioId, pagina]);

  // Scroll automático para o fim do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Zera badge ao abrir chat
  useEffect(() => { setNotificacao(false); }, [contatoId]);

  // Infinite scroll para buscar mensagens antigas
  useEffect(() => {
    const box = chatBoxRef.current;
    if (!box) return;
    const handleScroll = () => {
      if (box.scrollTop === 0 && mensagens.length > 0 && !loading) {
        setPagina(p => p + 1);
      }
    };
    box.addEventListener('scroll', handleScroll);
    return () => box.removeEventListener('scroll', handleScroll);
  }, [mensagens, loading]);

  // Simulação de evento digitando (frontend)
  useEffect(() => {
    if (!contatoId) return;
    if (!digitando) return;
    const timeout = setTimeout(() => setDigitando(false), 2000);
    // Simular recebimento do outro lado
    setContatoDigitando(true);
    const timeoutContato = setTimeout(() => setContatoDigitando(false), 2000);
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeoutContato);
    };
  }, [digitando, contatoId]);

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if ((!novaMensagem.trim() && !arquivo) || !contatoId) return;
    setLoadingMsg(true);
    setErro('');
    try {
      let body;
      let headers;
      if (arquivo) {
        body = new FormData();
        body.append('remetente_id', usuarioId.toString());
        body.append('destinatario_id', contatoId.toString());
        body.append('mensagem', novaMensagem);
        body.append('arquivo', arquivo);
        headers = undefined; // FormData define o header
      } else {
        body = JSON.stringify({ remetente_id: usuarioId, destinatario_id: contatoId, mensagem: novaMensagem });
        headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch(API_MENSAGENS, {
        method: 'POST',
        headers,
        body
      });
      if (!res.ok) {
        const err = await res.json();
        setErro(err.error || 'Erro ao enviar mensagem.');
        setLoadingMsg(false);
        return;
      }
      setNovaMensagem('');
      setArquivo(null);
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
    <div className="flex flex-col md:flex-row h-[70vh] md:h-[70vh] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-w-4xl mx-auto w-full max-md:h-[80vh] max-md:rounded-none max-md:shadow-none">
      {/* Lista de contatos */}
      <div className="w-full md:w-72 border-r border-gray-100 bg-gradient-to-b from-logo/5 to-white flex flex-col max-md:max-h-40 max-md:overflow-x-auto">
        <div className="p-5 font-bold text-lg border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between">
          <span>Contatos</span>
          {notificacao && <span className="ml-2 w-3 h-3 rounded-full bg-red-500 animate-pulse" title="Nova mensagem" />}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {usuarios.length === 0 && <div className="text-gray-400 p-4">Nenhum contato disponível.</div>}
          {usuarios.map(u => (
            <button
              key={u.id}
              onClick={() => setContatoId(u.id)}
              className={`w-full text-left px-5 py-4 flex items-center gap-3 border-b border-gray-50 hover:bg-logo-light/10 transition-all ${contatoId === u.id ? 'bg-logo-light/20 font-semibold' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-logo-light to-logo flex items-center justify-center text-lg font-bold text-logo uppercase shadow-md border-2 border-logo/20 transition-all duration-200 group-hover:scale-105">
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
      <div className="flex-1 flex flex-col bg-gradient-to-b from-logo/5 to-white min-w-0">
        {/* Cabeçalho do chat */}
        <div className="p-5 border-b border-gray-100 font-bold text-lg flex items-center gap-3 bg-white sticky top-0 z-10 min-h-[64px]">
          {contatoId ? (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-logo-light to-logo flex items-center justify-center text-lg font-bold text-logo uppercase shadow-md border-2 border-logo/20 transition-all duration-200">
                {usuarios.find(u => u.id === contatoId)?.name.slice(0,2)}
              </div>
              <div>
                <div className="text-base font-semibold">{usuarios.find(u => u.id === contatoId)?.name || 'Contato'}</div>
                <div className="text-xs text-gray-500">{usuarios.find(u => u.id === contatoId)?.role === 'admin' ? 'Admin' : 'Cliente'}</div>
              </div>
            </>
          ) : <span className="text-gray-700">Selecione um contato</span>}
        </div>
        {/* Campo de busca */}
        {contatoId && (
          <div className="px-5 pt-2 pb-1 bg-white sticky top-[64px] z-10">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar mensagens..."
              className="input input-bordered w-full text-base px-4 py-2 shadow-sm"
              maxLength={100}
            />
          </div>
        )}
        {/* Mensagens */}
        <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50 custom-scrollbar">
          {loading ? (
            <div className="text-gray-400">Carregando mensagens...</div>
          ) : (mensagens.filter(msg =>
              busca.trim() === '' || msg.mensagem.toLowerCase().includes(busca.toLowerCase())
            ).length === 0) ? (
            <div className="text-gray-400">Nenhuma mensagem.</div>
          ) : (
            mensagens.filter(msg =>
              busca.trim() === '' || msg.mensagem.toLowerCase().includes(busca.toLowerCase())
            ).map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.remetente_id === usuarioId ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] px-5 py-3 rounded-2xl shadow text-base break-words transition-all duration-200 transform-gpu animate-fade-in ${
                  msg.remetente_id === usuarioId
                    ? 'bg-gradient-to-r from-logo to-logo-light text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-line">{msg.mensagem}</div>
                  {msg.arquivo_url && (
                    <div className="mt-2">
                      <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-logo underline break-all">Arquivo anexado</a>
                    </div>
                  )}
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
            <label className="flex items-center cursor-pointer">
              <input type="file" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-logo-light text-logo hover:bg-logo transition-all mr-2" title="Anexar arquivo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V19.5a3.75 3.75 0 007.5 0V7.5a1.5 1.5 0 00-3 0v10.125" />
                </svg>
              </span>
            </label>
            <div className="flex-1 flex flex-col">
              <textarea
                value={novaMensagem}
                onChange={e => { setNovaMensagem(e.target.value); setDigitando(true); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loadingMsg && (novaMensagem.trim() || arquivo)) enviarMensagem(e as any);
                  }
                }}
                placeholder="Digite sua mensagem..."
                className="input input-bordered flex-1 text-base px-4 py-3 shadow-sm resize-none min-h-[48px] max-h-32"
                disabled={loadingMsg}
                maxLength={1000}
                rows={1}
              />
              {arquivo && (
                <div className="text-xs text-logo mt-1 flex items-center gap-2">
                  <span className="truncate max-w-[180px]">{arquivo.name}</span>
                  <button type="button" className="text-red-500 ml-2" onClick={() => setArquivo(null)}>Remover</button>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-logo to-logo-light text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all text-base"
              disabled={loadingMsg || (!novaMensagem.trim() && !arquivo)}
            >Enviar</button>
          </form>
        )}
        {erro && <div className="text-red-600 text-sm font-medium p-2">{erro}</div>}
        {/* Indicação de digitando */}
        {contatoDigitando && (
          <div className="px-6 pb-2 text-sm text-logo animate-pulse">{usuarios.find(u => u.id === contatoId)?.name || 'Contato'} está digitando...</div>
        )}
      </div>
      {/* Notificação sonora */}
      <audio ref={audioRef} src="/notificacao.mp3" preload="auto" style={{ display: 'none' }} />
    </div>
  );
}

/* Adicione ao seu CSS global para scrollbar customizada e animação fade-in:
.custom-scrollbar::-webkit-scrollbar { width: 8px; background: #f3f3f3; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 8px; }
@keyframes fade-in { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: none; } }
.animate-fade-in { animation: fade-in 0.3s ease; }
*/ 