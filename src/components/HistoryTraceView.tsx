import React, { useState } from 'react';
import { SAPConversionResult } from '../types/sap';
import { BarChart3, FileText, ChevronRight, Hash, QrCode, ArrowDownRight, Layers, ExternalLink, Calendar, Search } from 'lucide-react';

interface HistoryTraceViewProps {
  history: SAPConversionResult[];
  onSelectRecord?: (record: SAPConversionResult) => void;
  theme?: 'dark' | 'light';
}

export const HistoryTraceView: React.FC<HistoryTraceViewProps> = ({ 
  history, 
  onSelectRecord,
  theme = 'dark',
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(history[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(
    (h) =>
      h.targetItemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.targetItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(h.goodsIssueDocNum).includes(searchTerm) ||
      String(h.goodsReceiptDocNum).includes(searchTerm) ||
      (h.targetSerialNumber && h.targetSerialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedRecord = history.find((h) => h.id === selectedConvId) || filteredHistory[0] || history[0];

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto">
      {/* Header info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className={`text-sm font-bold uppercase tracking-widest ${
            theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
          }`}>
            Trazabilidad Completa & Costos de Conversión
          </h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
            Auditoría de salidas/entradas de mercancía y asientos contables generados en SAP Business One
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por documento o producto..."
            className={`border rounded-xl pl-9 pr-4 py-2 text-xs w-64 sm:w-80 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm'
            }`}
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Main Split View: Left List of Conversions / Right Traceability Details */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left: Conversion log list */}
        <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col shadow-lg transition-colors ${
          theme === 'dark'
            ? 'bg-[#151619] border-gray-800'
            : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-xs font-bold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
              Historial de Conversiones
            </span>
            <span className="text-xs text-sky-500 mono font-bold">{filteredHistory.length} registros</span>
          </div>

          <div className={`divide-y overflow-y-auto flex-1 ${
            theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'
          }`}>
            {filteredHistory.map((rec) => {
              const isSelected = rec.id === selectedRecord?.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedConvId(rec.id)}
                  className={`p-4 transition-all cursor-pointer ${
                    isSelected
                      ? theme === 'dark'
                        ? 'bg-sky-500/10 border-l-2 border-l-sky-400'
                        : 'bg-sky-50 border-l-2 border-l-sky-600'
                      : theme === 'dark'
                        ? 'hover:bg-gray-900/50'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="mono font-bold text-sky-500 text-xs">{rec.targetItemCode}</span>
                    <span className={`text-[10px] mono flex items-center space-x-1 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                      <Calendar className="w-3 h-3" />
                      <span>{rec.docDate}</span>
                    </span>
                  </div>

                  <p className={`text-xs font-medium truncate mb-2 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-slate-800'
                  }`}>
                    {rec.targetItemName}
                  </p>

                  <div className={`flex items-center justify-between text-[11px] ${
                    theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    <div className="space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] mono ${
                        theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Salida: #{rec.goodsIssueDocNum}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] mono ${
                        theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Entrada: #{rec.goodsReceiptDocNum}
                      </span>
                    </div>
                    <span className={`font-bold mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      ${rec.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredHistory.length === 0 && (
              <div className={`p-8 text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                No se encontraron registros de conversión coincidentes.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Conversion Detailed Trace Sheet */}
        {selectedRecord ? (
          <div className={`flex-[1.4] rounded-2xl border p-6 flex flex-col space-y-6 shadow-xl overflow-y-auto transition-colors ${
            theme === 'dark'
              ? 'bg-[#151619] border-gray-800'
              : 'bg-white border-slate-200 shadow-slate-200/50'
          }`}>
            {/* Header Document Summary */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-slate-200'
            }`}>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className={`text-base font-bold mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {selectedRecord.targetItemCode}
                  </h4>
                  <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mono">
                    SAP B1 Contabilizado
                  </span>
                </div>
                <p className={`text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                  {selectedRecord.targetItemName}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className={`text-[10px] uppercase block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                  Costo Total Contabilizado
                </span>
                <span className="text-xl font-bold text-sky-500 mono">${selectedRecord.totalCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Document Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`border p-3 rounded-xl ${
                theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] uppercase block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
                  Doc. Salida SAP
                </span>
                <p className={`mono font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  #{selectedRecord.goodsIssueDocNum}
                </p>
                <p className={`text-[10px] mono ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                  DocEntry {selectedRecord.goodsIssueDocEntry}
                </p>
              </div>

              <div className={`border p-3 rounded-xl ${
                theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] uppercase block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
                  Doc. Entrada SAP
                </span>
                <p className="mono font-bold text-emerald-500 text-sm">
                  #{selectedRecord.goodsReceiptDocNum}
                </p>
                <p className={`text-[10px] mono ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                  DocEntry {selectedRecord.goodsReceiptDocEntry}
                </p>
              </div>

              <div className={`border p-3 rounded-xl ${
                theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] uppercase block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>
                  Asiento Contable
                </span>
                <p className="mono font-bold text-amber-500 text-sm">
                  #{selectedRecord.journalEntryNumber}
                </p>
                <p className={`text-[10px] mono ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                  Fecha: {selectedRecord.docDate}
                </p>
              </div>
            </div>

            {/* Product Trace Information */}
            <div className={`p-4 rounded-xl border space-y-2 text-xs ${
              theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] uppercase font-bold block ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                Datos de Identificación del Producto Terminado
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className={`text-[10px] block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Lote o Serie Asignado:</span>
                  <span className="mono font-bold text-sky-500">
                    {selectedRecord.targetSerialNumber || selectedRecord.targetBatchNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Almacén Destino:</span>
                  <span className={`mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedRecord.targetWarehouse}</span>
                </div>
                <div>
                  <span className={`text-[10px] block ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Cantidad Terminada:</span>
                  <span className={`mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedRecord.targetQuantity} UN</span>
                </div>
              </div>
            </div>

            {/* Consumed Component Audit Trail Table */}
            <div className="space-y-3">
              <h5 className={`text-xs uppercase font-bold tracking-wider flex items-center justify-between ${
                theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
              }`}>
                <span>Árbol de Componentes Consumidos ({selectedRecord.consumedComponents.length})</span>
                <span className={`text-[11px] mono ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Origen: {selectedRecord.sourceWarehouse}</span>
              </h5>

              <div className={`border rounded-xl overflow-hidden ${
                theme === 'dark' ? 'border-gray-800' : 'border-slate-200'
              }`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`text-[10px] uppercase border-b ${
                    theme === 'dark'
                      ? 'bg-black/50 text-gray-500 border-gray-800'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    <tr>
                      <th className="px-4 py-2">Código Componente</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Serie / Lote Consumido</th>
                      <th className="px-4 py-2 text-right">Cant.</th>
                      <th className="px-4 py-2 text-right">Costo Unit.</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' ? 'divide-gray-800' : 'divide-slate-100'
                  }`}>
                    {selectedRecord.consumedComponents.map((comp, idx) => (
                      <tr key={idx} className={theme === 'dark' ? 'hover:bg-gray-900/40' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-2.5 mono font-semibold text-sky-500">{comp.itemCode}</td>
                        <td className={`px-4 py-2.5 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-800'}`}>{comp.itemName}</td>
                        <td className="px-4 py-2.5">
                          {comp.batchNumber ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] mono border ${
                              theme === 'dark' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              Lote: {comp.batchNumber}
                            </span>
                          ) : comp.serialNumber ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] mono border ${
                              theme === 'dark' ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}>
                              Serie: {comp.serialNumber}
                            </span>
                          ) : (
                            <span className={`text-[10px] mono ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Estándar</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right mono font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {comp.quantity} {comp.uom}
                        </td>
                        <td className={`px-4 py-2.5 text-right mono ${
                          theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                          ${comp.unitCost.toFixed(2)}
                        </td>
                        <td className={`px-4 py-2.5 text-right mono font-bold ${
                          theme === 'dark' ? 'text-gray-200' : 'text-slate-900'
                        }`}>
                          ${comp.totalCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex-1 rounded-2xl border p-12 flex items-center justify-center text-xs ${
            theme === 'dark'
              ? 'bg-[#151619] border-gray-800 text-gray-500'
              : 'bg-white border-slate-200 text-slate-400'
          }`}>
            Seleccione una conversión del historial para ver el detalle de trazabilidad.
          </div>
        )}
      </div>
    </div>
  );
};
