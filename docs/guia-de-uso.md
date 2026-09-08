# Liu Services — Guía de Uso

## ¿Qué es Liu Services?

Liu Services es una plataforma web gratuita diseñada para **agencias creativas y freelancers** que necesitan gestionar sus finanzas, servicios, clientes y cotizaciones desde un solo lugar.

Funciona directamente en el navegador — no requiere instalación. Tus datos se guardan automáticamente en la nube.

---

## Primeros Pasos

### 1. Acceder a la plataforma

Abre la aplicación en tu navegador. Verás la pantalla de inicio de sesión.

Tienes dos opciones:
- **Iniciar sesión con Google** — recomendado, un clic y listo.
- **Crear cuenta con email** — ingresa tu correo y contraseña.

> Tus datos están ligados a tu cuenta. Puedes acceder desde cualquier dispositivo con conexión a internet.

---

### 2. Configurar tu agencia (obligatorio al inicio)

Antes de usar los módulos, configura los datos de tu agencia:

1. Haz clic en el **ícono de engranaje** (⚙️) en la esquina superior derecha del header.
2. Se abrirá el panel de configuración. Completa:

| Campo | Descripción |
|---|---|
| **Nombre de la agencia** | Aparece en cotizaciones y header |
| **RUT** | Para documentos formales |
| **Dirección** | Dirección de tu empresa |
| **Email** | Correo de contacto |
| **URL del Logo** | Link directo a tu imagen (PNG/JPG) |
| **Capacidad en horas/mes** | Cuántas horas facturables tienes al mes |

3. Guarda los cambios.

> **¿Por qué la capacidad en horas?** Es el dato clave para calcular tu **tasa de punto de equilibrio** (cuánto debes cobrar por hora para cubrir todos tus costos).

---

## Módulos de la Plataforma

La navegación principal tiene 6 módulos. Se recomienda configurarlos en este orden la primera vez.

---

## MÓDULO 1: Finanzas

**Ruta**: `/finances` | **Ícono**: wallet / carpeta

Este módulo tiene dos pestañas: **Costos** y **Activos**.

### Tab — Costos

Aquí registras todo lo que te cuesta operar tu agencia cada mes.

**Tipos de costo:**
- **Fijo**: monto estable todos los meses (ej: arriendo, sueldos, suscripciones de software).
- **Variable**: varía según la actividad (ej: materiales por proyecto, subcontratos, comisiones).

**Para agregar un costo:**
1. Haz clic en **"Agregar Costo"**.
2. Completa nombre, tipo (fijo/variable) y monto mensual.
3. Guarda.

**Lo que verás en los KPIs superiores:**
- Total de costos mensuales
- Desglose fijos vs. variables
- **Tasa BEP por hora** = Total costos ÷ Horas de capacidad

> La **Tasa BEP** es el número más importante de tu agencia. Si cobras menos que eso por hora, pierdes dinero.

---

### Tab — Activos

Registra equipos, software, mobiliario u otros bienes de tu agencia.

**Para agregar un activo:**
1. Haz clic en **"Agregar Activo"**.
2. Completa: nombre, valor inicial, vida útil en años, fecha de compra.
3. Guarda.

**Lo que se calcula automáticamente:**
- Depreciación mensual = Valor inicial ÷ (Vida útil × 12)
- Depreciación anual
- Valor en libros actual (cuánto vale hoy según su depreciación)

> La depreciación mensual se suma automáticamente a tus costos en los demás módulos. No necesitas registrarla manualmente como costo.

---

## MÓDULO 2: Servicios

**Ruta**: `/services` | **Ícono**: grid/caja

Crea un catálogo de los servicios que ofrece tu agencia.

### Agregar un servicio

1. Clic en **"Nuevo Servicio"**.
2. Completa:
   - **Nombre**: ej. "Diseño de logo"
   - **Categoría**: Diseño / Edición / Video / Marketing / Otro
   - **Descripción**: detalla qué incluye
   - **Precio de venta**
   - **Horas estimadas** (opcional pero recomendado)
3. Guarda.

### Entender el badge de margen

Si ingresas horas estimadas, verás un badge de color en cada servicio:

| Color | Margen | Interpretación |
|---|---|---|
| Verde | > 40% | Excelente rentabilidad |
| Amarillo | 20% – 40% | Rentabilidad aceptable |
| Naranja | 0% – 20% | Margen muy ajustado |
| Rojo | < 0% | Estás perdiendo dinero |

> El margen se calcula así: `(Precio - Costo Hora BEP × Horas Estimadas) / Precio × 100`

### Buscar y filtrar servicios

- Usa la barra de búsqueda para filtrar por nombre o descripción.
- Usa los botones de categoría para ver solo un tipo de servicio.
- Alterna entre **vista en grid** y **vista en lista** con los botones de layout.

---

## MÓDULO 3: Clientes

**Ruta**: `/clients` | **Ícono**: personas

CRM básico para gestionar tus relaciones con clientes.

### Agregar un cliente

1. Clic en **"Nuevo Cliente"**.
2. Completa los datos: nombre, empresa, email, teléfono, RUT, dirección.
3. Asigna un **estado inicial** (ver tabla abajo).
4. Guarda.

### Estados del cliente

| Estado | Significado |
|---|---|
| **Info** | Solo pediste información, no hay relación todavía |
| **Interesado** | Mostró interés en tus servicios |
| **Propuesta** | Le enviaste una cotización |
| **Activo** | Está trabajando contigo actualmente |
| **Insatisfecho** | Tuvo problemas con el servicio |
| **Inactivo** | Ya no es un cliente activo |

Actualiza el estado a medida que avanza la relación.

### Contactar por WhatsApp

Cada tarjeta de cliente tiene un botón **"Mensaje WhatsApp"**. Al hacer clic:

1. Se genera un mensaje predeterminado según el estado del cliente.
2. Se abre WhatsApp Web (o la app en móvil) con el mensaje prellenado.
3. Solo debes enviarlo.

> Requiere que el número esté en formato chileno: `+56 9 XXXX XXXX`.

### Ver historial de cotizaciones

En cada cliente puedes ver las cotizaciones que le has enviado, con su estado (borrador, enviada, aceptada, rechazada).

---

## MÓDULO 4: Cotizaciones

**Ruta**: `/quotes` | **Ícono**: documento

Genera propuestas comerciales profesionales en PDF.

### Crear una cotización

1. Clic en **"Nueva Cotización"**.
2. **Selecciona el cliente** — busca por nombre en el dropdown.
3. **Agrega ítems**:
   - Busca en tu catálogo de servicios, o
   - Agrega una línea personalizada.
   - Edita nombre, descripción, precio y cantidad de cada ítem.
4. Configura fechas:
   - Fecha de emisión
   - Válida hasta
   - Fecha de entrega estimada
5. Agrega **términos y condiciones** (escribe libremente o selecciona una plantilla).
6. Cambia el **estado** según corresponda.

### Estados de cotización

| Estado | Color | Significado |
|---|---|---|
| **Borrador** | Gris | En preparación, no enviada |
| **Enviada** | Azul | El cliente la recibió |
| **Aceptada** | Verde | Proyecto confirmado |
| **Rechazada** | Rojo | El cliente declinó |

### Exportar a PDF

1. Con la cotización abierta, clic en **"Descargar PDF"**.
2. Se genera un PDF con:
   - Logo y datos de tu agencia
   - Datos del cliente
   - Tabla de ítems con subtotales
   - IVA 19% calculado
   - Total final
   - Términos y condiciones
3. El archivo se descarga a tu computador.

### Plantillas de términos

Puedes guardar plantillas reutilizables en la configuración para no escribir los mismos términos cada vez (ej: "Pago 50% adelanto, 50% al entregar", "Incluye 2 revisiones").

---

## MÓDULO 5: Simulador

**Ruta**: `/simulator` | **Ícono**: gráfico

Proyecta tus ingresos antes de comprometerte con metas de venta.

### Cómo usar el Simulador

1. Ingresa cuántas unidades venderías de cada servicio de tu catálogo.
2. El simulador calcula en tiempo real:
   - **Ingreso proyectado total**
   - **Punto de equilibrio** (barra de progreso)
   - Si estás en **ganancia** (verde) o **pérdida** (rojo)

### Caso de uso típico

> "Si en este mes vendo 3 diseños de logo, 2 ediciones de video y 1 estrategia de contenido... ¿cubriría mis costos?"

El simulador responde esa pregunta instantáneamente.

---

## MÓDULO 6: Analytics Dashboard

**Ruta**: `/` (inicio) | **Ícono**: gráfico de barras

Vista general del desempeño de tu agencia.

### Registrar ventas mensuales

En la tabla de los 12 meses del año:
1. Ingresa el monto facturado en cada mes.
2. Los gráficos se actualizan automáticamente.

### Gráficos disponibles

| Gráfico | Qué muestra |
|---|---|
| **Ingresos vs. Gastos** | Barras comparativas mes a mes |
| **Punto de Equilibrio** | Curva de BEP y ventas acumuladas |
| **Matriz P&L** | Ganancia/pérdida mensual y acumulada anual |

> Usa este módulo para hacer tu cierre mensual y planificación trimestral.

---

## Flujo de Trabajo Recomendado

### Configuración inicial (una vez)

```
1. Configura tu agencia (nombre, logo, RUT, horas)
2. Agrega tus costos fijos y variables
3. Registra tus activos con su depreciación
4. Crea tu catálogo de servicios
```

### Operación mensual

```
1. Registra ventas del mes en Analytics
2. Agrega nuevos clientes que lleguen
3. Actualiza estado de clientes existentes
4. Genera cotizaciones cuando corresponda
5. Usa el Simulador para proyectar antes de cerrar el mes
```

### Por proyecto

```
1. Crea/busca el cliente
2. Genera cotización desde el catálogo
3. Descarga PDF y envíalo
4. Actualiza estado según respuesta
5. Al completar, registra el ingreso en Analytics
```

---

## Preguntas Frecuentes

**¿Mis datos se guardan automáticamente?**
Sí. Liu Services sincroniza con la nube en cuanto haces un cambio. No necesitas hacer clic en "guardar" en la mayoría de las acciones.

**¿Puedo usar la plataforma desde mi celular?**
Sí. Es responsive y funciona en móvil, aunque la experiencia es óptima en escritorio.

**¿Qué pasa si cierro el navegador?**
Tus datos están en la nube. Al volver a iniciar sesión, todo estará exactamente igual.

**¿Puedo tener varias agencias?**
Actualmente, cada cuenta gestiona una agencia. Para múltiples agencias necesitarías cuentas separadas.

**¿El PDF que genera es legal en Chile?**
Liu Services genera el documento. Para que sea una boleta o factura legal debes emitirla a través del SII. Liu Services es un generador de **cotizaciones y propuestas comerciales**, no documentos tributarios.

**¿Cómo agrego el logo de mi agencia?**
Necesitas una URL pública de la imagen (puedes subirla a Google Drive, Dropbox, Cloudinary u otro servicio y copiar el enlace directo). Pega ese enlace en el campo "URL del Logo" de la configuración.

**¿El IVA se puede modificar?**
Actualmente está fijo en 19% según la normativa chilena.

---

## Atajos y Tips

- **Vista grid/lista** en Servicios: cambia la densidad visual según prefieras.
- **Búsqueda de cliente en cotización**: escribe las primeras letras y selecciona del dropdown.
- **Numeración automática**: las cotizaciones se numeran como `COT-2025-001`, `COT-2025-002`, etc.
- **Colores de avatar en clientes**: se generan automáticamente según el nombre, para identificación rápida.
- **Plantillas de términos**: créalas una vez en configuración y reutilízalas en cada cotización.

---

## Glosario

| Término | Definición |
|---|---|
| **BEP (Punto de Equilibrio)** | Ingreso mínimo para cubrir todos los costos sin ganancias ni pérdidas |
| **Tasa BEP por hora** | Total costos mensuales ÷ Horas de capacidad = Costo mínimo por hora |
| **Depreciación lineal** | Reducción del valor de un activo distribuida en partes iguales durante su vida útil |
| **Costo fijo** | Gasto que no varía según la cantidad de trabajo (ej: arriendo) |
| **Costo variable** | Gasto que depende del volumen de trabajo (ej: materiales por proyecto) |
| **Capacidad en horas** | Horas mensuales disponibles para vender o trabajar en proyectos |
| **RUT** | Rol Único Tributario — identificador fiscal en Chile |
| **IVA** | Impuesto al Valor Agregado (19% en Chile) |
| **Margen bruto** | Diferencia entre precio de venta y costo directo del servicio |
| **P&L** | Profit & Loss — Estado de ganancias y pérdidas |
