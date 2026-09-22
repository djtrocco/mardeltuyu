import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { NotificationsBanner } from './components/NotificationsBanner';
import { ReservasView } from './components/ReservasView';
import { CalendarioView } from './components/CalendarioView';
import { ReportesView } from './components/ReportesView';
import { ReservaModal } from './components/ReservaModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { ConfiguracionView } from './components/ConfiguracionView';
import { Reserva, ConfiguracionDueno } from './types';
import {
  subscribeToReservas,
  createReservaInFirestore,
  updateReservaInFirestore,
  deleteReservaFromFirestore,
  getReservasFromFirestore,
  subscribeToConfiguracionDueno,
} from './lib/firebase';
import {
  getStoredSupabaseConfig,
  testSupabaseConnection,
} from './lib/supabase';
import { generateAlerts } from './lib/formatters';
import { getConfiguracionDueno } from './lib/configStorage';
import { procesarDespachoAutomaticoDueno } from './lib/autoAlertsEngine';
import { Waves, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'reservas' | 'calendario' | 'reportes' | 'alertas' | 'configuracion'>('reservas');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [configDueno, setConfigDueno] = useState<ConfiguracionDueno>(() => getConfiguracionDueno());
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
  const [reservaToEdit, setReservaToEdit] = useState<Reserva | null>(null);
  const [initialDatesForBooking, setInitialDatesForBooking] = useState<{ ingreso: string; egreso: string } | null>(null);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);

  // Supabase state (optional alternative)
  const [supabaseConfig, setSupabaseConfig] = useState(getStoredSupabaseConfig());
  const [isSupabaseLive, setIsSupabaseLive] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Real-time synchronization with Firebase Firestore across all browsers and devices
  useEffect(() => {
    setLoading(true);
    setErrorNotice(null);

    const unsubscribe = subscribeToReservas(
      (cloudReservas) => {
        setReservas(cloudReservas);
        setLoading(false);
        setErrorNotice(null);
      },
      (err: any) => {
        console.warn('Aviso sincronizando con Firebase Firestore:', err);
        // Si Firestore opera en modo offline o reconectando, la app continúa con los datos en caché
        if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Could not reach')) {
          setLoading(false);
        } else {
          setErrorNotice('Hubo un inconveniente al conectar con la base de datos en la nube. Reintentando...');
          setLoading(false);
        }
      }
    );

    // Check optional Supabase status if configured
    if (supabaseConfig.useSupabase && supabaseConfig.url && supabaseConfig.anonKey) {
      testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey)
        .then((testRes) => setIsSupabaseLive(testRes.success))
        .catch(() => setIsSupabaseLive(false));
    }

    // Subscribe to real-time owner configuration updates
    const unsubConfig = subscribeToConfiguracionDueno((cloudConfig) => {
      setConfigDueno(cloudConfig);
    });

    return () => {
      unsubscribe();
      unsubConfig();
    };
  }, [supabaseConfig]);

  // Generated alerts
  const alerts = useMemo(() => {
    return generateAlerts(reservas);
  }, [reservas]);

  // Automated owner 24-hour notification dispatch engine
  useEffect(() => {
    if (loading || reservas.length === 0) return;

    procesarDespachoAutomaticoDueno(configDueno, reservas, alerts, (newConfig) => {
      setConfigDueno(newConfig);
    }).then((res) => {
      if (res.despachado) {
        showToast(`🔔 ${res.detalle || 'Aviso automático de 24 hs enviado a tu teléfono'}`);
      }
    });
  }, [loading, reservas, alerts, configDueno.envioAutomaticoWhatsapp, configDueno.ultimoAvisoEnviadoFecha]);

  const reloadData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const data = await getReservasFromFirestore();
      setReservas(data);
    } catch (e: any) {
      setErrorNotice('Error al recargar datos desde la nube');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Save reservation (create or update in Firestore)
  const handleSaveReserva = async (reservaData: Omit<Reserva, 'id'> | Reserva) => {
    if ('id' in reservaData && reservaData.id) {
      // Actualización optimista inmediata en pantalla
      setReservas(prev => prev.map(r => r.id === reservaData.id ? (reservaData as Reserva) : r));
      const res = await updateReservaInFirestore(reservaData.id, reservaData);
      if (res.success) {
        showToast('Reserva actualizada en la nube');
      } else {
        setErrorNotice(res.error || 'Error al actualizar reserva');
        reloadData();
      }
    } else {
      // Crear en la nube
      const res = await createReservaInFirestore(reservaData);
      if (res.success && res.data) {
        setReservas(prev => {
          if (prev.some(r => r.id === res.data!.id)) return prev;
          return [...prev, res.data!];
        });
        showToast('¡Nueva reserva guardada en la nube!');
      } else {
        setErrorNotice(res.error || 'Error al guardar reserva');
      }
    }
  };

  // Handler: Quick partial update
  const handleUpdateReserva = async (id: string, updates: Partial<Reserva>) => {
    // Actualización optimista inmediata en pantalla
    setReservas(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const res = await updateReservaInFirestore(id, updates);
    if (res.success) {
      showToast('Cambios sincronizados en la nube');
    } else {
      setErrorNotice(res.error || 'Error al actualizar');
      reloadData();
    }
  };

  // Handler: Delete reservation
  const handleDeleteReserva = async (id: string) => {
    // 1. Quitarla inmediatamente de la pantalla (optimistic UI update instantáneo)
    setReservas(prev => prev.filter(r => r.id !== id));

    // 2. Eliminarla de Firestore y de la caché persistente
    const res = await deleteReservaFromFirestore(id);
    if (res.success) {
      showToast('Reserva eliminada');
    } else {
      setErrorNotice(res.error || 'Error al eliminar en la nube');
      reloadData();
    }
  };

  // Open modal helpers
  const handleOpenNewReserva = () => {
    setReservaToEdit(null);
    setInitialDatesForBooking(null);
    setIsReservaModalOpen(true);
  };

  const handleEditReserva = (reserva: Reserva) => {
    setReservaToEdit(reserva);
    setInitialDatesForBooking(null);
    setIsReservaModalOpen(true);
  };

  const handleSelectDateToBook = (dateStr: string) => {
    // Start date is dateStr, end date 4 days later
    const start = new Date(dateStr);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);

    setInitialDatesForBooking({
      ingreso: dateStr,
      egreso: end.toISOString().split('T')[0],
    });
    setReservaToEdit(null);
    setIsReservaModalOpen(true);
  };

  const handleConfigUpdated = () => {
    const conf = getStoredSupabaseConfig();
    setSupabaseConfig(conf);
    reloadData();
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        alertCount={alerts.length}
        onOpenNewReserva={handleOpenNewReserva}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        supabaseConfig={supabaseConfig}
        isSupabaseLive={isSupabaseLive}
      />

      {/* Main content container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error notification banner if any */}
        {errorNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={reloadData}
              className="text-amber-900 font-bold underline hover:no-underline ml-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Floating toast notification */}
        {successToast && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Priority Automated Alerts Banner for Today */}
        <NotificationsBanner
          alerts={alerts}
          configDueno={configDueno}
          reservas={reservas}
          onOpenNotificationsModal={() => setIsNotificationsModalOpen(true)}
          onOpenConfiguracion={() => setCurrentTab('configuracion')}
          onSelectReserva={handleEditReserva}
        />

        {/* Tab View Switching */}
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-600" />
            <p className="text-sm font-medium">Cargando reservas de la propiedad...</p>
          </div>
        ) : (
          <>
            {currentTab === 'reservas' && (
              <ReservasView
                reservas={reservas}
                onNewReserva={handleOpenNewReserva}
                onEditReserva={handleEditReserva}
                onDeleteReserva={handleDeleteReserva}
                onUpdateReserva={handleUpdateReserva}
              />
            )}

            {currentTab === 'calendario' && (
              <CalendarioView
                reservas={reservas}
                onSelectDateToBook={handleSelectDateToBook}
                onEditReserva={handleEditReserva}
              />
            )}

            {currentTab === 'reportes' && (
              <ReportesView reservas={reservas} />
            )}

            {currentTab === 'configuracion' && (
              <ConfiguracionView
                reservas={reservas}
                alertas={alerts}
                onConfigSaved={() => setConfigDueno(getConfiguracionDueno())}
              />
            )}

            {currentTab === 'alertas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    Todas las Alertas y Notificaciones Automáticas
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    {alerts.length} avisos activos
                  </span>
                </div>
                {/* Embed notifications full view */}
                <NotificationsModal
                  isOpen={true}
                  onClose={() => setCurrentTab('reservas')}
                  alerts={alerts}
                  configDueno={configDueno}
                  reservas={reservas}
                  onOpenConfiguracion={() => setCurrentTab('configuracion')}
                  onUpdateReserva={handleUpdateReserva}
                  onSelectReserva={handleEditReserva}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ReservaModal
        isOpen={isReservaModalOpen}
        onClose={() => {
          setIsReservaModalOpen(false);
          setReservaToEdit(null);
          setInitialDatesForBooking(null);
        }}
        onSave={handleSaveReserva}
        onDelete={handleDeleteReserva}
        reservaToEdit={reservaToEdit}
        initialDates={initialDatesForBooking}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen && currentTab !== 'alertas'}
        onClose={() => setIsNotificationsModalOpen(false)}
        alerts={alerts}
        configDueno={configDueno}
        reservas={reservas}
        onOpenConfiguracion={() => setCurrentTab('configuracion')}
        onUpdateReserva={handleUpdateReserva}
        onSelectReserva={handleEditReserva}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onConfigUpdated={handleConfigUpdated}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Waves className="w-4 h-4 text-cyan-600" />
            <span>Alquiler Temporario Mar del Tuyú • Control de Ingresos y Egresos</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>React + Tailwind CSS</span>
            <span>•</span>
            <button
              onClick={() => setIsSupabaseConfigOpen(true)}
              className="hover:text-emerald-700 font-medium transition-colors cursor-pointer"
            >
              PostgreSQL & Supabase
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
