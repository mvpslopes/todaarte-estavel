import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { registrarLog } from './audit.js';
import { pool } from './db.js';
import sqlite3 from 'sqlite3';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000; // Use 3000 para compatibilidade com a hospedagem

app.use(cors());
app.use(express.json());

// Rotas da API
app.get('/api', (req, res) => {
  res.json({ message: 'API online!' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    // Não retornar a senha!
    const { password: _, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao autenticar', details: error.message });
  }
});

// Rotas de categorias financeiras
app.get('/api/categorias-financeiras', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categorias_financeiras ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar categorias', details: error.message });
  }
});

app.post('/api/categorias-financeiras', async (req, res) => {
  const { nome, tipo, usuario_id, usuario_nome } = req.body;
  if (!nome || !tipo) return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  try {
    const [result] = await pool.query('INSERT INTO categorias_financeiras (nome, tipo) VALUES (?, ?)', [nome, tipo]);
    // Log de auditoria
    console.log('Antes do registrarLog CREATE');
    try {
      await registrarLog({
        usuario_id: usuario_id || 0,
        usuario_nome: usuario_nome || 'Desconhecido',
        acao: 'CREATE',
        entidade: 'categoria',
        entidade_id: result.insertId,
        detalhes: { nome, tipo }
      });
      console.log('Depois do registrarLog CREATE');
    } catch (logErr) {
      console.error('Erro ao registrar log (CREATE):', logErr);
    }
    res.status(201).json({ id: result.insertId, nome, tipo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar categoria', details: error.message });
  }
});

app.put('/api/categorias-financeiras/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, usuario_id, usuario_nome } = req.body;
  if (!nome || !tipo) return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  try {
    // Buscar dados antigos para log
    const [oldRows] = await pool.query('SELECT * FROM categorias_financeiras WHERE id = ?', [id]);
    await pool.query('UPDATE categorias_financeiras SET nome = ?, tipo = ? WHERE id = ?', [nome, tipo, id]);
    // Log de auditoria
    console.log('Antes do registrarLog UPDATE');
    try {
      await registrarLog({
        usuario_id: usuario_id || 0,
        usuario_nome: usuario_nome || 'Desconhecido',
        acao: 'UPDATE',
        entidade: 'categoria',
        entidade_id: id,
        detalhes: { antes: oldRows[0], depois: { nome, tipo } }
      });
      console.log('Depois do registrarLog UPDATE');
    } catch (logErr) {
      console.error('Erro ao registrar log (UPDATE):', logErr);
    }
    res.json({ id, nome, tipo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao editar categoria', details: error.message });
  }
});

app.delete('/api/categorias-financeiras/:id', async (req, res) => {
  const { id } = req.params;
  const { usuario_id, usuario_nome } = req.body;
  try {
    // Buscar dados antigos para log
    const [oldRows] = await pool.query('SELECT * FROM categorias_financeiras WHERE id = ?', [id]);
    await pool.query('DELETE FROM categorias_financeiras WHERE id = ?', [id]);
    // Log de auditoria
    console.log('Antes do registrarLog DELETE');
    try {
      await registrarLog({
        usuario_id: usuario_id || 0,
        usuario_nome: usuario_nome || 'Desconhecido',
        acao: 'DELETE',
        entidade: 'categoria',
        entidade_id: id,
        detalhes: { removido: oldRows[0] }
      });
      console.log('Depois do registrarLog DELETE');
    } catch (logErr) {
      console.error('Erro ao registrar log (DELETE):', logErr);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir categoria', details: error.message });
  }
});

// Rotas de lançamentos financeiros
app.get('/api/transacoes-financeiras', async (req, res) => {
  try {
    const { tipo, categoria, cliente, data_inicio, data_fim, status } = req.query;
    let sql = `
      SELECT 
        lf.id,
        lf.tipo,
        lf.valor,
        lf.data_vencimento,
        lf.data_pagamento,
        lf.status,
        lf.descricao,
        cf.nome as categoria_nome,
        lf.pessoa,
        lf.pessoa_tipo,
        CASE 
          WHEN lf.pessoa_tipo = 'cliente' THEN u.name
          WHEN lf.pessoa_tipo = 'fornecedor' THEN f.nome
          ELSE '-'
        END as pessoa_nome,
        lf.criado_em,
        lf.atualizado_em
      FROM lancamentos_financeiros lf
      LEFT JOIN categorias_financeiras cf ON lf.categoria_id = cf.id
      LEFT JOIN users u ON lf.pessoa_tipo = 'cliente' AND lf.pessoa = u.id
      LEFT JOIN fornecedores f ON lf.pessoa_tipo = 'fornecedor' AND lf.pessoa = f.id
      WHERE 1=1
    `;
    const params = [];
    if (tipo) {
      sql += ' AND lf.tipo = ?';
      params.push(tipo);
    }
    if (categoria) {
      sql += ' AND cf.nome = ?';
      params.push(categoria);
    }
    if (cliente) {
      sql += ' AND ((u.name LIKE ?) OR (f.nome LIKE ?) OR lf.pessoa = ?)';
      params.push(`%${cliente}%`, `%${cliente}%`, cliente);
    }
    if (status) {
      sql += ' AND lf.status = ?';
      params.push(status);
    }
    if (data_inicio) {
      sql += ' AND lf.data_vencimento >= ?';
      params.push(data_inicio);
    }
    if (data_fim) {
      sql += ' AND lf.data_vencimento <= ?';
      params.push(data_fim);
    }
    sql += ' ORDER BY lf.data_vencimento DESC, lf.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar lançamentos', details: error.message });
  }
});

app.post('/api/transacoes-financeiras', async (req, res) => {
  const { tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status } = req.body;
  if (!tipo || !valor || !data_vencimento || !categoria_id || !pessoa || !pessoa_tipo) {
    return res.status(400).json({ error: 'Tipo, valor, data de vencimento, categoria, pessoa e pessoa_tipo são obrigatórios.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO lancamentos_financeiros (tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tipo, valor, data_vencimento, data_pagamento || null, categoria_id, pessoa, pessoa_tipo, descricao || null, status || 'pendente']
    );
    // Log de auditoria
    try {
      await registrarLog({
        usuario_id: req.body.usuario_id || 0,
        usuario_nome: req.body.usuario_nome || 'Desconhecido',
        acao: 'CREATE',
        entidade: 'transacao',
        entidade_id: result.insertId,
        detalhes: { tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status }
      });
    } catch (logErr) {
      console.error('Erro ao registrar log (CREATE TRANSACAO):', logErr);
    }
    res.status(201).json({ id: result.insertId, tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar lançamento', details: error.message });
  }
});

app.put('/api/transacoes-financeiras/:id', async (req, res) => {
  const { id } = req.params;
  const { tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status } = req.body;
  if (!tipo || !valor || !data_vencimento || !categoria_id || !pessoa || !pessoa_tipo) {
    return res.status(400).json({ error: 'Tipo, valor, data de vencimento, categoria, pessoa e pessoa_tipo são obrigatórios.' });
  }
  try {
    // Buscar dados antigos para log
    const [oldRows] = await pool.query('SELECT * FROM lancamentos_financeiros WHERE id = ?', [id]);
    await pool.query(
      'UPDATE lancamentos_financeiros SET tipo = ?, valor = ?, data_vencimento = ?, data_pagamento = ?, categoria_id = ?, pessoa = ?, pessoa_tipo = ?, descricao = ?, status = ? WHERE id = ?',
      [tipo, valor, data_vencimento, data_pagamento || null, categoria_id, pessoa, pessoa_tipo, descricao || null, status || 'pendente', id]
    );
    // Log de auditoria
    try {
      await registrarLog({
        usuario_id: req.body.usuario_id || 0,
        usuario_nome: req.body.usuario_nome || 'Desconhecido',
        acao: 'UPDATE',
        entidade: 'transacao',
        entidade_id: id,
        detalhes: { antes: oldRows[0], depois: { tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status } }
      });
    } catch (logErr) {
      console.error('Erro ao registrar log (UPDATE TRANSACAO):', logErr);
    }
    res.json({ id, tipo, valor, data_vencimento, data_pagamento, categoria_id, pessoa, pessoa_tipo, descricao, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao editar lançamento', details: error.message });
  }
});

app.delete('/api/transacoes-financeiras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Buscar dados antigos para log
    const [oldRows] = await pool.query('SELECT * FROM lancamentos_financeiros WHERE id = ?', [id]);
    await pool.query('DELETE FROM lancamentos_financeiros WHERE id = ?', [id]);
    // Log de auditoria
    try {
      await registrarLog({
        usuario_id: req.body.usuario_id || 0,
        usuario_nome: req.body.usuario_nome || 'Desconhecido',
        acao: 'DELETE',
        entidade: 'transacao',
        entidade_id: id,
        detalhes: { removido: oldRows[0] }
      });
    } catch (logErr) {
      console.error('Erro ao registrar log (DELETE TRANSACAO):', logErr);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir lançamento', details: error.message });
  }
});

app.patch('/api/transacoes-financeiras/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pendente', 'pago'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }
  try {
    await pool.query('UPDATE lancamentos_financeiros SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status', details: error.message });
  }
});

// Endpoint para listar logs de auditoria
app.get('/api/auditoria/logs', async (req, res) => {
  try {
    const { usuario_nome, acao, entidade } = req.query;
    let sql = 'SELECT * FROM auditoria WHERE 1=1';
    const params = [];
    if (usuario_nome) {
      sql += ' AND TRIM(LOWER(usuario_nome)) LIKE ?';
      params.push(`%${usuario_nome.toString().trim().toLowerCase()}%`);
    }
    if (acao) {
      sql += ' AND acao = ?';
      params.push(acao);
    }
    if (entidade) {
      sql += ' AND entidade = ?';
      params.push(entidade);
    }
    sql += ' ORDER BY data_hora DESC LIMIT 100';
    console.log('Filtros recebidos:', req.query);
    console.log('Query SQL:', sql, params);
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria', details: error.message });
  }
});

// Endpoint para criar usuário
app.post('/api/usuarios', async (req, res) => {
  const { nome, email, senha, role, company, usuario_id, usuario_nome } = req.body;
  if (!nome || !email || !senha || !role) {
    return res.status(400).json({ error: 'Nome, e-mail, senha e tipo são obrigatórios.' });
  }
  if (!['admin', 'client', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Tipo de usuário inválido.' });
  }
  try {
    // Verifica se o e-mail já existe
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }
    // Hash da senha
    const hash = await bcrypt.hash(senha, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, company) VALUES (?, ?, ?, ?, ?)',
      [nome, email, hash, role, company || null]
    );
    // Log de auditoria
    try {
      await registrarLog({
        usuario_id: usuario_id || 0,
        usuario_nome: usuario_nome || 'Desconhecido',
        acao: 'CREATE',
        entidade: 'usuario',
        entidade_id: result.insertId,
        detalhes: { nome, email, role, company }
      });
    } catch (logErr) {
      console.error('Erro ao registrar log (CREATE USUARIO):', logErr);
    }
    res.status(201).json({ id: result.insertId, nome, email, role, company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar usuário', details: error.message });
  }
});

// Endpoint para listar usuários com filtros
app.get('/api/usuarios-lista', async (req, res) => {
  try {
    const { nome, email, role } = req.query;
    let sql = 'SELECT id, name, email, role, company FROM users WHERE 1=1';
    const params = [];
    if (nome) {
      sql += ' AND TRIM(LOWER(name)) LIKE ?';
      params.push(`%${nome.toString().trim().toLowerCase()}%`);
    }
    if (email) {
      sql += ' AND TRIM(LOWER(email)) LIKE ?';
      params.push(`%${email.toString().trim().toLowerCase()}%`);
    }
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    sql += ' ORDER BY name';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários', details: error.message });
  }
});

// Endpoint para editar usuário
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, role, company, usuario_id, usuario_nome } = req.body;
  if (!nome || !email || !role) {
    return res.status(400).json({ error: 'Nome, e-mail e tipo são obrigatórios.' });
  }
  if (!['admin', 'client', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Tipo de usuário inválido.' });
  }
  try {
    // Verifica se o e-mail já existe em outro usuário
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ?', [email, id]);
    if (rows.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado em outro usuário.' });
    }
    let sql = 'UPDATE users SET name = ?, email = ?, role = ?, company = ?';
    const params = [nome, email, role, company || null];
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      sql += ', password = ?';
      params.push(hash);
    }
    sql += ' WHERE id = ?';
    params.push(id);
    await pool.query(sql, params);
    // Log de auditoria
    try {
      await registrarLog({
        usuario_id: usuario_id || 0,
        usuario_nome: usuario_nome || 'Desconhecido',
        acao: 'UPDATE',
        entidade: 'usuario',
        entidade_id: id,
        detalhes: { nome, email, role, company, senha: !!senha }
      });
    } catch (logErr) {
      console.error('Erro ao registrar log (UPDATE USUARIO):', logErr);
    }
    res.json({ id, name: nome, email, role, company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao editar usuário', details: error.message });
  }
});

// Endpoint para excluir usuário
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { usuario_id, usuario_nome } = req.body;
  try {
    // Buscar dados antigos para log
    const [oldRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    // Log de auditoria
    try {
      await registrarLog({
        usuario_id: usuario_id || 0,
        usuario_nome: usuario_nome || 'Desconhecido',
        acao: 'DELETE',
        entidade: 'usuario',
        entidade_id: id,
        detalhes: { removido: oldRows[0] }
      });
    } catch (logErr) {
      console.error('Erro ao registrar log (DELETE USUARIO):', logErr);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir usuário', details: error.message });
  }
});

// Rotas de contas fixas
app.get('/api/contas-fixas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cf.*, c.nome as categoria_nome, u.name as pessoa_nome
      FROM contas_fixas cf
      LEFT JOIN categorias_financeiras c ON cf.categoria_id = c.id
      LEFT JOIN users u ON cf.pessoa = u.id
      ORDER BY cf.dia_vencimento, cf.descricao
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar contas fixas', details: error.message });
  }
});

app.post('/api/contas-fixas', async (req, res) => {
  const { descricao, valor, tipo, categoria_id, pessoa, pessoa_tipo, dia_vencimento, status, data_inicio, data_fim } = req.body;
  if (!descricao || !valor || !tipo || !categoria_id || !dia_vencimento || !data_inicio) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO contas_fixas (descricao, valor, tipo, categoria_id, pessoa, dia_vencimento, status, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [descricao, valor, tipo, categoria_id, pessoa || null, dia_vencimento, status || 'ativa', data_inicio, data_fim || null]
    );
    // Gerar lançamentos recorrentes
    function gerarVencimentos(dataInicio, dataFim, diaVencimento) {
      const vencimentos = [];
      let atual = new Date(dataInicio);
      const fim = dataFim ? new Date(dataFim) : null;
      while (!fim || atual <= fim) {
        const ano = atual.getFullYear();
        const mes = atual.getMonth();
        const data = new Date(ano, mes, diaVencimento);
        if (data >= new Date(dataInicio) && (!fim || data <= fim)) {
          vencimentos.push(data.toISOString().slice(0, 10));
        }
        atual.setMonth(atual.getMonth() + 1);
        if (!fim && vencimentos.length >= 12) break; // segurança: não gerar mais de 12 meses
      }
      return vencimentos;
    }
    const vencimentos = gerarVencimentos(data_inicio, data_fim, dia_vencimento);
    const tipoPessoa = pessoa_tipo || (tipo === 'despesa' ? 'fornecedor' : 'cliente');
    for (const data_vencimento of vencimentos) {
      console.log('Lançamento gerado:', {
        tipo, valor, data_vencimento, categoria_id, pessoa, pessoa_tipo: tipoPessoa, descricao
      });
      await pool.query(
        'INSERT INTO lancamentos_financeiros (tipo, valor, data_vencimento, categoria_id, pessoa, pessoa_tipo, descricao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [tipo, valor, data_vencimento, categoria_id, pessoa, tipoPessoa, descricao, 'pendente']
      );
    }
    res.status(201).json({ id: result.insertId, descricao, valor, tipo, categoria_id, pessoa, pessoa_tipo, dia_vencimento, status, data_inicio, data_fim });
  }    catch (error) {
     console.log('Entrou no catch de erro!'); // <-- Adicione esta linha
     console.error('Erro ao criar conta fixa:', error);
     res.status(500).json({ error: 'Erro ao criar conta fixa', details: error.message });
   }
});

app.put('/api/contas-fixas/:id', async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, tipo, categoria_id, pessoa, dia_vencimento, status, data_inicio, data_fim } = req.body;
  if (!descricao || !valor || !tipo || !categoria_id || !dia_vencimento || !data_inicio) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }
  try {
    await pool.query(
      'UPDATE contas_fixas SET descricao=?, valor=?, tipo=?, categoria_id=?, pessoa=?, dia_vencimento=?, status=?, data_inicio=?, data_fim=? WHERE id=?',
      [descricao, valor, tipo, categoria_id, pessoa || null, dia_vencimento, status || 'ativa', data_inicio, data_fim || null, id]
    );
    res.json({ id, descricao, valor, tipo, categoria_id, pessoa, dia_vencimento, status, data_inicio, data_fim });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar conta fixa', details: error.message });
  }
});

app.delete('/api/contas-fixas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contas_fixas WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir conta fixa', details: error.message });
  }
});

// CRUD de fornecedores
app.get('/api/fornecedores', async (req, res) => {
  try {
    const { nome, tipo, documento } = req.query;
    let sql = 'SELECT * FROM fornecedores WHERE 1=1';
    const params = [];
    if (nome) {
      sql += ' AND TRIM(LOWER(nome)) LIKE ?';
      params.push(`%${nome.toString().trim().toLowerCase()}%`);
    }
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }
    if (documento) {
      sql += ' AND documento = ?';
      params.push(documento);
    }
    sql += ' ORDER BY nome';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fornecedores', details: error.message });
  }
});

app.post('/api/fornecedores', async (req, res) => {
  const { nome, tipo, documento, email, telefone, endereco, cidade, estado, cep, observacoes } = req.body;
  if (!nome || !tipo) {
    return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO fornecedores (nome, tipo, documento, email, telefone, endereco, cidade, estado, cep, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, tipo, documento || null, email || null, telefone || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null]
    );
    res.status(201).json({ id: result.insertId, nome, tipo, documento, email, telefone, endereco, cidade, estado, cep, observacoes });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar fornecedor', details: error.message });
  }
});

app.put('/api/fornecedores/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, documento, email, telefone, endereco, cidade, estado, cep, observacoes } = req.body;
  if (!nome || !tipo) {
    return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  }
  try {
    await pool.query(
      'UPDATE fornecedores SET nome=?, tipo=?, documento=?, email=?, telefone=?, endereco=?, cidade=?, estado=?, cep=?, observacoes=? WHERE id=?',
      [nome, tipo, documento || null, email || null, telefone || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null, id]
    );
    res.json({ id, nome, tipo, documento, email, telefone, endereco, cidade, estado, cep, observacoes });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar fornecedor', details: error.message });
  }
});

app.delete('/api/fornecedores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM fornecedores WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir fornecedor', details: error.message });
  }
});

// --- CHAT INTERNO ---
// Lista de usuários para chat (admins e clientes) + quantidade de mensagens não lidas
app.get('/api/chat/usuarios', async (req, res) => {
  const { usuario_id } = req.query;
  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users ORDER BY name');
    if (!usuario_id) return res.json(rows);
    // Para cada usuário, buscar quantas mensagens não lidas para o usuario_id
    const promises = rows.map(async (u) => {
      const [unread] = await pool.query(
        'SELECT COUNT(*) as total FROM mensagens_chat WHERE remetente_id = ? AND destinatario_id = ? AND lida = 0',
        [u.id, usuario_id]
      );
      return { ...u, unread_count: unread[0].total };
    });
    const result = await Promise.all(promises);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários do chat', details: error.message });
  }
});

// Lista mensagens entre dois usuários (usuário logado e outro)
app.get('/api/chat/mensagens', async (req, res) => {
  const { usuario_id, com } = req.query;
  if (!usuario_id || !com) {
    return res.status(400).json({ error: 'Informe usuario_id e com (id do outro usuário).' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM mensagens_chat
       WHERE (remetente_id = ? AND destinatario_id = ?)
          OR (remetente_id = ? AND destinatario_id = ?)
       ORDER BY criada_em ASC`,
      [usuario_id, com, com, usuario_id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensagens', details: error.message });
  }
});

// Enviar nova mensagem
app.post('/api/chat/mensagens', async (req, res) => {
  const { remetente_id, destinatario_id, mensagem } = req.body;
  if (!remetente_id || !destinatario_id || !mensagem) {
    return res.status(400).json({ error: 'remetente_id, destinatario_id e mensagem são obrigatórios.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO mensagens_chat (remetente_id, destinatario_id, mensagem) VALUES (?, ?, ?)',
      [remetente_id, destinatario_id, mensagem]
    );
    res.status(201).json({ id: result.insertId, remetente_id, destinatario_id, mensagem });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem', details: error.message });
  }
});

// Marcar mensagem como lida
app.patch('/api/chat/mensagens/:id/lida', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE mensagens_chat SET lida = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar mensagem como lida', details: error.message });
  }
});

// --- Endpoints de atividades (agenda) ---
app.get('/api/atividades', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM atividades ORDER BY data_pedido DESC, id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adicionar função utilitária para converter datas para o formato MySQL DATETIME
function toMySQLDateTime(dt) {
  if (!dt) return null;
  return dt.replace('T', ' ') + ':00';
}

app.post('/api/atividades', async (req, res) => {
  console.log('REQ.BODY:', req.body); // Log de depuração
  const { responsavel, atividade, cliente, data_pedido, data_realizacao, data_entrega, status, arquivo } = req.body;
  const values = [
    responsavel,
    atividade,
    cliente,
    toMySQLDateTime(data_pedido),
    toMySQLDateTime(data_realizacao),
    toMySQLDateTime(data_entrega),
    status,
    arquivo
  ];
  console.log('VALORES PARA O BANCO:', values); // Log de depuração
  try {
    const [result] = await pool.query(
      'INSERT INTO atividades (responsavel, atividade, cliente, data_pedido, data_realizacao, data_entrega, status, arquivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      values
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/atividades/:id', async (req, res) => {
  const { responsavel, atividade, cliente, data_pedido, data_realizacao, data_entrega, status, arquivo } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE atividades SET responsavel=?, atividade=?, cliente=?, data_pedido=?, data_realizacao=?, data_entrega=?, status=?, arquivo=? WHERE id=?',
      [responsavel, atividade, cliente, data_pedido, data_realizacao, data_entrega, status, arquivo, req.params.id]
    );
    res.json({ changes: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/atividades/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM atividades WHERE id=?', [req.params.id]);
    res.json({ changes: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Endpoints de clientes ---
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes ORDER BY nome');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nome, email, telefone, empresa, observacoes, cpf_cnpj } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO clientes (nome, email, telefone, empresa, observacoes, cpf_cnpj) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, telefone, empresa, observacoes, cpf_cnpj]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { nome, email, telefone, empresa, observacoes, cpf_cnpj } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE clientes SET nome=?, email=?, telefone=?, empresa=?, observacoes=?, cpf_cnpj=? WHERE id=?',
      [nome, email, telefone, empresa, observacoes, cpf_cnpj, req.params.id]
    );
    res.json({ changes: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM clientes WHERE id=?', [req.params.id]);
    res.json({ changes: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Endpoint para listar usuários (admins ou todos) ---
app.get('/api/users', async (req, res) => {
  const { role } = req.query;
  let sql = 'SELECT id, name FROM users';
  const params = [];
  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------- SERVIR O FRONTEND (React/Vite) -----------

// Para usar __dirname em ES Modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../dist')));

// Para SPA: redireciona todas as rotas que não sejam /api para o index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint não encontrado.' });
  }
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.post('/api/contato', async (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log('Recebido pedido de contato:', { name, email, subject, message });

  const transporter = nodemailer.createTransport({
    host: 'smtp.todaarte.com.br',
    port: 587,
    secure: false,
    auth: {
      user: 'contato@todaarte.com.br',
      pass: '68HTlQX1'
    }
  });

  try {
    console.log('Enviando e-mail via SMTP...');
    const info = await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: 'contato@todaarte.com.br',
      subject: subject || 'Mensagem do site',
      text: message,
      html: `<p><b>Nome:</b> ${name}</p>
             <p><b>E-mail:</b> ${email}</p>
             <p><b>Assunto:</b> ${subject}</p>
             <p><b>Mensagem:</b><br/>${message}</p>`
    });
    console.log('E-mail enviado com sucesso:', info);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    res.status(500).json({ error: 'Erro ao enviar e-mail', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});