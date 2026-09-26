/**
 * Cloud Function programada — Aviso automático de 24 hs para el propietario
 * (Alquiler Mar del Tuyú)
 *
 * Por qué existe esta función:
 * El motor original (src/lib/autoAlertsEngine.ts) corre DENTRO del navegador,
 * disparado por un useEffect de React. Eso significa que solo revisa
 * "¿hay ingresos/egresos mañana?" cuando la app está abierta en algún
 * dispositivo. Esta función replica exactamente esa misma lógica pero
 * corriendo en los servidores de Firebase con un horario fijo (Cloud
 * Scheduler), así que dispara el aviso todos los días sin que nadie
 * tenga que abrir la app.
 *
 * Despliegue: ver DEPLOY.md en esta misma carpeta.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

// El proyecto usa una base de datos Firestore con nombre propio, no "(default)".
const FIRESTORE_DATABASE_ID = 'ai-studio-alquilermardeltu-4c65e632-3e25-465c-ab61-5b169f2d66d9';

initializeApp();
const db = getFirestore(undefined, FIRESTORE_DATABASE_ID);

setGlobalOptions({ region: 'us-central1', maxInstances: 3 });

// ---------- Helpers de fecha / formato (equivalentes a src/lib/formatters.ts) ----------

function hoyYMD(tz = 'America/Argentina/Buenos_Aires') {
  // Devuelve YYYY-MM-DD en la zona horaria de Argentina, no en UTC del servidor.
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date()); // en-CA produce YYYY-MM-DD
}

function sumarDias(ymd, dias) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().split('T')[0];
}

function formatDateShort(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function formatCurrency(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);
}

// ---------- Generador de mensaje (equivalente a generarMensajeAvisosParaDueno) ----------

function generarMensajeAvisosParaDueno(dueno, reservas) {
  const hoyStr = hoyYMD();
  const mananaStr = sumarDias(hoyStr, 1);

  const activo = (r) => r.estado_reserva !== 'cancelada';
  const ingresos24hs = reservas.filter((r) => r.fecha_ingreso === mananaStr && activo(r));
  const egresos24hs = reservas.filter((r) => r.fecha_egreso === mananaStr && activo(r));
  const ingresosHoy = reservas.filter((r) => r.fecha_ingreso === hoyStr && activo(r));
  const egresosHoy = reservas.filter((r) => r.fecha_egreso === hoyStr && activo(r));
  const saldosPendientes = reservas.filter((r) => (r.saldo || 0) > 0 && activo(r));
  const contratosFaltantes = reservas.filter((r) => r.estado_contrato !== 'recibido_firmado' && activo(r));

  const hoyFormateado = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
  });

  let msg = `🔔 *AVISO DE CONTROL (24 HS DE ANTELACIÓN) - CASA MAR DEL TUYÚ*\n`;
  msg += `⏱️ *Finalidad:* Control y organización previa de la propiedad con 24 hs de anticipación.\n`;
  msg += `📅 *Fecha de emisión:* ${hoyFormateado}\n`;
  msg += `📍 *Inmueble:* ${dueno.direccionInmueble || 'Mar del Tuyú'}\n\n`;

  msg += `📥 *INGRESOS EN 24 HORAS (MAÑANA ${formatDateShort(mananaStr)}):* (${ingresos24hs.length})\n`;
  if (ingresos24hs.length > 0) {
    ingresos24hs.forEach((r) => {
      msg += `• *${r.nombre}* (${r.noches} noches) - Check-in: ${dueno.horarioCheckIn || '14:00'} hs\n`;
      msg += `  📞 Tel: ${r.numero_contacto} (${r.comunicacion})\n`;
      msg += `  🔑 Preparación: Coordinar llegada, chequear limpieza y entrega de llaves.\n`;
      if ((r.saldo || 0) > 0) {
        msg += `  ⚠️ Saldo a cobrar al entrar: ${formatCurrency(r.saldo)} (Seña: ${formatCurrency(r.sena)})\n`;
      } else {
        msg += `  ✅ Totalmente saldado\n`;
      }
    });
  } else {
    msg += `• Sin ingresos programados para mañana (en 24 hs).\n`;
  }
  msg += `\n`;

  msg += `📤 *EGRESOS EN 24 HORAS (MAÑANA ${formatDateShort(mananaStr)}):* (${egresos24hs.length})\n`;
  if (egresos24hs.length > 0) {
    egresos24hs.forEach((r) => {
      msg += `• *${r.nombre}* - Check-out hasta las ${dueno.horarioCheckOut || '10:00'} hs\n`;
      msg += `  🔑 Control: Coordinar horario de salida, llaves, inspección y recambio.\n`;
      if ((r.saldo || 0) > 0) {
        msg += `  ⚠️ ATENCIÓN: Saldo pendiente impago de ${formatCurrency(r.saldo)}\n`;
      }
    });
  } else {
    msg += `• Sin salidas programadas para mañana (en 24 hs).\n`;
  }
  msg += `\n`;

  if (ingresosHoy.length > 0 || egresosHoy.length > 0) {
    msg += `📌 *RECORDATORIO DE MOVIMIENTOS HOY (${formatDateShort(hoyStr)}):*\n`;
    if (ingresosHoy.length > 0) {
      msg += `  • Ingresan hoy: ${ingresosHoy.map((r) => `${r.nombre} (${r.noches} nts)`).join(', ')}\n`;
    }
    if (egresosHoy.length > 0) {
      msg += `  • Egresan hoy: ${egresosHoy.map((r) => r.nombre).join(', ')}\n`;
    }
    msg += `\n`;
  }

  msg += `💰 *SALDOS PENDIENTES DE COBRO (${saldosPendientes.length}):*\n`;
  if (saldosPendientes.length > 0) {
    saldosPendientes.slice(0, 5).forEach((r) => {
      msg += `• ${r.nombre} (${formatDateShort(r.fecha_ingreso)}): ${formatCurrency(r.saldo)}\n`;
    });
  } else {
    msg += `• No hay saldos pendientes. ¡Todo al día!\n`;
  }
  msg += `\n`;

  if (contratosFaltantes.length > 0) {
    msg += `📑 *CONTRATOS PENDIENTES DE FIRMA:* ${contratosFaltantes.length} contratos.\n`;
  }

  msg += `\n_Aviso automático generado con 24 hs de anticipación desde Cloud Functions (servidor, sin necesidad de abrir la app)._`;

  return { mensaje: msg, cantidadAlertas: ingresos24hs.length + egresos24hs.length };
}

// ---------- Envío por CallMeBot ----------

function limpiarTelefono(telefono) {
  return (telefono || '').replace(/[^\d+]/g, '');
}

async function enviarWhatsAppCallMeBot(telefono, mensaje, apiKey) {
  let cleanPhone = limpiarTelefono(telefono);
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
  const res = await fetch(url);
  const body = await res.text().catch(() => '');
  const exitoso = res.ok && !/error/i.test(body);
  return { success: exitoso, status: res.status, body };
}

// ---------- Lógica central de despacho (equivalente a procesarDespachoAutomaticoDueno) ----------

async function procesarDespachoDiario() {
  const configSnap = await db.doc('configuracion/dueno').get();
  if (!configSnap.exists) {
    logger.info('No hay configuración del propietario guardada aún. Nada que hacer.');
    return { despachado: false, motivo: 'sin_configuracion' };
  }
  const dueno = configSnap.data();

  if (dueno.envioAutomaticoWhatsapp === false) {
    logger.info('Envío automático desactivado por el propietario.');
    return { despachado: false, motivo: 'desactivado_por_dueno' };
  }

  const hoyStr = hoyYMD();
  if (dueno.ultimoAvisoEnviadoFecha === hoyStr) {
    logger.info(`Aviso ya despachado hoy (${hoyStr}) a las ${dueno.ultimoAvisoEnviadoHora}.`);
    return { despachado: false, motivo: 'ya_enviado_hoy' };
  }

  const reservasSnap = await db.collection('reservas').get();
  const reservas = reservasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const { mensaje, cantidadAlertas } = generarMensajeAvisosParaDueno(dueno, reservas);

  if (cantidadAlertas === 0) {
    logger.info('No hay ingresos ni egresos en las próximas 24 hs. No se envía aviso.');
    // No actualizamos ultimoAvisoEnviadoFecha para no bloquear un despacho real más tarde en el día.
    return { despachado: false, motivo: 'sin_movimientos_24hs' };
  }

  if (!dueno.telefonoDueno || !dueno.callmebotApiKey) {
    logger.warn('Falta teléfono o API Key de CallMeBot en la configuración del propietario.');
    return { despachado: false, motivo: 'falta_telefono_o_api_key' };
  }

  const resultado = await enviarWhatsAppCallMeBot(dueno.telefonoDueno, mensaje, dueno.callmebotApiKey);

  const horaActualStr = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
  });

  if (resultado.success) {
    await db.doc('configuracion/dueno').set(
      {
        ultimoAvisoEnviadoFecha: hoyStr,
        ultimoAvisoEnviadoHora: horaActualStr,
        ultimoAvisoEnviadoDetalle: `${cantidadAlertas} movimientos notificados (Cloud Function)`,
      },
      { merge: true }
    );
    logger.info(`Aviso de 24 hs enviado correctamente a ${dueno.telefonoDueno}.`);
    return { despachado: true, detalle: `WhatsApp enviado a ${dueno.telefonoDueno}` };
  }

  logger.error('Falló el envío por CallMeBot', resultado);
  return { despachado: false, motivo: 'error_callmebot', detalle: resultado.body };
}

// ---------- Disparador programado: todos los días a las 09:00 (hora Argentina) ----------

exports.avisoDiario24hs = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/Argentina/Buenos_Aires',
    retryCount: 2,
  },
  async () => {
    const resultado = await procesarDespachoDiario();
    logger.info('Resultado del despacho diario:', resultado);
  }
);

// ---------- Endpoint HTTP para probar manualmente sin esperar al horario ----------
// Uso: abrir en el navegador la URL que te da `firebase deploy`, algo como
// https://us-central1-<PROJECT_ID>.cloudfunctions.net/testAvisoManual

exports.testAvisoManual = onRequest(async (req, res) => {
  try {
    const resultado = await procesarDespachoDiario();
    res.status(200).json(resultado);
  } catch (err) {
    logger.error('Error en test manual', err);
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});
