import { Request } from 'express';

// ===== ENUMS =====
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VENDEDOR = 'VENDEDOR',
  RH = 'RH',
  FINANCEIRO = 'FINANCEIRO',
  INVENTARIO = 'INVENTARIO'
}

export enum SaleStatus {
  PENDENTE = 'PENDENTE',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
  DEVOLVIDA = 'DEVOLVIDA'
}

export enum PaymentMethod {
  DINHEIRO = 'DINHEIRO',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  PIX = 'PIX',
  TRANSFERENCIA = 'TRANSFERENCIA',
  FIADO = 'FIADO'
}

export enum PaymentStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  PARCIAL = 'PARCIAL',
  VENCIDO = 'VENCIDO',
  CANCELADO = 'CANCELADO'
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
  INVENTORY_CHANGE = 'INVENTORY_CHANGE'
}

// ===== INTERFACES =====

// Organização
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Usuário
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  active: boolean;
  role: UserRole;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Categoria
export interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Produto
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  categoryId?: string;
  organizationId: string;
  unit?: string;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Item de Estoque
export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  location?: string;
  notes?: string;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Item de Estoque
export interface InventoryItem {
  id: string;
  productId: string;
  organizationId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  location?: string;
  lastUpdated: Date;
}

// Cesta
export interface Cesta {
  id: string;
  organizationId: string;
  nome: string;
  descricao?: string;
  precoPromocional?: number;
  ativo: boolean;
  categoria?: string;
  itens: any[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cliente
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  observations?: string;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Vendedor
export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  commission: number;
  active: boolean;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Venda
export interface Sale {
  id: string;
  organizationId: string;
  clientId?: string;
  vendorId?: string;
  userId: string;
  status: SaleStatus;
  total: number;
  discount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Item da Venda
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

// Pagamento
export interface Payment {
  id: string;
  organizationId: string;
  saleId?: string;
  clientId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate?: Date;
  paidAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Log de Auditoria
export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: AuditAction;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ===== DTOs =====

// DTOs de Criação
export interface CreateOrganizationDto {
  name: string;
  slug: string;
  description?: string;
  settings?: any;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
}

export interface CreateCategoryDto {
  name: string;
  color?: string;
  description?: string;
  organizationId: string;
  createdBy: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  categoryId?: string;
  organizationId: string;
  unit?: string;
  active?: boolean;
  createdBy: string;
}

export interface CreateInventoryItemDto {
  productId: string;
  organizationId: string;
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  location?: string;
}

export interface CreateCestaDto {
  nome: string;
  descricao?: string;
  precoPromocional?: number;
  ativo?: boolean;
  categoria?: string;
  itens?: any[];
}

export interface CreateClientDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  observations?: string;
  organizationId: string;
  createdBy: string;
}

export interface CreateVendorDto {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cargo?: string;
  salarioBase?: number;
  comissaoPercentual?: number;
  dataContratacao?: string;
  active?: boolean;
  motivoInativacao?: string;
  permissoes?: any;
}

export interface CreateSaleDto {
  organizationId: string;
  clientId?: string;
  vendorId?: string;
  userId: string;
  status?: SaleStatus;
  total: number;
  discount?: number;
  notes?: string;
  items: CreateSaleItemDto[];
}

export interface CreateSaleItemDto {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreatePaymentDto {
  organizationId: string;
  saleId?: string;
  clientId?: string;
  amount: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  dueDate?: Date;
  notes?: string;
  createdBy: string;
}

// DTOs de Atualização
export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
  settings?: any;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  active?: boolean;
  role?: UserRole;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  description?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  costPrice?: number;
  categoryId?: string;
  unit?: string;
  active?: boolean;
}

export interface UpdateInventoryItemDto {
  quantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  location?: string;
}

export interface UpdateCestaDto {
  nome?: string;
  descricao?: string;
  precoPromocional?: number;
  ativo?: boolean;
  categoria?: string;
  itens?: any[];
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  observations?: string;
}

export interface UpdateVendorDto {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  position?: string;
  baseSalary?: number;
  commissionPercentage?: number;
  hireDate?: Date;
  active?: boolean;
  deactivationReason?: string;
}

export interface UpdateSaleDto {
  clientId?: string;
  vendorId?: string;
  status?: SaleStatus;
  total?: number;
  discount?: number;
  notes?: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
  dueDate?: Date;
  paidAt?: Date;
  notes?: string;
}

export interface CreateCategoryDto {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  description?: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  categoryId?: string;
  unit?: string;
  active?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  costPrice?: number;
  categoryId?: string;
  unit?: string;
  active?: boolean;
}

export interface CreateInventoryItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  location?: string;
  notes?: string;
}

export interface UpdateInventoryItemDto {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalValue?: number;
  location?: string;
  notes?: string;
}

export interface CreatePaymentDto {
  saleId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate?: Date;
  paidAt?: Date;
  notes?: string;
}

// ===== INTERFACES DE REQUISIÇÃO =====

export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
  token: string;
  organization?: Organization;
}

// ===== INTERFACES DE RESPOSTA =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface FilterQuery {
  search?: string;
  categoryId?: string;
  productId?: string;
  status?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
  vendorId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}
