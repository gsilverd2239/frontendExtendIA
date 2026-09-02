import React, { useState, useEffect } from 'react';
import { SrgcRecord } from '../types/sap';
import { sapService } from '../services/sapService';
import { 
  Database, 
  X, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Building2,
  Check,
  ShieldCheck
} from 'lucide-react';

interface SchemaManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const SchemaManagementModal: React.FC<SchemaManagementModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const [records, setRecords] = useState<SrgcRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<SrgcRecord | null>(null);
  const [formDbName, setFormDbName] = useState<string>('');
  const [formCmpName, setFormCmpName] = useState<string>('');
  const [formCmpStatus, setFormCmpStatus] = useState<string>('A');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete confirmation
  const [recordToDelete, setRecordToDelete] = useState<SrgcRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadRecords = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await sapService.getAdminSchemas();
      if (res.success && res.data) {
        setRecords(res.data);
      } else {
        setErrorMsg(res.error || 'No se pudieron obtener los esquemas.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de comunicación.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      (r.dbName && r.dbName.toLowerCase().includes(q)) ||
      (r.cmpName && r.cmpName.toLowerCase().includes(q)) ||
      (r.cmpStatus && r.cmpStatus.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormDbName('');
    setFormCmpName('');
    setFormCmpStatus('A'); // Recommended status 'A'
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: SrgcRecord) => {
    setEditingRecord(record);
    setFormDbName(record.dbName || '');
    setFormCmpName(record.cmpName || '');
    setFormCmpStatus(record.cmpStatus || 'A');
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDbName.trim()) {
      setErrorMsg('El nombre de la base de datos (dbName) es obligatorio.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload: SrgcRecord = {
      dbName: formDbName.trim(),
      cmpName: formCmpName.trim(),
      cmpStatus: formCmpStatus.trim() || 'A',
    };

    try {
      if (editingRecord) {
        // UPDATE convertia."SRGC" SET "cmpName"=$2, "cmpStatus"=$3 WHERE "dbName"=$1;
        const res = await sapService.updateAdminSchema(payload, editingRecord.dbName);
        if (res.success) {
          setSuccessMsg(`Esquema "${payload.dbName}" actualizado correctamente.`);
          setIsFormOpen(false);
          loadRecords();
        } else {
          setErrorMsg(res.error || 'Error al actualizar el esquema.');
        }
      } else {
        // INSERT INTO convertia."SRGC" ("dbName", "cmpName", "cmpStatus") VALUES ('', '', 'A'::character varying);
        const res = await sapService.createAdminSchema(payload);
        if (res.success) {
          setSuccessMsg(`Esquema "${payload.dbName}" creado correctamente.`);
          setIsFormOpen(false);
          loadRecords();
        } else {
          setErrorMsg(res.error || 'Error al insertar el esquema.');
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
      // DELETE FROM convertia."SRGC" WHERE "dbName"=$1;
      const res = await sapService.deleteAdminSchema(recordToDelete.dbName);
      if (res.success) {
        setSuccessMsg(`Esquema "${recordToDelete.dbName}" eliminado correctamente.`);
        setRecordToDelete(null);
        loadRecords();
      } else {
        setErrorMsg(res.error || 'Error al eliminar el esquema.');
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">Gestión de Esquemas de base de datos</h2>
                 {/* <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                   convertia."SRGC"
                 </span> */}
              </div>
               {/* <p className="text-xs text-gray-400 mt-0.5">
                 Administración de bases de datos y empresas autorizadas en el sistema
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

        {/* Toolbar & Search */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-800/40">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por dbName o cmpName..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  theme === 'dark' 
                    ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500' 
                    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
            <button
              onClick={loadRecords}
              title="Recargar datos de PostgreSQL"
              className={`p-2 border rounded-xl transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Esquema</span>
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
                  <th className="px-4 py-3 font-mono">dbName (Esquema BD)</th>
                  <th className="px-4 py-3">cmpName (Empresa)</th>
                  <th className="px-4 py-3 text-center">cmpStatus (Estado)</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800/60' : 'divide-slate-100'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span>Cargando esquemas desde convertia."SRGC"...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Database className="w-8 h-8 stroke-1 text-gray-500" />
                        <span>No se encontraron esquemas registrados en la tabla.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr 
                      key={record.dbName}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-800/40 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-400">
                        {record.dbName}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {record.cmpName || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border inline-flex items-center space-x-1 ${
                          record.cmpStatus === 'A'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          <span>{record.cmpStatus === 'A' ? 'A (Activo)' : record.cmpStatus}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-indigo-400' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Editar esquema"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(record)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              theme === 'dark' ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-red-600'
                            }`}
                            title="Eliminar esquema"
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
          <span>Total de esquemas registrados: <strong className="text-indigo-400 font-mono">{filteredRecords.length}</strong></span>
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
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editingRecord ? 'Editar Esquema (SRGC)' : 'Nuevo Esquema (SRGC)'}
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
                  Nombre BD / Esquema (dbName) *
                </label>
                <input
                  type="text"
                  required
                  value={formDbName}
                  onChange={(e) => setFormDbName(e.target.value)}
                  placeholder="Ej: FG_DESARROLLO"
                  className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Nombre Empresa (cmpName)
                </label>
                <input
                  type="text"
                  value={formCmpName}
                  onChange={(e) => setFormCmpName(e.target.value)}
                  placeholder="Ej: Frutika S.A."
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Estado (cmpStatus) *
                </label>
                <select
                  value={formCmpStatus}
                  onChange={(e) => setFormCmpStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="A">A - Activo (Recomendado)</option>
                  <option value="I">I - Inactivo</option>
                </select>
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold flex items-center space-x-2 shadow-md hover:opacity-90 transition-all cursor-pointer"
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
              <h3 className="font-bold text-base">Eliminar Esquema</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              ¿Está seguro de que desea eliminar el esquema <strong className="text-white font-mono">{recordToDelete.dbName}</strong> ({recordToDelete.cmpName || 'Sin Nombre'}) de la tabla <code className="text-indigo-400">convertia."SRGC"</code>?
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
