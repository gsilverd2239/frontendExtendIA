import { 
  SAPCredentials, 
  SAPSession, 
  SapSchema,
  SapConfig,
  SapUser,
  Warehouse,
  BusinessLine, 
  InventoryItem, 
  FinishedGoodItem, 
  ConversionExecutionPayload, 
  SAPConversionResult,
  OwhsRecord,
  SrgcRecord,
  OprcRecord
} from '../types/sap';
import { getApiUrl } from '../config/api';
import { 
  INITIAL_WAREHOUSES, 
  INITIAL_ITEMS, 
  INITIAL_FINISHED_GOODS, 
  INITIAL_CONVERSION_HISTORY 
} from '../data/mockSapData';

// Local storage key for persistent session in client
const SESSION_STORAGE_KEY = 'convertia_sap_session';
const HISTORY_STORAGE_KEY = 'convertia_sap_history';
const INVENTORY_STORAGE_KEY = 'convertia_sap_inventory';

export interface ConvertIAResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  goodsIssueDocEntry: number;
  goodsIssueDocNum: number;
  goodsReceiptDocEntry: number;
  goodsReceiptDocNum: number;
  message: string;
  exitPayload?: any;
  entryPayload?: any;
  patchPayload?: any;
}

class SAPService {
  private currentSession: SAPSession | null = null;

  constructor() {
    this.loadStoredSession();
  }

  private loadStoredSession() {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
      }
    } catch {
      this.currentSession = null;
    }
  }

  public getSession(): SAPSession | null {
    if (!this.currentSession) {
      this.loadStoredSession();
    }
    return this.currentSession;
  }

  public setSession(session: SAPSession): void {
    this.currentSession = session;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Error saving session to localStorage:', e);
    }
  }

  public async getConfig(): Promise<SapConfig> {
    try {
      const res = await fetch(getApiUrl('/api/config'));
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error fetching config:', e);
    }
    return {
      serviceLayerUrl: 'https://172.19.0.88:50000/b1s/v1',
      hanaServer: '172.19.0.88:30015',
      hanaUser: 'SYSTEM',
      hanaPassword: 'Admin123',
      isSandbox: false,
    };
  }

  public async saveConfig(config: SapConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.error || 'Error al guardar configuración' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async getSchemas(): Promise<SapSchema[]> {
    try {
      const res = await fetch(getApiUrl('/api/sap/schemas'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Error fetching schemas from backend:', e);
    }
    return [
      { DbName: 'SBO_TANDEMPRO_PROD', cpnyName: 'TandemPRO S.A. - Producción', dbType: 'HANA' },
      { DbName: 'SBO_CONVERTIA_PROD', cpnyName: 'ConvertIA Industrial - Planta Principal', dbType: 'HANA' },
      { DbName: 'SBO_TANDEMPRO_TEST', cpnyName: 'TandemPRO S.A. - Pruebas / QA', dbType: 'HANA' },
      { DbName: 'SBO_CONVERTIA_TEST', cpnyName: 'ConvertIA Industrial - Laboratorio', dbType: 'HANA' },
      { DbName: 'SBODEMOMX', cpnyName: 'SAP B1 Demostración México S.A.', dbType: 'HANA' },
      { DbName: 'SBODEMOUS', cpnyName: 'SAP B1 Demonstration Company US', dbType: 'SQLServer' },
    ];
  }

  public async login(credentials: SAPCredentials): Promise<{ success: boolean; session?: SAPSession; user?: SapUser; error?: string }> {
    try {
      // First attempt backend proxy to real SAP Service Layer
      const response = await fetch(getApiUrl('/api/sap/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.currentSession = data.session;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data.session));
        window.dispatchEvent(new Event('sap_activity'));
        return { success: true, session: data.session, user: data.user };
      } else {
        // If credentials specified demo mode or server fallback is acceptable
        if (credentials.isDemoMode || credentials.isSandbox) {
          const dbName = credentials.companyDB || credentials.schema || 'SBO_TANDEMPRO_PROD';
          const uName = credentials.userName || credentials.username || 'manager';
          const demoSession: SAPSession = {
            sessionId: 'B1SESSION-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            version: '1000210 (SAP B1 v10 FP2102)',
            sessionTimeout: 30,
            companyDB: dbName,
            companyName: dbName.replace(/_/g, ' '),
            userName: uName,
            serverUrl: credentials.serverUrl || credentials.serviceLayerUrl || 'https://172.19.0.88:50000/b1s/v1',
            loggedInAt: Date.now(),
            isDemoMode: true,
            SUPERUSER: 'Y',
          };
          this.currentSession = demoSession;
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(demoSession));
          return { 
            success: true, 
            session: demoSession,
            user: {
              UserName: uName,
              UserCode: uName.toUpperCase(),
              CompanyDB: dbName,
              CompanyName: dbName.replace(/_/g, ' '),
              SessionId: demoSession.sessionId,
              IsAdmin: true,
              SUPERUSER: 'Y',
            }
          };
        }

        return { 
          success: false, 
          error: data.error || 'Error al autenticar contra SAP Business One Service Layer' 
        };
      }
    } catch (err: any) {
      // If network error occurred and demo mode was checked
      if (credentials.isDemoMode || credentials.isSandbox) {
        const dbName = credentials.companyDB || credentials.schema || 'SBO_TANDEMPRO_PROD';
        const uName = credentials.userName || credentials.username || 'manager';
        const demoSession: SAPSession = {
          sessionId: 'B1SESSION-DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          version: '1000210 (SAP B1 v10 Demo)',
          sessionTimeout: 30,
          companyDB: dbName,
          companyName: dbName.replace(/_/g, ' '),
          userName: uName,
          serverUrl: credentials.serverUrl || credentials.serviceLayerUrl || 'https://172.19.0.88:50000/b1s/v1',
          loggedInAt: Date.now(),
          isDemoMode: true,
        };
        this.currentSession = demoSession;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(demoSession));
        return { 
          success: true, 
          session: demoSession,
          user: {
            UserName: uName,
            UserCode: uName.toUpperCase(),
            CompanyDB: dbName,
            CompanyName: dbName.replace(/_/g, ' '),
            SessionId: demoSession.sessionId,
            IsAdmin: true,
          }
        };
      }

      return { 
        success: false, 
        error: `No se pudo conectar con el servidor SAP Service Layer en "${credentials.serverUrl || credentials.serviceLayerUrl}". Verifique que el servicio esté activo y el certificado SSL sea válido o active el Modo Sandbox.` 
      };
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.currentSession && !this.currentSession.isDemoMode) {
        await fetch(getApiUrl('/api/sap/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.currentSession.sessionId, serverUrl: this.currentSession.serverUrl }),
        });
      }
    } catch (e) {
      console.warn('Logout warning:', e);
    } finally {
      this.currentSession = null;
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  public async getWarehousesInfo(schema?: string, userCode?: string, vendedor: string = '1'): Promise<{ warehouses: Warehouse[]; source: string; spQueryUsed: string; error?: string }> {
    try {
      const session = this.currentSession;
      const dbSchema = schema || session?.companyDB || session?.BD || 'FG_PROD';
      const uCode = userCode || session?.user_code || session?.userName || 'gualber';

      const url = getApiUrl(`/api/sap/warehouses?schema=${encodeURIComponent(dbSchema)}&userCode=${encodeURIComponent(uCode)}&vendedor=${encodeURIComponent(vendedor)}`);

      const response = await fetch(url, {
        headers: { 
          'X-SAP-Session': session?.sessionId || '',
          'X-SAP-CompanyDB': dbSchema,
          'X-SAP-UserCode': uCode,
        }
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.value && Array.isArray(data.value)) {
          return {
            warehouses: data.value,
            source: data.source || 'HANA_SP',
            spQueryUsed: data.spQueryUsed || `CALL "PL_SERVICES"."SP_CONVERTIA_OWHS" ('${dbSchema}', '${uCode}', '${vendedor}')`,
            error: data.error,
          };
        }
      }
    } catch (e: any) {
      console.warn('Using local warehouses fallback due to fetch error:', e);
      return {
        warehouses: INITIAL_WAREHOUSES,
        source: 'SANDBOX_MOCK',
        spQueryUsed: `CALL "PL_SERVICES"."SP_CONVERTIA_OWHS" ('${schema || 'FG_PROD'}', '${userCode || 'gualber'}', '${vendedor}')`,
        error: `Error de red al consultar API: ${e?.message || e}`,
      };
    }
    return {
      warehouses: INITIAL_WAREHOUSES,
      source: 'SANDBOX_MOCK',
      spQueryUsed: `CALL "PL_SERVICES"."SP_CONVERTIA_OWHS" ('${schema || 'FG_PROD'}', '${userCode || 'gualber'}', '${vendedor}')`,
    };
  }

  public async getWarehouses(schema?: string, userCode?: string, vendedor: string = '1'): Promise<Warehouse[]> {
    const res = await this.getWarehousesInfo(schema, userCode, vendedor);
    return res.warehouses;
  }

  public async getBusinessLines(schema?: string): Promise<BusinessLine[]> {
    try {
      const session = this.currentSession;
      const dbSchema = schema || session?.companyDB || (session as any)?.BD || 'FG_DESARROLLO';
      const url = getApiUrl(`/api/sap/business-lines?schema=${encodeURIComponent(dbSchema)}`);
      const response = await fetch(url, {
        headers: { 
          'X-SAP-Session': session?.sessionId || '',
          'X-SAP-CompanyDB': dbSchema,
        }
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.value && Array.isArray(data.value)) {
          return data.value;
        }
      }
    } catch (e) {
      console.warn('Error fetching business lines:', e);
    }
    return [
      { PrcCode: 'PAPAS', PrcName: 'Línea Papas', Schema: schema || 'FG_DESARROLLO' },
      { PrcCode: 'HAMBURG', PrcName: 'Línea Hamburguesas', Schema: schema || 'FG_DESARROLLO' },
      { PrcCode: 'BEBIDAS', PrcName: 'Línea Bebidas', Schema: schema || 'FG_DESARROLLO' },
    ];
  }

  public async getInventory(warehouseCode: string, schema?: string, businessLines?: string[]): Promise<InventoryItem[]> {
    try {
      if (businessLines && businessLines.length === 0) {
        return [];
      }
      const session = this.currentSession;
      const dbSchema = schema || session?.companyDB || (session as any)?.BD || 'FG_DESARROLLO';
      let url = `/api/sap/inventory?warehouse=${encodeURIComponent(warehouseCode)}&schema=${encodeURIComponent(dbSchema)}`;
      if (businessLines && businessLines.length > 0) {
        url += `&businessLines=${encodeURIComponent(businessLines.join(','))}`;
      }
      const response = await fetch(getApiUrl(url), {
        headers: { 
          'X-SAP-Session': session?.sessionId || '',
          'X-SAP-CompanyDB': dbSchema,
        }
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          return data.items;
        }
      }
    } catch (e) {
      console.warn('Using local inventory items:', e);
    }

    // Return stored or initial inventory adjusted for warehouse
    const savedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
    const baseItems: InventoryItem[] = savedInventory ? JSON.parse(savedInventory) : INITIAL_ITEMS;

    return baseItems.map(item => {
      // Calculate warehouse specific stock
      let whStock = 0;
      const whBatches = item.Batches.filter(b => b.WarehouseCode === warehouseCode);
      const whSerials = item.Serials.filter(s => s.WarehouseCode === warehouseCode && s.Status === 'Available');

      if (item.ManageBatchNumbers === 'tYES') {
        whStock = whBatches.reduce((acc, b) => acc + b.Quantity, 0);
      } else if (item.ManageSerialNumbers === 'tYES') {
        whStock = whSerials.length;
      } else {
        whStock = warehouseCode === 'ALM-GENERAL-01' ? item.WarehouseStock : Math.floor(item.WarehouseStock * 0.4);
      }

      return {
        ...item,
        WarehouseStock: whStock,
        Batches: whBatches,
        Serials: whSerials,
      };
    });
  }

  public async getFinishedGoods(): Promise<FinishedGoodItem[]> {
    try {
      const response = await fetch(getApiUrl('/api/sap/finished-goods'));
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          return data.items;
        }
      }
    } catch (e) {
      console.warn('Using local finished goods:', e);
    }
    return INITIAL_FINISHED_GOODS;
  }

  public async getHistory(startDate?: string, endDate?: string, schema?: string): Promise<SAPConversionResult[]> {
    try {
      let url = '/api/sap/history';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const activeSchema = schema || this.currentSession?.companyDB || (this.currentSession as any)?.BD || 'FG_PROD';
      params.append('schema', activeSchema);
      
      const queryStr = params.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }

      const response = await fetch(getApiUrl(url));
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.history && Array.isArray(data.history)) {
          return data.history;
        }
      }
    } catch (e) {
      console.warn('Using local history:', e);
    }

    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CONVERSION_HISTORY;
  }

  public async executeConvertIA(
    warehouseCode: string,
    targetWarehouseCode: string,
    selectedItems: InventoryItem[],
    schema?: string
  ): Promise<ConvertIAResult> {
    if (!this.currentSession) {
      this.loadStoredSession();
    }
    const session = this.currentSession;
    const activeSchema = schema || session?.companyDB || (session as any)?.BD || localStorage.getItem('tandempro_schema') || localStorage.getItem('convertia_schema') || 'FG_PROD';
    const activeSessionId = session?.sessionId || (session as any)?.SessionId || (session as any)?.b1session || '';
    
    const isDemoMode = session?.isDemoMode || false;

    try {
      const response = await fetch(getApiUrl('/api/sap/convertia'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SAP-Session': activeSessionId,
          'X-SAP-CompanyDB': activeSchema,
        },
        body: JSON.stringify({
          warehouseCode,
          targetWarehouseCode,
          selectedItems,
          schema: activeSchema,
          session: session,
          isDemoMode: isDemoMode,
        }),
      });

      if (response.status === 401) {
        window.dispatchEvent(new Event('sap_session_expired'));
      }

      const result: ConvertIAResult = await response.json();
      if (response.ok && result.success) {
        window.dispatchEvent(new Event('sap_activity'));
        return result;
      }

      if (!result.success || !response.ok) {
        throw new Error(result.message || (result as any).error || `Error en servidor SAP (HTTP ${response.status})`);
      }
      return result;
    } catch (e: any) {
      console.error('Excepción en executeConvertIA:', e);
      throw e;
    }
  }

  public async executeConversion(payload: ConversionExecutionPayload): Promise<SAPConversionResult> {
    let response;
    try {
      response = await fetch('/api/sap/execute-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SAP-Session': this.currentSession?.sessionId || '',
        },
        body: JSON.stringify({
          ...payload,
          session: this.currentSession,
        }),
      });
    } catch (e: any) {
      console.error('Error de red al ejecutar conversión:', e);
      throw new Error(`Error de red: ${e.message}`);
    }

    if (response.ok) {
      const result = await response.json();
      this.saveConversionToLocalHistory(result);
      this.deductLocalInventory(payload);
      return result;
    } else {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = {};
      }
      throw new Error(errorData.error || errorData.message || `Error HTTP ${response.status}`);
    }
  }

  public async continueConversion(nroConv: number, schema?: string): Promise<{ success: boolean; message: string; estadoActual?: string }> {
    if (!this.currentSession) {
      this.loadStoredSession();
    }
    const session = this.currentSession;
    const activeSchema = schema || session?.companyDB || (session as any)?.BD || localStorage.getItem('tandempro_schema') || localStorage.getItem('convertia_schema') || 'FG_PROD';
    const activeSessionId = session?.sessionId || (session as any)?.SessionId || (session as any)?.b1session || '';

    try {
      const response = await fetch(getApiUrl('/api/sap/continue-conversion'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SAP-Session': activeSessionId,
          'X-SAP-CompanyDB': activeSchema,
        },
        body: JSON.stringify({
          nroConv,
          schema: activeSchema,
          session: session,
        }),
      });

      if (response.status === 401) {
        window.dispatchEvent(new Event('sap_session_expired'));
      }

      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error(`Respuesta del servidor no válida (HTTP ${response.status}): ${text.substring(0, 100)}`);
      }

      if (!result.success || !response.ok) {
        throw new Error(result.message || (result as any).error || `Error en servidor SAP (HTTP ${response.status})`);
      }
      return result;
    } catch (e: any) {
      console.error('Error al continuar conversión:', e);
      throw e;
    }
  }

  private saveConversionToLocalHistory(record: SAPConversionResult) {
    try {
      const existing = localStorage.getItem(HISTORY_STORAGE_KEY);
      const list: SAPConversionResult[] = existing ? JSON.parse(existing) : INITIAL_CONVERSION_HISTORY;
      list.unshift(record);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  }

  private deductLocalInventory(payload: ConversionExecutionPayload) {
    try {
      const saved = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const items: InventoryItem[] = saved ? JSON.parse(saved) : INITIAL_ITEMS;

      payload.consumedComponents.forEach(comp => {
        const item = items.find(i => i.ItemCode === comp.itemCode);
        if (!item) return;

        if (comp.itemType === 'Batch' && comp.batchNumber) {
          const batch = item.Batches.find(b => b.BatchNumber === comp.batchNumber && b.WarehouseCode === payload.sourceWarehouse);
          if (batch) {
            batch.Quantity = Math.max(0, batch.Quantity - comp.quantity);
          }
        } else if (comp.itemType === 'Serial' && comp.serialNumber) {
          const serial = item.Serials.find(s => s.SerialNumber === comp.serialNumber);
          if (serial) {
            serial.Status = 'Allocated';
          }
        } else {
          item.WarehouseStock = Math.max(0, item.WarehouseStock - comp.quantity);
        }
      });

      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error updating local inventory:', e);
    }
  }

  // =========================================================================
  // ADMIN OWHS CRUD METHODS (convertia."OWHS")
  // =========================================================================

  public async getAdminWarehouses(schema?: string): Promise<{ success: boolean; data?: OwhsRecord[]; error?: string }> {
    try {
      const res = await fetch(getApiUrl(`/api/admin/owhs?schema=${encodeURIComponent(schema || 'FG_DESARROLLO')}`));
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al obtener almacenes.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async createAdminWarehouse(record: OwhsRecord): Promise<{ success: boolean; data?: OwhsRecord; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/owhs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al crear almacén.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async updateAdminWarehouse(record: OwhsRecord, oldWhsCode?: string, oldSchema?: string): Promise<{ success: boolean; data?: OwhsRecord; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/owhs'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          oldWhsCode: oldWhsCode || record.whsCode,
          oldSchema: oldSchema || record.Schema,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al actualizar almacén.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteAdminWarehouse(whsCode: string, schema: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(getApiUrl(`/api/admin/owhs?whsCode=${encodeURIComponent(whsCode)}&schema=${encodeURIComponent(schema)}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || 'Error al eliminar almacén.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // ADMIN CRUD METHODS FOR convertia."SRGC" (Gestión de Esquemas)
  // ==========================================

  public async getAdminSchemas(): Promise<{ success: boolean; data?: SrgcRecord[]; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/srgc'));
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data || [] };
      }
      return { success: false, error: json.error || 'Error al obtener esquemas SRGC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async createAdminSchema(record: SrgcRecord): Promise<{ success: boolean; data?: SrgcRecord; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/srgc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al crear esquema SRGC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async updateAdminSchema(record: SrgcRecord, oldDbName?: string): Promise<{ success: boolean; data?: SrgcRecord; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/srgc'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          oldDbName: oldDbName || record.dbName,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al actualizar esquema SRGC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteAdminSchema(dbName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(getApiUrl(`/api/admin/srgc?dbName=${encodeURIComponent(dbName)}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || 'Error al eliminar esquema SRGC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // ADMIN CRUD METHODS FOR convertia."OPRC" (Gestión de Líneas de Negocio)
  // ==========================================

  public async getAdminBusinessLines(schema: string = 'FG_DESARROLLO'): Promise<{ success: boolean; data?: OprcRecord[]; error?: string }> {
    try {
      const res = await fetch(getApiUrl(`/api/admin/oprc?schema=${encodeURIComponent(schema)}`));
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data || [] };
      }
      return { success: false, error: json.error || 'Error al obtener líneas de negocio OPRC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async createAdminBusinessLine(record: OprcRecord): Promise<{ success: boolean; data?: OprcRecord; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/oprc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al crear línea de negocio OPRC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async updateAdminBusinessLine(record: OprcRecord, oldPrcCode?: string, oldSchema?: string): Promise<{ success: boolean; data?: OprcRecord; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/api/admin/oprc'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          oldPrcCode: oldPrcCode || record.PrcCode,
          oldSchema: oldSchema || record.Schema,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error || 'Error al actualizar línea de negocio OPRC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteAdminBusinessLine(prcCode: string, schema: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(getApiUrl(`/api/admin/oprc?prcCode=${encodeURIComponent(prcCode)}&schema=${encodeURIComponent(schema)}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || 'Error al eliminar línea de negocio OPRC.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const sapService = new SAPService();
