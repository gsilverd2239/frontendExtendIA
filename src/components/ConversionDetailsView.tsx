import React, { useState, useEffect } from 'react';
import { Calendar, Search, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { sapService } from '../services/sapService';

interface ConversionDetailsViewProps {
  theme?: 'dark' | 'light';
}

type DateFilter = 'hoy' | 'ayer' | 'semana' | 'mes' | '7dias' | '15dias' | '30dias';

export const ConversionDetailsView: React.FC<ConversionDetailsViewProps> = ({ theme = 'dark' }) => {
  const [activeFilter, setActiveFilter] = useState<DateFilter>('hoy');
  const [conversions, setConversions] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  // Helper to format Date to YYYY-MM-DD
  const formatDate = (date: Date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  const calculateDateRange = (filter: DateFilter): { startDate: string, endDate: string } => {
    const end = new Date();
    let start = new Date();

    switch (filter) {
      case 'hoy':
        // same day
        break;
      case 'ayer':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'semana':
        // Sunday is 0, so subtract day of week to get to Sunday
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        break;
      case 'mes':
        start.setDate(1);
        break;
      case '7dias':
        start.setDate(start.getDate() - 7);
        break;
      case '15dias':
        start.setDate(start.getDate() - 15);
        break;
      case '30dias':
        start.setDate(start.getDate() - 30);
        break;
    }
    return { startDate: formatDate(start), endDate: formatDate(end) };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = calculateDateRange(activeFilter);
      const data = await sapService.getHistory(startDate, endDate);
      setConversions(data || []);
      if (data && data.length > 0) {
        // Find if selectedConvId still exists in the new list
        if (!data.find((c: any) => c.nroConv === selectedConvId)) {
          setSelectedConvId(data[0].nroConv);
        }
      } else {
        setSelectedConvId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async (nroConv: number, schema: string) => {
    setIsContinuing(true);
    try {
      const res = await sapService.continueConversion(nroConv, schema);
      if (res.success) {
        toast.success(`Éxito: ${res.message}`);
        await loadData();
      }
    } catch (e: any) {
      toast.error(e.message || 'Error desconocido al continuar');
    } finally {
      setIsContinuing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const filteredConversions = conversions.filter(c =>
    String(c.nroConv).includes(searchTerm) ||
    String(c.DocNumSal).includes(searchTerm) ||
    String(c.DocNumEnt).includes(searchTerm)
  );

  const selectedConv = conversions.find(c => c.nroConv === selectedConvId);
  const salidaDetails = selectedConv?.details?.filter((d: any) => d.Objeto === 'OIGE' || !d.Objeto || d.Objeto === '') || [];
  const entradaDetails = selectedConv?.details?.filter((d: any) => d.Objeto === 'OIGN') || [];

  // En caso de que el backend no haya guardado el "Objeto", asumimos que todos son salida si no hay distincion.
  // Podríamos ajustar esto según la data real.

  const filters: { id: DateFilter; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'ayer', label: 'Ayer' },
    { id: 'semana', label: 'Semana Actual' },
    { id: 'mes', label: 'Mes Actual' },
    { id: '7dias', label: 'Últimos 7 días' },
    { id: '15dias', label: 'Últimos 15 días' },
    { id: '30dias', label: 'Últimos 30 días' },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto">
      {/* Header and Pills */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
              Detalle de Conversiones
            </h3>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
              Consulta y visualiza detalles de salidas y entradas por fechas.
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nro, Doc..."
              className={`border rounded-xl pl-9 pr-4 py-2 text-xs w-64 sm:w-80 focus:outline-none focus:ring-1 focus:ring-sky-500 ${theme === 'dark'
                  ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm'
                }`}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Date Filters (Pills) */}
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${activeFilter === f.id
                  ? theme === 'dark'
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                    : 'bg-sky-100 border-sky-200 text-sky-700'
                  : theme === 'dark'
                    ? 'bg-[#151619] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout (Left: List, Right: Split Details) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Column: List */}
        <div className={`w-full lg:w-1/3 rounded-2xl border overflow-hidden flex flex-col shadow-lg transition-colors ${theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-slate-200/50'
          }`}>
          <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'
            }`}>
            <span className={`text-xs font-bold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
              Conversiones
            </span>
            <span className="text-xs text-sky-500 mono font-bold">{filteredConversions.length} regs</span>
          </div>

          <div className={`divide-y overflow-y-auto flex-1 ${theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'}`}>
            {isLoading && <div className="p-4 text-xs text-center text-gray-500">Cargando...</div>}
            {!isLoading && filteredConversions.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">No hay conversiones para la fecha seleccionada.</div>
            )}
            {!isLoading && filteredConversions.map(conv => (
              <div
                key={conv.nroConv}
                onClick={() => setSelectedConvId(conv.nroConv)}
                className={`p-4 transition-all cursor-pointer ${selectedConvId === conv.nroConv
                    ? theme === 'dark'
                      ? 'bg-sky-500/10 border-l-2 border-l-sky-400'
                      : 'bg-sky-50 border-l-2 border-l-sky-600'
                    : theme === 'dark'
                      ? 'hover:bg-gray-900/50'
                      : 'hover:bg-slate-50'
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold mono text-sky-500">Conv #{conv.nroConv}</span>
                  <span className={`text-[10px] mono ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                    {conv.FechaSalida}
                  </span>
                </div>
                <div className={`text-[11px] space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                  <div className="flex items-center space-x-1">
                    <ArrowUpRight className="w-3 h-3 text-red-400" />
                    <span>Salida: Doc {conv.DocNumSal} ({conv.WhsSal})</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                    <span>Entrada: Doc {conv.DocNumEnt} ({conv.WhsEnt})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Split Top/Bottom Details */}
        <div className="flex-[2] flex flex-col gap-6 min-h-0 relative">
          {selectedConv && (selectedConv.Estado === 'Salida' || selectedConv.Estado === 'Entrada') && (
            <div className="flex flex-col gap-2 shrink-0">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-amber-950/30 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex flex-col">
                  <span className={`text-sm font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>Atención: Conversión Incompleta</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-amber-500/80' : 'text-amber-700/80'}`}>Esta conversión se detuvo en el estado "{selectedConv.Estado}".</span>
                </div>
                <button 
                  onClick={() => handleContinue(selectedConv.nroConv, selectedConv.Schema)}
                  disabled={isContinuing}
                  className={`px-4 py-2 text-xs font-bold rounded shadow transition-all ${isContinuing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} ${theme === 'dark' ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                >
                  {isContinuing ? 'Procesando...' : 'Continuar Proceso'}
                </button>
              </div>
            </div>
          )}
          {selectedConv ? (
            <>
              {/* TOP: Salida de Mercancias (OIGE) */}
              <div className={`flex-1 rounded-2xl border flex flex-col shadow-lg overflow-hidden transition-colors ${theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-red-950/20 border-gray-800' : 'bg-red-50/50 border-slate-200'
                  }`}>
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="w-5 h-5 text-red-500" />
                    <span className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      Salida de Mercancías
                    </span>
                  </div>
                  <span className={`text-xs mono ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    DocNum: {selectedConv.DocNumSal}
                  </span>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`text-[10px] uppercase border-b ${theme === 'dark' ? 'text-gray-500 border-gray-800' : 'text-slate-500 border-slate-200'}`}>
                      <tr>
                        <th className="py-2 px-2">Código</th>
                        <th className="py-2 px-2">Descripción</th>
                        <th className="py-2 px-2 text-right">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'}`}>
                      {salidaDetails.length > 0 ? salidaDetails.map((det: any, idx: number) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-gray-900/40' : 'hover:bg-slate-50'}>
                          <td className="py-2 px-2 mono font-semibold text-sky-500">{det.ItemCode}</td>
                          <td className={`py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{det.Dscription}</td>
                          <td className={`py-2 px-2 text-right mono font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{Number(det.Qty).toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className={`py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>No hay detalles específicos guardados como OIGE.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BOTTOM: Entrada de Mercancias (OIGN) */}
              <div className={`flex-1 rounded-2xl border flex flex-col shadow-lg overflow-hidden transition-colors ${theme === 'dark' ? 'bg-[#151619] border-gray-800' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-emerald-950/20 border-gray-800' : 'bg-emerald-50/50 border-slate-200'
                  }`}>
                  <div className="flex items-center space-x-2">
                    <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                    <span className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Entrada de Mercancías
                    </span>
                  </div>
                  <span className={`text-xs mono ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    DocNum: {selectedConv.DocNumEnt}
                  </span>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`text-[10px] uppercase border-b ${theme === 'dark' ? 'text-gray-500 border-gray-800' : 'text-slate-500 border-slate-200'}`}>
                      <tr>
                        <th className="py-2 px-2">Código</th>
                        <th className="py-2 px-2">Descripción</th>
                        <th className="py-2 px-2 text-right">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'}`}>
                      {entradaDetails.length > 0 ? entradaDetails.map((det: any, idx: number) => (
                        <tr key={idx} className={theme === 'dark' ? 'hover:bg-gray-900/40' : 'hover:bg-slate-50'}>
                          <td className="py-2 px-2 mono font-semibold text-emerald-500">{det.ItemCode}</td>
                          <td className={`py-2 px-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{det.Dscription}</td>
                          <td className={`py-2 px-2 text-right mono font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{Number(det.Qty).toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className={`py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>No hay detalles específicos guardados como OIGN.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className={`flex-1 rounded-2xl border flex items-center justify-center p-12 text-xs ${theme === 'dark' ? 'bg-[#151619] border-gray-800 text-gray-500' : 'bg-white border-slate-200 text-slate-400'
              }`}>
              Seleccione una conversión para ver los detalles de Salida y Entrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
