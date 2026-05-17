import React, { useState, useMemo } from 'react';
import { Search, Calendar, X, Info, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StockMovement } from '../../types';

interface StockHistoryProps {
  stockMovements: StockMovement[];
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning') => void;
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  loadMore?: () => void;
  onRefresh?: () => void;
}

export const StockHistoryContent = ({ stockMovements, showNotification, showConfirm, formatCurrency, toNum, loadMore, onRefresh }: StockHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  
  const handleDeleteMovement = async (id: string) => {
    showConfirm(
      'Excluir Registro',
      'Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita e não afetará o estoque atual.',
      async () => {
        try {
          await deleteDoc(doc(db, 'estoque_movimentacoes', id));
          showNotification('Registro excluído com sucesso!');
          if (onRefresh) onRefresh();
        } catch (error: any) {
          handleFirestoreError(error, OperationType.DELETE, `estoque_movimentacoes/${id}`);
        }
      },
      'danger'
    );
  };

  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      const matchesSearch = (m.produto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.origem || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.usuario || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const movementDate = new Date(m.date);
      const matchesDate = !dateFilter || movementDate.toISOString().split('T')[0] === dateFilter;
      const matchesMonth = !monthFilter || (movementDate.getMonth() + 1).toString().padStart(2, '0') === monthFilter.split('-')[1] && movementDate.getFullYear().toString() === monthFilter.split('-')[0];
      const matchesType = !typeFilter || m.tipo === typeFilter;

      return matchesSearch && matchesDate && matchesMonth && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, searchTerm, dateFilter, monthFilter, typeFilter]);

  const summary = useMemo(() => {
    return filteredMovements.reduce((acc, current) => {
      if (current.tipo === 'entrada') {
        acc.entradas += toNum(current.quantidade);
      } else {
        acc.saidas += toNum(current.quantidade);
      }
      return acc;
    }, { entradas: 0, saidas: 0 });
  }, [filteredMovements, toNum]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = filteredMovements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'saída': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getOriginColor = (origin: string) => {
    switch (origin) {
      case 'compra': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'venda': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'ajuste manual': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'devolução': return 'bg-teal-50 text-teal-700 border-teal-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-100 border-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Entradas</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <ChevronRight className="w-4 h-4 text-emerald-600 rotate-[-90deg]" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">+{summary.entradas}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-tight">Produtos recebidos</p>
        </Card>

        <Card className="p-4 bg-rose-50/50 border-rose-100 border-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Saídas</span>
            <div className="p-1.5 bg-rose-100 rounded-lg">
              <ChevronRight className="w-4 h-4 text-rose-600 rotate-[90deg]" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700">-{summary.saidas}</p>
          <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tight">Produtos saídos</p>
        </Card>

        <Card className={`p-4 border-2 ${summary.entradas - summary.saidas >= 0 ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest ${summary.entradas - summary.saidas >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Saldo do Período</span>
            <div className={`p-1.5 rounded-lg ${summary.entradas - summary.saidas >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
              <Info className={`w-4 h-4 ${summary.entradas - summary.saidas >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-black ${summary.entradas - summary.saidas >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {summary.entradas - summary.saidas}
          </p>
          <p className={`text-[10px] font-bold mt-1 uppercase tracking-tight ${summary.entradas - summary.saidas >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>Diferença no estoque</p>
        </Card>
      </div>

      <Card className="p-3 sm:p-4 bg-white shadow-sm border border-slate-100 rounded-xl">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            <input 
              type="text" 
              placeholder="Produto, origem, marca..." 
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="relative group flex-1 sm:flex-initial">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="date" 
                className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all uppercase tracking-wider"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); if(e.target.value) setMonthFilter(''); setCurrentPage(1); }}
              />
            </div>
            <select 
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer appearance-none min-w-[120px] sm:min-w-[140px]"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Tipo</option>
              <option value="entrada">Entrada</option>
              <option value="saída">Saída</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-100 rounded-xl bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Data</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Produto</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Origem</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Qtd</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedMovements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 leading-none mb-1">
                        {new Date(m.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 leading-tight">{m.produto}</span>
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{m.marca} • {m.cor}/{m.tamanho}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getTypeColor(m.tipo)}`}>
                        {m.tipo}
                      </span>
                      <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getOriginColor(m.origem)}`}>
                        {m.origem}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.tipo === 'entrada' ? `+${m.quantidade}` : `-${m.quantidade}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => setSelectedMovement(m)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMovement(m.id)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden divide-y divide-slate-100">
          {paginatedMovements.map(m => (
            <div key={m.id} className="p-3 bg-white flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-slate-900 leading-none">{m.produto}</span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{m.marca} • {m.cor}/{m.tamanho}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getTypeColor(m.tipo)}`}>
                      {m.tipo}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getOriginColor(m.origem)}`}>
                      {m.origem}
                    </span>
                  </div>
                  <span className={`text-[13px] font-black ml-2 ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.tipo === 'entrada' ? `+${m.quantidade}` : `-${m.quantidade}`}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>{new Date(m.date).toLocaleDateString('pt-BR')} {new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedMovement(m)} className="p-1 text-blue-600 bg-blue-50 rounded-lg">
                    <Info className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteMovement(m.id)} className="p-1 text-rose-600 bg-rose-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {loadMore && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={loadMore}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-midnight transition-all shadow-sm active:scale-95"
          >
            Carregar mais histórico
          </button>
        </div>
      )}

      <Modal
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        title="Detalhes da Movimentação"
        maxWidth="max-w-sm"
      >
        {selectedMovement && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produto</p>
              <p className="text-sm font-bold text-slate-900">{selectedMovement.produto}</p>
              <p className="text-xs text-slate-500 mt-1">{selectedMovement.marca} • {selectedMovement.cor}/{selectedMovement.tamanho}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getTypeColor(selectedMovement.tipo)}`}>
                  {selectedMovement.tipo}
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origem</p>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getOriginColor(selectedMovement.origem)}`}>
                  {selectedMovement.origem}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantidade</p>
              <p className={`text-lg font-black ${selectedMovement.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {selectedMovement.tipo === 'entrada' ? '+' : '-'}{selectedMovement.quantidade}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</span>
                <span className="text-xs font-bold text-slate-700">{selectedMovement.usuario || 'Sistema'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</span>
                <span className="text-xs font-bold text-slate-700">{new Date(selectedMovement.date).toLocaleString('pt-BR')}</span>
              </div>
              {selectedMovement.observacao && (
                <div className="py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Observação</span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                    "{selectedMovement.observacao}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
