export interface SapSchema {
  DbName: string;
  cpnyName: string;
  version?: string;
  dbType?: 'HANA' | 'SQLServer';
}

export interface SapServer {
  ServerName: string;
  ServerType?: string;
  Version?: string;
  ServiceLayer: string;
  ServerHanaPort: string;
  HanaUser: string;
  HanaPassword?: string;
}

export interface SapConfig {
  serviceLayerUrl: string;
  hanaServer: string;
  hanaUser: string;
  hanaPassword?: string;
  isSandbox: boolean;
}

export interface SapUser {
  UserName: string;
  UserCode?: string;
  CompanyDB: string;
  CompanyName?: string;
  SessionId?: string;
  Version?: string;
  SessionTimeout?: number;
  IsAdmin?: boolean;

  // Extended profile fields from OADM & OUSR
  user_code?: string;
  username?: string;
  u_email?: string;
  CompnyName?: string;
  CompnyAddr?: string;
  phone1?: string;
  e_mail?: string;
  BD?: string;
  Sucursal?: string;
  Departamento?: string;
  SucursalCode?: string;
  SucursalName?: string;
  origen?: number;
  PDF?: string;
  XML?: string;
  IMG?: string;
  isSandbox?: boolean;
  SUPERUSER?: string;
}

export interface SAPCredentials {
  serverUrl?: string;
  serviceLayerUrl?: string;
  companyDB?: string;
  schema?: string;
  userName?: string;
  username?: string;
  password?: string;
  language?: number;
  isDemoMode?: boolean;
  isSandbox?: boolean;
}

export interface SAPSession {
  sessionId: string;
  version: string;
  sessionTimeout: number; // in minutes
  companyDB: string;
  companyName?: string;
  userName: string;
  serverUrl: string;
  loggedInAt: number;
  isDemoMode: boolean;

  // Extended profile info
  user_code?: string;
  username?: string;
  u_email?: string;
  CompnyName?: string;
  CompnyAddr?: string;
  phone1?: string;
  e_mail?: string;
  BD?: string;
  Sucursal?: string;
  Departamento?: string;
  SucursalCode?: string;
  SucursalName?: string;
  origen?: number;
  PDF?: string;
  XML?: string;
  IMG?: string;
  SUPERUSER?: string;
}

export interface OwhsRecord {
  whsCode: string;
  whsName: string;
  equWhsCode: string;
  equWhsName: string;
  Schema: string;
}

export interface SrgcRecord {
  dbName: string;
  cmpName: string;
  cmpStatus: string;
}

export interface OprcRecord {
  PrcCode: string;
  PrcName: string;
  Schema: string;
}

export interface Warehouse {
  WarehouseCode: string;
  WarehouseName: string;
  EquWhsCode?: string;
  EquWhsName?: string;
  Street?: string;
  City?: string;
  Inactive: 'tNO' | 'tYES';
  AllowZeroValue?: 'tNO' | 'tYES';
}

export interface BusinessLine {
  PrcCode: string;
  PrcName: string;
  Schema?: string;
}

export interface BatchDetail {
  BatchNumber: string;
  ItemCode: string;
  Quantity: number;
  UnitCost: number;
  AdmissionDate?: string;
  ExpiryDate?: string;
  WarehouseCode: string;
  Status?: 'Released' | 'Locked' | 'AccessDenied';
  Location?: string;
}

export interface SerialDetail {
  SerialNumber: string;
  SystemNumber?: number;
  ItemCode: string;
  UnitCost: number;
  AdmissionDate?: string;
  WarehouseCode: string;
  Status: 'Available' | 'Allocated' | 'InInspection';
  ManufacturerNumber?: string;
}

export interface InventoryItem {
  ItemCode: string;
  ItemName: string;
  LoteSerie?: 'Lote' | 'Serie' | string;
  ItemsGroupCode?: number;
  ForeignName?: string;
  ManageBatchNumbers: 'tYES' | 'tNO';
  ManageSerialNumbers: 'tYES' | 'tNO';
  InventoryUOM: string;
  AvgStdPrice: number; // Costo promedio
  OnHand: number; // Total stock
  WarehouseStock: number; // Stock en almacén activo
  CostoTotal?: number;
  ArticuloEquivalente?: string;
  CantidadEquivalente?: number;
  CostoEquivUnitario?: number;
  UnidadNegocio?: string;
  ItemType?: 'RawMaterial' | 'FinishedGood' | 'Component' | 'Packaging' | 'Batch' | 'Serial' | 'Standard' | string;
  Batches: BatchDetail[];
  Serials: SerialDetail[];
  SelectedBatches?: { [batchNum: string]: number }; // quantity selected
  SelectedSerials?: string[]; // serial numbers selected
  SelectedStandardQty?: number;
}

export interface FinishedGoodItem {
  ItemCode: string;
  ItemName: string;
  InventoryUOM: string;
  ManageBatchNumbers: 'tYES' | 'tNO';
  ManageSerialNumbers: 'tYES' | 'tNO';
  DefaultWarehouse: string;
  SuggestedSellingPrice: number;
  StandardCost?: number;
  Description?: string;
}

export interface ConsumedComponent {
  itemCode: string;
  itemName: string;
  itemType: 'Batch' | 'Serial' | 'Standard';
  batchNumber?: string;
  serialNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  uom: string;
}

export interface ConversionExecutionPayload {
  sourceWarehouse: string;
  targetWarehouse: string;
  targetItemCode: string;
  targetItemName: string;
  targetQuantity: number;
  targetBatchNumber?: string;
  targetSerialNumber?: string;
  targetExpiryDate?: string;
  targetUnitCost: number;
  totalCost: number;
  comments: string;
  consumedComponents: ConsumedComponent[];
}

export interface SAPConversionResult {
  id: string;
  goodsIssueDocEntry: number;
  goodsIssueDocNum: number;
  goodsReceiptDocEntry: number;
  goodsReceiptDocNum: number;
  journalEntryNumber: number;
  docDate: string;
  timestamp: number;
  sourceWarehouse: string;
  targetWarehouse: string;
  targetItemCode: string;
  targetItemName: string;
  targetQuantity: number;
  targetBatchNumber?: string;
  targetSerialNumber?: string;
  targetUnitCost: number;
  totalCost: number;
  consumedComponents: ConsumedComponent[];
  status: 'Success' | 'Error';
  message: string;
}
