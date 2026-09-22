import React from 'react';
import { Bell, UserCheck, UserMinus, DollarSign, ArrowRight, MessageCircle, Send, CheckCircle, ShieldAlert } from 'lucide-react';
import { AlertaNotificacion, Reserva, ConfiguracionDueno } from '../types';
import { createWhatsAppUrl } from '../lib/formatters';
import {
  generarAvisoDuenoIngreso24hs,
  generarAvisoDuenoEgreso24hs,
  generarMensajeAvisosParaDueno,
} from '../lib/configStorage';

interface NotificationsBannerProps {
  alerts: AlertaNotificacion[];
  configDueno: ConfiguracionDueno;
  reservas: Reserva[];
  onOpenNotificationsModal: () => void;
  onOpenConfiguracion?: () => void;
  onSelectReserva: (reserva: Reserva) => void;
}

export const NotificationsBanner: React.FC<NotificationsBannerProps> = ({
  alerts,
  configDueno,
  reservas,
  onOpenNotificationsModal,
  onOpenConfiguracion,
  onSelectReserva,
}) => {
  const urgentAlerts = alerts.filter(a => a.urgencia === 'alta');
  if (urgentAlerts.length === 0) return null;

  const hoyStr = new Date().toISOString().split('T')[0];
  const yaEnviadoHoy = configDueno.ultimoAvisoEnviadoFecha === hoyStr;
  const telefonoPropietario = configDueno.telefonoDueno;

  // Mensaje consolidado para el dueño
  const mensajeConsolidado = generarMensajeAvisosParaDueno(configDueno, reservas, alerts);
  const waConsolidadoUrl = telefonoPropietario
    ? createWhatsAppUrl(telefonoPropietario, mensajeConsolidado)
    : '';

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-cyan-500/15 border border-amber-300/70 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Avisos de Control 24 hs para Propietario ({urgentAlerts.length})
              </h3>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300/50">
                Alerta Propietario
              </span>

              {yaEnviadoHoy ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle className="w-3 h-3" />
                  <span>Despachado hoy a las {configDueno.ultimoAvisoEnviadoHora || 'temprano'}</span>
                </span>
              ) : configDueno.envioAutomaticoWhatsapp ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  ⚡ Despacho automático activo
                </span>
              ) : null}
            </div>

            <p className="text-xs text-slate-600 mt-0.5">
              Destinatario configurado: <strong className="text-slate-800">{telefonoPropietario || 'Sin teléfono configurado'}</strong> (para control de llaves, limpieza y cobro de saldos).
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700 mt-2">
              {urgentAlerts.slice(0, 3).map((a) => {
                // Generar mensaje individual para el dueño (no para el huésped)
                const textoDueno = a.tipo.startsWith('ingreso')
                  ? generarAvisoDuenoIngreso24hs(configDueno, a.reserva)
                  : generarAvisoDuenoEgreso24hs(configDueno, a.reserva);

                const waItemUrl = telefonoPropietario
                  ? createWhatsAppUrl(telefonoPropietario, textoDueno)
                  : '';

                return (
                  <div key={a.id} className="inline-flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                    {(a.tipo === 'ingreso_hoy' || a.tipo === 'ingreso_proximo') && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    {(a.tipo === 'egreso_hoy' || a.tipo === 'egreso_proximo') && <UserMinus className="w-3.5 h-3.5 text-blue-600" />}
                    {a.tipo === 'saldo_pendiente' && <DollarSign className="w-3.5 h-3.5 text-amber-600" />}
                    <span className="font-semibold text-slate-800">{a.titulo}</span>

                    {telefonoPropietario && (
                      <a
                        href={waItemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors ml-1"
                        title="Enviar este aviso específico a mi WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Avisarme</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Actions for Owner */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
          {telefonoPropietario ? (
            <a
              href={waConsolidadoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl shadow-xs transition-all hover:scale-[1.01]"
              title="Abrir resumen de 24 hs en mi WhatsApp de Propietario"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar a mi WhatsApp</span>
            </a>
          ) : (
            <button
              onClick={onOpenConfiguracion}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl border border-amber-300 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Cargar mi Teléfono</span>
            </button>
          )}

          <button
            onClick={onOpenNotificationsModal}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-cyan-700 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
          >
            <span>Ver Centro ({alerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
