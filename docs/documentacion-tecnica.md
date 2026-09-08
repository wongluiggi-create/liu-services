# Liu Services — Documentación Técnica de Construcción

## Resumen del Proyecto

**Liu Services** es una plataforma web de gestión empresarial para agencias creativas, desarrollada como Single Page Application (SPA) completamente client-side. No requiere servidor propio: el frontend consume Firebase directamente.

---

## Stack Tecnológico

### Core Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.3.1 | Framework UI principal |
| TypeScript | 5.7.2 | Tipado estático |
| Vite | 6.0.5 | Build tool y dev server |
| React Router | 7.0.2 | Enrutamiento client-side |

### Estilos
| Tecnología | Versión | Rol |
|---|---|---|
| Tailwind CSS | 4.0.0 | Utilidades CSS |
| PostCSS | 8.4.49 | Procesamiento CSS |
| Autoprefixer | 10.4.20 | Compatibilidad cross-browser |

### Componentes y Visualización
| Librería | Versión | Uso |
|---|---|---|
| Lucide React | 0.469.0 | Iconografía consistente |
| Recharts | 2.15.0 | Gráficos (BEP, ventas, P&L) |
| react-select | 5.9.0 | Dropdowns con búsqueda |
| html2pdf.js | 0.14.0 | Exportación PDF client-side |

### Backend as a Service (BaaS)
| Servicio | Uso |
|---|---|
| Firebase Auth | Email/password + Google OAuth |
| Firestore | Base de datos NoSQL en tiempo real |

### Utilidades
| Paquete | Uso |
|---|---|
| uuid 11.0.3 | Generación de IDs únicos |
| gh-pages 6.2.0 | Deploy a GitHub Pages |

---

## Arquitectura

### Patrón General

```
┌─────────────────────────────────────────┐
│              Firebase                   │
│   Auth ──────────── Firestore           │
└────────────┬────────────────────────────┘
             │ SDK client-side
┌────────────▼────────────────────────────┐
│              App.tsx                    │
│  Estado central + Context Provider      │
│  Debounced auto-save (800ms)            │
└────────────┬────────────────────────────┘
             │ Outlet Context
┌────────────▼────────────────────────────┐
│         Módulos de Ruta                 │
│  Analytics / Finances / Services /      │
│  Clients / Quotes / Simulator           │
└─────────────────────────────────────────┘
```

### Gestión de Estado

No se utiliza Redux ni Zustand. El estado vive en `App.tsx` y se distribuye mediante `React Router Outlet Context`:

```typescript
// App.tsx exporta el tipo del contexto
export type AppOutletContext = {
  costs: AgencyCost[];
  services: AgencyService[];
  clients: AgencyClient[];
  quotes: AgencyQuote[];
  assets: AgencyAsset[];
  settings: AgencySettings;
  bepHourlyRate: number;
  costsWithDepreciation: AgencyCost[];
  // + handlers CRUD para cada entidad
  handleAddCost: (cost: AgencyCost) => void;
  handleUpdateClient: (client: AgencyClient) => void;
  // ...etc
};

// Cualquier módulo hijo accede vía:
const context = useAppContext(); // hook personalizado
```

### Flujo de Datos

```
Firebase Auth
  └─► onAuthStateChanged (App.tsx)
        └─► Cargar doc Firestore (users/{uid})
              └─► Poblar estado React
                    └─► Outlet Context → Módulos
                          └─► CRUD handlers
                                └─► setState
                                      └─► useEffect → Firestore (debounced 800ms)
```

### Migración de Datos

Al primer login, `App.tsx` detecta datos en `localStorage` (versión anterior sin auth) y los migra automáticamente a Firestore.

---

## Estructura de Archivos

```
src/
├── components/
│   ├── auth/
│   │   └── LoginPage.tsx          # Email/Google sign-in y registro
│   ├── modules/
│   │   ├── Analytics.tsx          # Dashboard con gráficos (Recharts)
│   │   ├── Costs.tsx              # Gestión de costos fijos/variables
│   │   ├── Assets.tsx             # Activos y depreciación lineal
│   │   ├── Services.tsx           # Catálogo de servicios con márgenes
│   │   ├── Clients.tsx            # CRM con WhatsApp e historial
│   │   ├── Quotes.tsx             # Generador de cotizaciones + PDF
│   │   └── Simulator.tsx          # Proyección de ingresos en tiempo real
│   └── ui/
│       ├── Button.tsx             # Variantes: primary, secondary, danger, ghost
│       ├── Card.tsx               # Contenedor con bordes sutiles
│       └── Input.tsx              # Input con label integrado
├── pages/                         # Wrappers delgados de enrutamiento
├── App.tsx                        # Layout principal + proveedor de contexto
├── router.tsx                     # Definición de rutas (6 rutas principales)
├── firebase.ts                    # Config e inicialización Firebase
├── types.ts                       # Interfaces TypeScript + enums
├── main.tsx                       # Entry point
└── index.css                      # Tokens de tema + utilidades globales
```

---

## Esquema de Base de Datos (Firestore)

Colección `users` — un documento por usuario (key: Firebase UID):

```typescript
interface UserDocument {
  settings: {
    agencyName: string;
    rut: string;
    address: string;
    email: string;
    logoUrl: string;
    capacityHours: number;    // horas mensuales disponibles
  };

  costs: Array<{
    id: string;
    name: string;
    type: "FIXED" | "VARIABLE";
    amount: number;
    description?: string;
  }>;

  services: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    category: "Diseño" | "Edición" | "Video" | "Marketing" | "Otro";
    estimatedHours?: number;
  }>;

  clients: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    rut?: string;
    address?: string;
    status: "info" | "interested" | "active" | "proposal" | "unhappy" | "inactive";
    lastWhatsAppContact?: string;
    createdAt: string;
  }>;

  quotes: Array<{
    id: string;
    number: string;            // COT-YYYY-###
    clientId: string;
    items: QuoteItem[];
    subtotal: number;
    tax: number;               // 19% IVA automático
    total: number;
    status: "draft" | "sent" | "accepted" | "rejected";
    createdAt: string;
    validUntil?: string;
    deliveryDate?: string;
    notes?: string;
    terms?: string;
  }>;

  assets: Array<{
    id: string;
    name: string;
    initialValue: number;
    usefulLife: number;        // años
    purchaseDate: string;
    description?: string;
  }>;

  termTemplates: Array<{
    id: string;
    name: string;
    content: string;
  }>;

  monthlySales: Array<{
    month: string;             // formato YYYY-MM
    amount: number;
    notes?: string;
  }>;
}
```

### Valores Calculados (No Almacenados)

| Campo | Fórmula |
|---|---|
| `bepHourlyRate` | `totalCostosMensuales ÷ capacityHours` |
| `depreciaciónMensual` | `valorInicial ÷ (vidaÚtilAños × 12)` |
| `costsWithDepreciation` | `costs + depreciación virtual de assets` |
| `margenServicio` | `(precio - (horasEstimadas × bepRate)) / precio × 100` |
| `IVA` | `subtotal × 0.19` |

---

## Sistema de Diseño

### Tema (Tokens en `index.css`)

```css
@theme {
  --color-liu-primary: #FFCC00;       /* Amarillo marca */
  --color-liu-primary-text: #111111;  /* Texto sobre amarillo */
  --color-tech-bg: #111111;           /* Fondo principal */
  --color-tech-card: #1C1C1C;         /* Fondo tarjetas */
  --color-tech-deep: #0D0D0D;         /* Header, paneles profundos */
  --color-tech-purple: #7F54F5;       /* Acentos secundarios, bordes */
  --color-tech-orange: #FD8000;       /* CTAs, costos variables */
}
```

### Paleta Semántica

| Color | Uso |
|---|---|
| Emerald `#10b981` | Éxito, cotización aceptada, ganancia |
| Red `#ef4444` | Peligro, rechazo, pérdida |
| Yellow `#FFCC00` | Marca principal, botones primarios |
| Purple `#7F54F5` | Bordes de foco, acciones secundarias |
| Orange `#FD8000` | Costos variables, urgencia |

### Componentes UI Base

- **`Button`**: variantes `primary | secondary | danger | ghost`, tamaños `sm | md | lg`
- **`Card`**: contenedor con `padding` y `border` opcionales
- **`Input`**: campo con `label` integrado, estilos consistentes

---

## Módulos de Características

### 1. Analytics Dashboard (`/`)
- Grid de entrada de ventas mensuales (12 meses)
- Gráfico de barras: Ingresos vs. Gastos (Recharts `BarChart`)
- Gráfico de Punto de Equilibrio (BEP)
- Matriz anual de P&L con totales acumulados

### 2. Finanzas (`/finances`)
- **Tab Costos**: CRUD de costos fijos y variables, cálculo de tasa BEP
- **Tab Activos**: CRUD de activos, depreciación lineal mensual/anual, valor en libros actual

### 3. Catálogo de Servicios (`/services`)
- Vista grid/lista togglable
- Filtros por categoría + búsqueda por texto
- Cálculo automático de margen con badge visual (color por rango de %)
- Categorías: Diseño, Edición, Video, Marketing, Otro

### 4. Clientes (`/clients`)
- CRM con ciclo de vida: `info → interested → active → proposal → unhappy/inactive`
- Avatar generado por hash del nombre (color determinístico)
- Integración WhatsApp: genera mensaje contextual según estado, abre `wa.me/`
- Validación de número chileno (+56 9XXXXXXXX)
- Vista del historial de cotizaciones por cliente

### 5. Cotizaciones (`/quotes`)
- Layout split-pane (lista izquierda + formulario/preview derecha)
- Numeración automática `COT-YYYY-###`
- Búsqueda de cliente con react-select
- Ítems de línea dinámicos (nombre, descripción, precio, cantidad)
- IVA 19% automático
- Plantillas de términos reutilizables
- Exportación PDF con html2pdf.js (renderiza DOM → PDF)
- Estados: borrador → enviado → aceptado/rechazado

### 6. Simulador (`/simulator`)
- Sliders/inputs de cantidad por servicio
- Proyección de ingresos en tiempo real
- Barra de progreso vs. punto de equilibrio
- Indicador visual de ganancia/pérdida

---

## Despliegue

```bash
npm run dev        # Servidor de desarrollo (puerto 3000)
npm run build      # Build de producción → dist/
npm run preview    # Preview del build local
npm run deploy     # Build + push a rama gh-pages
```

**Base URL producción**: `/liu-services/` (configurada en `vite.config.ts`)

**Workaround SPA en GitHub Pages**: El `index.html` incluye un script que lee `?p=` del 404 y redirige al path correcto para que React Router maneje la navegación.

---

## Integraciones Externas

| Servicio | Tipo | Detalles |
|---|---|---|
| Firebase Auth | SDK client | Email/password + Google OAuth 2.0 |
| Firestore | SDK client | NoSQL, doc por usuario |
| WhatsApp | URL scheme | `wa.me/569XXXXXXXX?text=...` |
| Google Fonts | CSS link | Fuente Inter |
| html2pdf.js | Librería JS | Captura DOM → PDF descargable |

---

## Decisiones de Arquitectura Relevantes

1. **Sin backend propio**: Firebase elimina la necesidad de servidor, autenticación y API.
2. **Context sobre Redux**: El estado global es moderado; Outlet Context de React Router es suficiente sin agregar complejidad.
3. **Debounce 800ms en Firestore**: Evita escrituras excesivas mientras el usuario tipea.
4. **Depreciación virtual**: La depreciación de activos no se guarda como costo; se calcula en tiempo real y se inyecta en `costsWithDepreciation`.
5. **PDF client-side**: html2pdf.js permite generar PDFs sin servidor ni servicios externos.
6. **Localización chilena**: CLP, RUT, número móvil +56, WhatsApp como canal principal.
