import React, { useState } from 'react';
import { X, FileText, Download, Upload, MessageCircle, CheckCircle2, AlertCircle, FileCheck, ExternalLink } from 'lucide-react';
import { Reserva, ArchivoContrato, EstadoContrato } from '../types';
import { formatDateShort, createWhatsAppUrl } from '../lib/formatters';
import { fileToArchivoContrato, descargarArchivoContrato, getConfiguracionDueno } from '../lib/configStorage';

interface ContratoModalProps {
  isOpen: boolean;
  reserva: Reserva | null;
  onClose: () => void;
  onUpdateReserva: (id: string, updates: Partial<Reserva>) => Promise<void>;
  onOpenConfiguracion?: () => void;
}

export const ContratoModal: React.FC<ContratoModalProps> = ({
  isOpen,
  reserva,
  onClose,
  onUpdateReserva,
  onOpenConfiguracion,
}) => {
  if (!isOpen || !reserva) return null;

  const configDueno = getConfiguracionDueno();
  const contratoActual: ArchivoContrato | null = reserva.contrato_adjunto || configDueno.contratoModelo || null;

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Contract message for WhatsApp
  const mensajeWhatsApp = `¡Hola ${reserva.nombre}! 👋 Te comparto adjunto el contrato de alquiler temporario para tu estadía en Mar del Tuyú del ${formatDateShort(reserva.fecha_ingreso)} al ${formatDateShort(reserva.fecha_egreso)} (${reserva.noches} noches).\n\n📍 Inmueble: ${configDueno.direccionInmueble || 'Mar del Tuyú'}\n\nPor favor revisá los datos, firmalo y reenviame una foto o copia por este medio para dejar formalizada tu reserva. ¡Muchas gracias!`;

  const waUrl = createWhatsAppUrl(reserva.numero_contacto, mensajeWhatsApp);

  // Upload specific contract for this reservation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo no debe superar los 10MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const archivo = await fileToArchivoContrato(file);
      await onUpdateReserva(reserva.id, {
        contrato_adjunto: archivo,
        estado_contrato: reserva.estado_contrato === 'pendiente_envio' ? 'enviado' : reserva.estado_contrato,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    if (contratoActual) {
      descargarArchivoContrato(contratoActual);
    }
  };

  const handleSendViaWhatsApp = async () => {
    // If we have a file, download it first so the user can easily attach it in WhatsApp
    if (contratoActual) {
      handleDownload();
    }
    // Update contract status to 'enviado' if it was pending
    if (reserva.estado_contrato === 'pendiente_envio') {
      await onUpdateReserva(reserva.id, { estado_contrato: 'enviado' });
    }
    // Open WhatsApp
    window.open(waUrl, '_blank');
  };

  const handleStatusChange = async (newStatus: EstadoContrato) => {
    await onUpdateReserva(reserva.id, { estado_contrato: newStatus });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-800 to-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Gestión y Envío de Contrato
              </h2>
              <p className="text-xs text-cyan-200">
                Huésped: <span className="font-semibold text-white">{reserva.nombre}</span> ({formatDateShort(reserva.fecha_ingreso)} → {formatDateShort(reserva.fecha_egreso)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
          {/* Status Tracker */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estado Actual del Contrato
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('pendiente_envio')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  reserva.estado_contrato === 'pendiente_envio'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                1. Pendiente
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('enviado')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  reserva.estado_contrato === 'enviado'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                2. Enviado
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('recibido_firmado')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  reserva.estado_contrato === 'recibido_firmado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                3. Firmado ✓
              </button>
            </div>
          </div>

          {/* Contract Document Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Archivo de Contrato
              </span>
              {reserva.contrato_adjunto ? (
                <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
                  Archivo específico de esta reserva
                </span>
              ) : configDueno.contratoModelo ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Modelo oficial de la casa
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Sin archivo cargado
                </span>
              )}
            </div>

            {contratoActual ? (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {contratoActual.nombreArchivo}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(contratoActual.tamanoBytes / 1024).toFixed(1)} KB • Subido: {new Date(contratoActual.fechaSubida).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Descargar archivo en tu dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 p-4">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">
                  Aún no cargaste un modelo de contrato general.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Puedes cargar un modelo general en Configuración o subir uno específico para esta reserva aquí debajo.
                </p>
              </div>
            )}

            {/* Custom file upload for this reservation */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-cyan-600" />
                <span>{reserva.contrato_adjunto ? 'Reemplazar archivo para este huésped' : 'Subir archivo de contrato (PDF / Word)'}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {uploading && <span className="text-xs text-cyan-600 font-medium animate-pulse">Cargando archivo...</span>}
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* WhatsApp Sending Action */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Enviar por WhatsApp a {reserva.nombre}
              </h3>
            </div>

            <p className="text-xs text-emerald-800">
              Al hacer clic en el botón, se descargará el archivo del contrato (para adjuntarlo en el chat de WhatsApp) y se abrirá el chat con el mensaje formal redactado:
            </p>

            <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs text-slate-600 italic whitespace-pre-line">
              {mensajeWhatsApp}
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.01]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Descargar Contrato y Abrir WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
