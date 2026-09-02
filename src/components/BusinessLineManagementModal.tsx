import React, { useState, useEffect } from 'react';
import { OprcRecord } from '../types/sap';
import { sapService } from '../services/sapService';
import { 
  Layers, 
  X, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  RefreshCw,
  Database,
  Check
} from 'lucide-react';

interface BusinessLineManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSchema: string;
  theme?: 'dark' | 'light';
}

export const BusinessLineManagementModal: React.FC<BusinessLineManagementModalProps> = ({
  isOpen,
  onClose,
  activeSchema = 'FG_DESARROLLO',
  theme = 'dark',
}) => {
  const [records, setRecords] = useState<OprcRecord[]>([]);
  const [selectedSchemaFilter, setSelectedSchemaFilter] = useState<string>(activeSchema);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<OprcRecord | null>(null);
  const [formPrcCode, setFormPrcCode] = useState<string>('');
  const [formPrcName, setFormPrcName] = useState<string>('');
  const [formSchema, setFormSchema] = useState<string>(activeSchema);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete confirmation
  const [recordToDelete, setRecordToDelete] = useState<OprcRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadRecords = async (filterSchema: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await sapService.getAdminBusinessLines(filterSchema);
      if (res.success && res.data) {
        setRecords(res.data);
      } else {
        setErrorMsg(res.error || 'No se pudieron obtener las líneas de negocio.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de comunicación.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecords(selectedSchemaFilter);
    }
  }, [isOpen, selectedSchemaFilter]);

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      (r.PrcCode && r.PrcCode.toLowerCase().includes(q)) ||
      (r.PrcName && r.PrcName.toLowerCase().includes(q)) ||
      (r.Schema && r.Schema.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormPrcCode('');
    setFormPrcName('');
    setFormSchema(selectedSchemaFilter === 'ALL' ? activeSchema : selectedSchemaFilter);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: OprcRecord) => {
    setEditingRecord(record);
    setFormPrcCode(record.PrcCode || '');
    setFormPrcName(record.PrcName || '');
    setFormSchema(record.Schema || activeSchema);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrcCode.trim()) {
      setErrorMsg('El código de la línea de negocio (PrcCode) es obligatorio.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload: OprcRecord = {
      PrcCode: formPrcCode.trim(),
      PrcName: formPrcName.trim(),
      Schema: formSchema.trim() || activeSchema,
    };

    try {
      if (editingRecord) {
        // UPDATE convertia."OPRC" SET "PrcName"=$1, "Schema"=$2 WHERE "PrcCode"=$3 and "Schema"=$4;
        const res = await sapService.updateAdminBusinessLine(payload, editingRecord.PrcCode, editingRecord.Schema);
        if (res.success) {
          setSuccessMsg(`Línea de negocio "${payload.PrcCode}" actualizada correctamente.`);
          setIsFormOpen(false);
          loadRecords(selectedSchemaFilter);
        } else {
          setErrorMsg(res.error || 'Error al actualizar la línea de negocio.');
        }
      } else {
        // INSERT INTO convertia."OPRC" ("PrcCode", "PrcName", "Schema") VALUES ($1, $2, $3);
        const res = await sapService.createAdminBusinessLine(payload);
        if (res.success) {
          setSuccessMsg(`Línea de negocio "${payload.PrcCode}" creada correctamente.`);
          setIsFormOpen(false);
          loadRecords(selectedSchemaFilter);
        } else {
          setErrorMsg(res.error || 'Error al insertar la línea de negocio.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de procesamiento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      // DELETE FROM convertia."OPRC" WHERE "PrcCode"=$1 and "Schema"=$2;
      const res = await sapService.deleteAdminBusinessLine(recordToDelete.PrcCode, recordToDelete.Schema);
      if (res.success) {
        setSuccessMsg(`Línea de negocio "${recordToDelete.PrcCode}" eliminada correctamente.`);
        setRecordToDelete(null);
        loadRecords(selectedSchemaFilter);
      } else {
        setErrorMsg(res.error || 'Error al eliminar la línea de negocio.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de procesamiento al eliminar.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
        theme === 'dark' ? 'bg-[#151619] border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          theme === 'dark' ? 'border-gray-800/80 bg-black/30' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">Gestión de Líneas de Negocio</h2>
                {/* <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                   convertia."OPRC"
                 </span> */}
              </div>
               {/* <p className="text-xs text-gray-400 mt-0.5">
                 Mantenimiento de centros de costo y líneas de negocio por esquema
              </p> */}
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications & Status Banners */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-800/40">
          <div className="flex items-center space-x-2 w-full sm:w-auto flex-wrap gap-y-2">
            {/* Schema Filter Selector (Recommends active Schema) */}
            <div className="flex items-center space-x-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-gray-400 font-semibold">Esquema:</span>
              <select
                value={selectedSchemaFilter}
                onChange={(e) => setSelectedSchemaFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border font-mono font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer ${
                  theme === 'dark' ? 'bg-gray-900 border-gray-700 text-purple-300' : 'bg-white border-slate-300 text-purple-800'
                }`}
              >
                <option value={activeSchema}>{activeSchema} (Recomendado / Actual)</option>
                <option value="FG_PRODUCCION">FG_PRODUCCION</option>
                <option value="ALL">TODOS LOS ESQUEMAS</option>
              </select>
            </div>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por PrcCode o PrcName..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                  theme === 'dark' 
                    ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500' 
                    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            <button
              onClick={() => loadRecords(selectedSchemaFilter)}
              title="Recargar datos de PostgreSQL"
              className={`p-2 border rounded-xl transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Línea</span>
          </button>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`rounded-2xl border overflow-hidden ${
            theme === 'dark' ? 'border-gray-800 bg-gray-900/30' : 'border-slate-200 bg-white'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`uppercase text-[10px] tracking-wider font-semibold border-b ${
                theme === 'dark' ? 'bg-black/40 text-gray-400 border-gray-800' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <tr>
                  <th className="px-4 py-3 font-mono">PrcCode (Código)</th>
                  <th className="px-4 py-3">PrcName (Nombre Línea)</th>
                  <th className="px-4 py-3 font-mono">Schema (Esquema)</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                        <span>Cargando líneas de negocio desde convertia."OPRC"...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Layers className="w-8 h-8 stroke-1 text-gray-500" />
                        <span>No se encontraron líneas de negocio para el esquema seleccionado.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr 
                      key={`${record.PrcCode}-${record.Schema}`}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-800/40 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-purple-400">
                        {record.PrcCode}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {record.PrcName || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          record.Schema === activeSchema
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}>
                          {record.Schema}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-purple-400' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Editar línea de negocio"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(record)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              theme === 'dark' ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-red-600'
                            }`}
                            title="Eliminar línea de negocio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between text-xs ${
          theme === 'dark' ? 'border-gray-800 bg-black/20 text-gray-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span>Total de líneas en vista: <strong className="text-purple-400 font-mono">{filteredRecords.length}</strong></span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* CREATE / EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#181a20] border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">
                  {editingRecord ? 'Editar Línea de Negocio (OPRC)' : 'Nueva Línea de Negocio (OPRC)'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Código de Línea (PrcCode) *
                </label>
                <input
                  type="text"
                  required
                  value={formPrcCode}
                  onChange={(e) => setFormPrcCode(e.target.value)}
                  placeholder="Ej: PAPAS, JUGOS, DULCES"
                  className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Nombre de Línea de Negocio (PrcName)
                </label>
                <input
                  type="text"
                  value={formPrcName}
                  onChange={(e) => setFormPrcName(e.target.value)}
                  placeholder="Ej: Línea de Papas Fritas"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Esquema / BD (Schema) * (Recomendado: {activeSchema})
                </label>
                <input
                  type="text"
                  required
                  value={formSchema}
                  onChange={(e) => setFormSchema(e.target.value)}
                  placeholder={`Ej: ${activeSchema}`}
                  className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                    theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold flex items-center space-x-2 shadow-md hover:opacity-90 transition-all cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#181a20] border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-3 text-red-400 mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Eliminar Línea</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              ¿Está seguro de que desea eliminar la línea de negocio <strong className="text-white font-mono">{recordToDelete.PrcCode}</strong> ({recordToDelete.PrcName || 'Sin Nombre'}) del esquema <span className="text-purple-400 font-mono">{recordToDelete.Schema}</span>?
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md hover:bg-red-600 transition-colors cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
