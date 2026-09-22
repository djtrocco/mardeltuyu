import React from 'react';
import { Home, Calendar, DollarSign, Bell, Plus, Database, Waves, Settings, FileText } from 'lucide-react';
import { SupabaseConfig } from '../lib/supabase';

interface NavbarProps {
  currentTab: 'reservas' | 'calendario' | 'reportes' | 'alertas' | 'configuracion';
  setCurrentTab: (tab: 'reservas' | 'calendario' | 'reportes' | 'alertas' | 'configuracion') => void;
  alertCount: number;
  onOpenNewReserva: () => void;
  onOpenSupabaseConfig: () => void;
  supabaseConfig: SupabaseConfig;
  isSupabaseLive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  alertCount,
  onOpenNewReserva,
  onOpenSupabaseConfig,
  supabaseConfig,
  isSupabaseLive,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top micro bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-cyan-400">
            <Waves className="w-3.5 h-3.5" /> Mar del Tuyú
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Control de Ingresos, Egresos y Reservas</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-semibold shadow-xs"
            title="Sincronización en la nube activa: los datos se actualizan en tiempo real entre todos tus navegadores y celulares"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firebase Nube (Tiempo Real)</span>
          </div>

          <button
            onClick={onOpenSupabaseConfig}
            className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-[11px]"
            title="Configuración de Base de Datos PostgreSQL adicional"
          >
            <Database className="w-3 h-3 text-cyan-400" />
            <span>PostgreSQL</span>
          </button>

          <a
            href="/PROYECTO.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 transition-colors text-[11px] font-medium"
            title="Ver o descargar el archivo Markdown con toda la arquitectura del proyecto para cargar en otra Inteligencia Artificial"
          >
            <FileText className="w-3 h-3 text-cyan-400" />
            <span>PROYECTO.md (IA)</span>
          </a>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Alquiler Mar del Tuyú
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  Costa Atlántica
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Ingresos • Egresos • Pagos • Contratos • Calendario
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCurrentTab('reservas')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'reservas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Reservas & Saldos</span>
            </button>

            <button
              onClick={() => setCurrentTab('calendario')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'calendario'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => setCurrentTab('reportes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'reportes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Reportes de Ganancias</span>
            </button>

            <button
              onClick={() => setCurrentTab('alertas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                currentTab === 'alertas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alertas</span>
              {alertCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                  {alertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('configuracion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'configuracion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </button>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTab('configuracion')}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
              title="Configuración de avisos y contrato"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setCurrentTab('alertas')}
              className="md:hidden relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
              title="Ver alertas"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenNewReserva}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-sm shadow-cyan-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Reserva</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary tab bar */}
        <div className="md:hidden flex border-t border-slate-200 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setCurrentTab('reservas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentTab === 'reservas' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Reservas
          </button>
          <button
            onClick={() => setCurrentTab('calendario')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentTab === 'calendario' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setCurrentTab('reportes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentTab === 'reportes' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Reportes
          </button>
          <button
            onClick={() => setCurrentTab('alertas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
              currentTab === 'alertas' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Alertas ({alertCount})
          </button>
          <button
            onClick={() => setCurrentTab('configuracion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              currentTab === 'configuracion' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Configuración
          </button>
        </div>
      </div>
    </header>
  );
};
