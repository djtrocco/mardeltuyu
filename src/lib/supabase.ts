import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Reserva } from '../types';
import { INITIAL_RESERVAS } from '../data/initialData';

const STORAGE_KEY_RESERVAS = 'mardeltuyu_alquiler_reservas_v1';
const STORAGE_KEY_SUPABASE_CONFIG = 'mardeltuyu_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  useSupabase: boolean;
}

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  // If user copied rest/v1 endpoint (e.g. https://xyz.supabase.co/rest/v1 or /rest/v1/)
  clean = clean.replace(/\/rest\/v1\/?$/, '');
  // Remove any trailing slash
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = sanitizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: sanitizeSupabaseUrl(parsed.url || envUrl),
        anonKey: parsed.anonKey || envKey,
        useSupabase: parsed.useSupabase ?? (Boolean(envUrl) && Boolean(envKey)),
      };
    }
  } catch (e) {
    console.error('Error reading Supabase config from localStorage:', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    useSupabase: Boolean(envUrl) && Boolean(envKey),
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig) {
  try {
    const sanitizedConfig: SupabaseConfig = {
      ...config,
      url: sanitizeSupabaseUrl(config.url),
      anonKey: config.anonKey.trim(),
    };
    localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(sanitizedConfig));
    // Reset client
    cachedClient = null;
  } catch (e) {
    console.error('Error saving Supabase config to localStorage:', e);
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  const cleanUrl = sanitizeSupabaseUrl(config.url);
  const cleanKey = config.anonKey.trim();

  if (!config.useSupabase || !cleanUrl || !cleanKey) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cleanUrl, cleanKey);
    return cachedClient;
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err);
    return null;
  }
}

// Local storage fallback helpers
function getLocalReservas(): Reserva[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESERVAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(INITIAL_RESERVAS));
      return INITIAL_RESERVAS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading reservas from local storage:', err);
    return INITIAL_RESERVAS;
  }
}

function saveLocalReservas(reservas: Reserva[]) {
  try {
    localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservas));
  } catch (err) {
    console.error('Error saving reservas to local storage:', err);
  }
}

// Test connection to Supabase
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'La URL y la Anon Key son obligatorias' };
    }
    const testClient = createClient(cleanUrl, cleanKey);
    const { data, error } = await testClient.from('reservas').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.reservas" does not exist') || error.message.includes('reservas')) {
        return {
          success: true,
          message: '¡Conexión establecida con Supabase! Recuerda ejecutar el script SQL para crear la tabla "reservas".'
        };
      }
      return { success: false, message: `Error de Supabase: ${error.message}` };
    }

    return { success: true, message: '¡Conexión exitosa a PostgreSQL en Supabase!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error de red al conectar a Supabase' };
  }
}

// Main Data Repository API
export async function fetchAllReservas(): Promise<{ reservas: Reserva[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('reservas')
        .select('*')
        .order('fecha_ingreso', { ascending: true });

      if (error) {
        console.warn('Supabase fetch failed, falling back to local data:', error);
        return {
          reservas: getLocalReservas(),
          source: 'local',
          error: `No se pudo sincronizar con Supabase (${error.message}). Mostrando datos locales.`
        };
      }

      if (data) {
        // Map database fields if needed (numeric conversion)
        const mapped: Reserva[] = data.map((item: any) => ({
          id: item.id,
          nombre: item.nombre,
          fecha_ingreso: item.fecha_ingreso,
          fecha_egreso: item.fecha_egreso,
          noches: Number(item.noches) || 1,
          valor_total: Number(item.valor_total) || 0,
          sena: Number(item.sena) || 0,
          saldo: Number(item.saldo) || 0,
          comunicacion: item.comunicacion,
          numero_contacto: item.numero_contacto,
          estado_contrato: item.estado_contrato,
          notas: item.notas || '',
          estado_reserva: item.estado_reserva || 'confirmada',
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        // Update local backup
        saveLocalReservas(mapped);
        return { reservas: mapped, source: 'supabase' };
      }
    } catch (err: any) {
      console.warn('Supabase request threw error, using local fallback:', err);
      return {
        reservas: getLocalReservas(),
        source: 'local',
        error: 'Error conectando con Supabase. Usando almacenamiento local.'
      };
    }
  }

  return { reservas: getLocalReservas(), source: 'local' };
}

export async function createReserva(reserva: Omit<Reserva, 'id'>): Promise<{ success: boolean; data?: Reserva; error?: string }> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}`;
  const record: Reserva = {
    ...reserva,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('reservas').insert([record]).select().single();
      if (!error && data) {
        const current = getLocalReservas();
        saveLocalReservas([...current, record]);
        return { success: true, data: record };
      } else {
        console.warn('Could not insert to Supabase, saving locally:', error);
      }
    } catch (e: any) {
      console.warn('Error inserting to Supabase:', e);
    }
  }

  // Local fallback
  const list = getLocalReservas();
  list.push(record);
  saveLocalReservas(list);
  return { success: true, data: record };
}

export async function updateReserva(id: string, updates: Partial<Reserva>): Promise<{ success: boolean; data?: Reserva; error?: string }> {
  const now = new Date().toISOString();
  const fullUpdates = { ...updates, updated_at: now };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('reservas').update(fullUpdates).eq('id', id);
      if (error) {
        console.warn('Supabase update failed:', error);
      }
    } catch (e) {
      console.warn('Error updating Supabase:', e);
    }
  }

  // Always update local storage
  const list = getLocalReservas();
  const index = list.findIndex(r => r.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...fullUpdates };
    saveLocalReservas(list);
    return { success: true, data: list[index] };
  }

  return { success: false, error: 'Reserva no encontrada' };
}

export async function deleteReserva(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('reservas').delete().eq('id', id);
    } catch (e) {
      console.warn('Error deleting from Supabase:', e);
    }
  }

  const list = getLocalReservas().filter(r => r.id !== id);
  saveLocalReservas(list);
  return { success: true };
}

// Push local data to Supabase
export async function syncLocalDataToSupabase(): Promise<{ count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase no está configurado o activado' };
  }

  const local = getLocalReservas();
  if (local.length === 0) {
    return { count: 0 };
  }

  try {
    const { error } = await client.from('reservas').upsert(local, { onConflict: 'id' });
    if (error) {
      return { count: 0, error: error.message };
    }
    return { count: local.length };
  } catch (e: any) {
    return { count: 0, error: e.message || 'Fallo de sincronización' };
  }
}
