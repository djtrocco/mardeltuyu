import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Phone, MessageSquare, FileText, CheckCircle2, AlertCircle, Trash2, Upload, Download, MessageCircle } from 'lucide-react';
import { CanalComunicacion, EstadoContrato, EstadoReserva, Reserva, ArchivoContrato } from '../types';
import { calculateNights, formatCurrency, createWhatsAppUrl, formatDateShort } from '../lib/formatters';
import { fileToArchivoContrato, descargarArchivoContrato, getConfiguracionDueno } from '../lib/configStorage';

interface ReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reserva: Omit<Reserva, 'id'> | Reserva) => Promise<void>;
  onDelete?: (id: string, nombre: string) => Promise<void>;
  reservaToEdit?: Reserva | null;
  initialDates?: { ingreso: string; egreso: string } | null;
}

const CANALES: CanalComunicacion[] = [
  'WhatsApp',
  'Airbnb',
  'Booking',
  'Llamada telefónica',
  'Referido / Amigo',
  'Cartel en propiedad',
  'Facebook / Instagram',
  'Otro',
];

export const ReservaModal: React.FC<ReservaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  reservaToEdit,
  initialDates,
}) => {
  const configDueno = getConfiguracionDueno();
  const [nombre, setNombre] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [noches, setNoches] = useState(1);
  const [valorTotal, setValorTotal] = useState<number | ''>('');
  const [sena, setSena] = useState<number | ''>('');
  const [comunicacion, setComunicacion] = useState<CanalComunicacion>('WhatsApp');
  const [numeroContacto, setNumeroContacto] = useState('');
  const [estadoContrato, setEstadoContrato] = useState<EstadoContrato>('pendiente_envio');
  const [estadoReserva, setEstadoReserva] = useState<EstadoReserva>('confirmada');
  const [notas, setNotas] = useState('');
  const [contratoAdjunto, setContratoAdjunto] = useState<ArchivoContrato | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  // Reset or initialize state
  useEffect(() => {
    if (reservaToEdit) {
      setNombre(reservaToEdit.nombre);
      setFechaIngreso(reservaToEdit.fecha_ingreso);
      setFechaEgreso(reservaToEdit.fecha_egreso);
      setNoches(reservaToEdit.noches);
      setValorTotal(reservaToEdit.valor_total);
      setSena(reservaToEdit.sena);
      setComunicacion(reservaToEdit.comunicacion);
      setNumeroContacto(reservaToEdit.numero_contacto);
      setEstadoContrato(reservaToEdit.estado_contrato);
      setEstadoReserva(reservaToEdit.estado_reserva || 'confirmada');
      setNotas(reservaToEdit.notas || '');
      setContratoAdjunto(reservaToEdit.contrato_adjunto || null);
    } else {
      // Default to today and in 4 days if no initial dates
      const today = new Date();
      const inFourDays = new Date();
      inFourDays.setDate(today.getDate() + 4);

      const defaultIn = initialDates?.ingreso || today.toISOString().split('T')[0];
      const defaultOut = initialDates?.egreso || inFourDays.toISOString().split('T')[0];

      setNombre('');
      setFechaIngreso(defaultIn);
      setFechaEgreso(defaultOut);
      const computed = calculateNights(defaultIn, defaultOut);
      setNoches(computed);
      setValorTotal('');
      setSena('');
      setComunicacion('WhatsApp');
      setNumeroContacto('+54 9 ');
      setEstadoContrato('pendiente_envio');
      setEstadoReserva('confirmada');
      setNotas('');
      setContratoAdjunto(null);
    }
    setFormError('');
  }, [reservaToEdit, initialDates, isOpen]);

  // Recalculate nights when dates change
  const handleFechaIngresoChange = (val: string) => {
    setFechaIngreso(val);
    if (val && fechaEgreso) {
      const calculated = calculateNights(val, fechaEgreso);
      setNoches(calculated);
    }
  };

  const handleFechaEgresoChange = (val: string) => {
    setFechaEgreso(val);
    if (fechaIngreso && val) {
      const calculated = calculateNights(fechaIngreso, val);
      setNoches(calculated);
    }
  };

  // Compute calculated balance
  const numTotal = typeof valorTotal === 'number' ? valorTotal : 0;
  const numSena = typeof sena === 'number' ? sena : 0;
  const saldoCalculado = Math.max(0, numTotal - numSena);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nombre.trim()) {
      setFormError('Por favor ingrese el nombre del huésped');
      return;
    }
    if (!fechaIngreso || !fechaEgreso) {
      setFormError('Seleccione las fechas de ingreso y egreso');
      return;
    }
    if (fechaEgreso <= fechaIngreso) {
      setFormError('La fecha de egreso debe ser posterior a la de ingreso');
      return;
    }
    if (typeof valorTotal !== 'number' || valorTotal < 0) {
      setFormError('Indique un valor total válido');
      return;
    }
    if (!numeroContacto.trim()) {
      setFormError('Ingrese un número de contacto');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<Reserva, 'id'> | Reserva = {
        ...(reservaToEdit ? { id: reservaToEdit.id } : {}),
        nombre: nombre.trim(),
        fecha_ingreso: fechaIngreso,
        fecha_egreso: fechaEgreso,
        noches: Number(noches) > 0 ? Number(noches) : 1,
        valor_total: numTotal,
        sena: numSena,
        saldo: saldoCalculado,
        comunicacion,
        numero_contacto: numeroContacto.trim(),
        estado_contrato: estadoContrato,
        contrato_adjunto: contratoAdjunto,
        estado_reserva: estadoReserva,
        notas: notas.trim(),
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar la reserva');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const archivo = await fileToArchivoContrato(file);
      setContratoAdjunto(archivo);
      if (estadoContrato === 'pendiente_envio') {
        setEstadoContrato('enviado');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar archivo');
    }
  };

  const handleDeleteClick = async () => {
    if (!reservaToEdit || !onDelete) return;
    if (window.confirm(`¿Seguro que deseas eliminar definitivamente la reserva de "${reservaToEdit.nombre}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(reservaToEdit.id, reservaToEdit.nombre);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const archivoContratoActivo = contratoAdjunto || configDueno.contratoModelo;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-3 sm:p-4">
      <div className="my-auto bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              {reservaToEdit ? 'Editar Reserva' : 'Nueva Reserva - Mar del Tuyú'}
            </h2>
            <p className="text-xs text-slate-300">
              Control de estadía, pagos, contacto y contrato
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section: Huésped y Contacto */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-600" /> Datos del Huésped
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Lucas Gómez y Flia"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de contacto (Tel / WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  value={numeroContacto}
                  onChange={(e) => setNumeroContacto(e.target.value)}
                  placeholder="Ej. +54 9 11 3344-5566"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal de comunicación *
                </label>
                <select
                  value={comunicacion}
                  onChange={(e) => setComunicacion(e.target.value as CanalComunicacion)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                >
                  {CANALES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado de la Reserva
                </label>
                <select
                  value={estadoReserva}
                  onChange={(e) => setEstadoReserva(e.target.value as EstadoReserva)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                >
                  <option value="confirmada">Confirmada</option>
                  <option value="en_curso">En curso (hospedados)</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Fechas y Estadía */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-600" /> Fechas de la Estadía
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de ingreso (Check-in) *
                </label>
                <input
                  type="date"
                  required
                  value={fechaIngreso}
                  onChange={(e) => handleFechaIngresoChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de egreso (Check-out) *
                </label>
                <input
                  type="date"
                  required
                  value={fechaEgreso}
                  onChange={(e) => handleFechaEgresoChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cantidad de noches
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={noches}
                    onChange={(e) => setNoches(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50 font-semibold text-slate-800"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">noches</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Valores Económicos y Saldos */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-cyan-600" /> Pagos y Saldos (ARS)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Total ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 250000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seña abonada ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={sena}
                  onChange={(e) => setSena(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 125000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo pendiente ($)
                </label>
                <div className={`px-3 py-2 text-sm rounded-lg border font-bold flex items-center justify-between ${
                  saldoCalculado === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span>{formatCurrency(saldoCalculado)}</span>
                  <span className="text-[11px] font-medium uppercase">
                    {saldoCalculado === 0 ? 'Saldado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Estado del Contrato */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-600" /> Estado de Envío y Recepción de Contrato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  estadoContrato === 'pendiente_envio'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 text-rose-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="estado_contrato"
                  checked={estadoContrato === 'pendiente_envio'}
                  onChange={() => setEstadoContrato('pendiente_envio')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-bold">1. Pendiente de envío</div>
                  <div className="text-[11px] text-slate-500">Aún no se le envió el contrato</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  estadoContrato === 'enviado'
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 text-amber-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="estado_contrato"
                  checked={estadoContrato === 'enviado'}
                  onChange={() => setEstadoContrato('enviado')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold">2. Enviado (esperando firma)</div>
                  <div className="text-[11px] text-slate-500">Enviado por WhatsApp/Mail</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  estadoContrato === 'recibido_firmado'
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="estado_contrato"
                  checked={estadoContrato === 'recibido_firmado'}
                  onChange={() => setEstadoContrato('recibido_firmado')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold">3. Recibido y firmado</div>
                  <div className="text-[11px] text-slate-500">Contrato completo y archivado</div>
                </div>
              </label>
            </div>

            {/* Contract file card inside modal */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Documento de contrato adjunto:
                </span>
                {archivoContratoActivo ? (
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {contratoAdjunto ? 'Archivo específico' : 'Modelo oficial general'}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 font-medium">Sin archivo aún</span>
                )}
              </div>

              {archivoContratoActivo && (
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{archivoContratoActivo.nombreArchivo}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => descargarArchivoContrato(archivoContratoActivo)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] cursor-pointer shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>Descargar</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{contratoAdjunto ? 'Reemplazar archivo de contrato' : 'Cargar archivo de contrato (PDF / Word)'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleContractUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section: Notas adicionales */}
          <div className="space-y-1 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Notas adicionales (cantidad de personas, patente, mascotas, horarios)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. 4 personas, 1 auto (patente AB123CD). Solicitan sábanas."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div>
              {reservaToEdit && onDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={isDeleting || isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors font-bold text-xs cursor-pointer disabled:opacity-40"
                  title="Eliminar esta reserva definitivamente"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Eliminando...' : 'Eliminar Reserva'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Guardando...' : reservaToEdit ? 'Guardar Cambios' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
