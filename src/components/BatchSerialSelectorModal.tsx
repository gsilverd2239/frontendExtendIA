import React, { useState } from 'react';
import { InventoryItem } from '../types/sap';
import { X, Check, Hash, QrCode, AlertCircle, Plus, Minus } from 'lucide-react';

interface BatchSerialSelectorModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemCode: string, selectedBatches: { [batchNum: string]: number }, selectedSerials: string[]) => void;
}

export const BatchSerialSelectorModal: React.FC<BatchSerialSelectorModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !item) return null;

  const isBatched = item.ManageBatchNumbers === 'tYES';
  const isSerialized = item.ManageSerialNumbers === 'tYES';

  const [batchAllocations, setBatchAllocations] = useState<{ [batchNum: string]: number }>(
    item.SelectedBatches || {}
  );
  const [selectedSerialList, setSelectedSerialList] = useState<string[]>(
    item.SelectedSerials || []
  );

  const handleBatchQtyChange = (batchNum: string, maxQty: number, change: number) => {
    setBatchAllocations((prev) => {
      const current = prev[batchNum] || 0;
      const next = Math.max(0, Math.min(maxQty, current + change));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[batchNum];
        return copy;
      }
      return { ...prev, [batchNum]: next };
    });
  };

  const handleToggleSerial = (serialNum: string) => {
    setSelectedSerialList((prev) => {
      if (prev.includes(serialNum)) {
        return prev.filter((s) => s !== serialNum);
      } else {
        return [...prev, serialNum];
      }
    });
  };

  const totalSelectedQty = isBatched
    ? Object.values(batchAllocations).reduce((a, b) => a + b, 0)
    : isSerialized
    ? selectedSerialList.length
    : 0;

  const handleSave = () => {
    onConfirm(item.ItemCode, batchAllocations, selectedSerialList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#151619] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-black/50 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {isBatched ? <Hash className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="mono font-bold text-sky-400">{item.ItemCode}</span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded mono">
                  {isBatched ? 'Gestión por Lotes' : 'Gestión por Series'}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium truncate max-w-md">{item.ItemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
            <div>
              <span>Stock Disponible en Almacén: </span>
              <strong className="text-white font-mono">{item.WarehouseStock} {item.InventoryUOM}</strong>
            </div>
            <div>
              <span>Cantidad Seleccionada: </span>
              <strong className="text-sky-400 font-mono text-sm">{totalSelectedQty} {item.InventoryUOM}</strong>
            </div>
          </div>

          {/* Batches Table */}
          {isBatched && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Seleccione Lotes y Cantidades a Consumir
              </h4>
              {item.Batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 bg-black/20 rounded-xl border border-dashed border-gray-800">
                  No hay lotes con saldo disponible en este almacén.
                </div>
              ) : (
                <div className="border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-black/50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="px-4 py-2.5">Número de Lote</th>
                        <th className="px-4 py-2.5">Caducidad / Admisión</th>
                        <th className="px-4 py-2.5 text-right">Disponible</th>
                        <th className="px-4 py-2.5 text-right">Costo Unit.</th>
                        <th className="px-4 py-2.5 text-center">Consumir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {item.Batches.map((b) => {
                        const allocated = batchAllocations[b.BatchNumber] || 0;
                        return (
                          <tr key={b.BatchNumber} className="hover:bg-sky-500/5 transition-colors">
                            <td className="px-4 py-3 mono font-semibold text-sky-400">
                              {b.BatchNumber}
                              {b.Location && <span className="block text-[10px] text-gray-500">Ubic: {b.Location}</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-400 mono">
                              {b.ExpiryDate ? `Vence: ${b.ExpiryDate}` : `Ingreso: ${b.AdmissionDate || 'N/A'}`}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300 font-mono font-medium">
                              {b.Quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 font-mono">
                              ${b.UnitCost.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleBatchQtyChange(b.BatchNumber, b.Quantity, -1)}
                                  disabled={allocated <= 0}
                                  className="w-7 h-7 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg flex items-center justify-center text-white"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={b.Quantity}
                                  value={allocated}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(b.Quantity, Number(e.target.value) || 0));
                                    setBatchAllocations((prev) => ({ ...prev, [b.BatchNumber]: val }));
                                  }}
                                  className="w-16 bg-gray-900 border border-gray-700 text-center py-1 rounded text-white font-mono text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleBatchQtyChange(b.BatchNumber, b.Quantity, 1)}
                                  disabled={allocated >= b.Quantity}
                                  className="w-7 h-7 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg flex items-center justify-center text-white"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Serials List */}
          {isSerialized && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Seleccione Números de Serie Específicos
              </h4>
              {item.Serials.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 bg-black/20 rounded-xl border border-dashed border-gray-800">
                  No hay números de serie disponibles en este almacén.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {item.Serials.map((s) => {
                    const isSelected = selectedSerialList.includes(s.SerialNumber);
                    return (
                      <div
                        key={s.SerialNumber}
                        onClick={() => handleToggleSerial(s.SerialNumber)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm shadow-sky-500/10'
                            : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="mono font-semibold text-xs text-sky-400">{s.SerialNumber}</p>
                          <p className="text-[10px] text-gray-500">
                            Costo SAP: <span className="mono text-gray-400">${s.UnitCost.toFixed(2)}</span>
                          </p>
                          {s.ManufacturerNumber && (
                            <p className="text-[10px] text-gray-500">Mfr: {s.ManufacturerNumber}</p>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-sky-500 border-sky-500 text-black' : 'border-gray-700 bg-gray-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-black/50 border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Asignación ({totalSelectedQty})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
