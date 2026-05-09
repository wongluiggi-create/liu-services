export enum CostType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
}

export interface AgencySettings {
  agencyName: string;
  rut: string;
  address: string;
  email: string;
  logoUrl: string;
  capacityHours: number;
}

export const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: 'Liu Agency',
  rut: '',
  address: '',
  email: '',
  logoUrl: '',
  capacityHours: 160,
};

export interface AgencyCost {
  id: string;
  name: string;
  type: CostType;
  amount: number;
  description?: string;
}

export interface AgencyService {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  estimatedHours?: number;
}

export interface AgencyClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  rut?: string;
  address?: string;
  createdAt: string;
}

export interface QuoteItem {
  serviceId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface AgencyQuote {
  id: string;
  number: string;
  clientId: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  createdAt: string;
  validUntil?: string;
  deliveryDate?: string;
  notes?: string;
  terms?: string;
}

export interface AgencyAsset {
  id: string;
  name: string;
  initialValue: number;
  usefulLife: number;
  purchaseDate: string;
  description?: string;
}

export interface TermTemplate {
  id: string;
  name: string;
  content: string;
}

export interface MonthlySale {
  month: string;
  amount: number;
  notes?: string;
}

export const DEFAULT_TERM_TEMPLATES: TermTemplate[] = [
  {
    id: 'term-general',
    name: 'General',
    content:
      '1. CONDICIONES DE PAGO: El 50% del valor total se abona al inicio del proyecto y el 50% restante al momento de la entrega final.\n\n2. REVISIONES: Se incluyen hasta 3 rondas de revisiones dentro del alcance acordado.\n\n3. PROPIEDAD INTELECTUAL: Una vez recibido el pago total, el cliente obtiene los derechos de uso del trabajo entregado.\n\n4. CONFIDENCIALIDAD: Ambas partes se comprometen a mantener confidencial cualquier información sensible compartida durante el proyecto.\n\n5. CANCELACIÓN: En caso de cancelación por parte del cliente, los pagos realizados no son reembolsables.',
  },
  {
    id: 'term-web',
    name: 'Diseño Web',
    content:
      '1. ALCANCE: El proyecto incluye el diseño y desarrollo del sitio web según las especificaciones acordadas. Cambios fuera del alcance serán cotizados por separado.\n\n2. CONTENIDO: El cliente es responsable de proveer textos, imágenes y demás contenido en los plazos acordados.\n\n3. HOSTING Y DOMINIO: No se incluye el costo de hosting ni dominio, salvo que se especifique lo contrario.\n\n4. MANTENIMIENTO: El soporte post-entrega tiene una vigencia de 30 días para corrección de errores.\n\n5. PAGOS: 50% al inicio, 25% a la entrega del diseño aprobado, 25% al lanzamiento.',
  },
  {
    id: 'term-marketing',
    name: 'Marketing',
    content:
      '1. DURACIÓN: Los servicios de marketing se contratan por períodos mensuales renovables automáticamente salvo aviso con 15 días de anticipación.\n\n2. INFORMES: Se entregará un informe mensual de resultados con las métricas acordadas.\n\n3. ACCESOS: El cliente deberá proveer acceso a las plataformas necesarias (Meta Ads, Google Analytics, etc.) dentro de las 48 hs de inicio.\n\n4. PRESUPUESTO PUBLICITARIO: El presupuesto de pauta no está incluido en los honorarios y debe ser administrado directamente por el cliente o acordado por separado.\n\n5. RESULTADOS: Los resultados dependen de múltiples factores y no se garantizan métricas específicas.',
  },
];
