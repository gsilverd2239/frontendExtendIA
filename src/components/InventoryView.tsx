import React, { useState, useMemo } from 'react';
import { InventoryItem, Warehouse } from '../types/sap';
import { Search, Hash, QrCode, Boxes, Filter, RefreshCw, Eye, Tag, MapPin, Loader2 } from 'lucide-react';
import { formatCurrencyGs, formatQuantityPy } from '../utils/formatters';

interface InventoryViewProps {
  items: InventoryItem[];
  selectedWarehouse: string;
  warehouses: Warehouse[];
  onRefresh: () => void;
  isLoading: boolean;
  theme?: 'dark' | 'light';
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  selectedWarehouse,
  warehouses,
  onRefresh,
  isLoading,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'batches' | 'serials' | 'standard'>('all');
  const [expandedItemCode, setExpandedItemCode] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.ItemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ItemName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (categoryFilter === 'batches') return item.ManageBatchNumbers === 'tYES';
      if (categoryFilter === 'serials') return item.ManageSerialNumbers === 'tYES';
      if (categoryFilter === 'standard') return item.ManageBatchNumbers === 'tNO' && item.ManageSerialNumbers === 'tNO';

      return true;
    });
  }, [items, searchTerm, categoryFilter]);

  const totalStockInWarehouse = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.WarehouseStock, 0);
  }, [items]);

  const totalValuation = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.WarehouseStock * curr.AvgStdPrice, 0);
  }, [items]);

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto relative min-h-[400px]">
      {/* Full View Translucent Loading Overlay matching user design */}
      {isLoading && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-[2px] transition-all animate-fadeIn ${
          theme === 'dark' ? 'bg-black/50' : 'bg-white/70'
        }`}>
          <div className={`px-6 py-4 rounded-2xl border flex items-center space-x-3 shadow-xl transition-all ${
            theme === 'dark'
              ? 'bg-[#181a20] border-gray-800 text-white shadow-black/80'
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/40'
          }`}>
            <Loader2 className="w-5 h-5 text-sky-500 animate-spin shrink-0" />
            <span className={`text-sm font-semibold tracking-tight ${theme === 'dark' ? 'text-gray-100' : 'text-slate-800'}`}>
              Cargando...
            </span>
          </div>
        </div>
      )}

      {/* Top metrics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`border rounded-2xl p-4 transition-colors ${
          theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[11px] uppercase font-bold block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
            Almacén Consultado
          </span>
          <p className="text-lg font-bold text-sky-500 mono mt-1">{selectedWarehouse}</p>
          <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>SAP Business One</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${
          theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[11px] uppercase font-bold block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
            Total Artículos Catálogo
          </span>
          <p className={`text-lg font-bold mono mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{items.length}</p>
          <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Registros sincronizados</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${
          theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[11px] uppercase font-bold block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
            Unidades Físicas en Stock
          </span>
          <p className="text-lg font-bold text-emerald-500 mono mt-1">{formatQuantityPy(totalStockInWarehouse)}</p>
          <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>En {selectedWarehouse}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${
          theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[11px] uppercase font-bold block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
            Valoración de Inventario
          </span>
          <p className="text-lg font-bold text-amber-500 mono mt-1">{formatCurrencyGs(totalValuation)}</p>
          <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Costo promedio SAP</p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código o descripción..."
              className={`border rounded-xl pl-9 pr-4 py-2 text-xs w-64 sm:w-80 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm'
              }`}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={onRefresh}
            className={`p-2 border rounded-xl transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-gray-900 hover:bg-gray-800 border-gray-800 text-gray-400 hover:text-white'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm'
            }`}
            title="Sincronizar inventario desde Service Layer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
          </button>
        </div>

        {/* Category Filters */}
        <div className={`flex border rounded-xl p-1 text-xs ${
          theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              categoryFilter === 'all' 
                ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('batches')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
              categoryFilter === 'batches'
                ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3 h-3" />
            <span>Por Lotes</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('serials')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
              categoryFilter === 'serials'
                ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3 h-3" />
            <span>Por Series</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('standard')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              categoryFilter === 'standard'
                ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estándar
          </button>
        </div>
      </div>

      {/* Inventory Detailed Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-xl flex-1 flex flex-col transition-colors ${
        theme === 'dark'
          ? 'bg-[#151619] border-gray-800'
          : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className={`text-[11px] uppercase tracking-wider sticky top-0 backdrop-blur-sm border-b ${
              theme === 'dark'
                ? 'bg-black/50 text-gray-400 border-gray-800'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr className="h-10">
                <th className="px-6">Código SAP</th>
                <th className="px-6">Descripción</th>
                <th className="px-6">Tipo Control</th>
                <th className="px-6 text-right">Stock en Almacén</th>
                <th className="px-6 text-right">Stock Global</th>
                <th className="px-6 text-right">Costo Promedio</th>
                <th className="px-6 text-right">Valor en Almacén</th>
                <th className="px-6 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className={`text-sm divide-y ${
              theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'
            }`}>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-slate-100 border border-slate-200'}`}>
                        <Boxes className="w-8 h-8 text-gray-400 stroke-1" />
                      </div>
                      <div>
                        <p className={`text-base font-bold tracking-tight ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
                          Sin registros a procesar
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          No hay artículos ni registros de inventario para mostrar en {selectedWarehouse}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                const isExpanded = expandedItemCode === item.ItemCode;
                const isBatched = item.ManageBatchNumbers === 'tYES';
                const isSerialized = item.ManageSerialNumbers === 'tYES';

                return (
                  <React.Fragment key={item.ItemCode}>
                    <tr
                      onClick={() => setExpandedItemCode(isExpanded ? null : item.ItemCode)}
                      className={`h-12 transition-colors cursor-pointer ${
                        theme === 'dark'
                          ? 'hover:bg-gray-800/40 text-gray-300'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="px-6 mono font-semibold text-sky-500">{item.ItemCode}</td>
                      <td className={`px-6 font-medium text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-slate-800'}`}>{item.ItemName}</td>
                      <td className="px-6">
                        {isBatched ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] mono inline-flex items-center space-x-1 ${
                            theme === 'dark' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            <Hash className="w-2.5 h-2.5" />
                            <span>Loteado ({item.Batches.length})</span>
                          </span>
                        ) : isSerialized ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] mono inline-flex items-center space-x-1 ${
                            theme === 'dark' ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}>
                            <QrCode className="w-2.5 h-2.5" />
                            <span>Serializado ({item.Serials.length})</span>
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] mono ${
                            theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Estándar
                          </span>
                        )}
                      </td>
                      <td className="px-6 text-right font-semibold text-xs mono">
                        <span className={item.WarehouseStock > 0 ? (theme === 'dark' ? 'text-white' : 'text-slate-900') : 'text-red-500'}>
                          {formatQuantityPy(item.WarehouseStock)} {item.InventoryUOM}
                        </span>
                      </td>
                      <td className={`px-6 text-right text-xs mono ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                        {formatQuantityPy(item.OnHand)} {item.InventoryUOM}
                      </td>
                      <td className={`px-6 text-right text-xs mono font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                        {formatCurrencyGs(item.AvgStdPrice)}
                      </td>
                      <td className={`px-6 text-right text-xs mono font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
                        {formatCurrencyGs(item.WarehouseStock * item.AvgStdPrice)}
                      </td>
                      <td className="px-6 text-center">
                        <button
                          type="button"
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'text-gray-400 hover:text-sky-400 hover:bg-gray-800' : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Batches or Serials Row */}
                    {isExpanded && (
                      <tr className={`border-b ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                        <td colSpan={8} className="p-4 px-8">
                          <div className={`rounded-xl p-4 border space-y-3 ${
                            theme === 'dark' ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-sky-500">
                                Desglose de Existencias por Lote / Serie ({selectedWarehouse})
                              </h5>
                              <span className={`text-xs mono ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>UOM: {item.InventoryUOM}</span>
                            </div>

                            {/* Batches detailed list */}
                            {isBatched && item.Batches.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {item.Batches.map((b) => (
                                  <div key={b.BatchNumber} className={`border p-2.5 rounded-xl text-xs space-y-1 ${
                                    theme === 'dark' ? 'bg-black/50 border-gray-800' : 'bg-slate-50 border-slate-200'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <span className="mono font-semibold text-sky-500">{b.BatchNumber}</span>
                                      <span className={`mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{b.Quantity} {item.InventoryUOM}</span>
                                    </div>
                                    <div className={`flex justify-between text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
                                      <span>{b.ExpiryDate ? `Vence: ${b.ExpiryDate}` : `Ingreso: ${b.AdmissionDate}`}</span>
                                      <span>Costo: ${b.UnitCost.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Serials detailed list */}
                            {isSerialized && item.Serials.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                {item.Serials.map((s) => (
                                  <div key={s.SerialNumber} className={`border p-2 rounded-xl text-xs space-y-0.5 ${
                                    theme === 'dark' ? 'bg-black/50 border-gray-800' : 'bg-slate-50 border-slate-200'
                                  }`}>
                                    <p className="mono font-semibold text-sky-500 truncate">{s.SerialNumber}</p>
                                    <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Costo: ${s.UnitCost.toFixed(2)}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!isBatched && !isSerialized && (
                              <p className={`text-xs italic ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
                                Este artículo se controla por cantidad continua y costo promedio ponderado sin series ni lotes específicos.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
