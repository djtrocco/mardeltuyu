import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, Calendar, Download, PieChart, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Reserva } from '../types';
import { formatCurrency, generateMonthlyReports } from '../lib/formatters';

interface ReportesViewProps {
  reservas: Reserva[];
}

export const ReportesView: React.FC<ReportesViewProps> = ({ reservas }) => {
  const monthlyReports = useMemo(() => {
    return generateMonthlyReports(reservas);
  }, [reservas]);

  // Overall totals
  const overallTotals = useMemo(() => {
    const valid = reservas.filter(r => r.estado_reserva !== 'cancelada');
    const totalFacturado = valid.reduce((sum, r) => sum + r.valor_total, 0);
    const totalCobrado = valid.reduce((sum, r) => sum + (r.valor_total - r.saldo), 0);
    const totalPendiente = valid.reduce((sum, r) => sum + r.saldo, 0);
    const totalNoches = valid.reduce((sum, r) => sum + r.noches, 0);
    const tarifaPromedio = totalNoches > 0 ? Math.round(totalFacturado / totalNoches) : 0;

    return {
      totalFacturado,
      totalCobrado,
      totalPendiente,
      totalNoches,
      tarifaPromedio,
      totalReservas: valid.length,
    };
  }, [reservas]);

  // Breakdown by channel
  const channelBreakdown = useMemo(() => {
    const map: { [key: string]: { count: number; total: number } } = {};
    reservas.filter(r => r.estado_reserva !== 'cancelada').forEach((r) => {
      if (!map[r.comunicacion]) {
        map[r.comunicacion] = { count: 0, total: 0 };
      }
      map[r.comunicacion].count += 1;
      map[r.comunicacion].total += r.valor_total;
    });

    return Object.entries(map).map(([channel, data]) => ({
      channel,
      count: data.count,
      total: data.total,
      percentage: overallTotals.totalFacturado > 0 ? Math.round((data.total / overallTotals.totalFacturado) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [reservas, overallTotals]);

  // Max monthly revenue for bar scaling
  const maxMonthlyRevenue = useMemo(() => {
    return Math.max(...monthlyReports.map(r => r.totalFacturado), 1);
  }, [monthlyReports]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Mes', 'Año', 'Facturado', 'Cobrado', 'Saldo Pendiente', 'Cant. Reservas', 'Noches Ocupadas', 'Tarifa Promedio Noche'];
    const rows = monthlyReports.map(r => [
      r.nombreMes,
      r.ano,
      r.totalFacturado,
      r.totalCobrado,
      r.totalSaldoPendiente,
      r.cantidadReservas,
      r.nochesOcupadas,
      r.tarifaPromedioNoche,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_alquiler_mardeltuyu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
            Reportes Mensuales de Ganancias
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Control de facturación, cobros efectivos, saldos por percibir y estadísticas de ocupación.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a Excel (CSV)</span>
        </button>
      </div>

      {/* Global Financial Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facturado Total</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(overallTotals.totalFacturado)}
          </div>
          <span className="text-[11px] text-slate-500">Total pactado</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cobrado Efectivo</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {formatCurrency(overallTotals.totalCobrado)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Señas + saldos cobrados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Saldo a Cobrar</span>
          <div className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">
            {formatCurrency(overallTotals.totalPendiente)}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Pendiente de ingreso</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Noches Vendidas</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {overallTotals.totalNoches}
          </div>
          <span className="text-[11px] text-slate-500">En {overallTotals.totalReservas} reservas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarifa Promedio</span>
          <div className="text-xl sm:text-2xl font-bold text-cyan-700 mt-1">
            {formatCurrency(overallTotals.tarifaPromedio)}
          </div>
          <span className="text-[11px] text-slate-500">Por noche alquilada</span>
        </div>
      </div>

      {/* Visual Monthly Revenue Chart Bars */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Evolución Mensual de Facturación
        </h3>

        <div className="space-y-3 pt-2">
          {monthlyReports.map((report) => {
            const pct = Math.round((report.totalFacturado / maxMonthlyRevenue) * 100);
            return (
              <div key={report.mesClave} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{report.nombreMes}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{report.nochesOcupadas} noches • {report.cantidadReservas} reservas</span>
                    <span className="font-bold text-slate-900">{formatCurrency(report.totalFacturado)}</span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full transition-all duration-500"
                    title={`${report.nombreMes}: ${formatCurrency(report.totalFacturado)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month-by-month Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Detalle Mes a Mes
          </h3>
          <span className="text-xs text-slate-400">
            Valores expresados en Pesos Argentinos (ARS)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Mes</th>
                <th className="py-3 px-4">Reservas</th>
                <th className="py-3 px-4">Noches Ocupadas</th>
                <th className="py-3 px-4">Tarifa Prom./Noche</th>
                <th className="py-3 px-4">Total Facturado</th>
                <th className="py-3 px-4">Cobrado Efectivo</th>
                <th className="py-3 px-4">Saldo Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {monthlyReports.map((report) => (
                <tr key={report.mesClave} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {report.nombreMes}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {report.cantidadReservas}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {report.nochesOcupadas} noches
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatCurrency(report.tarifaPromedioNoche)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {formatCurrency(report.totalFacturado)}
                  </td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">
                    {formatCurrency(report.totalCobrado)}
                  </td>
                  <td className="py-3 px-4 text-amber-700 font-semibold">
                    {formatCurrency(report.totalSaldoPendiente)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Communication Channel Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-cyan-600" />
          Rendimiento por Canal de Comunicación
        </h3>
        <p className="text-xs text-slate-500">
          ¿Por dónde te llegan más reservas y dinero a la casa en Mar del Tuyú?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {channelBreakdown.map((item) => (
            <div key={item.channel} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{item.channel}</span>
                <span className="text-[11px] font-bold text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded">
                  {item.percentage}%
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 mt-2">
                {formatCurrency(item.total)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {item.count} reserva(s)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
