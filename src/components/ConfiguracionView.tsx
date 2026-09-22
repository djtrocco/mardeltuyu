import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Home,
  Clock,
  Wifi,
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  MessageCircle,
  Send,
  Bell,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Zap,
  Radio,
  History,
  Info,
  Copy,
  ExternalLink,
  Bot,
  FileCode,
} from 'lucide-react';
import { ConfiguracionDueno, ArchivoContrato, Reserva, AlertaNotificacion, RegistroAvisoDueno } from '../types';
import {
  getConfiguracionDueno,
  saveConfiguracionDueno,
  fileToArchivoContrato,
  descargarArchivoContrato,
  generarMensajeAvisosParaDueno,
  generarMailtoAvisosParaDueno,
} from '../lib/configStorage';
import {
  subscribeToConfiguracionDueno,
  saveConfiguracionDuenoToFirestore,
} from '../lib/firebase';
import { createWhatsAppUrl } from '../lib/formatters';
import {
  solicitarPermisoNotificaciones,
  dispararNotificacionNavegador,
  getHistorialAvisos,
  enviarWhatsAppCallMeBot,
  guardarRegistroAviso,
} from '../lib/autoAlertsEngine';

interface ConfiguracionViewProps {
  reservas?: Reserva[];
  alertas?: AlertaNotificacion[];
  onConfigSaved?: () => void;
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  reservas = [],
  alertas = [],
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<ConfiguracionDueno>(() => getConfiguracionDueno());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<RegistroAvisoDueno[]>(() => getHistorialAvisos());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingApi, setTestingApi] = useState(false);
  const [notifGranted, setNotifGranted] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const getMarkdownUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/PROYECTO.md`;
    }
    return '/PROYECTO.md';
  };

  const handleCopiarUrl = () => {
    const url = getMarkdownUrl();
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const handleCopiarPrompt = () => {
    const promptText = `Actúa como un Desarrollador Senior Full Stack experto en React 19, TypeScript, Tailwind CSS y Firebase.\nHe adjuntado el archivo PROYECTO.md que describe en detalle la arquitectura, tipos, estado y propósito de la aplicación "Alquiler Mar del Tuyú".\nPor favor analiza el archivo adjunto y confirma que comprendes la lógica del negocio, el modelo de datos y las reglas del sistema.\nQuedo a la espera de tu confirmación para indicarte la siguiente funcionalidad a desarrollar.`;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleActivarNotificaciones = async () => {
    const granted = await solicitarPermisoNotificaciones();
    setNotifGranted(granted);
    if (granted) {
      dispararNotificacionNavegador(
        '🔔 Notificaciones automáticas activadas',
        'Recibirás los avisos de 24 hs de tus alquileres de Mar del Tuyú en este dispositivo.'
      );
    }
  };

  const handleTestCallMeBot = async () => {
    if (!config.telefonoDueno) {
      setTestResult('⚠️ Debes ingresar primero tu teléfono de propietario.');
      return;
    }
    if (!config.callmebotApiKey) {
      setTestResult('⚠️ Ingresa la API Key de CallMeBot para enviar WhatsApp en segundo plano.');
      return;
    }
    setTestingApi(true);
    setTestResult('Enviando WhatsApp de prueba a tu teléfono...');
    const res = await enviarWhatsAppCallMeBot(
      config.telefonoDueno,
      '🔔 *TEST AUTOMÁTICO - Casa Mar del Tuyú*\nEl sistema de avisos automáticos al propietario con 24 hs de antelación está conectado y operativo.',
      config.callmebotApiKey
    );
    setTestingApi(false);
    if (res.success) {
      setTestResult('✅ ¡WhatsApp de prueba enviado correctamente a tu celular!');
      guardarRegistroAviso({
        id: `test-${Date.now()}`,
        fecha: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        tipo: 'callmebot_api',
        telefonoDestino: config.telefonoDueno,
        destinatario: 'dueno',
        resumen: 'Prueba de despacho automático exitosa',
        exitoso: true,
      });
      setHistorial(getHistorialAvisos());
    } else {
      setTestResult(`❌ Error al enviar: ${res.error}`);
    }
  };

  // Sync owner configuration in real time with Firestore
  React.useEffect(() => {
    const unsubscribe = subscribeToConfiguracionDueno((cloudConfig) => {
      setConfig(cloudConfig);
      saveConfiguracionDueno(cloudConfig);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveConfiguracionDueno(config);
    await saveConfiguracionDuenoToFirestore(config);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('El archivo no debe superar los 15MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const archivo = await fileToArchivoContrato(file);
      const updatedConfig = { ...config, contratoModelo: archivo };
      setConfig(updatedConfig);
      saveConfiguracionDueno(updatedConfig);
      await saveConfiguracionDuenoToFirestore(updatedConfig);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveContract = () => {
    if (window.confirm('¿Seguro que deseas eliminar el archivo de contrato guardado?')) {
      const updatedConfig = { ...config, contratoModelo: null };
      setConfig(updatedConfig);
      saveConfiguracionDueno(updatedConfig);
    }
  };

  // WhatsApp summary to owner
  const mensajeDueno = generarMensajeAvisosParaDueno(config, reservas, alertas);
  const whatsappDuenoUrl = config.telefonoDueno
    ? createWhatsAppUrl(config.telefonoDueno, mensajeDueno)
    : '';

  const emailDuenoUrl = generarMailtoAvisosParaDueno(config, reservas, alertas);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-semibold backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Panel de Propietario</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Configuración & Avisos al Dueño
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Configura tus datos de contacto para recibir resúmenes automáticos por WhatsApp o Email, y carga el modelo de contrato para enviarlo a los inquilinos con 1 clic.
            </p>
          </div>

          <button
            onClick={() => handleSave()}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>¡Configuración y datos guardados exitosamente!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Owner & Property Details */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tus Datos de Contacto (Dueño)
                </h3>
                <p className="text-xs text-slate-500">
                  Aquí es donde recibirás los avisos de check-in, check-out y saldos pendientes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Dueño / Administrador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.nombreDueno}
                    onChange={(e) => setConfig({ ...config, nombreDueno: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tu WhatsApp (donde recibirás avisos)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.telefonoDueno}
                    onChange={(e) => setConfig({ ...config, telefonoDueno: e.target.value })}
                    placeholder="Ej. +54 9 11 4455-6677"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400">Incluye código de país y área (+54 9...)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tu Email (para reportes por correo)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={config.emailDueno}
                    onChange={(e) => setConfig({ ...config, emailDueno: e.target.value })}
                    placeholder="Ej. dueno@alquiler.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal preferido para recibir avisos
                </label>
                <select
                  value={config.canalAvisoPreferido}
                  onChange={(e) => setConfig({ ...config, canalAvisoPreferido: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                >
                  <option value="whatsapp">WhatsApp (Recomendado)</option>
                  <option value="email">Email</option>
                  <option value="ambos">Ambos (WhatsApp y Email)</option>
                </select>
              </div>
            </div>

            {/* Property details */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Datos de la Casa en Mar del Tuyú
                  </h3>
                  <p className="text-xs text-slate-500">
                    Información que se incluirá en los mensajes para los inquilinos y en los contratos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección exacta del inmueble
                  </label>
                  <input
                    type="text"
                    value={config.direccionInmueble}
                    onChange={(e) => setConfig({ ...config, direccionInmueble: e.target.value })}
                    placeholder="Calle 74 entre 2 y 3, Mar del Tuyú, Pcia. de Buenos Aires"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horario de Check-in
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={config.horarioCheckIn}
                      onChange={(e) => setConfig({ ...config, horarioCheckIn: e.target.value })}
                      placeholder="14:00"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horario de Check-out
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={config.horarioCheckOut}
                      onChange={(e) => setConfig({ ...config, horarioCheckOut: e.target.value })}
                      placeholder="10:00"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Antelación de avisos de control
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50/70 border border-cyan-200 rounded-lg text-xs font-bold text-cyan-900">
                    <Clock className="w-4 h-4 text-cyan-700 shrink-0" />
                    <span>24 horas de antelación (1 día antes)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Control previo de ingresos y egresos con 24 hs de antelación (no diario).
                  </p>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Red Wi-Fi
                  </label>
                  <div className="relative">
                    <Wifi className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={config.redWifi}
                      onChange={(e) => setConfig({ ...config, redWifi: e.target.value })}
                      placeholder="MarDelTuyu_Wifi"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña Wi-Fi
                  </label>
                  <input
                    type="text"
                    value={config.claveWifi}
                    onChange={(e) => setConfig({ ...config, claveWifi: e.target.value })}
                    placeholder="verano2025"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>

          {/* Contract Upload Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Modelo Oficial de Contrato de Alquiler
                  </h3>
                  <p className="text-xs text-slate-500">
                    Carga aquí el archivo (PDF, Word o Imagen) que le enviarás a cada inquilino por WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            {config.contratoModelo ? (
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {config.contratoModelo.nombreArchivo}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                        Cargado ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tamaño: {(config.contratoModelo.tamanoBytes / 1024).toFixed(1)} KB • Subido el {new Date(config.contratoModelo.fechaSubida).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => descargarArchivoContrato(config.contratoModelo!)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                    title="Descargar para revisar"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reemplazar</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveContract}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/60 rounded-2xl p-6 text-center transition-colors">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Aún no has subido tu modelo de contrato
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Sube el archivo PDF o Word con las cláusulas de tu alquiler temporario en Mar del Tuyú.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Cargando archivo...' : 'Cargar Archivo de Contrato'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                ¿Cómo funciona el envío por WhatsApp?
              </span>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                En la lista de reservas verás el botón <strong>"Enviar Contrato"</strong>. Al presionarlo, el sistema descarga el archivo y abre el chat de WhatsApp con el inquilino con el texto listo. Solo adjuntas el archivo y listo.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Owner Alerts Center & Automation */}
        <div className="space-y-6">
          {/* Main Card: Automatic 24h Alerts to Owner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Avisos de 24 hs para el Propietario
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Notificaciones automáticas dirigidas a tu teléfono sobre llaves, limpieza y cobros.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                Automático
              </span>
            </div>

            {/* Toggle Automatic Dispatch */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="toggle-auto-envio" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Envío Automático de Avisos</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    El sistema detecta automáticamente ingresos y egresos de mañana y te notifica.
                  </p>
                </div>
                <input
                  id="toggle-auto-envio"
                  type="checkbox"
                  checked={config.envioAutomaticoWhatsapp ?? true}
                  onChange={(e) => setConfig({ ...config, envioAutomaticoWhatsapp: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Browser notification permission */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600">
                  Notificaciones en pantalla/celular:
                </span>
                {notifGranted ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Activadas</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleActivarNotificaciones}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    Activar en este dispositivo
                  </button>
                )}
              </div>
            </div>

            {/* Optional 100% Background WhatsApp via CallMeBot API */}
            <div className="bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-200/70 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                <span>Envío 100% Automático en Segundo Plano (CallMeBot)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Permite que el sistema envíe el WhatsApp directamente a tu celular sin que tengas que abrir la aplicación de WhatsApp ni confirmar la ventana.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  API Key gratuita de CallMeBot (opcional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.callmebotApiKey || ''}
                    onChange={(e) => setConfig({ ...config, callmebotApiKey: e.target.value })}
                    placeholder="Ej. 1234567"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestCallMeBot}
                    disabled={testingApi}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    {testingApi ? 'Enviando...' : 'Probar'}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Para obtener tu API Key gratuita: envía el texto "I allow callmebot to send me messages" por WhatsApp al +34 911 06 18 84.
                </span>
              </div>

              {testResult && (
                <div className={`p-2 rounded-lg text-xs font-medium ${
                  testResult.startsWith('✅') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {testResult}
                </div>
              )}
            </div>

            {/* Direct action buttons for Owner */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold uppercase text-slate-400 block">
                Disparar aviso a mi teléfono ahora:
              </label>

              {config.telefonoDueno ? (
                <a
                  href={whatsappDuenoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.01]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Aviso de Control (24 hs antes) a mi WhatsApp ({config.telefonoDueno})</span>
                </a>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                  ⚠️ Carga tu número de WhatsApp arriba para poder enviarte el aviso a tu teléfono.
                </div>
              )}

              {config.emailDueno && (
                <a
                  href={emailDuenoUrl}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                >
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>Enviar Copia a mi Email</span>
                </a>
              )}
            </div>

            {/* Preview Box */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Vista previa del aviso que recibes como dueño:
                </label>
                <span className="text-[10px] text-cyan-700 font-semibold">Exclusivo Propietario</span>
              </div>
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-line border border-slate-800 shadow-inner">
                {mensajeDueno}
              </div>
            </div>

            {/* Audit history of dispatched alerts */}
            {historial.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Últimos avisos automáticos despachados:</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {historial.slice(0, 5).map((h) => (
                    <div key={h.id} className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-800">{h.fecha}</span>
                        <span className="text-slate-500 mx-1">•</span>
                        <span className="text-slate-600">{h.resumen}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                        {h.tipo === 'callmebot_api' ? 'WhatsApp API' : h.tipo === 'notificacion_navegador' ? 'Notif. Pantalla' : 'WhatsApp'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Context Card for Other LLMs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Archivo de Contexto para otra Inteligencia Artificial
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                  PROYECTO.md
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Archivo generado de manera local con la arquitectura completa, modelos TypeScript, lógica de Firestore y reglas del negocio para cargar en Claude, ChatGPT, Cursor u otra IA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/PROYECTO.md"
              download="PROYECTO.md"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Descargar archivo en tu computadora"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .md</span>
            </a>
            <a
              href="/PROYECTO.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Abrir el archivo en una nueva pestaña"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Archivo</span>
            </a>
          </div>
        </div>

        {/* URL and Copy Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              URL pública directa del archivo .md:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getMarkdownUrl()}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopiarUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Puedes pegar esta URL directamente en navegadores, curl, o como enlace fuente en IAs que admitan lectura de URLs.
            </p>
          </div>

          {/* Prompt template */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-600" />
                Prompt recomendado para iniciar la conversación en la otra IA:
              </span>
              <button
                type="button"
                onClick={handleCopiarPrompt}
                className="text-xs font-bold text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Prompt copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Prompt</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed select-all">
              Actúa como un Desarrollador Senior Full Stack experto en React 19, TypeScript, Tailwind CSS y Firebase.<br />
              He adjuntado el archivo PROYECTO.md que describe en detalle la arquitectura, tipos, estado y propósito de la aplicación "Alquiler Mar del Tuyú".<br />
              Por favor analiza el archivo adjunto y confirma que comprendes la lógica del negocio, el modelo de datos y las reglas del sistema.<br />
              Quedo a la espera de tu confirmación para indicarte la siguiente funcionalidad a desarrollar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
