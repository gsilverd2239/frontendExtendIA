import React, { useState, useEffect } from 'react';
import { SAPSession } from '../types/sap';
import { Layers, Boxes, BarChart3, LogOut, ShieldCheck, Database, X, Settings, ChevronDown, ChevronRight, Warehouse } from 'lucide-react';

interface SidebarProps {
  currentTab: 'conversion' | 'inventory' | 'history';
  onSelectTab: (tab: 'conversion' | 'inventory' | 'history') => void;
  session: SAPSession | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenWarehouseManagement?: () => void;
  onOpenSchemaManagement?: () => void;
  onOpenBusinessLineManagement?: () => void;
  theme?: 'dark' | 'light';
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  onLogout,
  onOpenWarehouseManagement,
  onOpenSchemaManagement,
  onOpenBusinessLineManagement,
  theme = 'dark',
  isOpen = false,
  onClose,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);

  // Superuser check: SUPERUSER === 'Y' (or fallback for manager)
  const isSuperUser = (session?.SUPERUSER || '').toUpperCase() === 'Y' || session?.userName?.toLowerCase() === 'manager';
  // Token expiration countdown (default 30m)
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: session?.sessionTimeout || 29,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          return { minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Backdrop overlay when expanded on top of views (GitHub overlay style) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity animate-fadeIn"
          title="Haga clic para cerrar el menú"
        />
      )}

      {/* Floating Overlay Sidebar Panel (Starts Collapsed w-16, Expands to Floating Overlay w-64) */}
      <aside 
        id="app-sidebar"
        className={`fixed top-3 left-3 bottom-3 z-50 flex flex-col justify-between py-5 transition-all duration-300 ease-in-out border rounded-2xl shadow-2xl ${
          isOpen ? 'w-64 px-4' : 'w-16 px-2'
        } ${
          theme === 'dark' 
            ? 'bg-[#121316]/95 border-gray-800 text-gray-200 backdrop-blur-xl shadow-black/80' 
            : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-xl shadow-slate-300/50'
        }`}
      >
        <div className="space-y-6">
          {/* Brand & Close Action */}
          <div className="flex items-center justify-between px-1">
            {isOpen ? (
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center font-bold text-black text-lg shadow-md shadow-sky-500/20 shrink-0">
                  E
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className={`font-bold tracking-tight text-base leading-tight ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    Extend<span className="text-sky-500">IA</span>
                  </h1>
                  <p className="text-[9px] text-sky-500 uppercase font-bold tracking-widest truncate">
                    SAP B1 Extension
                  </p>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800 border-gray-800'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Cerrar menú"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="mx-auto flex flex-col items-center">
                <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center font-bold text-black text-lg shadow-md shadow-sky-500/20 shrink-0">
                  E
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2 pt-1" id="sidebar-navigation">
            <button
              id="nav-tab-conversion"
              onClick={() => {
                onSelectTab('conversion');
                if (onClose) onClose();
              }}
              title="Conversión"
              className={`w-full p-2.5 rounded-xl font-medium flex items-center ${
                !isOpen ? 'justify-center' : 'space-x-3'
              } text-xs transition-all text-left cursor-pointer ${
                currentTab === 'conversion'
                  ? theme === 'dark'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold shadow-sm'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-900/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-5 h-5 shrink-0" />
              {isOpen && <span className="truncate">Conversión</span>}
            </button>

            <button
              id="nav-tab-inventory"
              onClick={() => {
                onSelectTab('inventory');
                if (onClose) onClose();
              }}
              title="Inventario"
              className={`w-full p-2.5 rounded-xl font-medium flex items-center ${
                !isOpen ? 'justify-center' : 'space-x-3'
              } text-xs transition-all text-left cursor-pointer ${
                currentTab === 'inventory'
                  ? theme === 'dark'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold shadow-sm'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-900/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Boxes className="w-5 h-5 shrink-0" />
              {isOpen && <span className="truncate">Inventario</span>}
            </button>

            {/* <button
              id="nav-tab-history"
              onClick={() => {
                onSelectTab('history');
                if (onClose) onClose();
              }}
              title="Costos y Trazas"
              className={`w-full p-2.5 rounded-xl font-medium flex items-center ${
                !isOpen ? 'justify-center' : 'space-x-3'
              } text-xs transition-all text-left cursor-pointer ${
                currentTab === 'history'
                  ? theme === 'dark'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold shadow-sm'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 font-bold shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-900/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              {isOpen && <span className="truncate">Costos y Trazas</span>}
            </button> */}

            {/* Ajustes Menu (Visible ONLY for Superusers) */}
            {isSuperUser && (
              <div className="pt-2 border-t border-gray-800/60 space-y-1">
                <button
                  id="nav-tab-settings"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  title="Ajustes (Super Usuario)"
                  className={`w-full p-2.5 rounded-xl font-medium flex items-center justify-between text-xs transition-all text-left cursor-pointer ${
                    theme === 'dark'
                      ? 'text-sky-400 hover:bg-sky-500/10'
                      : 'text-sky-700 hover:bg-sky-50'
                  }`}
                >
                  <div className={`flex items-center ${!isOpen ? 'justify-center w-full' : 'space-x-3'}`}>
                    <Settings className="w-5 h-5 shrink-0" />
                    {isOpen && <span className="font-bold truncate">Ajustes</span>}
                  </div>
                  {isOpen && (
                    isSettingsOpen ? <ChevronDown className="w-4 h-4 text-sky-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                </button>

                {/* Submenus when open */}
                {isOpen && isSettingsOpen && (
                  <div className="pl-4 space-y-1 animate-fadeIn">
                    <button
                      id="nav-submenu-owhs"
                      onClick={() => {
                        if (onOpenWarehouseManagement) onOpenWarehouseManagement();
                        if (onClose) onClose();
                      }}
                      title="Gestión de Almacenes"
                      className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-xs transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800/80'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Warehouse className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate">Gestión de Almacenes</span>
                    </button>

                    <button
                      id="nav-submenu-srgc"
                      onClick={() => {
                        if (onOpenSchemaManagement) onOpenSchemaManagement();
                        if (onClose) onClose();
                      }}
                      title="Gestión de Esquemas"
                      className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-xs transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800/80'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Database className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate">Gestión de Esquemas</span>
                    </button>

                    <button
                      id="nav-submenu-oprc"
                      onClick={() => {
                        if (onOpenBusinessLineManagement) onOpenBusinessLineManagement();
                        if (onClose) onClose();
                      }}
                      title="Gestión de Líneas de Negocios"
                      className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-xs transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800/80'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate">Gestión de Líneas de Negocios</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Footer Info & SAP Status */}
        <div className="space-y-3">
          {/* Service Layer Status Card */}
          {isOpen ? (
            <div className={`p-3.5 rounded-xl space-y-2 border ${
              theme === 'dark'
                ? 'bg-[#181a20] border-gray-800'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-green-500 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[11px]">Service Layer</span>
                </div>
                {session?.isDemoMode && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded mono uppercase font-bold">
                    Sandbox
                  </span>
                )}
              </div>

              <div className={`flex items-center justify-between text-[10px] ${
                theme === 'dark' ? 'text-gray-400' : 'text-slate-600'
              }`}>
                <span className="flex items-center space-x-1 truncate">
                  <Database className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="mono truncate">{session?.companyDB || 'SBO_PROD'}</span>
                </span>
                <span className="mono opacity-70 shrink-0">
                  v10
                </span>
              </div>

              <div className={`pt-1 border-t flex items-center justify-between ${
                theme === 'dark' ? 'border-gray-800' : 'border-slate-200'
              }`}>
                <p className={`text-[10px] mono uppercase ${
                  theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  Exp: {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                </p>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 space-y-2">
              <div className="relative flex h-3 w-3" title="SAP Service Layer Online">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
            </div>
          )}

          {/* Logout trigger */}
          <button
            id="btn-logout-sap"
            onClick={onLogout}
            title="Cerrar Sesión SAP"
            className={`w-full flex items-center ${
              !isOpen ? 'justify-center p-2.5' : 'justify-center space-x-2 p-2'
            } text-xs transition-all cursor-pointer rounded-xl ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/30'
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isOpen && <span>Cerrar Sesión SAP</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

