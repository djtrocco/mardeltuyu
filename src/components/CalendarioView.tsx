import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus, CheckCircle2, Clock, SunMedium } from 'lucide-react';
import { Reserva } from '../types';
import { formatCurrency, formatDateShort } from '../lib/formatters';

interface CalendarioViewProps {
  reservas: Reserva[];
  onSelectDateToBook: (dateStr: string) => void;
  onEditReserva: (reserva: Reserva) => void;
}

export const CalendarioView: React.FC<CalendarioViewProps> = ({
  reservas,
  onSelectDateToBook,
  onEditReserva,
}) => {
  // Current displayed month & year
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(null);
  };

  const jumpToTemporada = (targetMonth: number, targetYear: number) => {
    setCurrentDate(new Date(targetYear, targetMonth, 1));
    setSelectedDateStr(null);
  };

  // Calendar day cells calculation
  const calendarData = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    // Normalize to Monday = 0
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    interface DayCell {
      dayNumber: number | null;
      dateStr: string | null;
      activeBookings: Reserva[];
      checkIns: Reserva[];
      checkOuts: Reserva[];
      staying: Reserva[];
      isOccupied: boolean;
      isRecambio: boolean;
    }

    const days: DayCell[] = [];

    // Empty lead cells
    for (let i = 0; i < startOffset; i++) {
      days.push({
        dayNumber: null,
        dateStr: null,
        activeBookings: [],
        checkIns: [],
        checkOuts: [],
        staying: [],
        isOccupied: false,
        isRecambio: false,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;

      // Check bookings touching this date
      const activeBookings = reservas.filter((r) => {
        if (r.estado_reserva === 'cancelada') return false;
        return dateStr >= r.fecha_ingreso && dateStr <= r.fecha_egreso;
      });

      const checkIns = activeBookings.filter((r) => r.fecha_ingreso === dateStr);
      const checkOuts = activeBookings.filter((r) => r.fecha_egreso === dateStr);
      const staying = activeBookings.filter((r) => dateStr > r.fecha_ingreso && dateStr < r.fecha_egreso);

      days.push({
        dayNumber: d,
        dateStr,
        activeBookings,
        checkIns,
        checkOuts,
        staying,
        isOccupied: staying.length > 0 || (checkIns.length > 0 && checkOuts.length > 0),
        isRecambio: checkIns.length > 0 && checkOuts.length > 0,
      });
    }

    return days;
  }, [year, month, reservas]);

  const monthName = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Selected date details
  const selectedDayInfo = useMemo(() => {
    if (!selectedDateStr) return null;
    return calendarData.find((d) => d.dateStr === selectedDateStr);
  }, [selectedDateStr, calendarData]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Calendar Header & Quick Season Jump */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cyan-600" />
              <span>{capitalizedMonth}</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
              Casa Mar del Tuyú
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Consulta disponibilidad, ingresos y egresos diarios. Haz clic en un día libre para reservar.
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick jump to summer months */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
            <span className="px-2 text-slate-400 font-normal">Temporada:</span>
            <button
              onClick={() => jumpToTemporada(11, year)}
              className={`px-2 py-1 rounded-lg hover:bg-white transition-all ${month === 11 ? 'bg-white font-bold text-cyan-700 shadow-xs' : ''}`}
            >
              Dic
            </button>
            <button
              onClick={() => jumpToTemporada(0, month > 6 ? year + 1 : year)}
              className={`px-2 py-1 rounded-lg hover:bg-white transition-all ${month === 0 ? 'bg-white font-bold text-cyan-700 shadow-xs' : ''}`}
            >
              Ene
            </button>
            <button
              onClick={() => jumpToTemporada(1, month > 6 ? year + 1 : year)}
              className={`px-2 py-1 rounded-lg hover:bg-white transition-all ${month === 1 ? 'bg-white font-bold text-cyan-700 shadow-xs' : ''}`}
            >
              Feb
            </button>
            <button
              onClick={() => jumpToTemporada(2, month > 6 ? year + 1 : year)}
              className={`px-2 py-1 rounded-lg hover:bg-white transition-all ${month === 2 ? 'bg-white font-bold text-cyan-700 shadow-xs' : ''}`}
            >
              Mar
            </button>
          </div>
        </div>
      </div>

      {/* Main Month Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-slate-900 text-white text-center text-xs font-bold py-2.5 uppercase tracking-wider">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span className="text-cyan-300">Sáb</span>
          <span className="text-cyan-300">Dom</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-50">
          {calendarData.map((day, idx) => {
            if (!day.dayNumber || !day.dateStr) {
              return <div key={`empty-${idx}`} className="min-h-[100px] sm:min-h-[120px] bg-slate-100/40" />;
            }

            const isToday = day.dateStr === todayStr;
            const isSelected = day.dateStr === selectedDateStr;
            const hasCheckIn = day.checkIns.length > 0;
            const hasCheckOut = day.checkOuts.length > 0;
            const isStaying = day.staying.length > 0;
            const isRecambio = day.isRecambio;
            const isFree = day.activeBookings.length === 0;

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDateStr(day.dateStr)}
                className={`min-h-[100px] sm:min-h-[120px] p-2 transition-all flex flex-col justify-between cursor-pointer group relative ${
                  isSelected
                    ? 'ring-2 ring-cyan-500 bg-cyan-50/50 z-10'
                    : isToday
                    ? 'bg-amber-50/50 hover:bg-amber-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Day number & indicators */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-slate-900 text-white'
                        : isSelected
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-800 group-hover:text-cyan-700'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Micro state indicators */}
                  <div className="flex items-center gap-1">
                    {isRecambio && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Recambio: entra y sale gente hoy" />
                    )}
                    {isFree && (
                      <span className="text-[10px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        + Reservar
                      </span>
                    )}
                  </div>
                </div>

                {/* Day content / guest cards */}
                <div className="mt-1 flex-1 flex flex-col gap-1 overflow-hidden">
                  {/* Recambio day indicator */}
                  {isRecambio && (
                    <div className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold truncate">
                      🔄 Recambio Hoy
                    </div>
                  )}

                  {/* Check-ins */}
                  {hasCheckIn && (
                    <div className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-semibold flex items-center gap-1 truncate border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span className="truncate">In: {day.checkIns[0].nombre}</span>
                    </div>
                  )}

                  {/* Full staying day */}
                  {isStaying && !hasCheckIn && (
                    <div className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 text-[10px] font-medium flex items-center gap-1 truncate border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="truncate">{day.staying[0].nombre}</span>
                    </div>
                  )}

                  {/* Check-outs */}
                  {hasCheckOut && !isRecambio && (
                    <div className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium flex items-center gap-1 truncate border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="truncate">Out: {day.checkOuts[0].nombre}</span>
                    </div>
                  )}

                  {/* Free day label */}
                  {isFree && (
                    <div className="text-[10px] text-slate-300 font-medium text-center py-2 flex items-center justify-center gap-1">
                      <span>Libre</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Selected Day Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Legend */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-1 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Referencias del Calendario</h4>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-300" />
              <span><b>Ingreso (Check-in)</b>: Huésped entra a la casa</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-blue-100 border border-blue-300" />
              <span><b>Estadía Ocupada</b>: Casa alquilada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300" />
              <span><b>Día de Recambio</b>: Sale alguien a la mañana y entra otro a la tarde</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-white border border-slate-300" />
              <span><b>Disponible</b>: Fecha libre para alquilar</span>
            </div>
          </div>
        </div>

        {/* Selected Date Details Panel */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2">
          {selectedDayInfo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Detalle del {formatDateShort(selectedDayInfo.dateStr!)}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedDayInfo.activeBookings.length > 0
                      ? `${selectedDayInfo.activeBookings.length} reserva(s) registradas para esta fecha`
                      : 'Esta fecha está 100% disponible'}
                  </p>
                </div>

                <button
                  onClick={() => onSelectDateToBook(selectedDayInfo.dateStr!)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Reserva desde este día</span>
                </button>
              </div>

              {/* Bookings touching this date */}
              {selectedDayInfo.activeBookings.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  {selectedDayInfo.activeBookings.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => onEditReserva(res)}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{res.nombre}</span>
                        <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                          {res.noches} noches
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {formatDateShort(res.fecha_ingreso)} → {formatDateShort(res.fecha_egreso)}
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-200/60">
                        <span>Total: <b>{formatCurrency(res.valor_total)}</b></span>
                        <span className={res.saldo === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {res.saldo === 0 ? 'Saldado' : `Debe: ${formatCurrency(res.saldo)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              <SunMedium className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Selecciona cualquier día del calendario para ver el detalle de ocupación o comenzar una reserva directa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
