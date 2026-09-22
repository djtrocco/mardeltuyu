import { ConfiguracionDueno, ArchivoContrato, Reserva, AlertaNotificacion } from '../types';
import { formatCurrency, formatDateShort } from './formatters';

const STORAGE_KEY_CONFIG_DUENO = 'mardeltuyu_config_dueno_v1';

export const DEFAULT_CONFIG_DUENO: ConfiguracionDueno = {
  nombreDueno: 'Dueño Mar del Tuyú',
  telefonoDueno: '',
  emailDueno: '',
  direccionInmueble: 'Calle 74 e/ 2 y 3, Mar del Tuyú, Pcia. Buenos Aires',
  horarioCheckIn: '14:00',
  horarioCheckOut: '10:00',
  redWifi: 'AlquilerMarDelTuyu',
  claveWifi: 'verano2025',
  avisoDiasAnticipacion: 2,
  canalAvisoPreferido: 'whatsapp',
  contratoModelo: null,
  envioAutomaticoWhatsapp: true,
  callmebotApiKey: '8811549',
  webhookAvisosUrl: '',
  notificacionesNavegador: true,
  horaEnvioAviso: '09:00',
};

export function getConfiguracionDueno(): ConfiguracionDueno {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG_DUENO);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG_DUENO, ...parsed };
    }
  } catch (e) {
    console.error('Error al leer configuracion del dueno:', e);
  }
  return DEFAULT_CONFIG_DUENO;
}

export function saveConfiguracionDueno(config: ConfiguracionDueno): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG_DUENO, JSON.stringify(config));
  } catch (e) {
    console.error('Error al guardar configuracion del dueno:', e);
  }
}

/**
 * Convierte un File a objeto ArchivoContrato con Base64
 */
export async function fileToArchivoContrato(file: File): Promise<ArchivoContrato> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          nombreArchivo: file.name,
          tipoMime: file.type || 'application/octet-stream',
          tamanoBytes: file.size,
          fechaSubida: new Date().toISOString(),
          contenidoBase64: reader.result,
        });
      } else {
        reject(new Error('No se pudo leer el archivo'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Descarga el archivo de contrato guardado
 */
export function descargarArchivoContrato(contrato: ArchivoContrato) {
  const link = document.createElement('a');
  link.href = contrato.contenidoBase64;
  link.download = contrato.nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera el aviso individual de 24 hs para el PROPIETARIO sobre un ingreso de mañana
 */
export function generarAvisoDuenoIngreso24hs(dueno: ConfiguracionDueno, res: Reserva): string {
  const manana = formatDateShort(res.fecha_ingreso);
  let msg = `🔔 *ALERTA 24 HS PROPIETARIO - MAR DEL TUYÚ*\n`;
  msg += `Mañana ingresa un nuevo huésped a tu propiedad.\n\n`;
  msg += `👤 *Huésped:* ${res.nombre}\n`;
  msg += `📅 *Fecha de entrada:* Mañana ${manana}\n`;
  msg += `🕒 *Horario Check-in:* ${dueno.horarioCheckIn || '14:00'} hs\n`;
  msg += `🌙 *Estadía:* ${res.noches} noches (egreso: ${formatDateShort(res.fecha_egreso)})\n`;
  msg += `📞 *Teléfono huésped:* ${res.numero_contacto} (${res.comunicacion})\n`;
  if (res.saldo > 0) {
    msg += `💰 *SALDO A COBRAR AL ENTRAR:* ${formatCurrency(res.saldo)} (Seña: ${formatCurrency(res.sena)})\n`;
  } else {
    msg += `✅ *PAGO:* 100% abonado (Total: ${formatCurrency(res.valor_total)})\n`;
  }
  msg += `\n🔑 *TAREAS DE CONTROL PREVIO (24 HS):*\n`;
  msg += `• Chequear que la casa esté limpia y ventilada.\n`;
  msg += `• Confirmar horario estimado de llegada con ${res.nombre}.\n`;
  msg += `• Preparar entrega de llaves e inventario.\n`;
  if (res.saldo > 0) {
    msg += `• Recordar cobrar el saldo pendiente de ${formatCurrency(res.saldo)} antes de entregar la llave.\n`;
  }
  msg += `\n_Alerta automática generada para el propietario (Tel: ${dueno.telefonoDueno || 'Configurado en el panel'})._`;
  return msg;
}

/**
 * Genera el aviso individual de 24 hs para el PROPIETARIO sobre un egreso de mañana
 */
export function generarAvisoDuenoEgreso24hs(dueno: ConfiguracionDueno, res: Reserva): string {
  const manana = formatDateShort(res.fecha_egreso);
  let msg = `🔔 *ALERTA 24 HS PROPIETARIO - MAR DEL TUYÚ*\n`;
  msg += `Mañana finaliza una estadía y se retira el huésped.\n\n`;
  msg += `👤 *Huésped:* ${res.nombre}\n`;
  msg += `📅 *Fecha de salida:* Mañana ${manana}\n`;
  msg += `🕚 *Horario límite Check-out:* ${dueno.horarioCheckOut || '10:00'} hs\n`;
  msg += `📞 *Teléfono huésped:* ${res.numero_contacto}\n`;
  if (res.saldo > 0) {
    msg += `⚠️ *ATENCIÓN - SALDO IMPAGO:* ${formatCurrency(res.saldo)}\n`;
  } else {
    msg += `✅ Cuenta saldada al 100%.\n`;
  }
  msg += `\n🔑 *TAREAS DE CONTROL PREVIO (24 HS):*\n`;
  msg += `• Coordinar horario de entrega y recepción de llaves.\n`;
  msg += `• Inspección del estado de la propiedad y artefactos.\n`;
  msg += `• Programar recambio de ropa blanca y limpieza para el próximo ingreso.\n`;
  msg += `\n_Alerta automática generada para el propietario (Tel: ${dueno.telefonoDueno || 'Configurado en el panel'})._`;
  return msg;
}

/**
 * Genera el texto del aviso de control con 24 hs de antelación para el WhatsApp del dueño
 */
export function generarMensajeAvisosParaDueno(
  dueno: ConfiguracionDueno,
  reservas: Reserva[],
  alertas: AlertaNotificacion[]
): string {
  const hoy = new Date();
  const hoyFormatted = hoy.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Cálculo de la fecha de mañana (24 hs de antelación)
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  const mananaStr = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const ingresos24hs = reservas.filter(
    r => r.fecha_ingreso === mananaStr && r.estado_reserva !== 'cancelada'
  );
  const egresos24hs = reservas.filter(
    r => r.fecha_egreso === mananaStr && r.estado_reserva !== 'cancelada'
  );
  const ingresosHoy = reservas.filter(
    r => r.fecha_ingreso === hoyStr && r.estado_reserva !== 'cancelada'
  );
  const egresosHoy = reservas.filter(
    r => r.fecha_egreso === hoyStr && r.estado_reserva !== 'cancelada'
  );
  const saldosPendientes = reservas.filter(
    r => r.saldo > 0 && r.estado_reserva !== 'cancelada'
  );
  const contratosFaltantes = reservas.filter(
    r => r.estado_contrato !== 'recibido_firmado' && r.estado_reserva !== 'cancelada'
  );

  let msg = `🔔 *AVISO DE CONTROL (24 HS DE ANTELACIÓN) - CASA MAR DEL TUYÚ*\n`;
  msg += `⏱️ *Finalidad:* Control y organización previa de la propiedad con 24 hs de anticipación.\n`;
  msg += `📅 *Fecha de emisión:* ${hoyFormatted}\n`;
  msg += `📍 *Inmueble:* ${dueno.direccionInmueble || 'Mar del Tuyú'}\n\n`;

  // Ingresos con 24 hs de antelación (Mañana)
  msg += `📥 *INGRESOS EN 24 HORAS (MAÑANA ${formatDateShort(mananaStr)}):* (${ingresos24hs.length})\n`;
  if (ingresos24hs.length > 0) {
    ingresos24hs.forEach(r => {
      msg += `• *${r.nombre}* (${r.noches} noches) - Check-in: ${dueno.horarioCheckIn || '14:00'} hs\n`;
      msg += `  📞 Tel: ${r.numero_contacto} (${r.comunicacion})\n`;
      msg += `  🔑 Preparación: Coordinar llegada, chequear limpieza y entrega de llaves.\n`;
      if (r.saldo > 0) {
        msg += `  ⚠️ Saldo a cobrar al entrar: ${formatCurrency(r.saldo)} (Seña: ${formatCurrency(r.sena)})\n`;
      } else {
        msg += `  ✅ Totalmente saldado\n`;
      }
    });
  } else {
    msg += `• Sin ingresos programados para mañana (en 24 hs).\n`;
  }
  msg += `\n`;

  // Egresos con 24 hs de antelación (Mañana)
  msg += `📤 *EGRESOS EN 24 HORAS (MAÑANA ${formatDateShort(mananaStr)}):* (${egresos24hs.length})\n`;
  if (egresos24hs.length > 0) {
    egresos24hs.forEach(r => {
      msg += `• *${r.nombre}* - Check-out hasta las ${dueno.horarioCheckOut || '10:00'} hs\n`;
      msg += `  🔑 Control: Coordinar horario de salida, llaves, inspección y recambio.\n`;
      if (r.saldo > 0) {
        msg += `  ⚠️ ATENCIÓN: Saldo pendiente impago de ${formatCurrency(r.saldo)}\n`;
      }
    });
  } else {
    msg += `• Sin salidas programadas para mañana (en 24 hs).\n`;
  }
  msg += `\n`;

  // Movimientos de hoy (si existieran)
  if (ingresosHoy.length > 0 || egresosHoy.length > 0) {
    msg += `📌 *RECORDATORIO DE MOVIMIENTOS HOY (${formatDateShort(hoyStr)}):*\n`;
    if (ingresosHoy.length > 0) {
      msg += `  • Ingresan hoy: ${ingresosHoy.map(r => `${r.nombre} (${r.noches} nts)`).join(', ')}\n`;
    }
    if (egresosHoy.length > 0) {
      msg += `  • Egresan hoy: ${egresosHoy.map(r => r.nombre).join(', ')}\n`;
    }
    msg += `\n`;
  }

  // Saldos
  msg += `💰 *SALDOS PENDIENTES DE COBRO (${saldosPendientes.length}):*\n`;
  if (saldosPendientes.length > 0) {
    saldosPendientes.slice(0, 5).forEach(r => {
      msg += `• ${r.nombre} (${formatDateShort(r.fecha_ingreso)}): ${formatCurrency(r.saldo)}\n`;
    });
  } else {
    msg += `• No hay saldos pendientes. ¡Todo al día!\n`;
  }
  msg += `\n`;

  // Contratos
  if (contratosFaltantes.length > 0) {
    msg += `📑 *CONTRATOS PENDIENTES DE FIRMA:* ${contratosFaltantes.length} contratos.\n`;
  }

  msg += `\n_Aviso automático generado con 24 hs de anticipación desde el panel de Mar del Tuyú._`;
  return msg;
}

/**
 * Genera el enlace mailto para enviar aviso de control por correo al dueño
 */
export function generarMailtoAvisosParaDueno(
  dueno: ConfiguracionDueno,
  reservas: Reserva[],
  alertas: AlertaNotificacion[]
): string {
  if (!dueno.emailDueno) return '';

  const asunto = encodeURIComponent(`Aviso de Control (24 hs de antelación) - Mar del Tuyú`);
  const cuerpoTexto = generarMensajeAvisosParaDueno(dueno, reservas, alertas);
  const cuerpo = encodeURIComponent(cuerpoTexto.replace(/\*/g, ''));

  return `mailto:${dueno.emailDueno}?subject=${asunto}&body=${cuerpo}`;
}
