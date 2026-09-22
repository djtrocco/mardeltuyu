export type CanalComunicacion =
  | 'WhatsApp'
  | 'Airbnb'
  | 'Booking'
  | 'Llamada telefónica'
  | 'Referido / Amigo'
  | 'Cartel en propiedad'
  | 'Facebook / Instagram'
  | 'Otro';

export type EstadoContrato =
  | 'pendiente_envio'
  | 'enviado'
  | 'recibido_firmado';

export type EstadoReserva =
  | 'confirmada'
  | 'en_curso'
  | 'finalizada'
  | 'cancelada';

export interface ArchivoContrato {
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  fechaSubida: string;
  contenidoBase64: string;
}

export interface ConfiguracionDueno {
  nombreDueno: string;
  telefonoDueno: string;
  emailDueno: string;
  direccionInmueble: string;
  horarioCheckIn: string;
  horarioCheckOut: string;
  redWifi: string;
  claveWifi: string;
  avisoDiasAnticipacion: number;
  canalAvisoPreferido: 'whatsapp' | 'email' | 'ambos';
  contratoModelo?: ArchivoContrato | null;
  // Automatización de avisos al propietario
  envioAutomaticoWhatsapp?: boolean;
  callmebotApiKey?: string;
  webhookAvisosUrl?: string;
  notificacionesNavegador?: boolean;
  horaEnvioAviso?: string;
  ultimoAvisoEnviadoFecha?: string;
  ultimoAvisoEnviadoHora?: string;
  ultimoAvisoEnviadoDetalle?: string;
}

export interface RegistroAvisoDueno {
  id: string;
  fecha: string;
  timestamp: string;
  tipo: 'whatsapp_directo' | 'callmebot_api' | 'webhook' | 'notificacion_navegador';
  telefonoDestino: string;
  destinatario: 'dueno';
  resumen: string;
  exitoso: boolean;
}

export interface Reserva {
  id: string;
  nombre: string;
  fecha_ingreso: string; // Formato YYYY-MM-DD
  fecha_egreso: string;  // Formato YYYY-MM-DD
  noches: number;
  valor_total: number;
  sena: number;
  saldo: number;
  comunicacion: CanalComunicacion;
  numero_contacto: string;
  estado_contrato: EstadoContrato;
  contrato_adjunto?: ArchivoContrato | null;
  notas?: string;
  estado_reserva?: EstadoReserva;
  created_at?: string;
  updated_at?: string;
}

export interface AlertaNotificacion {
  id: string;
  tipo: 'ingreso_hoy' | 'ingreso_proximo' | 'egreso_hoy' | 'egreso_proximo' | 'saldo_pendiente' | 'contrato_pendiente';
  titulo: string;
  descripcion: string;
  fecha: string;
  reserva: Reserva;
  urgencia: 'alta' | 'media' | 'baja';
}

export interface ReporteMensual {
  mesClave: string; // YYYY-MM
  nombreMes: string;
  ano: number;
  totalFacturado: number;
  totalCobrado: number; // Señas + pagos de saldos
  totalSaldoPendiente: number;
  cantidadReservas: number;
  nochesOcupadas: number;
  tarifaPromedioNoche: number;
}
