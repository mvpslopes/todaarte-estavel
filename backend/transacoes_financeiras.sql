-- Tabela de transações financeiras
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('receita', 'despesa') NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  categoria_id INT NOT NULL,
  cliente_id INT NULL,
  descricao TEXT NULL,
  usuario_id INT NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_tipo (tipo),
  INDEX idx_data (data),
  INDEX idx_categoria (categoria_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_usuario (usuario_id)
);

-- Inserir algumas transações de exemplo
INSERT INTO transacoes_financeiras (tipo, valor, data, categoria_id, cliente_id, descricao, usuario_id) VALUES
('receita', 1200.00, '2024-06-01', 1, 2, 'Venda de pacote de design', 1),
('despesa', 300.00, '2024-06-02', 3, NULL, 'Conta de internet mensal', 1),
('receita', 800.00, '2024-06-03', 2, 3, 'Serviço de fotografia', 1),
('despesa', 150.00, '2024-06-04', 4, NULL, 'Compra de materiais', 1); 