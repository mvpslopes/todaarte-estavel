import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});

// Tabela de compromissos (agenda)
const db = new sqlite3.Database(':memory:');
db.run(`CREATE TABLE IF NOT EXISTS compromissos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  responsavel TEXT NOT NULL,
  atividade TEXT NOT NULL,
  cliente TEXT NOT NULL,
  data_pedido TEXT NOT NULL,
  data_entrega TEXT NOT NULL,
  status TEXT NOT NULL,
  arquivo TEXT
)`); 