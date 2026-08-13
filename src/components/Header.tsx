import React from 'react';
import { SAPSession } from '../types/sap';
import { Database, Sun, Moon, Menu } from 'lucide-react';

interface HeaderProps {
  title?: string;
  session: SAPSession | null;
  onOpenLogin?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

function getInitials(name?: string): string {
  if (!name) return 'US';
  const clean = name.trim().replace(/^Usuario:\s*/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return 'US';
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Gestión de Almacén',
  session,
  theme = 'dark',
  onToggleTheme,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const rawName = session?.username || session?.userName || session?.user_code || 'Usuario SAP';
  const displayName = rawName.replace(/^Usuario:\s*/i, '');
  const initials = getInitials(displayName);

  const departamento = session?.Departamento || null;
  const sucursal = session?.Sucursal || null;

  const deptAndBranchText = [departamento, sucursal].filter(Boolean).join(' • ') || 'Operaciones de Producción';

  return (
    <header 
      id="app-header"
      className={`h-20 border-b px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-black/60 border-gray-800 backdrop-blur-md text-white'
          : 'bg-white border-slate-200 shadow-sm text-slate-800'
      }`}
    >
      {/* Title Section with Burger Menu */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            id="header-burger-menu"
            onClick={onToggleSidebar}
            type="button"
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-gray-800/80 border-gray-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-sm'
            }`}
            title={isSidebarOpen ? 'Colapsar menú lateral' : 'Mostrar menú lateral'}
          >
            <Menu className="w-5 h-5 shrink-0" />
          </button>
        )}
        <h2 className={`text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h2>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
          theme === 'dark' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-sky-50 text-sky-700 border border-sky-200'
        }`}>
          SAP B1 v10
        </span>
      </div>

      {/* User Profile & Database Pills & Theme Switcher */}
      <div className="flex items-center space-x-3">
        {/* Active Database / Schema Pill */}
        <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-mono font-medium shadow-sm ${
          theme === 'dark'
            ? 'border-sky-500/20 bg-sky-500/10 text-sky-400'
            : 'border-sky-200 bg-sky-50 text-sky-700'
        }`}>
          <Database className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate max-w-[180px]">
            {session?.companyName || session?.companyDB || 'SAP B1'}
          </span>
          <span className="text-[10px] opacity-70 font-mono">({session?.companyDB || 'SBO'})</span>
        </div>

        {/* User Pill Badge */}
        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-2xl border shadow-sm ${
          theme === 'dark'
            ? 'border-gray-800 bg-[#111318]'
            : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Avatar circle with user initials */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500/20 to-sky-600/30 border border-sky-500/40 text-sky-500 font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
            {initials}
          </div>

          {/* User Name, Department and Branch */}
          <div className="flex flex-col text-left">
            <span className={`text-xs font-bold tracking-tight leading-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-800'
            }`}>
              {displayName}
            </span>
            <span className={`text-[10px] font-medium leading-tight mt-0.5 ${
              theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
            }`}>
              {deptAndBranchText}
            </span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            id="header-theme-toggle"
            onClick={onToggleTheme}
            type="button"
            className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-center cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#151619] border-gray-800 hover:bg-gray-800 text-amber-400 shadow-md'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-indigo-600 shadow-sm'
            }`}
            title={theme === 'dark' ? 'Cambiar a Modo Claro (Pastel LinkedIn)' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        )}
      </div>
    </header>
  );
};
