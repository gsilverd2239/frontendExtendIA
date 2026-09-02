import React, { useState, useEffect } from 'react';
import { OwhsRecord } from '../types/sap';
import { sapService } from '../services/sapService';
import { 
  Warehouse, 
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
  Building2,
  Tag
} from 'lucide-react';

interface WarehouseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSchema: string;
  theme?: 'dark' | 'light';
}

export const WarehouseManagementModal: React.FC<WarehouseManagementModalProps> = ({
  isOpen,
  onClose,
  activeSchema = 'FG_DESARROLLO',
  theme = 'dark',
}) => {
  const [records, setRecords] = useState<OwhsRecord[]>([]);
  const [selectedSchemaFilter, setSelectedSchemaFilter] = useState<string>(activeSchema);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<OwhsRecord | null>(null);
  const [formWhsCode, setFormWhsCode] = useState<string>('');
  const [formWhsName, setFormWhsName] = useState<string>('');
  const [formEquWhsCode, setFormEquWhsCode] = useState<string>('');
  const [formEquWhsName, setFormEquWhsName] = useState<string>('');
  const [formSchema, setFormSchema] = useState<string>(activeSchema);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete confirmation
  const [recordToDelete, setRecordToDelete] = useState<OwhsRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load records on modal open or schema filter change
  const loadRecords = async (filterSchema: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await sapService.getAdminWarehouses(filterSchema);
      if (res.success && res.data) {
        setRecords(res.data);
      } else {
        setErrorMsg(res.error || 'No se pudieron obtener los almacenes.');
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

  // Filter local search
  const filteredRecords = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      (r.whsCode && r.whsCode.toLowerCase().includes(q)) ||
      (r.whsName && r.whsName.toLowerCase().includes(q)) ||
      (r.equWhsCode && r.equWhsCode.toLowerCase().includes(q)) ||
      (r.equWhsName && r.equWhsName.toLowerCase().includes(q)) ||
      (r.Schema && r.Schema.toLowerCase().includes(q))
    );
  });

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormWhsCode('');
    setFormWhsName('');
    setFormEquWhsCode('');
    setFormEquWhsName('');
    setFormSchema(selectedSchemaFilter === 'ALL' ? activeSchema : selectedSchemaFilter);
    setIsFormOpen(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Open Form for Editing
  const handleOpenEdit = (rec: OwhsRecord) => {
    setEditingRecord(rec);
    setFormWhsCode(rec.whsCode);
    setFormWhsName(rec.whsName);
    setFormEquWhsCode(rec.equWhsCode);
    setFormEquWhsName(rec.equWhsName);
    setFormSchema(rec.Schema || activeSchema);
    setIsFormOpen(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Save Record (Insert or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWhsCode.trim()) {
      setErrorMsg('El código del almacén es obligatorio.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload: OwhsRecord = {
      whsCode: formWhsCode.trim(),
      whsName: formWhsName.trim(),
      equWhsCode: formEquWhsCode.trim(),
      equWhsName: formEquWhsName.trim(),
      Schema: formSchema.trim() || activeSchema,
    };

    try {
      if (editingRecord) {
        // Update
        const res = await sapService.updateAdminWarehouse(
          payload,
          editingRecord.whsCode,
          editingRecord.Schema
        );
        if (res.success) {
          setSuccessMsg(`Almacén '${payload.whsCode}' actualizado con éxito.`);
          setIsFormOpen(false);
          loadRecords(selectedSchemaFilter);
        } else {
          setErrorMsg(res.error || 'Error al actualizar almacén.');
        }
      } else {
        // Insert
        const res = await sapService.createAdminWarehouse(payload);
        if (res.success) {
          setSuccessMsg(`Almacén '${payload.whsCode}' creado con éxito.`);
          setIsFormOpen(false);
          loadRecords(selectedSchemaFilter);
        } else {
          setErrorMsg(res.error || 'Error al crear almacén.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando datos.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete
  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const res = await sapService.deleteAdminWarehouse(recordToDelete.whsCode, recordToDelete.Schema);
      if (res.success) {
        setSuccessMsg(`Almacén '${recordToDelete.whsCode}' eliminado correctamente.`);
        setRecordToDelete(null);
        loadRecords(selectedSchemaFilter);
      } else {
        setErrorMsg(res.error || 'Error al eliminar almacén.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error eliminando almacén.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div 
        className={`w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] ${
          theme === 'dark'
            ? 'bg-[#121316] border-gray-800 text-gray-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          theme === 'dark' ? 'border-gray-800 bg-[#16181e]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Gestión de Almacenes</h2>
              {/* <p className="text-xs text-gray-400 font-mono">
                 Mapeo en base de datos PostgreSQL <span className="text-sky-400">convertia."OWHS"</span>
               </p> */}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search & Filter */}
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre o esquema..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-800 text-gray-100 placeholder-gray-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Schema selector filter */}
              <div className="flex items-center space-x-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={selectedSchemaFilter}
                  onChange={(e) => setSelectedSchemaFilter(e.target.value)}
                  className={`py-1.5 px-2 text-xs rounded-xl border font-mono ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-800 text-gray-200'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value={activeSchema}>Esquema: {activeSchema}</option>
                  <option value="FG_DESARROLLO">FG_DESARROLLO</option>
                  <option value="FG_PROD">FG_PROD</option>
                  <option value="ALL">Ver Todos</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => loadRecords(selectedSchemaFilter)}
                title="Recargar datos"
                className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'border-gray-800 text-gray-300 hover:bg-gray-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-black font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Almacén</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className={`rounded-xl border overflow-hidden ${
            theme === 'dark' ? 'border-gray-800/80 bg-gray-950/40' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                  theme === 'dark'
                    ? 'bg-gray-900/80 text-gray-400 border-gray-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Código (whsCode)</th>
                    <th className="py-3 px-4">Nombre (whsName)</th>
                    <th className="py-3 px-4">Cód. Equiv. (equWhsCode)</th>
                    <th className="py-3 px-4">Nom. Equiv. (equWhsName)</th>
                    <th className="py-3 px-4">Esquema</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono text-[12px] ${
                  theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'
                }`}>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                          <span className="text-gray-400 text-xs font-sans">Consultando convertia."OWHS"...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 font-sans">
                        No se encontraron almacenes registrados en PostgreSQL para el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, idx) => (
                      <tr 
                        key={`${rec.whsCode}-${rec.Schema}-${idx}`}
                        className={`transition-colors ${
                          theme === 'dark' ? 'hover:bg-gray-800/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-bold text-sky-400">
                          {rec.whsCode}
                        </td>
                        <td className="py-2.5 px-4 font-sans font-medium">
                          {rec.whsName || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400">
                          {rec.equWhsCode || '-'}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-gray-400">
                          {rec.equWhsName || '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                            {rec.Schema}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Editar almacén"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setRecordToDelete(rec)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Eliminar almacén"
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
        </div>

        {/* Footer info */}
        <div className={`px-6 py-3 border-t text-[11px] text-gray-400 flex items-center justify-between ${
          theme === 'dark' ? 'border-gray-800 bg-[#16181e]' : 'border-slate-200 bg-slate-50'
        }`}>
          <span>Total: <strong className="text-sky-400 font-mono">{filteredRecords.length}</strong> registros</span>
          <span>Sugerencia: El esquema actual es <strong className="text-sky-400 font-mono">{activeSchema}</strong></span>
        </div>
      </div>

      {/* Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 ${
            theme === 'dark' ? 'bg-[#16181e] border-gray-800 text-gray-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>{editingRecord ? 'Editar Almacén' : 'Nuevo Almacén'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Código de Almacén (whsCode) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. ALM-01"
                  value={formWhsCode}
                  onChange={(e) => setFormWhsCode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Nombre de Almacén (whsName)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Almacén Central Producción"
                  value={formWhsName}
                  onChange={(e) => setFormWhsName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Cód. Equiv. (equWhsCode)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. ALM-VEN"
                    value={formEquWhsCode}
                    onChange={(e) => setFormEquWhsCode(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Nom. Equiv. (equWhsName)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Almacén Ventas"
                    value={formEquWhsName}
                    onChange={(e) => setFormEquWhsName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-400">
                    Esquema (Schema)
                  </label>
                  <span className="text-[10px] text-sky-400 font-mono">
                    Sugerido: {activeSchema}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Ej. FG_DESARROLLO"
                  value={formSchema}
                  onChange={(e) => setFormSchema(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-black font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-sky-500/20"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Guardar Almacén</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${
            theme === 'dark' ? 'bg-[#16181e] border-gray-800 text-gray-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold">¿Eliminar Almacén?</h3>
              <p className="text-xs text-gray-400 mt-1">
                Está a punto de eliminar el almacén <strong className="text-sky-400 font-mono">{recordToDelete.whsCode}</strong> del esquema <span className="font-mono">{recordToDelete.Schema}</span> en convertia."OWHS".
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all shadow-md shadow-red-500/20 flex items-center space-x-1"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
