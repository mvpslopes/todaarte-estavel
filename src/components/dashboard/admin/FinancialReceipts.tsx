import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
// Substitua pelo base64 real da sua logo (exemplo abaixo)
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQC...";

function gerarReciboPDF(recibo: any) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  // Logo centralizada (descomente e use base64 válido)
  // doc.addImage(logoBase64, 'PNG', pageWidth/2 - 60, y, 120, 60);
  // y += 80;

  // Cores padrão (azul escuro/cinza, verde, cinza)
  const corTitulo = '#22223b'; // Azul escuro
  const corValor = '#10b981'; // Verde
  const corTexto = '#22223b';
  const corLinha = '#e0e0e0'; // Cinza claro
  const corObs = '#6c757d'; // Cinza observação

  // Título principal
  doc.setFontSize(26);
  doc.setTextColor(corTitulo);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', pageWidth/2, y, { align: 'center' });
  y += 36;

  // Linha divisória
  doc.setDrawColor(corLinha);
  doc.setLineWidth(1.5);
  doc.line(60, y, pageWidth-60, y);
  y += 18;

  // Sessão: Emitente
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(corTitulo);
  doc.text('Emitente', 60, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(corTexto);
  doc.text('TODA ARTE MARKETING', 60, y);
  y += 16;
  doc.text('CNPJ: 39.539.187/0001-31', 60, y);
  y += 20;
  doc.setDrawColor(corLinha);
  doc.line(60, y, pageWidth-60, y);
  y += 18;

  // Sessão: Favorecido
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(corTitulo);
  doc.text('Favorecido/Cliente', 60, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(corTexto);
  doc.text(`Nome: ${recibo.pessoa_nome || '-'}`, 60, y);
  y += 20;
  doc.setDrawColor(corLinha);
  doc.line(60, y, pageWidth-60, y);
  y += 18;

  // Sessão: Detalhes do Pagamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(corTitulo);
  doc.text('Detalhes do Pagamento', 60, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(corTexto);
  doc.text(`Categoria: ${recibo.categoria_nome || recibo.categoria || '-'}`, 60, y);
  y += 16;
  doc.text(`Data do Pagamento: ${recibo.data_pagamento ? new Date(recibo.data_pagamento).toLocaleDateString('pt-BR') : '-'}`, 60, y);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(corValor);
  doc.text(`Valor: R$ ${Number(recibo.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}`, 60, y);
  doc.setTextColor(corTexto);
  doc.setFont('helvetica', 'normal');
  y += 24;
  doc.setDrawColor(corLinha);
  doc.line(60, y, pageWidth-60, y);
  y += 32;

  // Observação
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(corObs);
  doc.text('Este recibo comprova o pagamento da transação acima descrita.', 60, y);
  y += 40;

  // Rodapé
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#b0b0b0');
  doc.text('Gerado por Toda Arte - www.todaarte.com.br', pageWidth/2, 800, { align: 'center' });

  doc.save(`recibo-${recibo.pessoa_nome || 'pagamento'}.pdf`);
}

export default function FinancialReceipts() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReceipts() {
      setLoading(true);
      const res = await fetch('/api/transacoes-financeiras');
      const data = await res.json();
      // Filtrar apenas transações pagas
      setReceipts(data.filter((t: any) => t.status === 'pago'));
      setLoading(false);
    }
    fetchReceipts();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Recibos de Transações Pagas</h1>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Carregando recibos...</div>
      ) : receipts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Nenhum recibo encontrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow-lg bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-logo to-logo-light text-white sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Favorecido/Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-blue-50 transition' : 'bg-white hover:bg-blue-50 transition'}>
                  <td className="px-6 py-3 text-base font-medium text-gray-800">{r.data_pagamento ? new Date(r.data_pagamento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-6 py-3 text-gray-900 font-semibold">{r.pessoa_nome || '-'}</td>
                  <td className="px-6 py-3 text-gray-700">{r.categoria_nome || r.categoria || '-'}</td>
                  <td className="px-6 py-3">
                    <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm shadow-sm">
                      R$ {Number(r.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 transition text-sm font-semibold" onClick={() => gerarReciboPDF(r)}>
                      <FileText className="w-4 h-4" /> Recibo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 