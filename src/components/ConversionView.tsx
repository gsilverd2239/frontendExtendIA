import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, FinishedGoodItem, Warehouse, BusinessLine, ConsumedComponent, ConversionExecutionPayload } from '../types/sap';
import { sapService, ConvertIAResult } from '../services/sapService';
import { Search, Hash, QrCode, Check, ArrowRight, Layers, Info, RefreshCw, Loader2, Sliders, Warehouse as WarehouseIcon, ChevronDown, CheckSquare, Square, Sparkles, X, Boxes, FileCheck2, Link2, AlertCircle, Lock, Eraser } from 'lucide-react';
import { BatchSerialSelectorModal } from './BatchSerialSelectorModal';
import { formatCurrencyGs, formatQuantityPy } from '../utils/formatters';

const WAREHOUSE_MAPPING: Record<string, string> = {
  'CAM-OPE': 'CAM-VEN',
  'CLI-OPE': 'CLI-VEN',
  'CDE-OPE': 'CDE-VEN',
  'ENC-OPE': 'ENC-VEN',
  'ITG-OPE': 'ITG-OPE',
  'ITG-PRO': 'ITG-PRO',
  'OVI-OPE': 'OVI-VEN',
};

interface ConversionViewProps {
  items: InventoryItem[];
  finishedGoods: FinishedGoodItem[];
  selectedWarehouse: string;
  warehouses: Warehouse[];
  spWarehouseInfo?: { source?: string; spQueryUsed?: string; error?: string };
  onSelectWarehouse: (code: string) => void;
  onExecuteConversion: (payload: ConversionExecutionPayload) => Promise<void>;
  isLoading: boolean;
  onRefreshInventory: () => void;
  theme?: 'dark' | 'light';
}

export const ConversionView: React.FC<ConversionViewProps> = ({
  items,
  finishedGoods,
  selectedWarehouse,
  warehouses,
  spWarehouseInfo,
  onSelectWarehouse,
  onExecuteConversion,
  isLoading,
  onRefreshInventory,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'batches' | 'serials'>('all');

  // Business Lines state (OPRC from PostgreSQL)
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([]);
  const [selectedBusinessLines, setSelectedBusinessLines] = useState<string[]>([]);
  const [localItems, setLocalItems] = useState<InventoryItem[] | null>(null);
  const [isFetchingInventory, setIsFetchingInventory] = useState<boolean>(false);

  const activeSchema = localStorage.getItem('sap_company_db') || localStorage.getItem('convertia_schema') || 'FG_DESARROLLO';
  const isBusy = isLoading || isFetchingInventory;

  // Load business lines from OPRC table on mount / schema change
  useEffect(() => {
    let isMounted = true;
    sapService.getBusinessLines(activeSchema).then((lines) => {
      if (isMounted) {
        setBusinessLines(lines);
        if (lines.length > 0) {
          // Select all loaded business lines by default
          setSelectedBusinessLines(lines.map((l) => l.PrcCode));
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeSchema]);

  // Fetch inventory whenever warehouse or selectedBusinessLines changes
  useEffect(() => {
    if (selectedBusinessLines.length === 0) {
      setLocalItems([]);
      return;
    }

    let isMounted = true;
    setIsFetchingInventory(true);
    sapService.getInventory(selectedWarehouse, activeSchema, selectedBusinessLines)
      .then((resItems) => {
        if (isMounted) {
          setLocalItems(resItems);
          setIsFetchingInventory(false);
        }
      })
      .catch((err) => {
        console.warn('Error fetching inventory with business lines:', err);
        if (isMounted) setIsFetchingInventory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouse, activeSchema, selectedBusinessLines]);

  const effectiveItems = localItems !== null ? localItems : items;

  const handleToggleBusinessLine = (code: string) => {
    setSelectedBusinessLines((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllBusinessLines = () => {
    setSelectedBusinessLines(businessLines.map((b) => b.PrcCode));
  };

  const handleDeselectAllBusinessLines = () => {
    setSelectedBusinessLines([]);
  };

  // Selected Target Finished Good
  const [selectedTargetCode, setSelectedTargetCode] = useState<string>(
    finishedGoods[0]?.ItemCode || 'PT-5000'
  );
  const [targetQuantity, setTargetQuantity] = useState<number>(1);
  const [targetBatchOrSerial, setTargetBatchOrSerial] = useState<string>('SER-PT5000-' + Math.floor(1000 + Math.random() * 9000));
  const [targetWarehouse, setTargetWarehouse] = useState<string>('ALM-PT-01');
  const [comments, setComments] = useState<string>('Conversión de inventario para orden comercial');

  // Keep target selection in sync if finishedGoods list updates
  useEffect(() => {
    if (finishedGoods.length > 0) {
      if (!selectedTargetCode || !finishedGoods.some((g) => g.ItemCode === selectedTargetCode)) {
        const first = finishedGoods[0];
        setSelectedTargetCode(first.ItemCode);
        setTargetWarehouse(first.DefaultWarehouse || 'ALM-PT-01');
        setTargetBatchOrSerial(
          (first.ManageSerialNumbers === 'tYES' ? 'SER-' : 'BATCH-') +
          first.ItemCode +
          '-' +
          Math.floor(1000 + Math.random() * 9000)
        );
      }
    }
  }, [finishedGoods, selectedTargetCode]);

  // Sync target warehouse with equivalent warehouse (equWhsCode) from OWHS
  useEffect(() => {
    const selectedWhObj = warehouses.find((w) => w.WarehouseCode === selectedWarehouse);
    if (selectedWhObj && selectedWhObj.EquWhsCode) {
      setTargetWarehouse(selectedWhObj.EquWhsCode);
    }
  }, [selectedWarehouse, warehouses]);

  // Selected components state
  const [componentAllocations, setComponentAllocations] = useState<{
    [itemCode: string]: {
      selectedBatches: { [batchNum: string]: number };
      selectedSerials: string[];
      standardQty: number;
    };
  }>({
    'MP-00124': { selectedBatches: { 'BATCH-2024-001': 1 }, selectedSerials: [], standardQty: 0 },
    'MP-00155': { selectedBatches: {}, selectedSerials: ['SER-99422831'], standardQty: 0 },
    'MP-00982': { selectedBatches: { 'BATCH-2024-055': 1 }, selectedSerials: [], standardQty: 0 },
    'MP-00331': { selectedBatches: { 'BATCH-2023-991': 1 }, selectedSerials: [], standardQty: 0 },
    'MP-01200': { selectedBatches: {}, selectedSerials: [], standardQty: 1 },
  });

  const [activeItemForModal, setActiveItemForModal] = useState<InventoryItem | null>(null);

  const selectedTargetGood = finishedGoods.find((g) => g.ItemCode === selectedTargetCode) || finishedGoods[0] || null;

  // Filter items in current warehouse
  const filteredItems = useMemo(() => {
    return effectiveItems.filter((item) => {
      const matchSearch =
        item.ItemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ItemName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'batches') return item.ManageBatchNumbers === 'tYES';
      if (filterType === 'serials') return item.ManageSerialNumbers === 'tYES';
      return true;
    });
  }, [effectiveItems, searchTerm, filterType]);

  // Compute total consumed components & costs
  const consumedComponentsList = useMemo<ConsumedComponent[]>(() => {
    const list: ConsumedComponent[] = [];

    Object.entries(componentAllocations).forEach(([itemCode, alloc]) => {
      const item = effectiveItems.find((i) => i.ItemCode === itemCode);
      if (!item) return;

      if (item.ManageBatchNumbers === 'tYES') {
        Object.entries(alloc.selectedBatches).forEach(([batchNum, qty]) => {
          if (qty > 0) {
            const batchInfo = item.Batches.find((b) => b.BatchNumber === batchNum);
            const cost = batchInfo?.UnitCost || item.AvgStdPrice;
            list.push({
              itemCode: item.ItemCode,
              itemName: item.ItemName,
              itemType: 'Batch',
              batchNumber: batchNum,
              quantity: qty,
              unitCost: cost,
              totalCost: qty * cost,
              uom: item.InventoryUOM,
            });
          }
        });
      } else if (item.ManageSerialNumbers === 'tYES') {
        alloc.selectedSerials.forEach((serialNum) => {
          const serialInfo = item.Serials.find((s) => s.SerialNumber === serialNum);
          const cost = serialInfo?.UnitCost || item.AvgStdPrice;
          list.push({
            itemCode: item.ItemCode,
            itemName: item.ItemName,
            itemType: 'Serial',
            serialNumber: serialNum,
            quantity: 1,
            unitCost: cost,
            totalCost: cost,
            uom: item.InventoryUOM,
          });
        });
      } else if (alloc.standardQty > 0) {
        list.push({
          itemCode: item.ItemCode,
          itemName: item.ItemName,
          itemType: 'Standard',
          quantity: alloc.standardQty,
          unitCost: item.AvgStdPrice,
          totalCost: alloc.standardQty * item.AvgStdPrice,
          uom: item.InventoryUOM,
        });
      }
    });

    return list;
  }, [componentAllocations, items]);

  const totalCalculatedCost = useMemo(() => {
    return consumedComponentsList.reduce((acc, curr) => acc + curr.totalCost, 0);
  }, [consumedComponentsList]);

  const unitCostCalculated = useMemo(() => {
    return targetQuantity > 0 ? totalCalculatedCost / targetQuantity : 0;
  }, [totalCalculatedCost, targetQuantity]);

  // Toast notification state for ConvertIA button action
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' } | null>(null);

  // Auto-dismiss toast notification after 4.5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Helper to check if an item has "SIN EQUIVALENCIA"
  const isSinEquivalencia = (item: InventoryItem) => {
    const artEq = String(item.ArticuloEquivalente || (item as any).ArtEq || '').trim();
    if (!artEq || artEq === 'SIN EQUIVALENCIA' || artEq === '-') return true;
    if (item.Activo === false || item.Valido === false) return true;
    return false;
  };

  // Check if all selectable filtered items are selected
  const allFilteredSelected = useMemo(() => {
    const selectable = filteredItems.filter((item) => !isSinEquivalencia(item));
    if (selectable.length === 0) return false;
    return selectable.every((item) => {
      const alloc = componentAllocations[item.ItemCode];
      return (
        alloc &&
        (Object.values(alloc.selectedBatches).some((q) => q > 0) ||
          alloc.selectedSerials.length > 0 ||
          alloc.standardQty > 0)
      );
    });
  }, [filteredItems, componentAllocations]);

  // Toggle selecting / deselecting all currently filtered items
  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setComponentAllocations((prev) => {
        const next = { ...prev };
        filteredItems.forEach((item) => {
          delete next[item.ItemCode];
        });
        return next;
      });
    } else {
      const selectable = filteredItems.filter((item) => !isSinEquivalencia(item));
      if (selectable.length === 0) {
        setToastMessage({
          title: '⚠️ Sin Equivalencia',
          desc: 'Sin Equivalencia no se puede seleccionar',
          type: 'info',
        });
        return;
      }
      setComponentAllocations((prev) => {
        const next = { ...prev };
        selectable.forEach((item) => {
          const isLote = item.LoteSerie === 'Lote' || item.ManageBatchNumbers === 'tYES';
          const isSerie = item.LoteSerie === 'Serie' || item.ManageSerialNumbers === 'tYES';

          if (isLote && item.Batches && item.Batches.length > 0) {
            next[item.ItemCode] = {
              selectedBatches: { [item.Batches[0].BatchNumber]: 1 },
              selectedSerials: [],
              standardQty: 0,
            };
          } else if (isSerie && item.Serials && item.Serials.length > 0) {
            next[item.ItemCode] = {
              selectedBatches: {},
              selectedSerials: [item.Serials[0].SerialNumber],
              standardQty: 0,
            };
          } else {
            next[item.ItemCode] = {
              selectedBatches: {},
              selectedSerials: [],
              standardQty: 1,
            };
          }
        });
        return next;
      });
    }
  };

  // ConvertIA state for progress spinner modal and completion summary
  const [isProcessingConvertIA, setIsProcessingConvertIA] = useState(false);
  const [convertIAStep, setConvertIAStep] = useState<number>(1);
  const [convertIAStats, setConvertIAStats] = useState<{ processed: number; total: number; skipped: number }>({ processed: 0, total: 0, skipped: 0 });
  const [convertIAResultModal, setConvertIAResultModal] = useState<ConvertIAResult | null>(null);

  // ConvertIA button action handler with full SAP B1 workflow execution
  const handleConvertIA = async () => {
    // Get all selected items from componentAllocations or items marked as selected
    const selectedList = effectiveItems.filter((item) => {
      const alloc = componentAllocations[item.ItemCode];
      if (!alloc) return false;
      const bQty = Object.values(alloc.selectedBatches).reduce((a, b) => a + b, 0);
      const sQty = alloc.selectedSerials.length;
      const stdQty = alloc.standardQty;
      return bQty + sQty + stdQty > 0;
    }).map((item) => ({
      ...item,
      allocation: componentAllocations[item.ItemCode],
    }));

    if (selectedList.length === 0) {
      setToastMessage({
        title: '⚡ ConvertIA: Sin Selección',
        desc: 'Por favor seleccione al menos un artículo de la grilla para procesar ConvertIA.',
        type: 'info',
      });
      return;
    }

    // Filter items with valid equivalencies
    const validWithEq = selectedList.filter((i) => {
      const artEq = String(i.ArticuloEquivalente || (i as any).ArtEq || '').trim();
      return artEq && artEq !== 'SIN EQUIVALENCIA' && artEq !== '-' && artEq !== 'PT-5000';
    });

    const totalCount = selectedList.length;
    const processedCount = validWithEq.length;
    const skippedCount = totalCount - processedCount;

    if (processedCount === 0) {
      setToastMessage({
        title: '⚡ ConvertIA: Sin Equivalentes Válidos',
        desc: 'Ninguno de los artículos seleccionados posee un Artículo Equivalente asignado.',
        type: 'info',
      });
      return;
    }

    setConvertIAStats({ processed: processedCount, total: totalCount, skipped: skippedCount });
    setIsProcessingConvertIA(true);
    setConvertIAStep(1);

    try {
      // Step 1: Consultar Lotes/Series en SAP HANA
      setConvertIAStep(1);
      await new Promise((r) => setTimeout(r, 400));

      // Step 2: Generar Salida de Mercancías (/InventoryGenExits)
      setConvertIAStep(2);
      await new Promise((r) => setTimeout(r, 400));

      // Backend call to /api/sap/convertia
      const activeSchema = localStorage.getItem('sap_company_db') || localStorage.getItem('convertia_schema') || 'FG_DESARROLLO';
      const selectedWhObj = warehouses.find((w) => w.WarehouseCode === selectedWarehouse);
      const computedTargetWarehouse = selectedWhObj?.EquWhsCode || selectedWhObj?.WarehouseCode || selectedWarehouse;

      const result = await sapService.executeConvertIA(
        selectedWarehouse,
        computedTargetWarehouse,
        selectedList,
        activeSchema
      );

      // Step 3: Generar Entrada de Mercancías (/InventoryGenEntries)
      setConvertIAStep(3);
      await new Promise((r) => setTimeout(r, 300));

      // Step 4: Vinculación de Documentos (PATCH /InventoryGenEntries)
      setConvertIAStep(4);
      await new Promise((r) => setTimeout(r, 300));

      setIsProcessingConvertIA(false);
      setConvertIAResultModal(result);

      // Clear grid selection
      setComponentAllocations({});

      // Toast feedback
      setToastMessage({
        title: '⚡ ExtendIA: Proceso Completado',
        desc: `Salida #${result.goodsIssueDocNum} y Entrada #${result.goodsReceiptDocNum} generadas y vinculadas exitosamente.`,
        type: 'success',
      });

      // Refresh inventory
      onRefreshInventory();
    } catch (err: any) {
      console.error('Error al ejecutar ExtendIA:', err);
      setIsProcessingConvertIA(false);
      setToastMessage({
        title: '❌ Error en ExtendIA',
        desc: err?.message || 'Ocurrió un error al procesar la conversión en SAP Service Layer.',
        type: 'info',
      });
    }
  };

  const handleToggleRow = (item: InventoryItem) => {
    if (isSinEquivalencia(item)) {
      setToastMessage({
        title: '⚠️ Sin Equivalencia',
        desc: 'Sin Equivalencia no se puede seleccionar',
        type: 'info',
      });
      return;
    }

    const currentAlloc = componentAllocations[item.ItemCode];
    const isCurrentlyAllocated =
      currentAlloc &&
      (Object.values(currentAlloc.selectedBatches).some((q) => q > 0) ||
        currentAlloc.selectedSerials.length > 0 ||
        currentAlloc.standardQty > 0);

    if (isCurrentlyAllocated) {
      setComponentAllocations((prev) => {
        const next = { ...prev };
        delete next[item.ItemCode];
        return next;
      });
    } else {
      if (item.ManageBatchNumbers === 'tYES' && item.Batches.length > 0) {
        const firstBatch = item.Batches[0];
        setComponentAllocations((prev) => ({
          ...prev,
          [item.ItemCode]: {
            selectedBatches: { [firstBatch.BatchNumber]: 1 },
            selectedSerials: [],
            standardQty: 0,
          },
        }));
      } else if (item.ManageSerialNumbers === 'tYES' && item.Serials.length > 0) {
        const firstSerial = item.Serials[0];
        setComponentAllocations((prev) => ({
          ...prev,
          [item.ItemCode]: {
            selectedBatches: {},
            selectedSerials: [firstSerial.SerialNumber],
            standardQty: 0,
          },
        }));
      } else {
        setComponentAllocations((prev) => ({
          ...prev,
          [item.ItemCode]: {
            selectedBatches: {},
            selectedSerials: [],
            standardQty: 1,
          },
        }));
      }
    }
  };

  const handleOpenAllocationModal = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSinEquivalencia(item)) {
      setToastMessage({
        title: '⚠️ Sin Equivalencia',
        desc: 'Sin Equivalencia no se puede seleccionar',
        type: 'info',
      });
      return;
    }
    setActiveItemForModal({
      ...item,
      SelectedBatches: componentAllocations[item.ItemCode]?.selectedBatches || {},
      SelectedSerials: componentAllocations[item.ItemCode]?.selectedSerials || [],
    });
  };

  const handleConfirmAllocations = (
    itemCode: string,
    selectedBatches: { [batchNum: string]: number },
    selectedSerials: string[]
  ) => {
    setComponentAllocations((prev) => ({
      ...prev,
      [itemCode]: {
        selectedBatches,
        selectedSerials,
        standardQty: prev[itemCode]?.standardQty || 0,
      },
    }));
  };

  const handleStandardQtyChange = (itemCode: string, qty: number, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setComponentAllocations((prev) => ({
      ...prev,
      [itemCode]: {
        selectedBatches: {},
        selectedSerials: [],
        standardQty: Math.max(0, qty),
      },
    }));
  };

  const handleExecute = async () => {
    if (!selectedTargetGood) {
      alert('Por favor seleccione un artículo destino a generar.');
      return;
    }

    if (consumedComponentsList.length === 0) {
      alert('Por favor seleccione al menos un componente a consumir de SAP B1.');
      return;
    }

    const payload: ConversionExecutionPayload = {
      sourceWarehouse: selectedWarehouse,
      targetWarehouse: targetWarehouse,
      targetItemCode: selectedTargetGood.ItemCode,
      targetItemName: selectedTargetGood.ItemName,
      targetQuantity: targetQuantity,
      targetBatchNumber: selectedTargetGood.ManageBatchNumbers === 'tYES' ? targetBatchOrSerial : undefined,
      targetSerialNumber: selectedTargetGood.ManageSerialNumbers === 'tYES' ? targetBatchOrSerial : undefined,
      targetUnitCost: unitCostCalculated,
      totalCost: totalCalculatedCost,
      comments: comments,
      consumedComponents: consumedComponentsList,
    };

    await onExecuteConversion(payload);
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col lg:flex-row gap-6 overflow-y-auto relative min-h-[500px]">
      {/* Full View Translucent Loading Overlay matching user screenshot */}
      {isLoading && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-[2px] transition-all animate-fadeIn ${theme === 'dark' ? 'bg-black/50' : 'bg-white/70'
          }`}>
          <div className={`px-6 py-4 rounded-2xl border flex items-center space-x-3 shadow-xl transition-all ${theme === 'dark'
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

      {/* LEFT COLUMN: Warehouse Grid + Available Items Table */}
      <div className="flex-[2] flex flex-col space-y-5 min-w-0">

        {/* WAREHOUSE + BUSINESS LINE FILTERS GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* CARD 1: FILTRO POR ALMACEN */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${theme === 'dark'
            ? 'bg-[#151619] border-gray-800'
            : 'bg-white border-slate-200 shadow-sm'
            }`}>
            <div className="flex items-start space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 ${theme === 'dark'
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-600'
                }`}>
                <WarehouseIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h3 className={`text-xs font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Filtro por Almacén
                  </h3>
                  {isBusy && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center space-x-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Cargando...</span>
                    </span>
                  )}
                  {spWarehouseInfo?.source === 'HANA_SP' && !isBusy && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      🟢 HANA SP Ejecutado
                    </span>
                  )}
                  {spWarehouseInfo?.source === 'SERVICE_LAYER' && !isBusy && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      🔵 Service Layer
                    </span>
                  )}
                </div>
                <p className={`text-[11px] font-mono mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                  {warehouses.length} almacenes disponibles
                </p>
              </div>
            </div>

            {/* Warehouse Selection ComboBox */}
            <div className="relative w-full">
              <select
                id="select-warehouse-combo"
                value={selectedWarehouse}
                onChange={(e) => onSelectWarehouse(e.target.value)}
                className={`w-full appearance-none border rounded-xl px-3 py-2 pr-10 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-sm transition-all ${theme === 'dark'
                  ? 'bg-gray-900 border-gray-700 text-sky-400 hover:border-gray-600'
                  : 'bg-white border-slate-300 text-sky-700 hover:border-slate-400'
                  }`}
              >
                {warehouses.map((wh) => (
                  <option
                    key={wh.WarehouseCode}
                    value={wh.WarehouseCode}
                    className={theme === 'dark' ? 'bg-[#151619] text-white font-sans' : 'bg-white text-slate-900 font-sans'}
                  >
                    {wh.WarehouseCode} - {wh.WarehouseName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-sky-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* CARD 2: FILTRO POR LINEA DE NEGOCIO (convertia."OPRC") */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${theme === 'dark'
            ? 'bg-[#151619] border-gray-800'
            : 'bg-white border-slate-200 shadow-sm'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${theme === 'dark'
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                  : 'bg-purple-50 border-purple-200 text-purple-600'
                  }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-xs font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Filtro por línea de Negocio
                    </h3>
                    {isBusy && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center space-x-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Actualizando...</span>
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    {selectedBusinessLines.length} de {businessLines.length} elegidas
                  </p>
                </div>
              </div>

              {/* Quick toggle actions */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleSelectAllBusinessLines}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                  title="Seleccionar todas las líneas de negocio"
                >
                  Marcar Todo
                </button>
                <span className="text-gray-600 text-xs">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllBusinessLines}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Limpiar todas las líneas de negocio"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Checkboxes grid for Líneas de Negocio */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {businessLines.length === 0 ? (
                <span className="text-xs text-gray-500 italic">Cargando líneas de negocio...</span>
              ) : (
                businessLines.map((bl) => {
                  const isChecked = selectedBusinessLines.includes(bl.PrcCode);
                  return (
                    <button
                      type="button"
                      key={bl.PrcCode}
                      onClick={() => handleToggleBusinessLine(bl.PrcCode)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium transition-all cursor-pointer select-none ${isChecked
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm'
                        : theme === 'dark'
                          ? 'bg-gray-900/60 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                          : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                        }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${isChecked
                        ? 'bg-emerald-500 text-white border border-emerald-500'
                        : theme === 'dark' ? 'border border-gray-700 bg-gray-900' : 'border border-slate-300 bg-white'
                        }`}>
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{bl.PrcName || bl.PrcCode}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Error Banner if HANA SP execution failed */}
        {spWarehouseInfo?.error && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-400">Diagnóstico de Ejecución del Procedimiento HANA:</span>
              <p className="mt-0.5 text-amber-200/90 break-all">{spWarehouseInfo.error}</p>
            </div>
          </div>
        )}

        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
              }`}>
              Artículos Disponibles (Lotes/Series)
            </h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono ${theme === 'dark'
              ? 'bg-gray-800 text-sky-400'
              : 'bg-sky-100 text-sky-800 font-semibold'
              }`}>
              {filteredItems.length}
            </span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2 sm:gap-2">
            {/* Filter pills */}
            <div className={`flex border rounded-xl p-0.5 text-xs ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'
              }`}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${filterType === 'all'
                  ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterType('batches')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${filterType === 'batches'
                  ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Lotes
              </button>
              <button
                type="button"
                onClick={() => setFilterType('serials')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${filterType === 'serials'
                  ? theme === 'dark' ? 'bg-sky-500 text-black font-bold' : 'bg-white text-sky-700 shadow-sm font-bold'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Series
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                id="search-inventory-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar artículo..."
                className={`border rounded-xl pl-8 pr-3 py-1.5 text-xs w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-sky-500 ${theme === 'dark'
                  ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm'
                  }`}
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            <button
              onClick={onRefreshInventory}
              title="Recargar datos de SAP"
              className={`p-2 border rounded-xl transition-colors cursor-pointer ${theme === 'dark'
                ? 'bg-gray-900 hover:bg-gray-800 border-gray-800 text-gray-400 hover:text-white'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm'
                }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className={`rounded-2xl border flex-1 overflow-hidden flex flex-col shadow-lg transition-colors ${theme === 'dark'
          ? 'bg-[#151619] border-gray-800'
          : 'bg-white border-slate-200 shadow-slate-200/50'
          }`}>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse" id="sap-inventory-table">
              <thead className={`text-[11px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm border-b ${theme === 'dark'
                ? 'bg-black/50 text-gray-400 border-gray-800'
                : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                <tr className="h-10">
                  <th className="px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="focus:outline-none flex items-center justify-center mx-auto text-sky-400 hover:text-sky-300 transition-colors"
                      title={allFilteredSelected ? "Desmarcar Todo" : "Seleccionar Todo"}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                      )}
                    </button>
                  </th>
                  <th className="px-3">CODIGO_SAP</th>
                  <th className="px-4">DESCRIPCION</th>
                  <th className="px-3 text-center">ACTIVO</th>
                  <th className="px-3">LOTE / SERIE</th>
                  <th className="px-3 text-right">DISPONIBLE</th>
                  <th className="px-3 text-right">COST_OTOTAL</th>
                  <th className="px-3">ART_EQUIVALENTE</th>
                  <th className="px-3">DESC_EQUIVALENTE</th>
                  <th className="px-3 text-center">VÁLIDO</th>
                  <th className="px-3 text-right">CANT_EQUIVALENTE</th>
                  <th className="px-3 text-right">COST_EQUIV_UNITARIO</th>
                  <th className="px-3 text-center">UNIDAD_NEGOCIO</th>
                </tr>
              </thead>
              <tbody className={`text-sm divide-y ${theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'
                }`}>
                {isBusy ? (
                  <tr>
                    <td colSpan={13} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-sky-500/10 border border-sky-500/30' : 'bg-sky-50 border border-sky-200'}`}>
                          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                        </div>
                        <div>
                          <p className={`text-base font-bold tracking-tight ${theme === 'dark' ? 'text-sky-300' : 'text-sky-800'}`}>
                            Cargando inventario de artículos...
                          </p>
                          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                            Consultando stock, lotes y series para el almacén y líneas de negocio seleccionadas
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : selectedBusinessLines.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                          <Layers className="w-8 h-8 text-purple-400 stroke-1" />
                        </div>
                        <div>
                          <p className={`text-base font-bold tracking-tight ${theme === 'dark' ? 'text-purple-300' : 'text-purple-800'}`}>
                            Línea de Negocio Requerida
                          </p>
                          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                            Debe seleccionar al menos 1 Línea de Negocio en la grilla superior para listar los artículos disponibles.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-slate-100 border border-slate-200'}`}>
                          <Boxes className="w-8 h-8 text-gray-400 stroke-1" />
                        </div>
                        <div>
                          <p className={`text-base font-bold tracking-tight ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
                            Sin registros a procesar
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            No hay artículos o lote/series registrados en el almacén y líneas de negocio seleccionadas
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const alloc = componentAllocations[item.ItemCode];
                    const isLote = item.LoteSerie === 'Lote' || item.ManageBatchNumbers === 'tYES';
                    const isSerie = item.LoteSerie === 'Serie' || item.ManageSerialNumbers === 'tYES';
                    const noEqu = isSinEquivalencia(item);

                    const batchQtyAllocated = alloc
                      ? Object.values(alloc.selectedBatches).reduce((a, b) => a + b, 0)
                      : 0;
                    const serialQtyAllocated = alloc ? alloc.selectedSerials.length : 0;
                    const standardQtyAllocated = alloc ? alloc.standardQty : 0;

                    const totalAllocated = batchQtyAllocated + serialQtyAllocated + standardQtyAllocated;
                    const isSelected = totalAllocated > 0;
                    const costoTotalVal = item.CostoTotal ?? (item.WarehouseStock * item.AvgStdPrice);

                    return (
                      <tr
                        key={item.ItemCode}
                        onClick={() => handleToggleRow(item)}
                        className={`h-12 transition-all ${noEqu
                          ? theme === 'dark'
                            ? 'opacity-45 bg-gray-950/50 hover:bg-gray-950/70 cursor-not-allowed'
                            : 'opacity-50 bg-slate-100/80 hover:bg-slate-100 cursor-not-allowed'
                          : isSelected
                            ? theme === 'dark'
                              ? 'bg-sky-500/10 hover:bg-sky-500/15 border-l-2 border-l-sky-400 cursor-pointer'
                              : 'bg-sky-50/80 hover:bg-sky-50 border-l-2 border-l-sky-600 cursor-pointer'
                            : theme === 'dark'
                              ? 'hover:bg-gray-800/40 text-gray-300 cursor-pointer'
                              : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                          }`}
                      >
                        {/* Selection Checkbox */}
                        <td className="px-3 text-center">
                          {noEqu ? (
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center mx-auto border border-red-500/30 bg-red-500/10 text-red-400"
                              title="Sin Equivalencia no se puede seleccionar"
                            >
                              <Lock className="w-2.5 h-2.5" />
                            </div>
                          ) : (
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center transition-colors mx-auto ${isSelected
                                ? 'bg-sky-500 border border-sky-500 text-black'
                                : theme === 'dark'
                                  ? 'border border-gray-700 bg-gray-900/60'
                                  : 'border border-slate-300 bg-white'
                                }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          )}
                        </td>

                        {/* CODIGO_SAP */}
                        <td className="px-3 mono font-semibold text-sky-500 whitespace-nowrap text-xs">
                          {item.ItemCode}
                        </td>

                        {/* DESCRIPCION */}
                        <td className={`px-4 font-medium text-xs truncate max-w-[200px] ${theme === 'dark' ? 'text-gray-300' : 'text-slate-800'
                          }`} title={item.ItemName}>
                          {item.ItemName}
                        </td>

                        {/* ACTIVO */}
                        <td className="px-3 text-center">
                          <input type="checkbox" checked={item.Activo !== false} readOnly className="pointer-events-none w-3.5 h-3.5 accent-sky-500" />
                        </td>

                        {/* LOTE / SERIE */}
                        <td className="px-3 whitespace-nowrap">
                          {isLote ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold mono inline-flex items-center space-x-1 ${theme === 'dark'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-amber-50 text-amber-800 border border-amber-300 shadow-sm'
                                }`}
                            >
                              <Hash className="w-3 h-3 text-amber-400" />
                              <span>Lote</span>
                            </span>
                          ) : isSerie ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold mono inline-flex items-center space-x-1 ${theme === 'dark'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-sky-50 text-sky-800 border border-sky-300 shadow-sm'
                                }`}
                            >
                              <QrCode className="w-3 h-3 text-sky-400" />
                              <span>Serie</span>
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold mono inline-flex items-center space-x-1 ${theme === 'dark'
                                ? 'bg-gray-800 text-gray-400 border border-gray-700'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                            >
                              <span>Estándar</span>
                            </span>
                          )}
                        </td>

                        {/* DISPONIBLE (Quantity: '.' thousands, ',' decimals) */}
                        <td className="px-3 text-right font-semibold text-xs mono">
                          <span className={item.WarehouseStock > 0 ? (theme === 'dark' ? 'text-gray-200' : 'text-slate-800') : 'text-red-500'}>
                            {formatQuantityPy(item.WarehouseStock)}
                          </span>
                        </td>

                        {/* COST_OTOTAL (Monetary Cost: Guaraníes Gs. - No decimals) */}
                        <td className={`px-3 text-right text-xs mono font-medium ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                          }`}>
                          {formatCurrencyGs(costoTotalVal)}
                        </td>

                        {/* ART_EQUIVALENTE */}
                        <td className="px-3 text-xs mono font-medium whitespace-nowrap">
                          {!item.ArticuloEquivalente || item.ArticuloEquivalente === 'SIN EQUIVALENCIA' ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center space-x-1 ${theme === 'dark'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                              }`}>
                              <Lock className="w-2.5 h-2.5 shrink-0" />
                              <span>SIN EQUIVALENCIA</span>
                            </span>
                          ) : (
                            <span className={theme === 'dark' ? 'text-purple-300' : 'text-purple-700'} title={item.DescEquivalente}>
                              {item.ArticuloEquivalente}
                            </span>
                          )}
                        </td>

                        {/* DESC_EQUIVALENTE */}
                        <td className={`px-3 text-xs font-medium truncate max-w-[200px] ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'
                          }`} title={item.DescEquivalente}>
                          {item.DescEquivalente || ''}
                        </td>

                        {/* VALIDO */}
                        <td className="px-3 text-center">
                          <input type="checkbox" checked={item.Valido !== false} readOnly className="pointer-events-none w-3.5 h-3.5 accent-sky-500" />
                        </td>

                        {/* CANT_EQUIVALENTE (Quantity: '.' thousands, ',' decimals) */}
                        <td className={`px-3 text-right text-xs mono ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'
                          }`}>
                          {formatQuantityPy(item.CantidadEquivalente != null ? item.CantidadEquivalente : item.WarehouseStock)}
                        </td>

                        {/* COST_EQUIV_UNITARIO (Monetary Cost: Guaraníes Gs. - No decimals) */}
                        <td className={`px-3 text-right text-xs mono font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'
                          }`}>
                          {formatCurrencyGs(item.CostoEquivUnitario != null ? item.CostoEquivUnitario : item.AvgStdPrice)}
                        </td>

                        {/* UNIDAD_NEGOCIO */}
                        <td className="px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold mono inline-flex items-center space-x-1 ${theme === 'dark'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-purple-50 text-purple-800 border border-purple-300 shadow-sm'
                            }`}>
                            <span>{item.UnidadNegocio || 'PAPAS'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className={`px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${theme === 'dark'
            ? 'bg-black/40 border-gray-800 text-gray-400'
            : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
            <span>
              Mostrando <strong className={theme === 'dark' ? 'text-gray-200' : 'text-slate-900'}>{filteredItems.length}</strong> artículos en almacén{' '}
              <strong className="text-sky-500 mono font-bold">{selectedWarehouse}</strong>
            </span>

            <div className="flex items-center space-x-3 flex-wrap">
              <span className="mono">
                Componentes Seleccionados:{' '}
                <strong className="text-sky-500 font-bold">{consumedComponentsList.length}</strong>
              </span>

              {/* Botón Desmarcar Todos - Solo se activa cuando se elije un check */}
              <button
                type="button"
                onClick={() => setComponentAllocations({})}
                disabled={consumedComponentsList.length === 0}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center space-x-1.5 transition-all ${consumedComponentsList.length > 0
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 cursor-pointer shadow-sm'
                  : theme === 'dark'
                    ? 'bg-gray-900/40 border-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                title="Desmarcar todos los artículos seleccionados"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>

              {/* Botón ConvertIA */}
              <button
                type="button"
                onClick={handleConvertIA}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-md hover:shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                title="Ejecutar proceso de conversión inteligente"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>ConvertIA</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      <BatchSerialSelectorModal
        item={activeItemForModal}
        isOpen={!!activeItemForModal}
        onClose={() => setActiveItemForModal(null)}
        onConfirm={handleConfirmAllocations}
      />

      {/* ConvertIA Processing Progress Overlay Modal */}
      {isProcessingConvertIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl transition-all ${theme === 'dark' ? 'bg-[#121316] border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-500/20">
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">Ejecutando Proceso ConvertIA</h3>
                <p className="text-xs text-sky-400 font-mono">SAP B1 Service Layer & HANA Engine</p>
              </div>
            </div>

            {/* Counters Badge Bar */}
            <div className={`p-3 rounded-2xl border mb-5 flex items-center justify-between text-xs font-mono ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}>
                  Procesando: <strong className="text-sky-400 font-bold">{convertIAStats.processed} de {convertIAStats.total}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No Procesados: <strong>{convertIAStats.skipped}</strong></span>
              </div>
            </div>

            {/* Animated Workflow Steps */}
            <div className="space-y-3 mb-6">
              {/* Step 1 */}
              <div className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${convertIAStep >= 1
                ? theme === 'dark' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                : theme === 'dark' ? 'bg-gray-900/40 border-gray-800 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                {convertIAStep > 1 ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : convertIAStep === 1 ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-current shrink-0" />
                )}
                <span className="text-xs font-medium">1. Consultar Lotes/Series en SAP HANA (OBTQ / OSRQ)</span>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${convertIAStep >= 2
                ? theme === 'dark' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                : theme === 'dark' ? 'bg-gray-900/40 border-gray-800 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                {convertIAStep > 2 ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : convertIAStep === 2 ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-current shrink-0" />
                )}
                <span className="text-xs font-medium">2. Generar Salida de Mercancías (<code className="font-mono text-sky-400">/InventoryGenExits</code>)</span>
              </div>

              {/* Step 3 */}
              <div className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${convertIAStep >= 3
                ? theme === 'dark' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                : theme === 'dark' ? 'bg-gray-900/40 border-gray-800 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                {convertIAStep > 3 ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : convertIAStep === 3 ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-current shrink-0" />
                )}
                <span className="text-xs font-medium">3. Generar Entrada de Mercancías (<code className="font-mono text-sky-400">/InventoryGenEntries</code>)</span>
              </div>

              {/* Step 4 */}
              <div className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${convertIAStep >= 4
                ? theme === 'dark' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                : theme === 'dark' ? 'bg-gray-900/40 border-gray-800 text-gray-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                {convertIAStep === 4 ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-current shrink-0" />
                )}
                <span className="text-xs font-medium">4. Vinculación de Referencia (<code className="font-mono text-sky-400">PATCH /InventoryGenEntries</code>)</span>
              </div>
            </div>

            <p className="text-[11px] text-center opacity-70 animate-pulse">
              Por favor espere mientras SAP B1 procesa los documentos y referencias cruzadas...
            </p>
          </div>
        </div>
      )}

      {/* ConvertIA Result Completion Modal */}
      {convertIAResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl transition-all ${theme === 'dark' ? 'bg-[#151619] border-gray-800 text-white' : 'bg-[#f0f4f8] border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight text-emerald-400">⚡ Proceso ConvertIA Exitoso</h3>
                <p className="text-xs text-gray-400">Documentos generados y vinculados en SAP B1</p>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Salida */}
              <div className={`p-3.5 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-slate-200'
                }`}>
                <div className="flex items-center space-x-2 text-sky-400 mb-1">
                  <ArrowRight className="w-4 h-4 rotate-45" />
                  <span className="text-xs font-bold uppercase tracking-wider">Salida de Mercancías</span>
                </div>
                <div className="text-xs space-y-1 font-mono">
                  <p>DocNum: <strong className="text-sky-400 text-sm">#{convertIAResultModal.goodsIssueDocNum}</strong></p>
                  <p className="opacity-70">DocEntry: {convertIAResultModal.goodsIssueDocEntry}</p>
                  <p className="opacity-70 text-[11px]">Endpoint: /InventoryGenExits</p>
                </div>
              </div>

              {/* Entrada */}
              <div className={`p-3.5 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-slate-200'
                }`}>
                <div className="flex items-center space-x-2 text-emerald-400 mb-1">
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                  <span className="text-xs font-bold uppercase tracking-wider">Entrada de Mercancías</span>
                </div>
                <div className="text-xs space-y-1 font-mono">
                  <p>DocNum: <strong className="text-emerald-400 text-sm">#{convertIAResultModal.goodsReceiptDocNum}</strong></p>
                  <p className="opacity-70">DocEntry: {convertIAResultModal.goodsReceiptDocEntry}</p>
                  <p className="opacity-70 text-[11px]">Endpoint: /InventoryGenEntries</p>
                </div>
              </div>
            </div>

            {/* DocumentReference Patch Banner - Styled identical to summary counters box */}
            <div className={`p-3.5 rounded-2xl border mb-4 text-xs font-mono space-y-1 ${theme === 'dark' ? 'bg-gray-900/60 border-gray-800 text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
              <div className="flex items-center space-x-2 font-bold">
                <Link2 className="w-4 h-4 text-sky-500" />
                <span>Referencia PATCH Aplicada Exitosamente</span>
              </div>
              <p className="opacity-80 text-[11px]">
                RefDocEntr: {convertIAResultModal.goodsIssueDocEntry} | RefDocNum: #{convertIAResultModal.goodsIssueDocNum} (rot_GoodsIssue)
              </p>
            </div>

            {/* Summary counters */}
            <div className={`p-3 rounded-2xl border mb-6 flex items-center justify-between text-xs font-mono ${theme === 'dark' ? 'bg-gray-900/60 border-gray-800 text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
              <span>Procesados: <strong className="text-emerald-500 font-bold">{convertIAResultModal.processedCount}</strong></span>
              <span>No Procesados: <strong className="text-amber-500 font-bold">{convertIAResultModal.skippedCount}</strong></span>
            </div>

            <button
              onClick={() => setConvertIAResultModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
            >
              Aceptar y Recargar Inventario
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Notification for ConvertIA button */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div className={`p-4 rounded-2xl border shadow-2xl flex items-start space-x-3 max-w-md backdrop-blur-md transition-all ${toastMessage.type === 'success'
            ? theme === 'dark'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-200/50'
            : theme === 'dark'
              ? 'bg-sky-950/90 border-sky-500/40 text-sky-200'
              : 'bg-sky-50 border-sky-300 text-sky-900 shadow-sky-200/50'
            }`}>
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm tracking-tight">{toastMessage.title}</h4>
              <p className="text-xs mt-0.5 leading-relaxed opacity-90">{toastMessage.desc}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-black/20 text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
