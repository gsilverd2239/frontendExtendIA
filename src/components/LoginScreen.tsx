import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../config/api";
import { 
  Database, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Server, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ShieldCheck, 
  Boxes, 
  ArrowRight,
  Sun, 
  Moon,
  Plus,
  Edit3,
  ListFilter,
  Factory
} from "lucide-react";
import { SapConfig, SapUser, SapSchema, SAPSession, SapServer } from "../types/sap";

interface LoginScreenProps {
  onLoginSuccess: (user: SapUser, session?: SAPSession) => void;
  theme?: "dark" | "light";
  toggleTheme?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const DEFAULT_SCHEMAS: SapSchema[] = [
  { DbName: "SBODEMOMX", cpnyName: "SAP B1 Demostración US S.A.", version: "10.0 Demo", dbType: "HANA" },
  { DbName: "SBODEMOUS", cpnyName: "SAP B1 Demonstration Company US", version: "10.0 Demo", dbType: "SQLServer" },
];

const getInitialSchemas = (): SapSchema[] => {
  try {
    const savedCustom = localStorage.getItem("sap_custom_schemas");
    if (savedCustom) {
      const parsed: SapSchema[] = JSON.parse(savedCustom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read cached schemas", e);
  }
  return [];
};

export default function LoginScreen({ 
  onLoginSuccess, 
  theme = "dark", 
  toggleTheme,
  isModal = false,
  onClose 
}: LoginScreenProps) {
  // Credentials State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<string>(() => {
    return localStorage.getItem("tandempro_schema") || localStorage.getItem("convertia_schema") || "SBO_TANDEMPRO_PROD";
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Manual / Custom Schema input toggle
  const [isManualSchemaMode, setIsManualSchemaMode] = useState(false);
  const [manualSchemaText, setManualSchemaText] = useState("");

  // SAP Server Configuration State
  const [config, setConfig] = useState<SapConfig>({
    serviceLayerUrl: "https://172.19.0.88:50000/b1s/v1",
    hanaServer: "172.19.0.88:30015",
    hanaUser: "SYSTEM",
    hanaPassword: "Admin123",
    isSandbox: false,
  });

  // UI State
  const [schemas, setSchemas] = useState<SapSchema[]>(getInitialSchemas);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSchemas, setIsFetchingSchemas] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" | "info" | null }>({ 
    text: "", 
    type: null 
  });

  // Add new schema state inside Settings
  const [newDbName, setNewDbName] = useState("");
  const [newCpnyName, setNewCpnyName] = useState("");
  const [isAddingSchema, setIsAddingSchema] = useState(false);

  // SAP Servers (from convertia.DBINSTANCES via Postgres)
  const [servers, setServers] = useState<SapServer[]>([]);
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [isFetchingServers, setIsFetchingServers] = useState(false);

  // Accordion state & input refs for login flow
  const [isSchemaExpanded, setIsSchemaExpanded] = useState(false);
  const userInputRef = React.useRef<HTMLInputElement>(null);

  // Helper to apply selected server credentials to config
  const applyServerConfig = (srv: SapServer) => {
    const updated: SapConfig = {
      serviceLayerUrl: srv.ServiceLayer || "https://172.19.0.88:50000/b1s/v1",
      hanaServer: srv.ServerHanaPort || "172.19.0.88:30015",
      hanaUser: srv.HanaUser || "SYSTEM",
      hanaPassword: srv.HanaPassword || "Admin123",
      isSandbox: false,
    };
    setConfig(updated);
    fetch(getApiUrl("/api/config"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch((err) => console.warn("Error actualizando config en backend:", err));
  };

  // Load Saved Settings & Servers on Mount
  useEffect(() => {
    // Fetch DBINSTANCES servers from Postgres
    setIsFetchingServers(true);
    fetch(getApiUrl("/api/sap/servers"))
      .then((res) => res.json())
      .then((data: SapServer[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setServers(data);
          const savedServerName = localStorage.getItem("convertia_selected_server");
          const matched = data.find((s) => s.ServerName === savedServerName) || data[0];
          if (matched) {
            setSelectedServerName(matched.ServerName);
            applyServerConfig(matched);
          }
        }
      })
      .catch((err) => console.error("Error cargando servidores desde Postgres DBINSTANCES:", err))
      .finally(() => setIsFetchingServers(false));

    // Load config from backend
    fetch(getApiUrl("/api/config"))
      .then((res) => res.json())
      .then((data) => {
        if (data) setConfig(data);
      })
      .catch((err) => console.error("Error cargando config:", err));

    // Load credentials from localStorage if remembered
    const savedUser = localStorage.getItem("tandempro_user") || localStorage.getItem("convertia_user");
    const savedPass = localStorage.getItem("tandempro_pass") || localStorage.getItem("convertia_pass");
    const savedSchema = localStorage.getItem("tandempro_schema") || localStorage.getItem("convertia_schema");
    const savedRemember = localStorage.getItem("tandempro_remember") || localStorage.getItem("convertia_remember");

    if (savedSchema) {
      setSelectedSchema(savedSchema);
      setManualSchemaText(savedSchema);
    }

    if (savedRemember === "true" || savedRemember === null) {
      setRememberMe(true);
      if (savedUser) setUsername(savedUser);
      else setUsername("manager");
      if (savedPass) setPassword(savedPass);
      else setPassword("B1Admin2024*");
    } else {
      setRememberMe(false);
      setUsername("");
      setPassword("");
    }
  }, []);

  // Fetch Schemas whenever config mode changes (or on mount)
  useEffect(() => {
    loadSchemas(false);
  }, [config.isSandbox, config.hanaServer, config.serviceLayerUrl]);

  const loadSchemas = async (forceScan = false) => {
    setIsFetchingSchemas(true);
    if (forceScan) {
      setMessage({ text: "Consultando servidores SAP (Service Layer / SLD / HANA)...", type: "info" });
    }

    try {
      const res = await fetch(getApiUrl(`/api/sap/schemas${forceScan ? "?scan=true" : ""}`));
      if (res.ok) {
        const data: SapSchema[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge with any custom local schemas
          const customSaved = localStorage.getItem("sap_custom_schemas");
          let mergedList = [...data];
          if (customSaved) {
            try {
              const parsed: SapSchema[] = JSON.parse(customSaved);
              parsed.forEach((p) => {
                if (!mergedList.some((m) => m.DbName.toUpperCase() === p.DbName.toUpperCase())) {
                  mergedList.unshift(p);
                }
              });
            } catch (e) {}
          }

          setSchemas(mergedList);

          // Restore saved schema or keep current selected
          const savedSchema = localStorage.getItem("tandempro_schema") || localStorage.getItem("convertia_schema") || selectedSchema;
          const schemaExists = mergedList.some((s) => s.DbName === savedSchema);
          if (schemaExists && savedSchema) {
            setSelectedSchema(savedSchema);
          } else if (mergedList.length > 0 && !selectedSchema) {
            setSelectedSchema(mergedList[0].DbName);
          }

          if (forceScan) {
            setMessage({ text: `Se cargaron ${mergedList.length} esquemas de bases de datos SAP.`, type: "success" });
            setTimeout(() => setMessage({ text: "", type: null }), 3500);
          }
        }
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err: any) {
      console.warn("Notice: Fetching schemas encountered an issue:", err.message);
      // Keep existing fallback schemas without blocking the user
      if (schemas.length === 0) {
        setSchemas(DEFAULT_SCHEMAS);
      }
      if (forceScan) {
        setMessage({ text: "No se pudieron obtener nuevos esquemas en vivo. Mostrando esquemas registrados.", type: "error" });
        setTimeout(() => setMessage({ text: "", type: null }), 4000);
      }
    } finally {
      setIsFetchingSchemas(false);
    }
  };

  const handleAddCustomSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;

    setIsAddingSchema(true);
    const dbName = newDbName.trim();
    const cpnyName = newCpnyName.trim() || dbName;

    try {
      const res = await fetch(getApiUrl("/api/sap/schemas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DbName: dbName, cpnyName }),
      });

      const data = await res.json();
      if (res.ok && data.schemas) {
        setSchemas(data.schemas);
      } else {
        // Local update
        const updated = [{ DbName: dbName, cpnyName, version: "10.0", dbType: "HANA" as const }, ...schemas];
        setSchemas(updated);
      }

      // Persist in localStorage custom list
      try {
        const customSaved = localStorage.getItem("sap_custom_schemas");
        const list: SapSchema[] = customSaved ? JSON.parse(customSaved) : [];
        if (!list.some((item) => item.DbName.toUpperCase() === dbName.toUpperCase())) {
          list.unshift({ DbName: dbName, cpnyName, version: "10.0", dbType: "HANA" });
          localStorage.setItem("sap_custom_schemas", JSON.stringify(list));
        }
      } catch (err) {}

      setSelectedSchema(dbName);
      localStorage.setItem("tandempro_schema", dbName);
      localStorage.setItem("convertia_schema", dbName);

      setNewDbName("");
      setNewCpnyName("");
      setMessage({ text: `Esquema "${dbName}" agregado y seleccionado exitosamente.`, type: "success" });
      setTimeout(() => setMessage({ text: "", type: null }), 3000);
    } catch (err: any) {
      setMessage({ text: `Error al agregar esquema: ${err.message}`, type: "error" });
    } finally {
      setIsAddingSchema(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "Guardando configuración de servidores SAP...", type: "info" });
    try {
      const res = await fetch(getApiUrl("/api/config"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ text: "Configuración actualizada. Recargando esquemas SAP...", type: "success" });
        await loadSchemas(true);
        setTimeout(() => setMessage({ text: "", type: null }), 3000);
      } else {
        throw new Error("No se pudo guardar la configuración");
      }
    } catch (err: any) {
      setMessage({ text: `Error al guardar: ${err.message}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSchema = isManualSchemaMode ? manualSchemaText.trim() : selectedSchema;

    if (!username.trim() || !password || !effectiveSchema) {
      setMessage({ text: "Por favor complete usuario, contraseña y esquema SAP.", type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "Conectando al Service Layer de SAP Business One...", type: "info" });

    try {
      const res = await fetch(getApiUrl("/api/sap/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          schema: effectiveSchema,
          serviceLayerUrl: config.serviceLayerUrl,
          isSandbox: config.isSandbox,
          hanaServer: config.hanaServer,
          hanaUser: config.hanaUser,
          hanaPassword: config.hanaPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ text: "¡Autenticación exitosa con SAP Business One!", type: "success" });

        // Save to localStorage if rememberMe is enabled
        if (rememberMe) {
          localStorage.setItem("tandempro_user", username);
          localStorage.setItem("tandempro_pass", password);
          localStorage.setItem("tandempro_remember", "true");
          localStorage.setItem("convertia_user", username);
          localStorage.setItem("convertia_pass", password);
          localStorage.setItem("convertia_remember", "true");
        } else {
          localStorage.removeItem("tandempro_user");
          localStorage.removeItem("tandempro_pass");
          localStorage.setItem("tandempro_remember", "false");
          localStorage.removeItem("convertia_user");
          localStorage.removeItem("convertia_pass");
          localStorage.setItem("convertia_remember", "false");
        }

        // Schema is ALWAYS remembered
        if (effectiveSchema) {
          localStorage.setItem("tandempro_schema", effectiveSchema);
          localStorage.setItem("convertia_schema", effectiveSchema);
        }

        setTimeout(() => {
          onLoginSuccess(data.user, data.session);
        }, 800);
      } else {
        setMessage({ 
          text: data.error || "Fallo en la conexión. Verifique sus credenciales o active el modo Sandbox.", 
          type: "error" 
        });
      }
    } catch (err: any) {
      setMessage({ text: `Error de red: ${err.message}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const activeSchemaObj = schemas.find((s) => s.DbName === selectedSchema);

  return (
    <div 
      id="login_fullscreen" 
      className={`${isModal ? 'fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md' : 'min-h-screen'} flex items-center justify-center overflow-hidden font-sans transition-colors duration-150 ${
        theme === "dark" 
          ? "bg-[#0B0C10] text-gray-100" 
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Theme Toggle Button (if provided) */}
      {toggleTheme && (
        <button
          onClick={toggleTheme}
          type="button"
          className={`absolute top-4 right-4 p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-center z-50 ${
            theme === "dark"
              ? "bg-[#151619] border-[#1F2937] hover:bg-gray-800 text-gray-300 shadow-md"
              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
          }`}
          title={theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
        >
          {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-600" />}
        </button>
      )}

      {/* Abstract Grid background for a high-tech corporate appearance */}
      <div className={`absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none transition-opacity duration-150 ${
        theme === "dark"
          ? "bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] opacity-25"
          : "bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] opacity-30"
      }`}></div>

      {/* Decorative Ambient Lights */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-150 ${theme === "dark" ? "bg-sky-500/10" : "bg-sky-500/5"}`}></div>
      <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-150 ${theme === "dark" ? "bg-teal-500/10" : "bg-teal-500/5"}`}></div>

      <div className="relative w-full max-w-5xl px-4 py-8 flex flex-col md:flex-row gap-8 lg:gap-12 items-center justify-center z-10">
        
        {/* Left Side: Brand presentation and current version */}
        <div className="flex-1 text-left hidden md:block max-w-md">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Active connection status pill */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono mb-4 transition-colors duration-150 ${
              theme === "dark"
                ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                : "border-sky-500/20 bg-sky-50 text-sky-700"
            }`}>
              {/* <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              <span>SBO Service Layer Conectado</span> */}
            </div>

            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-sky-500/25">
                E
              </div>
              <h1 className={`text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}>
                Extend<span className="text-sky-400">IA</span>
              </h1>
            </div>

            <p className={`mt-3 text-sm leading-relaxed ${
              theme === "dark" ? "text-gray-400" : "text-slate-600"
            }`}>
              La extensión inteligente para<strong className={theme === "dark" ? "text-gray-200" : "text-slate-800"}></strong> el sistema <strong className={theme === "dark" ? "text-sky-400" : "text-sky-600"}>SAP Business One</strong>.
            </p>
            
            <div className={`mt-6 space-y-3 font-mono text-xs ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Salida de Mercancías </span>
              </div>
              <div className="flex items-center gap-3">
                <Boxes className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Entrada de Mercancías </span>
              </div>
              <div className="flex items-center gap-3">
                <Factory className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Ordenes de Producción </span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Validación de Lotes </span>
              </div>
            </div>
            
            <div className={`mt-8 pt-5 border-t text-[11px] font-mono flex justify-between ${
              theme === "dark" ? "border-[#1F2937] text-gray-500" : "border-slate-200 text-slate-400"
            }`}>
              <span>TI Grupo Pettengill</span>
              <span>v10.0 (HANA)</span>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Centered Credentials Form Modal */}
        <motion.div
          id="login_modal_container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden transition-all duration-150 ${
            theme === "dark" 
              ? "bg-[#151619] border-[#1F2937] shadow-black/80" 
              : "bg-white border-slate-200 shadow-slate-200/50"
          }`}
        >
          {/* Header */}
          <div className={`p-5 border-b flex items-center justify-between transition-colors duration-150 ${
            theme === "dark" 
              ? "border-[#1F2937] bg-black/40" 
              : "border-slate-200 bg-slate-50/70"
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-black font-bold text-base shadow-sm">
                E
              </div>
              <div>
                <h2 className={`text-base font-bold flex items-center gap-1.5 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  Extend<span className="text-sky-400">IA</span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase ml-1">
                    B1 Service Layer
                  </span>
                </h2>
                <p className={`text-[11px] ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                  Seleccione el esquema y credenciales de SAP
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Botón Ajustes ocultado por requerimiento (cargado automáticamente desde Postgres DBINSTANCES) */}
              {/* 
              <button
                onClick={() => setShowConfig(!showConfig)}
                type="button"
                className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                  showConfig 
                    ? "bg-sky-500/20 border-sky-500/40 text-sky-300" 
                    : theme === "dark"
                    ? "bg-gray-900/60 border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                    : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-800"
                }`}
                title="Configurar conexión con el servidor SAP"
                id="btn_toggle_config"
              >
                <Settings className="h-4 w-4" />
                <span className="text-[11px] font-medium">Ajustes</span>
              </button>
              */}

              {isModal && onClose && (
                <button
                  onClick={onClose}
                  type="button"
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Alert messages inside modal */}
          <AnimatePresence>
            {message.text && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`px-5 py-3 border-b text-xs flex items-center gap-2.5 ${
                  message.type === "error" 
                    ? (theme === "dark" ? "bg-rose-950/40 border-rose-800/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700")
                    : message.type === "success"
                    ? (theme === "dark" ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700")
                    : (theme === "dark" ? "bg-sky-950/40 border-sky-800/40 text-sky-300" : "bg-sky-50 border-sky-200 text-sky-700")
                }`}
              >
                {message.type === "error" ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                ) : message.type === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0 text-sky-400" />
                )}
                <span className="leading-snug">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sliding panel for DB, Service Layer Config & Schema Management */}
          <AnimatePresence>
            {showConfig && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-5 space-y-4 border-b transition-colors duration-150 ${
                  theme === "dark" ? "bg-black/60 border-[#1F2937]" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${
                    theme === "dark" ? "text-sky-400" : "text-sky-600"
                  }`}>
                    <Server className="h-3.5 w-3.5" /> Parámetros del Servidor SAP
                  </h3>
                  <button
                    type="button"
                    onClick={() => loadSchemas(true)}
                    disabled={isFetchingSchemas}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition flex items-center gap-1 cursor-pointer"
                    title="Escanear esquemas en servidor SAP"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingSchemas ? "animate-spin" : ""}`} />
                    <span>Escanear Esquemas</span>
                  </button>
                </div>
                
                {/* Operation Mode */}
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                    Modo de Operación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, isSandbox: false })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        !config.isSandbox 
                          ? "bg-sky-500 text-black font-bold shadow-sm" 
                          : theme === "dark" ? "bg-gray-800/80 text-gray-400 hover:bg-gray-800" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      Service Layer Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, isSandbox: true })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        config.isSandbox 
                          ? "bg-sky-500 text-black font-bold shadow-sm" 
                          : theme === "dark" ? "bg-gray-800/80 text-gray-400 hover:bg-gray-800" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      Simulador Sandbox
                    </button>
                  </div>
                </div>

                {!config.isSandbox && (
                  <form onSubmit={handleSaveConfig} className="space-y-3">
                    <div>
                      <label className={`block text-[10px] font-mono uppercase ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                        Service Layer URL
                      </label>
                      <input
                        type="text"
                        className={`mt-1 w-full text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono border transition ${
                          theme === "dark" ? "bg-gray-900 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800"
                        }`}
                        value={config.serviceLayerUrl}
                        onChange={(e) => setConfig({ ...config, serviceLayerUrl: e.target.value })}
                        placeholder="https://172.19.0.88:50000/b1s/v1"
                        required
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-mono uppercase ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                        Servidor HANA (IP:Port)
                      </label>
                      <input
                        type="text"
                        className={`mt-1 w-full text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono border transition ${
                          theme === "dark" ? "bg-gray-900 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800"
                        }`}
                        value={config.hanaServer}
                        onChange={(e) => setConfig({ ...config, hanaServer: e.target.value })}
                        placeholder="172.19.0.88:30015"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-[10px] font-mono uppercase ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                          HANA User
                        </label>
                        <input
                          type="text"
                          className={`mt-1 w-full text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono border transition ${
                            theme === "dark" ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          value={config.hanaUser}
                          onChange={(e) => setConfig({ ...config, hanaUser: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-mono uppercase ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                          HANA Password
                        </label>
                        <input
                          type="password"
                          className={`mt-1 w-full text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono border transition ${
                            theme === "dark" ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          value={config.hanaPassword || ""}
                          onChange={(e) => setConfig({ ...config, hanaPassword: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-xs bg-sky-500 hover:bg-sky-400 text-black font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <span>Guardar Parámetros</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-panel to Register Custom Schema */}
                <div className={`pt-3 border-t ${theme === "dark" ? "border-gray-800" : "border-slate-200"}`}>
                  <h4 className={`text-[11px] font-bold font-mono flex items-center gap-1.5 mb-2 ${theme === "dark" ? "text-gray-300" : "text-slate-700"}`}>
                    <Plus className="h-3.5 w-3.5 text-sky-400" /> Registrar Esquema / Base de Datos
                  </h4>
                  <form onSubmit={handleAddCustomSchema} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre BD (ej. SBO_PETTENGILL_PROD)"
                        value={newDbName}
                        onChange={(e) => setNewDbName(e.target.value)}
                        className={`text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono border transition ${
                          theme === "dark" ? "bg-gray-900 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800"
                        }`}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Nombre Empresa (Opcional)"
                        value={newCpnyName}
                        onChange={(e) => setNewCpnyName(e.target.value)}
                        className={`text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 border transition ${
                          theme === "dark" ? "bg-gray-900 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isAddingSchema || !newDbName.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Añadir Esquema a la Lista</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Login Credentials Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            
            {/* Server Selector Accordion Step 1 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              theme === "dark" ? "bg-gray-900/40 border-[#1F2937]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="cbServer" className={`text-xs font-bold flex items-center gap-1.5 ${
                  theme === "dark" ? "text-sky-300" : "text-slate-700"
                }`}>
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                  <Server className="h-3.5 w-3.5 text-sky-400" />
                  <span>Servidor</span>
                </label>

                {isFetchingServers && (
                  <span className="text-[10px] text-sky-400 font-mono flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Cargando...
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  id="cbServer"
                  className={`w-full pl-3.5 pr-8 py-2.5 text-xs font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition border appearance-none cursor-pointer ${
                    theme === "dark" 
                      ? "bg-gray-900 border-[#1F2937] text-white" 
                      : "bg-white border-slate-200 text-slate-800 shadow-sm"
                  }`}
                  value={selectedServerName}
                  onChange={(e) => {
                    const sName = e.target.value;
                    setSelectedServerName(sName);
                    localStorage.setItem("convertia_selected_server", sName);
                    const found = servers.find((s) => s.ServerName === sName);
                    if (found) {
                      applyServerConfig(found);
                      loadSchemas(true);
                    }
                    setIsSchemaExpanded(true);
                  }}
                  onClick={() => {
                    if (!isSchemaExpanded) setIsSchemaExpanded(true);
                  }}
                >
                  {servers.length === 0 ? (
                    <option value="">Consultando DBINSTANCES...</option>
                  ) : (
                    servers.map((srv) => (
                      <option key={srv.ServerName} value={srv.ServerName} className="bg-gray-900 text-white">
                        {srv.ServerName} {srv.Version ? `[v${srv.Version}]` : ''}
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                  ▼
                </div>
              </div>
            </div>

            {/* Schema Selector Accordion Step 2 (desplegable) */}
            <div className={`rounded-xl border transition-all overflow-hidden ${
              theme === "dark" ? "bg-gray-900/40 border-[#1F2937]" : "bg-slate-50 border-slate-200"
            }`}>
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setIsSchemaExpanded(!isSchemaExpanded)}
                className={`w-full p-3.5 flex items-center justify-between text-left cursor-pointer transition-colors ${
                  isSchemaExpanded 
                    ? (theme === "dark" ? "bg-sky-500/10 border-b border-[#1F2937]" : "bg-sky-50 border-b border-slate-200")
                    : "hover:bg-gray-800/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full font-mono text-[11px] flex items-center justify-center font-bold ${
                    isSchemaExpanded ? "bg-sky-500 text-black" : "bg-gray-800 text-gray-400"
                  }`}>2</span>
                  <Database className="h-3.5 w-3.5 text-sky-400" />
                  <span className={`text-xs font-bold ${theme === "dark" ? "text-gray-200" : "text-slate-800"}`}>
                    Esquema
                  </span>
                  {!isSchemaExpanded && selectedSchema && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {selectedSchema}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-gray-400">
                    {isSchemaExpanded ? "Ocultar" : "Desplegar"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {isSchemaExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Accordion Body */}
              <AnimatePresence>
                {isSchemaExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 space-y-2 border-t border-transparent"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                        Seleccione el esquema correspondiente:
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualSchemaMode(!isManualSchemaMode);
                            if (!isManualSchemaMode) {
                              setManualSchemaText(selectedSchema);
                            }
                          }}
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-mono transition flex items-center gap-1 cursor-pointer"
                          title={isManualSchemaMode ? "Cambiar a lista de selección" : "Escribir nombre de base manualmente"}
                        >
                          {isManualSchemaMode ? (
                            <>
                              <ListFilter className="h-3 w-3" />
                              <span>Ver Lista</span>
                            </>
                          ) : (
                            <>
                              <Edit3 className="h-3 w-3" />
                              <span>Escribir Manual</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => loadSchemas(true)}
                          disabled={isFetchingSchemas}
                          className="p-1 rounded text-gray-400 hover:text-sky-400 hover:bg-gray-800 transition cursor-pointer"
                          title="Refrescar esquemas desde el servidor SAP"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isFetchingSchemas ? "animate-spin text-sky-400" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {isManualSchemaMode ? (
                      <div className="relative">
                        <input
                          type="text"
                          id="txtManualSchema"
                          placeholder="ej. SBO_PETTENGILL_PROD"
                          value={manualSchemaText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualSchemaText(val);
                            setSelectedSchema(val);
                            localStorage.setItem("tandempro_schema", val);
                            localStorage.setItem("convertia_schema", val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              userInputRef.current?.focus();
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition border ${
                            theme === "dark" 
                              ? "bg-gray-900 border-[#1F2937] text-white placeholder-gray-600" 
                              : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                          }`}
                          required
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          id="cbSchema"
                          className={`w-full pl-3.5 pr-8 py-2.5 text-xs font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition border appearance-none cursor-pointer ${
                            theme === "dark" 
                              ? "bg-gray-900 border-[#1F2937] text-white" 
                              : "bg-white border-slate-200 text-slate-800 shadow-sm"
                          }`}
                          value={selectedSchema}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__ADD_NEW__") {
                              setShowConfig(true);
                            } else {
                              setSelectedSchema(val);
                              setManualSchemaText(val);
                              if (val) {
                                localStorage.setItem("tandempro_schema", val);
                                localStorage.setItem("convertia_schema", val);
                              }
                              // Auto-focus usuario
                              setTimeout(() => {
                                userInputRef.current?.focus();
                              }, 100);
                            }
                          }}
                        >
                          {schemas.map((schema) => (
                            <option key={schema.DbName} value={schema.DbName} className="bg-gray-900 text-white">
                              {schema.cpnyName} [{schema.DbName}]
                            </option>
                          ))}
                          <option value="__ADD_NEW__" className="bg-gray-800 text-sky-400 font-semibold">
                            ➕ Registrar otro esquema en Ajustes...
                          </option>
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                          ▼
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                      <span className={theme === "dark" ? "text-gray-500" : "text-slate-400"}>
                        Base activa: <span className="text-sky-400 font-semibold">{isManualSchemaMode ? (manualSchemaText || 'No especificada') : (selectedSchema || 'No seleccionada')}</span>
                      </span>
                      {activeSchemaObj && !isManualSchemaMode && (
                        <span className="text-gray-500">{activeSchemaObj.dbType || 'HANA'}</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 3: Usuario SAP */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="txtUser" className={`block text-xs font-semibold flex items-center gap-1.5 ${
                theme === "dark" ? "text-gray-300" : "text-slate-700"
              }`}>
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[11px] flex items-center justify-center font-bold">3</span>
                <span>Usuario</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  ref={userInputRef}
                  id="txtUser"
                  type="text"
                  placeholder="manager"
                  className={`w-full pl-10 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition border ${
                    theme === "dark" 
                      ? "bg-gray-900/90 border-[#1F2937] text-white placeholder-gray-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Input (txtPass) */}
            <div className="space-y-1.5">
              <label htmlFor="txtPass" className={`block text-xs font-semibold ${
                theme === "dark" ? "text-gray-300" : "text-slate-700"
              }`}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  id="txtPass"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition border ${
                    theme === "dark" 
                      ? "bg-gray-900/90 border-[#1F2937] text-white placeholder-gray-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-2.5 p-1 rounded-lg focus:outline-none transition-colors cursor-pointer ${
                    theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle (tswRemember) */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="tswRemember"
                  type="checkbox"
                  className={`rounded focus:ring-0 focus:ring-offset-0 h-4 w-4 accent-sky-500 cursor-pointer ${
                    theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"
                  }`}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
                  Recordar credenciales
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setUsername("manager");
                  setPassword("B1Admin2024*");
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-mono transition-colors"
              >
                Autocompletar Admin
              </button>
            </div>

            {/* Login Action (btnLogin) */}
            <button
              id="btnLogin"
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 mt-2 font-bold rounded-xl transition-all duration-150 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                theme === "dark"
                  ? "bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/20 hover:shadow-sky-500/30"
                  : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 hover:shadow-sky-600/30"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Modal Footer with metadata version checks */}
          <div className={`px-6 py-3.5 border-t flex items-center justify-between text-[11px] font-mono ${
            theme === "dark" ? "border-[#1F2937] bg-black/40 text-gray-500" : "border-slate-200 bg-slate-50 text-slate-400"
          }`}>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>REST Service Layer</span>
            </span>
            <span>HANA </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}