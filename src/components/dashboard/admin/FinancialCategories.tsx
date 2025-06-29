import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Plus, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface CategoriaFinanceira {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa';
}

const API_URL = '/api/categorias-financeiras';

export function FinancialCategories() {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [editId, setEditId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'todas' | 'receita' | 'despesa'>('todas');
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const filteredCategorias = filter === 'todas' ? categorias : categorias.filter(cat => cat.tipo === filter);

  // Buscar categorias ao carregar
  useEffect(() => {
    setLoading(true);
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategorias(data);
        } else {
          setCategorias([]);
          setFeedback({ type: 'error', message: data?.error || 'Erro ao buscar categorias.' });
        }
      })
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao buscar categorias.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFeedback({ type: 'error', message: 'Informe o nome da categoria.' });
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        // Editar
        const res = await fetch(`${API_URL}/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, tipo, usuario_id: user?.id, usuario_nome: user?.name })
        });
        if (!res.ok) throw new Error('Erro ao editar categoria.');
        const updated = await res.json();
        setCategorias(categorias.map(cat => cat.id === editId ? updated : cat));
        setFeedback({ type: 'success', message: 'Categoria editada com sucesso!' });
        setEditId(null);
      } else {
        // Adicionar
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, tipo, usuario_id: user?.id, usuario_nome: user?.name })
        });
        if (!res.ok) throw new Error('Erro ao adicionar categoria.');
        const nova = await res.json();
        setCategorias([...categorias, nova]);
        setFeedback({ type: 'success', message: 'Categoria adicionada com sucesso!' });
      }
      setNome('');
      setShowModal(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro desconhecido.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleEdit = (cat: CategoriaFinanceira) => {
    setEditId(cat.id);
    setNome(cat.nome);
    setTipo(cat.tipo);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir esta categoria?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: user?.id, usuario_nome: user?.name })
      });
      if (!res.ok) throw new Error('Erro ao excluir categoria.');
      setCategorias(categorias.filter(cat => cat.id !== id));
      setFeedback({ type: 'success', message: 'Categoria excluída com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro desconhecido.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setNome('');
    setTipo('receita');
    setShowModal(true);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Categorias Financeiras</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-full font-semibold transition-all ${filter === 'todas' ? 'bg-gradient-to-r from-logo to-logo-light text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setFilter('todas')}
        >Todas</button>
        <button
          className={`px-4 py-2 rounded-full font-semibold transition-all ${filter === 'receita' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setFilter('receita')}
        >Receitas</button>
        <button
          className={`px-4 py-2 rounded-full font-semibold transition-all ${filter === 'despesa' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setFilter('despesa')}
        >Despesas</button>
        <button
          className="ml-auto flex items-center gap-2 bg-gradient-to-r from-logo to-logo-light text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          onClick={openAddModal}
        >
          <Plus className="h-5 w-5" /> Adicionar
        </button>
      </div>
      {loading && <div className="mb-4 text-gray-500">Carregando...</div>}
      {feedback && (
        <div className={`mb-4 px-4 py-2 rounded-lg font-medium ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{feedback.message}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.isArray(filteredCategorias) && filteredCategorias.length > 0 ? (
          filteredCategorias.map(cat => (
            <div
              key={cat.id}
              className={`rounded-2xl p-6 shadow-lg flex flex-col gap-3 relative ${cat.tipo === 'receita' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {cat.tipo === 'receita' ? (
                  <ArrowUpCircle className="h-7 w-7 text-green-500" />
                ) : (
                  <ArrowDownCircle className="h-7 w-7 text-red-500" />
                )}
                <span className="text-lg font-bold text-gray-900">{cat.nome}</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cat.tipo === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{cat.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(cat)}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Edit className="h-4 w-4" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="flex items-center gap-1 text-red-600 hover:underline"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-8">Nenhuma categoria encontrada.</div>
        )}
      </div>
      {/* Modal de adicionar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-black"
              onClick={() => setShowModal(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nome da categoria"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
              />
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as 'receita' | 'despesa')}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
              <button
                type="submit"
                className="bg-gradient-to-r from-logo to-logo-light text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={loading}
              >
                {editId ? 'Salvar' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 