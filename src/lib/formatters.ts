import { AlertaNotificacion, ReporteMensual, Reserva } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateLong(dateString: string): string {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function calculateNights(ingreso: string, egreso: string): number {
  if (!ingreso || !egreso) return 1;
  const start = new Date(ingreso);
  const end = new Date(egreso);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

export function cleanPhoneNumber(phone: string): string {
  // Remove spaces, hyphens, parentheses
  return phone.replace(/[\s\-\(\)]/g, '');
}

export function createWhatsAppUrl(phone: string, text: string): string {
  let cleaned = cleanPhoneNumber(phone);
  if (!cleaned.startsWith('+')) {
    // If Argentine number without international code
    if (cleaned.startsWith('15') || cleaned.length === 10) {
      cleaned = '549' + cleaned;
    } else if (cleaned.startsWith('549')) {
      // already good
    } else if (!cleaned.startsWith('54')) {
      cleaned = '549' + cleaned;
    }
  } else {
    cleaned = cleaned.replace('+', '');
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export function getReservationWhatsAppMessage(reserva: Reserva, tipo: 'bienvenida' | 'recordatorio_saldo' | 'contrato' | 'salida'): string {
  const ingreso = formatDateShort(reserva.fecha_ingreso);
  const egreso = formatDateShort(reserva.fecha_egreso);

  switch (tipo) {
    case 'bienvenida':
      return `¡Hola ${reserva.nombre}! 👋 Te escribo por tu reserva en nuestra casa en Mar del Tuyú del ${ingreso} al ${egreso} (${reserva.noches} noches). Quería confirmar tu horario estimado de llegada y dejarte toda la información de acceso. ¡Los esperamos!`;
    case 'recordatorio_saldo':
      return `¡Hola ${reserva.nombre}! Espero que estés muy bien. Te contacto para recordar el saldo pendiente de tu reserva en Mar del Tuyú por un total de ${formatCurrency(reserva.saldo)} (Seña abonada: ${formatCurrency(reserva.sena)}). ¿Precisás los datos bancarios o preferís abonarlo al ingresar? ¡Gracias!`;
    case 'contrato':
      return `¡Hola ${reserva.nombre}! Te escribo para coordinar el contrato de alquiler temporario de la casa en Mar del Tuyú para el período ${ingreso} al ${egreso}. Por favor confirmame tu email para enviártelo o avisame si pudiste revisarlo y firmarlo. ¡Muchas gracias!`;
    case 'salida':
      return `¡Hola ${reserva.nombre}! Esperamos que hayan disfrutado mucho su estadía en Mar del Tuyú 🌊. Les recordamos que el horario de egreso (check-out) es hoy. Cuando estén listos para entregar la llave avísennos. ¡Buen viaje de regreso!`;
  }
}

// Generate automatic notifications based on current date & bookings
export function generateAlerts(reservas: Reserva[]): AlertaNotificacion[] {
  const alerts: AlertaNotificacion[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  reservas.forEach((res) => {
    if (res.estado_reserva === 'cancelada') return;

    const [inY, inM, inD] = res.fecha_ingreso.split('-').map(Number);
    const inDate = new Date(inY, inM - 1, inD);
    inDate.setHours(0, 0, 0, 0);

    const [outY, outM, outD] = res.fecha_egreso.split('-').map(Number);
    const outDate = new Date(outY, outM - 1, outD);
    outDate.setHours(0, 0, 0, 0);

    const diffDaysIn = Math.round((inDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const diffDaysOut = Math.round((outDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Avisos automáticos de ingreso (con antelación de 24 hs para control previo)
    if (diffDaysIn === 1) {
      alerts.push({
        id: `in-24hs-${res.id}`,
        tipo: 'ingreso_proximo',
        titulo: `Aviso 24 hs: Mañana ingresa ${res.nombre}`,
        descripcion: `Control previo de 24 hs. Ingresa mañana (${formatDateShort(res.fecha_ingreso)}) por ${res.noches} noches. Coordinar horario de entrada, llaves y limpieza. Saldo: ${formatCurrency(res.saldo)}.`,
        fecha: res.fecha_ingreso,
        reserva: res,
        urgencia: 'alta',
      });
    } else if (diffDaysIn === 0) {
      alerts.push({
        id: `in-today-${res.id}`,
        tipo: 'ingreso_hoy',
        titulo: `Ingreso Hoy - ${res.nombre}`,
        descripcion: `Llega hoy a la casa en Mar del Tuyú (${res.noches} noches). Saldo a cobrar al entrar: ${formatCurrency(res.saldo)}.`,
        fecha: res.fecha_ingreso,
        reserva: res,
        urgencia: 'alta',
      });
    }

    // Avisos automáticos de egreso (con antelación de 24 hs para control previo)
    if (diffDaysOut === 1) {
      alerts.push({
        id: `out-24hs-${res.id}`,
        tipo: 'egreso_proximo',
        titulo: `Aviso 24 hs: Mañana egresa ${res.nombre}`,
        descripcion: `Control previo de 24 hs. Sale mañana (${formatDateShort(res.fecha_egreso)}). Coordinar horario de salida, llaves, inspección de la casa y recambio de limpieza.`,
        fecha: res.fecha_egreso,
        reserva: res,
        urgencia: 'alta',
      });
    } else if (diffDaysOut === 0) {
      alerts.push({
        id: `out-today-${res.id}`,
        tipo: 'egreso_hoy',
        titulo: `Egreso Hoy - ${res.nombre}`,
        descripcion: `Finaliza su estadía hoy. Realizar check-out, control de llaves y limpieza de la propiedad.`,
        fecha: res.fecha_egreso,
        reserva: res,
        urgencia: 'alta',
      });
    }

    // Pending Balance notifications
    if (res.saldo > 0 && res.estado_reserva !== 'finalizada') {
      if (diffDaysIn <= 7 && diffDaysIn >= 0) {
        alerts.push({
          id: `saldo-${res.id}`,
          tipo: 'saldo_pendiente',
          titulo: `Saldo pendiente: ${formatCurrency(res.saldo)} (${res.nombre})`,
          descripcion: `Ingresa el ${formatDateShort(res.fecha_ingreso)}. Seña pagada: ${formatCurrency(res.sena)}.`,
          fecha: res.fecha_ingreso,
          reserva: res,
          urgencia: diffDaysIn <= 2 ? 'alta' : 'media',
        });
      }
    }

    // Contract notifications
    if (res.estado_contrato === 'pendiente_envio') {
      alerts.push({
        id: `contrato-pen-${res.id}`,
        tipo: 'contrato_pendiente',
        titulo: `Contrato sin enviar - ${res.nombre}`,
        descripcion: `Falta enviar el contrato de alquiler para la estadía del ${formatDateShort(res.fecha_ingreso)}.`,
        fecha: res.fecha_ingreso,
        reserva: res,
        urgencia: 'media',
      });
    } else if (res.estado_contrato === 'enviado') {
      alerts.push({
        id: `contrato-esp-${res.id}`,
        tipo: 'contrato_pendiente',
        titulo: `Esperando firma de contrato - ${res.nombre}`,
        descripcion: `Contrato enviado. Aún no se recibió firmado o confirmado.`,
        fecha: res.fecha_ingreso,
        reserva: res,
        urgencia: 'baja',
      });
    }
  });

  return alerts;
}

// Monthly profit and occupancy metrics generator
export function generateMonthlyReports(reservas: Reserva[]): ReporteMensual[] {
  const monthMap: { [key: string]: ReporteMensual } = {};

  reservas.forEach((res) => {
    if (res.estado_reserva === 'cancelada') return;

    // Use fecha_ingreso for booking month attribution
    const [yearStr, monthStr] = res.fecha_ingreso.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const mesClave = `${yearStr}-${monthStr}`;

    const dateObj = new Date(year, month - 1, 1);
    const nombreMes = dateObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const capitalizedMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    if (!monthMap[mesClave]) {
      monthMap[mesClave] = {
        mesClave,
        nombreMes: capitalizedMes,
        ano: year,
        totalFacturado: 0,
        totalCobrado: 0,
        totalSaldoPendiente: 0,
        cantidadReservas: 0,
        nochesOcupadas: 0,
        tarifaPromedioNoche: 0,
      };
    }

    monthMap[mesClave].totalFacturado += res.valor_total;
    monthMap[mesClave].totalCobrado += (res.sena + (res.saldo === 0 ? (res.valor_total - res.sena) : 0));
    monthMap[mesClave].totalSaldoPendiente += res.saldo;
    monthMap[mesClave].cantidadReservas += 1;
    monthMap[mesClave].nochesOcupadas += res.noches;
  });

  const reports = Object.values(monthMap);

  // Compute average rates
  reports.forEach((rep) => {
    rep.tarifaPromedioNoche = rep.nochesOcupadas > 0 ? Math.round(rep.totalFacturado / rep.nochesOcupadas) : 0;
  });

  // Sort chronologically
  return reports.sort((a, b) => a.mesClave.localeCompare(b.mesClave));
}
