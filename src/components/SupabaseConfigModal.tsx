import React, { useState } from 'react';
import { X, Database, Check, Copy, ExternalLink, RefreshCw, Server, AlertCircle, ShieldAlert } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../lib/sqlSchema';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, testSupabaseConnection, syncLocalDataToSupabase, SupabaseConfig, sanitizeSupabaseUrl } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const currentConfig = getStoredSupabaseConfig();

  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [useSupabase, setUseSupabase] = useState(currentConfig.useSupabase);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const cleanUrl = sanitizeSupabaseUrl(url);
    setUrl(cleanUrl);
    try {
      const res = await testSupabaseConnection(cleanUrl, anonKey.trim());
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Error de conexión' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const cleanUrl = sanitizeSupabaseUrl(url);
    const config: SupabaseConfig = {
      url: cleanUrl,
      anonKey: anonKey.trim(),
      useSupabase,
    };
    saveStoredSupabaseConfig(config);
    onConfigUpdated();
    onClose();
  };

  const handleSyncData = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncLocalDataToSupabase();
      if (res.error) {
        setSyncResult(`Error: ${res.error}`);
      } else {
        setSyncResult(`¡Se migraron ${res.count} reservas locales a tu Supabase exitosamente!`);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Conexión Supabase & PostgreSQL
              </h2>
              <p className="text-xs text-slate-300">
                Configura tu base de datos en la nube y obtén el script SQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
          {/* Status info box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                Modo actual de la Base de Datos:
              </span>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                useSupabase && url && anonKey
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {useSupabase && url && anonKey ? '🟢 Supabase PostgreSQL' : '🟡 Modo Local (Listo para Supabase)'}
              </span>
            </div>
            <p className="text-slate-500">
              La app funciona tanto en modo local (sin perder ningún dato en tu navegador) como conectada en tiempo real a tu base de datos PostgreSQL en Supabase.
            </p>
          </div>

          {/* Form credentials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Credenciales de tu proyecto Supabase
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSupabase}
                  onChange={(e) => setUseSupabase(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">Activar sincronización con Supabase</span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600">
                  Project URL (VITE_SUPABASE_URL)
                </label>
                {url.includes('/rest/v1') && (
                  <span className="text-[11px] text-amber-600 font-semibold">
                    (Se quitará automáticamente el "/rest/v1/")
                  </span>
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setUrl(sanitizeSupabaseUrl(url))}
                placeholder="https://xyzabcdefgh.supabase.co"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Coloca la URL base del proyecto (ej: <code className="text-slate-600">https://qayouotzlnvaamvlcbbu.supabase.co</code>). No agregues <code className="text-rose-600">/rest/v1/</code> al final.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !url || !anonKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Probando conexión...' : 'Probar Conexión'}</span>
              </button>

              {url && anonKey && (
                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                  title="Sube las reservas locales existentes a Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Subir Reservas Locales a Supabase</span>
                </button>
              )}
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {syncResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{syncResult}</span>
              </div>
            )}
          </div>

          {/* Section: SQL Script ready for Supabase PostgreSQL */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Script SQL de Inicialización (PostgreSQL)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Copia y pega este script en el <b>SQL Editor</b> de tu panel de Supabase:
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold rounded-lg border border-cyan-200 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Script SQL'}</span>
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl p-3 overflow-x-auto text-[11px] font-mono text-emerald-300 max-h-44 border border-slate-800">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
