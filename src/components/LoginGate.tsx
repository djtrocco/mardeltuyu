import React, { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { Waves, LogOut, Lock } from 'lucide-react';
import { db } from '../lib/firebase'; // asegura que la app Firebase esté inicializada

void db;
const auth = getAuth(getApp());

// Pantalla de acceso: la app solo se monta cuando hay un usuario autenticado en Firebase Auth.
export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Esperá unos minutos y volvé a probar.');
      } else if (code === 'auth/network-request-failed') {
        setError('Sin conexión. Revisá tu internet.');
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-5"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center">
              <Waves className="w-6 h-6 text-cyan-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Mar del Tuyú</h1>
            <p className="text-xs text-slate-500">Ingresá para continuar</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="login-email" className="text-xs font-semibold text-slate-600">Usuario (email)</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="login-password" className="text-xs font-semibold text-slate-600">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {error && <p className="text-xs text-rose-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={() => signOut(auth)}
        title={`Cerrar sesión (${user.email ?? ''})`}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-medium px-3 py-2 shadow-lg cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        Salir
      </button>
    </>
  );
};
