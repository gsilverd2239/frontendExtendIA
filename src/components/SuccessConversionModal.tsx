import React from 'react';
import { SAPConversionResult } from '../types/sap';
import { CheckCircle2, FileText, ArrowRight, Layers, ShieldCheck, Printer, X, Sparkles } from 'lucide-react';
import { formatCurrencyGs, formatQuantityPy } from '../utils/formatters';

interface SuccessConversionModalProps {
  result: SAPConversionResult | null;
  isOpen: boolean;
  onClose: () => void;
  onNewConversion: () => void;
}

export const SuccessConversionModal: React.FC<SuccessConversionModalProps> = ({
  result,
  isOpen,
  onClose,
  onNewConversion,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#151619] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header with success state */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-sky-950/30 to-black p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Conversión Ejecutada en SAP B1</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mono">
                  Contabilizado
                </span>
              </div>
              <p className="text-xs text-gray-400">Service Layer generó los movimientos de stock y costos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SAP Documents Generated Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Goods Issue */}
            <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-gray-500 font-bold block">Salida Mercancías</span>
              <p className="text-lg font-bold text-sky-400 mono">#{result.goodsIssueDocNum}</p>
              <p className="text-[10px] text-gray-400 mono">DocEntry: {result.goodsIssueDocEntry}</p>
            </div>

            {/* Goods Receipt */}
            <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-gray-500 font-bold block">Entrada Mercancías</span>
              <p className="text-lg font-bold text-emerald-400 mono">#{result.goodsReceiptDocNum}</p>
              <p className="text-[10px] text-gray-400 mono">DocEntry: {result.goodsReceiptDocEntry}</p>
            </div>

            {/* Journal Entry */}
            <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-gray-500 font-bold block">Asiento Contable</span>
              <p className="text-lg font-bold text-amber-400 mono">#{result.journalEntryNumber}</p>
              <p className="text-[10px] text-gray-400 mono">Total: {formatCurrencyGs(result.totalCost)}</p>
            </div>
          </div>

          {/* Product Created Details */}
          <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold text-gray-400">Producto Terminado Generado:</span>
                <span className="mono font-bold text-white text-sm">{result.targetItemCode}</span>
              </div>
              <span className="text-xs font-mono bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                Cant: {formatQuantityPy(result.targetQuantity)}
              </span>
            </div>
            <p className="text-xs text-gray-300 font-medium">{result.targetItemName}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-800 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 block">Lote / Serie Asignado</span>
                <span className="mono text-white font-semibold">
                  {result.targetSerialNumber || result.targetBatchNumber || 'Estándar'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Almacén Destino</span>
                <span className="mono text-white">{result.targetWarehouse}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Costo Calculado</span>
                <span className="mono text-white font-semibold">{formatCurrencyGs(result.targetUnitCost)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Fecha Contabilización</span>
                <span className="mono text-white">{result.docDate}</span>
              </div>
            </div>
          </div>

          {/* Consumed Items Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 flex items-center justify-between">
              <span>Componentes Consumidos con Trazabilidad ({result.consumedComponents.length})</span>
              <span className="text-[11px] text-gray-500 mono">Almacén Origen: {result.sourceWarehouse}</span>
            </h4>
            <div className="max-h-44 overflow-y-auto border border-gray-800 rounded-xl divide-y divide-gray-800/80">
              {result.consumedComponents.map((comp, idx) => (
                <div key={idx} className="p-3 bg-black/30 flex items-center justify-between text-xs hover:bg-black/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="mono text-sky-400 font-semibold">{comp.itemCode}</span>
                      <span className="text-gray-300">{comp.itemName}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mono flex items-center space-x-2">
                      {comp.batchNumber && <span>Lote: <strong className="text-gray-400">{comp.batchNumber}</strong></span>}
                      {comp.serialNumber && <span>Serie: <strong className="text-gray-400">{comp.serialNumber}</strong></span>}
                      {!comp.batchNumber && !comp.serialNumber && <span>Sin control de serie/lote</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mono font-semibold text-white">
                      {comp.quantity} {comp.uom}
                    </p>
                    <p className="mono text-[11px] text-gray-500">
                      ${comp.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-black/60 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Hoja de Trazabilidad</span>
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onClose();
                onNewConversion();
              }}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nueva Conversión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
