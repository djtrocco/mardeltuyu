import React, { useState, useMemo } from 'react';
import { Search, Filter, MessageCircle, Phone, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, FileText, Plus, ChevronRight, User, Send } from 'lucide-react';
import { EstadoContrato, EstadoReserva, Reserva } from '../types';
import { formatCurrency, formatDateShort, createWhatsAppUrl, getReservationWhatsAppMessage } from '../lib/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ContratoModal } from './ContratoModal';

interface ReservasViewProps {
  reservas: Reserva[];
  onNewReserva: () => void;
  onEditReserva: (reserva: Reserva) => void;
  onDeleteReserva: (id: string) => Promise<void>;
  onUpdateReserva: (id: string, updates: Partial<Reserva>) => Promise<void>;
}

type FilterTab = 'todas' | 'en_curso' | 'proximas' | 'con_saldo' | 'contrato_pendiente';

export const ReservasView: React.FC<ReservasViewProps> = ({
  reservas,
  onNewReserva,
  onEditReserva,
  onDeleteReserva,
  onUpdateReserva,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todas');
  const [reservaToDelete, setReservaToDelete] = useState<Reserva | null>(null);
  const [reservaParaContrato, setReservaParaContrato] = useState<Reserva | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered reservations
  const filteredReservas = useMemo(() => {
    return reservas.filter((res) => {
      // Search term
      const matchesSearch =
        res.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.numero_contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.comunicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (res.notas && res.notas.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter tab
      if (activeFilter === 'en_curso') {
        return (
          res.estado_reserva === 'en_curso' ||
          (res.fecha_ingreso <= todayStr && res.fecha_egreso >= todayStr && res.estado_reserva !== 'cancelada')
        );
      }
      if (activeFilter === 'proximas') {
        return res.fecha_ingreso > todayStr && res.estado_reserva !== 'cancelada';
      }
      if (activeFilter === 'con_saldo') {
        return res.saldo > 0 && res.estado_reserva !== 'cancelada';
      }
      if (activeFilter === 'contrato_pendiente') {
        return res.estado_contrato !== 'recibido_firmado' && res.estado_reserva !== 'cancelada';
      }

      return true;
    });
  }, [reservas, searchTerm, activeFilter, todayStr]);

  // Statistics
  const stats = useMemo(() => {
    const total = reservas.filter(r => r.estado_reserva !== 'cancelada');
    const totalFacturado = total.reduce((acc, r) => acc + r.valor_total, 0);
    const totalSenas = total.reduce((acc, r) => acc + r.sena, 0);
    const totalSaldosPendientes = total.reduce((acc, r) => acc + r.saldo, 0);
    const enCursoCount = total.filter(
      r => r.estado_reserva === 'en_curso' || (r.fecha_ingreso <= todayStr && r.fecha_egreso >= todayStr)
    ).length;
    const contratosPendientesCount = total.filter(r => r.estado_contrato !== 'recibido_firmado').length;

    return {
      totalFacturado,
      totalSenas,
      totalSaldosPendientes,
      enCursoCount,
      contratosPendientesCount,
      reservasCount: total.length,
    };
  }, [reservas, todayStr]);

  const handleContractChange = async (res: Reserva, newEstado: EstadoContrato) => {
    await onUpdateReserva(res.id, { estado_contrato: newEstado });
  };

  const handleCobrarSaldoCompleto = async (res: Reserva) => {
    if (window.confirm(`¿Confirmar cobro total del saldo de ${formatCurrency(res.saldo)} a ${res.nombre}?`)) {
      await onUpdateReserva(res.id, {
        sena: res.valor_total,
        saldo: 0,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!reservaToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteReserva(reservaToDelete.id);
      setReservaToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top metrics summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Huéspedes Hoy</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{stats.enCursoCount}</span>
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              En la propiedad
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Mar del Tuyú</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo por Cobrar</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-bold text-amber-700">{formatCurrency(stats.totalSaldosPendientes)}</span>
            <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
              Pendiente
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">A cobrar al ingresar</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Facturado</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{formatCurrency(stats.totalFacturado)}</span>
            <span className="text-xs text-cyan-700 font-medium bg-cyan-50 px-2 py-0.5 rounded-full">
              {stats.reservasCount} reservas
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Señas: {formatCurrency(stats.totalSenas)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contratos Pendientes</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-purple-700">{stats.contratosPendientesCount}</span>
            <span className="text-xs text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
              Por enviar/firmar
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Control de firma</p>
        </div>
      </div>

      {/* Control bar: Search + Filter tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, canal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50/50"
            />
          </div>

          <button
            onClick={onNewReserva}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Reserva</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs sm:text-sm">
          <button
            onClick={() => setActiveFilter('todas')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'todas'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({reservas.length})
          </button>
          <button
            onClick={() => setActiveFilter('en_curso')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'en_curso'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            En curso ({stats.enCursoCount})
          </button>
          <button
            onClick={() => setActiveFilter('proximas')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'proximas'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Próximos Ingresos
          </button>
          <button
            onClick={() => setActiveFilter('con_saldo')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'con_saldo'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Con Saldo Pendiente
          </button>
          <button
            onClick={() => setActiveFilter('contrato_pendiente')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'contrato_pendiente'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Contratos Pendientes ({stats.contratosPendientesCount})
          </button>
        </div>
      </div>

      {/* Reservations Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredReservas.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No se encontraron reservas</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros o agrega una nueva reserva.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Huésped & Contacto</th>
                  <th className="py-3.5 px-4">Fechas (Ingreso / Egreso)</th>
                  <th className="py-3.5 px-4">Noches</th>
                  <th className="py-3.5 px-4">Total & Seña</th>
                  <th className="py-3.5 px-4">Saldo</th>
                  <th className="py-3.5 px-4">Comunicación</th>
                  <th className="py-3.5 px-4">Estado Contrato</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredReservas.map((res) => {
                  const waUrl = createWhatsAppUrl(
                    res.numero_contacto,
                    getReservationWhatsAppMessage(res, 'bienvenida')
                  );
                  const isSaldado = res.saldo === 0;

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Huésped & Contacto */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{res.nombre}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{res.numero_contacto}</span>
                        </div>
                        {res.notas && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5" title={res.notas}>
                            {res.notas}
                          </p>
                        )}
                      </td>

                      {/* Fechas */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          <span className="text-cyan-700 font-semibold">{formatDateShort(res.fecha_ingreso)}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span>{formatDateShort(res.fecha_egreso)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {res.fecha_ingreso <= todayStr && res.fecha_egreso >= todayStr ? (
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              ● Estadía en curso
                            </span>
                          ) : res.fecha_ingreso > todayStr ? (
                            <span className="text-blue-600 font-medium">Próximo ingreso</span>
                          ) : (
                            <span className="text-slate-400">Finalizada</span>
                          )}
                        </div>
                      </td>

                      {/* Noches */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {res.noches} nts
                        </span>
                      </td>

                      {/* Total & Seña */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatCurrency(res.valor_total)}</div>
                        <div className="text-xs text-slate-500">
                          Seña: <span className="font-medium text-emerald-700">{formatCurrency(res.sena)}</span>
                        </div>
                      </td>

                      {/* Saldo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSaldado ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            $0 (Saldado)
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {formatCurrency(res.saldo)}
                            </span>
                            <button
                              onClick={() => handleCobrarSaldoCompleto(res)}
                              className="block text-[11px] text-cyan-700 hover:text-cyan-900 font-medium mt-1 cursor-pointer underline"
                            >
                              Registrar cobro total
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Comunicación */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                          {res.comunicacion}
                        </span>
                      </td>

                      {/* Estado Contrato */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <select
                            value={res.estado_contrato}
                            onChange={(e) => handleContractChange(res, e.target.value as EstadoContrato)}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer block ${
                              res.estado_contrato === 'recibido_firmado'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : res.estado_contrato === 'enviado'
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-rose-50 border-rose-300 text-rose-800'
                            }`}
                          >
                            <option value="pendiente_envio">1. Pendiente de envío</option>
                            <option value="enviado">2. Enviado (esperando firma)</option>
                            <option value="recibido_firmado">3. Recibido / Firmado</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setReservaParaContrato(res)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer"
                            title="Ver o enviar contrato por WhatsApp a este huésped"
                          >
                            <FileText className="w-3 h-3 text-purple-600" />
                            <span>Enviar Contrato</span>
                          </button>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Abrir WhatsApp con mensaje de estadía"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setReservaToDelete(res)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Eliminar reserva para borrarla"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setReservaParaContrato(res)}
                            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Gestionar y Enviar Contrato por WhatsApp"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditReserva(res)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Editar reserva"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(reservaToDelete)}
        reserva={reservaToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setReservaToDelete(null)}
        isDeleting={isDeleting}
      />

      {/* Contrato Modal */}
      <ContratoModal
        isOpen={Boolean(reservaParaContrato)}
        reserva={reservaParaContrato}
        onClose={() => setReservaParaContrato(null)}
        onUpdateReserva={onUpdateReserva}
      />
    </div>
  );
};
