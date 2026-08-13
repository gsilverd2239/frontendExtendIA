import React, { useState, useEffect, useCallback } from 'react';
import { 
  SAPSession, 
  SapUser, 
  Warehouse, 
  InventoryItem, 
  FinishedGoodItem, 
  SAPConversionResult, 
  ConversionExecutionPayload 
} from './types/sap';
import { 
  INITIAL_WAREHOUSES, 
  INITIAL_ITEMS, 
  INITIAL_FINISHED_GOODS, 
  INITIAL_CONVERSION_HISTORY 
} from './data/mockSapData';
import { sapService } from './services/sapService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ConversionView } from './components/ConversionView';
import { InventoryView } from './components/InventoryView';
import { HistoryTraceView } from './components/HistoryTraceView';
import LoginScreen from './components/LoginScreen';
import { LoginModal } from './components/LoginModal';
import { SuccessConversionModal } from './components/SuccessConversionModal';
import { WarehouseManagementModal } from './components/WarehouseManagementModal';
import { SchemaManagementModal } from './components/SchemaManagementModal';
import { BusinessLineManagementModal } from './components/BusinessLineManagementModal';

export default function App() {
  const [session, setSession] = useState<SAPSession | null>(sapService.getSession());
  const [isSwitchDbModalOpen, setIsSwitchDbModalOpen] = useState<boolean>(false);
  const [isWarehouseMgmtModalOpen, setIsWarehouseMgmtModalOpen] = useState<boolean>(false);
  const [isSchemaMgmtModalOpen, setIsSchemaMgmtModalOpen] = useState<boolean>(false);
  const [isBusinessLineMgmtModalOpen, setIsBusinessLineMgmtModalOpen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'conversion' | 'inventory' | 'history'>('conversion');

  // Sidebar starts collapsed by default as requested
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // App Theme state: Default to DARK mode as requested, support LIGHT mode (LinkedIn soft pastel)
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('convertia_theme') as 'dark' | 'light') || 'dark'
  );

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('convertia_theme', next);
      return next;
    });
  };

  // Warehouses & Active Warehouse
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALM-GENERAL-01');

  // Inventory & Finished goods state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodItem[]>(INITIAL_FINISHED_GOODS);
  const [historyRecords, setHistoryRecords] = useState<SAPConversionResult[]>(INITIAL_CONVERSION_HISTORY);

  // Execution states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [latestConversionResult, setLatestConversionResult] = useState<SAPConversionResult | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [spWarehouseInfo, setSpWarehouseInfo] = useState<{ source?: string; spQueryUsed?: string; error?: string }>({});

  // Load SAP initial data with SP parameters: schema, userCode, vendedor='1'
  const loadSapData = useCallback(async (whCode: string) => {
    setIsLoading(true);
    try {
      const activeSchema = session?.companyDB || 'FG_PROD';
      const activeUserCode = session?.user_code || session?.userName || 'gualber';

      const [whRes, itemsList, fgList, histList] = await Promise.all([
        sapService.getWarehousesInfo(activeSchema, activeUserCode, '1'),
        sapService.getInventory(whCode, activeSchema),
        sapService.getFinishedGoods(),
        sapService.getHistory(),
      ]);

      setWarehouses(whRes.warehouses);
      setSpWarehouseInfo({
        source: whRes.source,
        spQueryUsed: whRes.spQueryUsed,
        error: whRes.error,
      });

      if (whRes.warehouses.length > 0 && !whRes.warehouses.some(w => w.WarehouseCode === selectedWarehouse)) {
        setSelectedWarehouse(whRes.warehouses[0].WarehouseCode);
      }
      setInventoryItems(itemsList);
      setFinishedGoods(fgList);
      setHistoryRecords(histList);
    } catch (err) {
      console.error('Error loading SAP data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session, selectedWarehouse]);

  // Handle warehouse selection change and refresh inventory container
  const handleWarehouseSelect = async (code: string) => {
    setSelectedWarehouse(code);
    setIsLoading(true);
    try {
      const activeSchema = session?.companyDB || 'FG_PROD';
      const itemsList = await sapService.getInventory(code, activeSchema);
      setInventoryItems(itemsList);
    } catch (err) {
      console.error('Error fetching inventory for warehouse:', code, err);
    } finally {
      setIsLoading(false);
    }
  };

  // On initial mount or session change
  useEffect(() => {
    if (session) {
      loadSapData(selectedWarehouse);
    }
  }, [session, loadSapData]);

  // Handle SAP login success
  const handleLoginSuccess = async (user: SapUser, newSession?: SAPSession) => {
    const activeSess = newSession || sapService.getSession() || {
      sessionId: user.SessionId || 'B1SESSION-' + Date.now(),
      version: user.Version || '1000210 (SAP B1 v10 FP2102)',
      sessionTimeout: user.SessionTimeout || 30,
      companyDB: user.CompanyDB,
      companyName: user.CompanyName,
      userName: user.UserName,
      serverUrl: 'https://172.19.0.88:50000/b1s/v1',
      loggedInAt: Date.now(),
      isDemoMode: false,
    };

    setSession(activeSess);
    sapService.setSession(activeSess);
    setIsSwitchDbModalOpen(false);
    await loadSapData(selectedWarehouse);
  };

  // Handle Logout
  const handleLogout = async () => {
    await sapService.logout();
    setSession(null);
  };

  // Handle Conversion Execution
  const handleExecuteConversion = async (payload: ConversionExecutionPayload) => {
    setIsLoading(true);
    try {
      const result = await sapService.executeConversion(payload);
      setLatestConversionResult(result);
      setIsSuccessModalOpen(true);

      // Refresh inventory & history
      await loadSapData(selectedWarehouse);
    } catch (error: any) {
      alert('Error al ejecutar la conversión en SAP: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  // If not logged in, present LoginScreen with theme switch option
  if (!session) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className={`flex h-screen w-full transition-colors duration-200 overflow-hidden font-sans relative ${
      theme === 'dark' 
        ? 'bg-[#0B0C10] text-[#C5C6C7]' 
        : 'bg-[#F3F2EF] text-slate-800'
    }`}>
      {/* Persistent Sidebar (Starts Collapsed, Expands as Overlay) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        session={session}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSwitchDbModalOpen(true)}
        onOpenWarehouseManagement={() => setIsWarehouseMgmtModalOpen(true)}
        onOpenSchemaManagement={() => setIsSchemaMgmtModalOpen(true)}
        onOpenBusinessLineManagement={() => setIsBusinessLineMgmtModalOpen(true)}
        theme={theme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area (Fixed layout, does not shift when sidebar expands) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pl-20 transition-all">
        {/* Top Header */}
        <Header
          title={
            currentTab === 'conversion' 
              ? 'Gestión de Almacén' 
              : currentTab === 'inventory' 
              ? 'Catálogo & Stocks de Almacén' 
              : 'Trazabilidad y Costos SAP B1'
          }
          session={session}
          onOpenLogin={() => setIsSwitchDbModalOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Tab content routing */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 'conversion' && (
            <ConversionView
              items={inventoryItems}
              finishedGoods={finishedGoods}
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              spWarehouseInfo={spWarehouseInfo}
              onSelectWarehouse={handleWarehouseSelect}
              onExecuteConversion={handleExecuteConversion}
              isLoading={isLoading}
              onRefreshInventory={() => loadSapData(selectedWarehouse)}
              theme={theme}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              items={inventoryItems}
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              onRefresh={() => loadSapData(selectedWarehouse)}
              isLoading={isLoading}
              theme={theme}
            />
          )}

          {currentTab === 'history' && (
            <HistoryTraceView 
              history={historyRecords} 
              theme={theme}
            />
          )}
        </main>
      </div>

      {/* Database Switch / Re-authentication Modal */}
      <LoginModal
        isOpen={isSwitchDbModalOpen}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setIsSwitchDbModalOpen(false)}
      />

      {/* Success Modal showing SAP Goods Issue & Goods Receipt Documents */}
      <SuccessConversionModal
        isOpen={isSuccessModalOpen}
        result={latestConversionResult}
        onClose={() => setIsSuccessModalOpen(false)}
        onNewConversion={() => {
          setIsSuccessModalOpen(false);
          setCurrentTab('conversion');
        }}
      />

      {/* Admin Warehouse Management Modal (OWHS) */}
      <WarehouseManagementModal
        isOpen={isWarehouseMgmtModalOpen}
        onClose={() => setIsWarehouseMgmtModalOpen(false)}
        activeSchema={session?.companyDB || 'FG_DESARROLLO'}
        theme={theme}
      />

      {/* Admin Schema Management Modal (SRGC) */}
      <SchemaManagementModal
        isOpen={isSchemaMgmtModalOpen}
        onClose={() => setIsSchemaMgmtModalOpen(false)}
        theme={theme}
      />

      {/* Admin Business Line Management Modal (OPRC) */}
      <BusinessLineManagementModal
        isOpen={isBusinessLineMgmtModalOpen}
        onClose={() => setIsBusinessLineMgmtModalOpen(false)}
        activeSchema={session?.companyDB || 'FG_DESARROLLO'}
        theme={theme}
      />
    </div>
  );
}
