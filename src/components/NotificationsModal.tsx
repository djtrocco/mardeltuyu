import React from 'react';
import { Bell, UserCheck, UserMinus, DollarSign, FileText, ExternalLink, Check, AlertTriangle, MessageCircle, Calendar, Send, ShieldAlert, CheckCircle } from 'lucide-react';
import { AlertaNotificacion, Reserva, ConfiguracionDueno } from '../types';
import { formatCurrency, formatDateShort, getReservationWhatsAppMessage, createWhatsAppUrl } from '../lib/formatters';
import {
  generarAvisoDuenoIngreso24hs,
  generarAvisoDuenoEgreso24hs,
  generarMensajeAvisosParaDueno,
} from '../lib/configStorage';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertaNotificacion[];
  configDueno?: ConfiguracionDueno;
  reservas?: Reserva[];
  onOpenConfiguracion?: () => void;
  onUpdateReserva: (id: string, updates: Partial<Reserva>) => Promise<void>;
  onSelectReserva: (reserva: Reserva) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  configDueno,
  reservas = [],
  onOpenConfiguracion,
  onUpdateReserva,
  onSelectReserva,
}) => {
  if (!isOpen) return null;

  const ingresos = alerts.filter(a => a.tipo === 'ingreso_hoy' || a.tipo === 'ingreso_proximo');
  const egresos = alerts.filter(a => a.tipo === 'egreso_hoy' || a.tipo === 'egreso_proximo');
  const saldos = alerts.filter(a => a.tipo === 'saldo_pendiente');
  const contratos = alerts.filter(a => a.tipo === 'contrato_pendiente');

  const hoyStr = new Date().toISOString().split('T')[0];
  const yaEnviadoHoy = configDueno?.ultimoAvisoEnviadoFecha === hoyStr;
  const telefonoPropietario = configDueno?.telefonoDueno || '';

  // Mensaje consolidado de control para el dueño
  const mensajeConsolidadoDueno = configDueno
    ? generarMensajeAvisosParaDueno(configDueno, reservas, alerts)
    : '';
  const waConsolidadoUrl = telefonoPropietario
    ? createWhatsAppUrl(telefonoPropietario, mensajeConsolidadoDueno)
    : '';

  const handleCobrarSaldo = async (res: Reserva) => {
    await onUpdateReserva(res.id, {
      sena: res.valor_total,
      saldo: 0,
    });
  };

  const handleMarcarContratoFirmado = async (res: Reserva) => {
    await onUpdateReserva(res.id, {
      estado_contrato: 'recibido_firmado',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Centro de Avisos Automáticos al Propietario
              </h2>
              <p className="text-xs text-slate-300">
                Alertas operativas de control con 24 hs de antelación para el teléfono configurado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        {/* Owner Automation Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                📱 Teléfono de recepción de avisos:
              </span>
              <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">
                {telefonoPropietario || 'No configurado'}
              </span>
              {yaEnviadoHoy && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-3 h-3" />
                  <span>Despachado hoy ({configDueno?.ultimoAvisoEnviadoHora || 'temprano'})</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Las alertas de 24 hs te avisan a vos como dueño sobre llaves, limpieza, inspección y cobro de saldos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {telefonoPropietario ? (
              <a
                href={waConsolidadoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                title="Enviar resumen completo de control a mi WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Enviar a mi WhatsApp</span>
              </a>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onOpenConfiguracion) onOpenConfiguracion();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Cargar mi Teléfono</span>
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-6">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-800">¡Todo al día!</p>
              <p className="text-sm text-slate-500">
                No hay ingresos ni egresos urgentes para hoy ni saldos pendientes inmediatos.
              </p>
            </div>
          ) : (
            <>
              {/* Seccion Ingresos */}
              {ingresos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase tracking-wide">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Huéspedes que ingresan - Control 24 hs ({ingresos.length})</span>
                  </div>
                  <div className="space-y-2">
                    {ingresos.map((alert) => {
                      // Mensaje para el DUEÑO
                      const waDuenoMsg = configDueno
                        ? generarAvisoDuenoIngreso24hs(configDueno, alert.reserva)
                        : '';
                      const waDuenoUrl = telefonoPropietario
                        ? createWhatsAppUrl(telefonoPropietario, waDuenoMsg)
                        : '';

                      // Mensaje opcional para el huésped si el dueño desea escribirle
                      const waHuespedMsg = getReservationWhatsAppMessage(alert.reserva, 'bienvenida');
                      const waHuespedUrl = createWhatsAppUrl(alert.reserva.numero_contacto, waHuespedMsg);

                      const isToday = alert.tipo === 'ingreso_hoy';

                      return (
                        <div
                          key={alert.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isToday
                              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  isToday ? 'bg-emerald-600 text-white' : 'bg-cyan-100 text-cyan-800'
                                }`}>
                                  {isToday ? '¡INGRESA HOY!' : 'AVISO 24 HS: ENTRA MAÑANA'}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                  {alert.reserva.nombre}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                Período: {formatDateShort(alert.reserva.fecha_ingreso)} al {formatDateShort(alert.reserva.fecha_egreso)} ({alert.reserva.noches} noches)
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                <span>Canal: <b>{alert.reserva.comunicacion}</b></span>
                                <span>Tel Huésped: <b>{alert.reserva.numero_contacto}</b></span>
                                {alert.reserva.saldo > 0 ? (
                                  <span className="text-amber-700 font-semibold">
                                    Saldo a cobrar al entrar: {formatCurrency(alert.reserva.saldo)}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">
                                    Abonado al 100%
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {/* Botón principal: Enviar aviso de 24 hs al WhatsApp del PROPIETARIO */}
                              {telefonoPropietario ? (
                                <a
                                  href={waDuenoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                                  title="Enviar aviso de 24 hs a mi WhatsApp de Propietario"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>Enviar a mi WhatsApp</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-amber-700 font-medium">Configurar mi tel</span>
                              )}

                              {/* Opción secundaria: Escribir al huésped */}
                              <a
                                href={waHuespedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                                title="Escribir al huésped"
                              >
                                <span>Chat Huésped</span>
                              </a>

                              <button
                                onClick={() => {
                                  onSelectReserva(alert.reserva);
                                  onClose();
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                              >
                                Ver Ficha
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seccion Egresos */}
              {egresos.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-wide">
                    <UserMinus className="w-4 h-4 text-blue-600" />
                    <span>Huéspedes que se van / Check-out - Control 24 hs ({egresos.length})</span>
                  </div>
                  <div className="space-y-2">
                    {egresos.map((alert) => {
                      // Mensaje para el DUEÑO
                      const waDuenoMsg = configDueno
                        ? generarAvisoDuenoEgreso24hs(configDueno, alert.reserva)
                        : '';
                      const waDuenoUrl = telefonoPropietario
                        ? createWhatsAppUrl(telefonoPropietario, waDuenoMsg)
                        : '';

                      // Mensaje opcional para el huésped
                      const waHuespedMsg = getReservationWhatsAppMessage(alert.reserva, 'salida');
                      const waHuespedUrl = createWhatsAppUrl(alert.reserva.numero_contacto, waHuespedMsg);

                      const isToday = alert.tipo === 'egreso_hoy';

                      return (
                        <div
                          key={alert.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isToday
                              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  isToday ? 'bg-blue-600 text-white' : 'bg-cyan-100 text-cyan-800'
                                }`}>
                                  {isToday ? '¡SE VA HOY!' : 'AVISO 24 HS: SALE MAÑANA'}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                  {alert.reserva.nombre}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                {alert.descripcion}
                              </p>
                              {alert.reserva.saldo > 0 && (
                                <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  ¡ATENCIÓN! Saldo pendiente por cobrar: {formatCurrency(alert.reserva.saldo)}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {/* Botón principal: Enviar aviso de 24 hs al WhatsApp del PROPIETARIO */}
                              {telefonoPropietario ? (
                                <a
                                  href={waDuenoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                                  title="Enviar aviso de 24 hs a mi WhatsApp de Propietario"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>Enviar a mi WhatsApp</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-amber-700 font-medium">Configurar mi tel</span>
                              )}

                              {/* Opción secundaria: Escribir al huésped */}
                              <a
                                href={waHuespedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                                title="Escribir al huésped"
                              >
                                <span>Chat Huésped</span>
                              </a>

                              <button
                                onClick={() => {
                                  onSelectReserva(alert.reserva);
                                  onClose();
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seccion Saldos Pendientes */}
              {saldos.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-800 uppercase tracking-wide">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>Saldos Pendientes de Cobro ({saldos.length})</span>
                  </div>
                  <div className="space-y-2">
                    {saldos.map((alert) => {
                      const waMessage = getReservationWhatsAppMessage(alert.reserva, 'recordatorio_saldo');
                      const waUrl = createWhatsAppUrl(alert.reserva.numero_contacto, waMessage);

                      return (
                        <div
                          key={alert.id}
                          className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                                Debe: {formatCurrency(alert.reserva.saldo)}
                              </span>
                              <span className="font-semibold text-slate-900 text-sm">
                                {alert.reserva.nombre}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Ingreso: {formatDateShort(alert.reserva.fecha_ingreso)} • Total reserva: {formatCurrency(alert.reserva.valor_total)} (Seña: {formatCurrency(alert.reserva.sena)})
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCobrarSaldo(alert.reserva)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Marcar Cobrado</span>
                            </button>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Pedir Saldo</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seccion Contratos */}
              {contratos.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-800 uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Control de Contratos de Alquiler ({contratos.length})</span>
                  </div>
                  <div className="space-y-2">
                    {contratos.map((alert) => {
                      const waMessage = getReservationWhatsAppMessage(alert.reserva, 'contrato');
                      const waUrl = createWhatsAppUrl(alert.reserva.numero_contacto, waMessage);
                      const isNotSent = alert.reserva.estado_contrato === 'pendiente_envio';

                      return (
                        <div
                          key={alert.id}
                          className="p-3.5 bg-purple-50/40 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                isNotSent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isNotSent ? 'Falta Enviar' : 'Esperando Firma'}
                              </span>
                              <span className="font-semibold text-slate-900 text-sm">
                                {alert.reserva.nombre}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Ingreso: {formatDateShort(alert.reserva.fecha_ingreso)} • Contacto: {alert.reserva.numero_contacto}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMarcarContratoFirmado(alert.reserva)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Marcar Firmado</span>
                            </button>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Coordinar</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
