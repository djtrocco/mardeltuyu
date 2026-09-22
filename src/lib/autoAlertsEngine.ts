import { ConfiguracionDueno, Reserva, AlertaNotificacion, RegistroAvisoDueno } from '../types';
import { cleanPhoneNumber, createWhatsAppUrl, formatDateShort, formatCurrency } from './formatters';
import {
  generarAvisoDuenoIngreso24hs,
  generarAvisoDuenoEgreso24hs,
  generarMensajeAvisosParaDueno,
  saveConfiguracionDueno,
} from './configStorage';
import { saveConfiguracionDuenoToFirestore } from './firebase';

const STORAGE_KEY_REGISTRO_AVISOS = 'mardeltuyu_registro_avisos_v1';

/**
 * Obtiene el historial de avisos automáticos despachados al propietario
 */
export function getHistorialAvisos(): RegistroAvisoDueno[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTRO_AVISOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error al leer historial de avisos:', e);
  }
  return [];
}

/**
 * Guarda un registro de aviso despachado
 */
export function guardarRegistroAviso(registro: RegistroAvisoDueno): void {
  try {
    const actuales = getHistorialAvisos();
    const actualizados = [registro, ...actuales].slice(0, 30); // guardar los últimos 30
    localStorage.setItem(STORAGE_KEY_REGISTRO_AVISOS, JSON.stringify(actualizados));
  } catch (e) {
    console.error('Error al guardar registro de aviso:', e);
  }
}

/**
 * Solicita permiso para notificaciones nativas del navegador / celular
 */
export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Emite una notificación nativa del sistema en el dispositivo del propietario
 */
export function dispararNotificacionNavegador(titulo: string, cuerpo: string): boolean {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, {
        body: cuerpo,
        icon: '/favicon.ico',
        tag: 'aviso-dueno-24hs',
      });
      return true;
    }
  } catch (e) {
    console.warn('No se pudo emitir notificación nativa:', e);
  }
  return false;
}

/**
 * Envía mensaje de WhatsApp automático en segundo plano mediante la API de CallMeBot
 * (Servicio gratuito oficial para bots personales de WhatsApp)
 */
export async function enviarWhatsAppCallMeBot(
  telefono: string,
  mensaje: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let cleanPhone = cleanPhoneNumber(telefono);
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('15') || cleanPhone.length === 10) {
        cleanPhone = '549' + cleanPhone;
      } else if (!cleanPhone.startsWith('54')) {
        cleanPhone = '549' + cleanPhone;
      }
    } else {
      cleanPhone = cleanPhone.replace('+', '');
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(mensaje)}&apikey=${apiKey}`;
    
    // CallMeBot responde con texto html
    const res = await fetch(url, { mode: 'no-cors' });
    // En no-cors mode no podemos leer status exacto, pero la petición se envía
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al conectar con CallMeBot' };
  }
}

/**
 * Envía webhook a Make/Zapier/Telegram/Discord si está configurado
 */
export async function enviarWebhookAviso(
  url: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Motor central de verificación y despacho automático de alertas de 24 hs para el PROPIETARIO
 */
export async function procesarDespachoAutomaticoDueno(
  dueno: ConfiguracionDueno,
  reservas: Reserva[],
  alertas: AlertaNotificacion[],
  onConfigActualizada?: (nuevaConfig: ConfiguracionDueno) => void
): Promise<{
  despachado: boolean;
  motivo?: string;
  detalle?: string;
}> {
  // 1. Verificar si tiene habilitado el envío automático
  if (dueno.envioAutomaticoWhatsapp === false) {
    return { despachado: false, motivo: 'Envío automático desactivado por el propietario' };
  }

  // 2. Filtrar alertas de 24 hs urgentes (ingresos y egresos de mañana)
  const mananaAlerts = alertas.filter(
    a => a.tipo === 'ingreso_proximo' || a.tipo === 'egreso_proximo' || a.tipo === 'ingreso_hoy' || a.tipo === 'egreso_hoy'
  );

  if (mananaAlerts.length === 0) {
    return { despachado: false, motivo: 'No hay ingresos ni egresos en las próximas 24 hs' };
  }

  // 3. Verificar si ya fue despachado hoy
  const hoyStr = new Date().toISOString().split('T')[0];
  if (dueno.ultimoAvisoEnviadoFecha === hoyStr) {
    return {
      despachado: false,
      motivo: `Aviso del día ya enviado hoy a las ${dueno.ultimoAvisoEnviadoHora || 'horas tempranas'}`,
    };
  }

  // 4. Generar el mensaje consolidado para el propietario
  const mensajeDueno = generarMensajeAvisosParaDueno(dueno, reservas, alertas);
  const horaActualStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  let canalUsado: RegistroAvisoDueno['tipo'] = 'whatsapp_directo';
  let exitoso = false;
  let detalle = '';

  // 5. Intento A: Si configuró CallMeBot API, envío automático 100% en segundo plano
  if (dueno.callmebotApiKey && dueno.telefonoDueno) {
    const apiRes = await enviarWhatsAppCallMeBot(dueno.telefonoDueno, mensajeDueno, dueno.callmebotApiKey);
    if (apiRes.success) {
      canalUsado = 'callmebot_api';
      exitoso = true;
      detalle = `WhatsApp enviado en segundo plano a ${dueno.telefonoDueno} vía CallMeBot`;
    }
  }

  // 6. Intento B: Si configuró Webhook adicional (Zapier, Make, Telegram)
  if (dueno.webhookAvisosUrl) {
    await enviarWebhookAviso(dueno.webhookAvisosUrl, {
      evento: 'alerta_24hs_propietario',
      fecha: hoyStr,
      telefonoDueno: dueno.telefonoDueno,
      mensaje: mensajeDueno,
      cantidadAlertas: mananaAlerts.length,
    });
  }

  // 7. Intento C: Notificación nativa en el dispositivo del propietario
  if (dueno.notificacionesNavegador !== false) {
    const tituloNotif = `🔔 Mar del Tuyú: Alerta 24 hs para Propietario (${mananaAlerts.length} movimientos)`;
    const cuerpoNotif = mananaAlerts.map(a => a.titulo).join(' • ');
    dispararNotificacionNavegador(tituloNotif, cuerpoNotif);
    if (!exitoso) {
      canalUsado = 'notificacion_navegador';
      exitoso = true;
      detalle = `Notificación de sistema emitida en pantalla/celular (${mananaAlerts.length} avisos)`;
    }
  }

  // 8. Actualizar la configuración del dueño con el estado de despacho de hoy
  const updatedDueno: ConfiguracionDueno = {
    ...dueno,
    ultimoAvisoEnviadoFecha: hoyStr,
    ultimoAvisoEnviadoHora: horaActualStr,
    ultimoAvisoEnviadoDetalle: `${mananaAlerts.length} movimientos notificados`,
  };

  saveConfiguracionDueno(updatedDueno);
  await saveConfiguracionDuenoToFirestore(updatedDueno);
  if (onConfigActualizada) onConfigActualizada(updatedDueno);

  // 9. Guardar en el historial de auditoría
  guardarRegistroAviso({
    id: `aviso-${Date.now()}`,
    fecha: hoyStr,
    timestamp: new Date().toISOString(),
    tipo: canalUsado,
    telefonoDestino: dueno.telefonoDueno || 'No configurado',
    destinatario: 'dueno',
    resumen: `${mananaAlerts.length} alertas de 24 hs: ${mananaAlerts.map(a => a.reserva.nombre).join(', ')}`,
    exitoso: true,
  });

  return {
    despachado: true,
    detalle: detalle || `Alerta de 24 hs procesada automáticamente a las ${horaActualStr}`,
  };
}
