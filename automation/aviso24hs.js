/**
 * Aviso automático de 24 hs para el propietario — Alquiler Mar del Tuyú
 *
 * Corre desde GitHub Actions (.github/workflows/aviso-24hs.yml), NO desde
 * Firebase Cloud Functions, así que no requiere el plan Blaze. Se conecta
 * directo a Firestore con una cuenta de servicio (gratis, plan Spark) y
 * manda el WhatsApp vía CallMeBot, exactamente igual que
 * src/lib/autoAlertsEngine.ts pero corriendo en el servidor, con horario
 * fijo, sin depender de que la app esté abierta.
 *
 * Variables de entorno esperadas (las pone el workflow desde GitHub Secrets):
 *   FIREBASE_SERVICE_ACCOUNT_KEY_BASE64  -> JSON de la cuenta de servicio, en base64
 */

const admin = require('firebase-admin');

const FIRESTORE_DATABASE_ID = 'ai-studio-alquilermardeltu-4c65e632-3e25-465c-ab61-5b169f2d66d9';
const TZ = 'America/Argentina/Buenos_Aires';

function cargarCredenciales() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!b64) {
    throw new Error('Falta el secreto FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 en GitHub Actions.');
  }
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
}

admin.initializeApp({ credential: admin.credential.cert(cargarCredenciales()) });
const db = admin.firestore();
db.settings({ databaseId: FIRESTORE_DATABASE_ID });

// ---------- Helpers de fecha / formato ----------

function hoyYMD() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
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

// ---------- Mensaje (igual a generarMensajeAvisosParaDueno) ----------

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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ,
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

  msg += `\n_Aviso automático generado con 24 hs de anticipación desde GitHub Actions (servidor, sin necesidad de abrir la app)._`;

  return { mensaje: msg, cantidadAlertas: ingresos24hs.length + egresos24hs.length };
}

// ---------- CallMeBot ----------

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

// ---------- Lógica central ----------

async function procesarDespachoDiario() {
  const configSnap = await db.doc('configuracion/dueno').get();
  if (!configSnap.exists) {
    console.log('No hay configuración del propietario guardada aún. Nada que hacer.');
    return { despachado: false, motivo: 'sin_configuracion' };
  }
  const dueno = configSnap.data();

  if (dueno.envioAutomaticoWhatsapp === false) {
    console.log('Envío automático desactivado por el propietario.');
    return { despachado: false, motivo: 'desactivado_por_dueno' };
  }

  const hoyStr = hoyYMD();
  if (dueno.ultimoAvisoEnviadoFecha === hoyStr) {
    console.log(`Aviso ya despachado hoy (${hoyStr}) a las ${dueno.ultimoAvisoEnviadoHora}.`);
    return { despachado: false, motivo: 'ya_enviado_hoy' };
  }

  const reservasSnap = await db.collection('reservas').get();
  const reservas = reservasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const { mensaje, cantidadAlertas } = generarMensajeAvisosParaDueno(dueno, reservas);

  if (cantidadAlertas === 0) {
    console.log('No hay ingresos ni egresos en las próximas 24 hs. No se envía aviso.');
    return { despachado: false, motivo: 'sin_movimientos_24hs' };
  }

  if (!dueno.telefonoDueno || !dueno.callmebotApiKey) {
    console.warn('Falta teléfono o API Key de CallMeBot en la configuración del propietario.');
    return { despachado: false, motivo: 'falta_telefono_o_api_key' };
  }

  const resultado = await enviarWhatsAppCallMeBot(dueno.telefonoDueno, mensaje, dueno.callmebotApiKey);

  const horaActualStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

  if (resultado.success) {
    await db.doc('configuracion/dueno').set(
      {
        ultimoAvisoEnviadoFecha: hoyStr,
        ultimoAvisoEnviadoHora: horaActualStr,
        ultimoAvisoEnviadoDetalle: `${cantidadAlertas} movimientos notificados (GitHub Actions)`,
      },
      { merge: true }
    );
    console.log(`Aviso de 24 hs enviado correctamente a ${dueno.telefonoDueno}.`);
    return { despachado: true, detalle: `WhatsApp enviado a ${dueno.telefonoDueno}` };
  }

  console.error('Falló el envío por CallMeBot', resultado);
  return { despachado: false, motivo: 'error_callmebot', detalle: resultado.body };
}

procesarDespachoDiario()
  .then((resultado) => {
    console.log('Resultado del despacho diario:', JSON.stringify(resultado, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error fatal en el despacho diario:', err);
    process.exit(1);
  });
