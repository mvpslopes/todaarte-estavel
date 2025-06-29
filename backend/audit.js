// Utilitário para registrar logs de auditoria
import { pool } from './db.js';

export async function registrarLog({ usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes }) {
  await pool.query(
    'INSERT INTO auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)',
    [usuario_id, usuario_nome, acao, entidade, entidade_id, JSON.stringify(detalhes || {})]
  );
} 