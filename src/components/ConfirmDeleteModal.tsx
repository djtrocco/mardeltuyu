import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Reserva } from '../types';
import { formatDateShort, formatCurrency } from '../lib/formatters';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  reserva: Reserva | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  reserva,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen || !reserva) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              ¿Eliminar esta reserva?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Esta acción no se puede deshacer. Se liberarán las fechas en el calendario.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-400">Huésped:</span>
              <span className="font-bold text-slate-900">{reserva.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Período:</span>
              <span className="font-medium text-slate-800">
                {formatDateShort(reserva.fecha_ingreso)} → {formatDateShort(reserva.fecha_egreso)} ({reserva.noches} nts)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total pactado:</span>
              <span className="font-bold text-slate-900">{formatCurrency(reserva.valor_total)}</span>
            </div>
            {reserva.saldo > 0 && (
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Saldo pendiente:</span>
                <span>{formatCurrency(reserva.saldo)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Reserva'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
