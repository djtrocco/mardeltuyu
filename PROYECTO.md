# Alquiler Mar del Tuyú - Documento de Contexto y Arquitectura para Inteligencia Artificial

> **Versión del Sistema:** 1.0.0  
> **Fecha de Generación:** 2026-09-20  
> **Dominio:** Gestión Integral de Alquiler Temporario de Inmueble en Mar del Tuyú, Pcia. de Buenos Aires, Argentina.  
> **Tecnologías:** React 19, TypeScript 5+, Vite 8, Tailwind CSS v4, Firebase Firestore (Tiempo Real), Supabase (PostgreSQL opcional), Lucide React, Motion.

---

## 1. Resumen Ejecutivo y Propósito del Proyecto

Esta aplicación web es una plataforma integral de **gestión y control operativo de alquileres temporarios** diseñada para propietarios de inmuebles turísticos en **Mar del Tuyú (Partido de La Costa, Argentina)**.

### Objetivos Clave:
1. **Control de Flujo de Fondos (Ingresos y Saldos):** Seguimiento exacto de señas recibidas, saldos adeudados y total facturado en Pesos Argentinos (ARS) o Dólares (USD).
2. **Control de Check-In y Check-Out (Ingresos y Egresos):** Monitoreo estricto de las fechas de entrada y salida de inquilinos, control de horarios, entrega y devolución de llaves.
3. **Motor Automatizado de Avisos de 24 Horas:** Sistema proactivo que alerta exclusivamente al propietario con 24 a 48 hs de anticipación sobre qué inquilinos ingresan o egresan mañana, coordinación de limpieza y cobro del saldo restante al momento de ingresar.
4. **Gestión de Contratos de Locación:** Carga, visualización y descarga de contratos modelo y firmados en PDF o imagen (almacenados en Base64 de forma local o en la nube).
5. **Calendario Visual de Ocupación:** Grilla interactiva mensual con detección de solapamientos, días libres y transiciones inmediatas de huéspedes.
6. **Persistencia Híbrida y Resiliencia Offline:** Sincronización en tiempo real vía **Google Cloud Firestore**, con almacenamiento local de respaldo (`localStorage`) y soporte para exportación/duplicación en **Supabase (PostgreSQL)**.

---

## 2. Stack Tecnológico y Dependencias

| Capa | Herramienta | Versión | Propósito |
|---|---|---|---|
| **Frontend Framework** | React | 19.0.1 | SPA con componentes funcionales y hooks modernos |
| **Lenguaje** | TypeScript | 5.8+ / 7.0+ | Tipado estricto en todas las entidades |
| **Bundler & Dev Server** | Vite | 8.3.0 | Compilación ultrarrápida y servidor en puerto 3000 |
| **Estilos & UI** | Tailwind CSS | 4.3.3 (`@tailwindcss/vite`) | Estilizado atómico sin archivos CSS externos |
| **Iconografía** | Lucide React | 0.546.0 | Iconos limpios para acciones, estados y navegación |
| **Animaciones** | Motion | 12.23.24 | Transiciones suaves de modales y banners |
| **Base de Datos Principal** | Firebase Firestore Web SDK | 12.19.0 | Base de datos NoSQL documental en tiempo real |
| **Base de Datos Secundaria** | Supabase JS | 2.116.0 | Cliente opcional para replicar en PostgreSQL |

---

## 3. Modelo de Datos y Definiciones TypeScript (`src/types.ts`)

```typescript
// Canales por los cuales llega el huésped
export type CanalComunicacion =
  | 'WhatsApp'
  | 'Airbnb'
  | 'Booking'
  | 'Llamada telefónica'
  | 'Referido / Amigo'
  | 'Cartel en propiedad'
  | 'Facebook / Instagram'
  | 'Otro';

// Estado de la firma del contrato
export type EstadoContrato =
  | 'pendiente_envio'
  | 'enviado'
  | 'recibido_firmado';

// Estado de la reserva
export type EstadoReserva =
  | 'confirmada'
  | 'en_curso'
  | 'finalizada'
  | 'cancelada';

// Archivo adjunto (PDF / Imagen en Base64)
export interface ArchivoContrato {
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  fechaSubida: string;
  contenidoBase64: string;
}

// Configuración general del propietario y automatizaciones
export interface ConfiguracionDueno {
  nombreDueno: string;
  telefonoDueno: string;           // Ej: "+5491130078272"
  emailDueno: string;
  direccionInmueble: string;        // Ej: "Calle 8 5668 Mar del Tuyú, Pcia. Buenos Aires"
  horarioCheckIn: string;           // Ej: "10:00"
  horarioCheckOut: string;          // Ej: "10:00"
  redWifi: string;
  claveWifi: string;
  avisoDiasAnticipacion: number;    // Por defecto 1 o 2 días
  canalAvisoPreferido: 'whatsapp' | 'email' | 'ambos';
  contratoModelo?: ArchivoContrato | null;

  // Motor de avisos automatizados
  envioAutomaticoWhatsapp?: boolean;
  callmebotApiKey?: string;         // API Key para envío 100% autónomo a WhatsApp
  webhookAvisosUrl?: string;        // URL opcional (Make / Zapier / Telegram)
  notificacionesNavegador?: boolean;
  horaEnvioAviso?: string;          // Ej: "09:00"
  ultimoAvisoEnviadoFecha?: string; // YYYY-MM-DD para evitar duplicados
  ultimoAvisoEnviadoHora?: string;
  ultimoAvisoEnviadoDetalle?: string;
}

// Entidad principal: Reserva
export interface Reserva {
  id: string;
  nombre: string;                   // Nombre completo del titular
  fecha_ingreso: string;            // YYYY-MM-DD
  fecha_egreso: string;             // YYYY-MM-DD
  noches: number;                   // Calculado automáticamente
  valor_total: number;              // Monto total del alquiler
  sena: number;                     // Seña adelantada
  saldo: number;                    // Monto pendiente de cobro (valor_total - sena)
  comunicacion: CanalComunicacion;
  numero_contacto: string;          // Teléfono del inquilino
  estado_contrato: EstadoContrato;
  contrato_adjunto?: ArchivoContrato | null;
  notas?: string;                   // Cantidad de personas, autos, mascotas, etc.
  estado_reserva?: EstadoReserva;
  created_at?: string;
  updated_at?: string;
}

// Alertas dinámicas generadas en tiempo de ejecución
export interface AlertaNotificacion {
  id: string;
  tipo:
    | 'ingreso_hoy'
    | 'ingreso_proximo'
    | 'egreso_hoy'
    | 'egreso_proximo'
    | 'saldo_pendiente'
    | 'contrato_pendiente';
  titulo: string;
  descripcion: string;
  fecha: string;
  reserva: Reserva;
  urgencia: 'alta' | 'media' | 'baja';
}

// Métricas y balances mensuales
export interface ReporteMensual {
  mesClave: string;                 // YYYY-MM
  nombreMes: string;
  ano: number;
  totalFacturado: number;
  totalCobrado: number;             // Señas + saldos saldados
  totalSaldoPendiente: number;
  cantidadReservas: number;
  nochesOcupadas: number;
  tarifaPromedioNoche: number;
}
```

---

## 4. Estructura de Directorios del Código Fuente

```text
├── .env.example                     # Variables de entorno documentadas
├── firebase-applet-config.json      # Credenciales de Google Cloud Firebase del proyecto
├── firebase-blueprint.json          # Esquema de colecciones Firestore
├── firestore.rules                  # Reglas de seguridad de Firestore
├── supabase_schema.sql              # Esquema SQL relacional para PostgreSQL en Supabase
├── index.html                       # Entry point HTML con viewport y metadatos
├── metadata.json                    # Metadatos del entorno AI Studio
├── package.json                     # Scripts y dependencias npm
├── tsconfig.json                    # Configuración TypeScript
├── vite.config.ts                   # Configuración Vite con plugin Tailwind v4 y React
├── public/
│   ├── PROYECTO.md                  # Este documento accesible vía web
│   └── assets/
└── src/
    ├── main.tsx                     # Montaje React, StrictMode y captura de advertencias
    ├── App.tsx                      # Controlador raíz: estado global, tabs, modales, subscripciones
    ├── types.ts                     # Definiciones e interfaces de dominio
    ├── index.css                    # Directiva `@import "tailwindcss";`
    ├── data/
    │   └── initialData.ts           # Reservas de ejemplo para onboarding inicial
    ├── components/
    │   ├── Navbar.tsx               # Barra de navegación, estado Firebase/PostgreSQL y tabs
    │   ├── ReservasView.tsx         # Listado, filtros por fecha/estado, cards, acciones WhatsApp
    │   ├── CalendarioView.tsx       # Calendario mensual interactivo con barras de estadía
    │   ├── ReportesView.tsx         # Balances financieros, ingresos totales y KPIs por mes
    │   ├── ConfiguracionView.tsx    # Configuración del dueño, datos WiFi, contratos, API CallMeBot
    │   ├── NotificationsBanner.tsx  # Banner superior con botón directo de aviso 24hs al dueño
    │   ├── NotificationsModal.tsx   # Modal detallado con alertas clasificadas por urgencia
    │   ├── ReservaModal.tsx         # Formulario de alta y edición con cálculo automático de noches y saldos
    │   ├── ContratoModal.tsx        # Visor / Carga de contrato en base64
    │   ├── ConfirmDeleteModal.tsx   # Modal de confirmación para eliminar reservas
    │   └── SupabaseConfigModal.tsx  # Modal para conectar URL y Anon Key de Supabase
    └── lib/
        ├── firebase.ts              # Cliente Firestore, fallback offline y suscripciones en tiempo real
        ├── autoAlertsEngine.ts      # Motor de despacho autónomo para avisos de 24 horas al dueño
        ├── configStorage.ts         # Lectura/escritura de configuración del dueño (Local + Cloud)
        ├── formatters.ts            # Formateo de moneda ARS, fechas, horas y generadores de textos WhatsApp
        ├── supabase.ts              # Adaptador y sincronizador hacia Supabase
        └── sqlSchema.ts             # Script generador de tablas SQL para PostgreSQL
```

---

## 5. Módulos Principales y Lógica de Negocio

### 5.1 Conexión con Firebase Firestore (`src/lib/firebase.ts`)
- **ID de Base de Datos:** `ai-studio-alquilermardeltu-4c65e632-3e25-465c-ab61-5b169f2d66d9`.
- **Estrategia de Conexión:** Utiliza `initializeFirestore` con `experimentalForceLongPolling: true`. Esto evita los errores `[code=unavailable]` provocados por proxys, firewalls o iframes que bloquean WebSockets/WebChannel.
- **Colecciones:**
  - `/reservas`: Cada documento almacena una reserva con su ID.
  - `/configuracion/dueno`: Documento único que sincroniza los datos de contacto y preferencias del dueño en todos sus dispositivos.
- **Suscripción en Tiempo Real:** Las funciones `subscribeToReservas` y `subscribeToConfiguracionDueno` escuchan cambios con `onSnapshot`. Si la conexión se pierde momentáneamente, se devuelve inmediatamente la caché local para no bloquear la interfaz.

### 5.2 Motor de Alertas Automáticas de 24 Horas (`src/lib/autoAlertsEngine.ts`)
Este motor está programado para resolver la necesidad operativa más crítica del propietario: **saber exactamente qué hacer el día previo a un movimiento.**

- **Algoritmo de Detección:**
  - Evalúa la fecha actual (`hoy`) y calcula la fecha de mañana (`manana`).
  - Identifica inquilinos que ingresan mañana (`fecha_ingreso === manana`):
    - *Acción:* Cobrar saldo pendiente en efectivo/transferencia al entregar llave, coordinar horario de check-in (ej: 10:00 hs), verificar que la casa esté limpia y enviar datos de WiFi.
  - Identifica inquilinos que egresan mañana (`fecha_egreso === manana`):
    - *Acción:* Coordinar revisión del estado del inmueble, devolución de llaves y programación del equipo de limpieza antes del próximo ingreso.
- **Prevención de Spam y Duplicados:**
  - Compara `ultimoAvisoEnviadoFecha` con `hoy` (formato `YYYY-MM-DD`). Solo ejecuta el despacho si aún no se ha enviado en la jornada actual.
- **Canales de Notificación Soportados:**
  1. **WhatsApp Directo (1 clic):** Genera la URL con `https://wa.me/{telefonoDueno}?text={mensaje}` con formato pre-redactado y profesional.
  2. **CallMeBot API (100% Desatendido):** Permite enviar mensajes automáticos a WhatsApp sin intervención humana utilizando una API Key personal gratuita.
  3. **Notificaciones Push del Navegador:** Mediante la Notification API de HTML5.
  4. **Webhooks:** Envío por HTTP POST hacia Make, Zapier o bots de Telegram.

### 5.3 Generador de Mensajes para Huéspedes (`src/lib/formatters.ts`)
La aplicación permite al dueño enviar con un solo clic desde la lista de reservas:
1. **Mensaje de Bienvenida e Instrucciones de Llegada:**
   - Dirección exacta en Mar del Tuyú.
   - Horario de check-in y recordatorio del saldo restante a pagar.
   - Nombre de la red y contraseña del WiFi.
2. **Recordatorio de Saldo Pendiente:**
   - Mensaje cortés recordando el monto que debe abonarse al recibir las llaves.
3. **Coordinación de Salida (Check-Out):**
   - Horario de entrega de llaves e instrucciones para dejar el inmueble en orden.

---

## 6. Esquema de Base de Datos Relacional (PostgreSQL en Supabase)

Para exportar o integrar con PostgreSQL, se incluye el archivo `supabase_schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS reservas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_ingreso DATE NOT NULL,
  fecha_egreso DATE NOT NULL,
  noches INTEGER NOT NULL,
  valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sena NUMERIC(12, 2) NOT NULL DEFAULT 0,
  saldo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  comunicacion TEXT NOT NULL DEFAULT 'WhatsApp',
  numero_contacto TEXT NOT NULL,
  estado_contrato TEXT NOT NULL DEFAULT 'pendiente_envio',
  notas TEXT,
  estado_reserva TEXT NOT NULL DEFAULT 'confirmada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracion_dueno (
  id TEXT PRIMARY KEY DEFAULT 'dueno',
  nombre_dueno TEXT,
  telefono_dueno TEXT,
  email_dueno TEXT,
  direccion_inmueble TEXT,
  horario_check_in TEXT DEFAULT '10:00',
  horario_check_out TEXT DEFAULT '10:00',
  red_wifi TEXT,
  clave_wifi TEXT,
  aviso_dias_anticipacion INTEGER DEFAULT 1,
  envio_automatico_whatsapp BOOLEAN DEFAULT TRUE,
  callmebot_api_key TEXT,
  webhook_avisos_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Directrices y Reglas para Otras Inteligencias Artificiales

Si vas a continuar el desarrollo de este software mediante otro modelo o asistente de IA, ten en cuenta estas directrices obligatorias:

1. **Idioma y Localismo:** El sistema está adaptado para **Argentina**. Las fechas deben manejarse con formato visual `DD/MM/YYYY` (aunque internamente se guarden como `YYYY-MM-DD`), la moneda es `$ ARS` (o `USD` si se especifica), y las comunicaciones de WhatsApp usan lenguaje rioplatense cordial ("Hola Juan, te escribo del alquiler de Mar del Tuyú...").
2. **Respeto por el Número del Propietario:** Las alertas y notificaciones automáticas del motor `autoAlertsEngine` van dirigidas **exclusivamente al dueño** (`config.telefonoDueno`). Nunca se deben enviar avisos internos o recordatorios de tareas domésticas al número del inquilino.
3. **No romper la compatibilidad Long-Polling:** Si modificas `src/lib/firebase.ts`, mantén siempre `experimentalForceLongPolling: true` para prevenir desconexiones en proxies o sandboxes.
4. **Calculo de Noches:** La cantidad de noches siempre se calcula como la diferencia en días entre `fecha_egreso` y `fecha_ingreso`. `saldo` siempre debe ser `valor_total - sena`.
5. **Iconos:** Todos los iconos deben provenir estrictamente de `lucide-react`.
6. **Estilos:** Únicamente clases utilitarias de Tailwind CSS v4. No crear archivos `.css` adicionales ni estilos inline.

---

## 8. Formato de Prompt Recomendado para Cargar en Otra IA

Copia y pega el siguiente bloque en la nueva IA junto con este archivo:

```text
Actúa como un Desarrollador Senior Full Stack experto en React 19, TypeScript, Tailwind CSS y Firebase.
He adjuntado el archivo PROYECTO.md que describe en detalle la arquitectura, tipos, estado y propósito de la aplicación "Alquiler Mar del Tuyú".
Por favor analiza el archivo adjunto y confirma que comprendes la lógica del negocio, el modelo de datos y las reglas del sistema.
Quedo a la espera de tu confirmación para indicarte la siguiente funcionalidad a desarrollar.
```
