import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Reserva, ConfiguracionDueno } from '../types';
import { INITIAL_RESERVAS } from '../data/initialData';
import { DEFAULT_CONFIG_DUENO } from './configStorage';

// Silenciar logs internos de reconexión/heurística de Firestore
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Inicialización de la app Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Conexión robusta a la base de datos Firestore provisionada con Long-Polling
const targetDatabaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

function initFirestoreInstance() {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      targetDatabaseId
    );
  } catch (err1) {
    try {
      return targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
    } catch (err2) {
      return getFirestore(app);
    }
  }
}

export const db = initFirestoreInstance();

const RESERVAS_COLLECTION = 'reservas';
const CONFIG_COLLECTION = 'configuracion';
const CONFIG_DUENO_DOC_ID = 'dueno';
const SISTEMA_DOC_ID = 'sistema';

const LOCAL_STORAGE_KEY_RESERVAS = 'mardeltuyu_alquiler_reservas_v1';

/**
 * Prueba la conexión con el servidor de Firestore
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const { getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, CONFIG_COLLECTION, 'healthcheck'));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Obtiene las reservas almacenadas localmente para migración si Firestore está vacío
 */
function getLocalReservasForMigration(): Reserva[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RESERVAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error leyendo reservas locales para migración:', e);
  }
  return INITIAL_RESERVAS;
}

/**
 * Migra las reservas iniciales o existentes en localStorage a Firestore
 */
async function seedInitialDataIfEmpty(): Promise<Reserva[]> {
  const localData = getLocalReservasForMigration();
  try {
    for (const r of localData) {
      const docRef = doc(db, RESERVAS_COLLECTION, r.id);
      await setDoc(docRef, {
        ...r,
        updated_at: r.updated_at || new Date().toISOString(),
      }, { merge: true });
    }
    // Marcar en la nube que la base ya fue inicializada para evitar volver a sembrar si el usuario elimina todo
    const sisRef = doc(db, CONFIG_COLLECTION, SISTEMA_DOC_ID);
    await setDoc(sisRef, { seeded: true, initializedAt: new Date().toISOString() }, { merge: true });
    return localData;
  } catch (err) {
    console.warn('No se pudieron sembrar reservas iniciales en Firestore:', err);
    return localData;
  }
}

/**
 * Escucha cambios en tiempo real en la colección de reservas en Firestore.
 * Notifica a la app cuando hay cualquier cambio desde este o cualquier otro navegador.
 */
export function subscribeToReservas(
  onUpdate: (reservas: Reserva[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const reservasQuery = query(collection(db, RESERVAS_COLLECTION), orderBy('fecha_ingreso', 'asc'));

    const unsubscribe = onSnapshot(
      reservasQuery,
      async (snapshot) => {
        if (snapshot.empty) {
          // Verificar si ya fue inicializada previamente
          try {
            const sisSnap = await getDoc(doc(db, CONFIG_COLLECTION, SISTEMA_DOC_ID));
            if (sisSnap.exists() && sisSnap.data()?.seeded) {
              // La base de datos fue vaciada por el usuario; no volver a cargar datos iniciales borrados
              onUpdate([]);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY_RESERVAS, JSON.stringify([]));
              } catch {}
              return;
            }
          } catch (err) {
            console.warn('Error verificando estado de inicialización:', err);
          }

          // Si es la primera vez que se abre la base de datos vacía, inicializar
          const seeded = await seedInitialDataIfEmpty();
          onUpdate(seeded);
          return;
        }

        // Marcar que el sistema tiene datos inicializados
        try {
          const sisRef = doc(db, CONFIG_COLLECTION, SISTEMA_DOC_ID);
          setDoc(sisRef, { seeded: true }, { merge: true }).catch(() => {});
        } catch {}

        const items: Reserva[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          items.push({
            id: docSnap.id,
            nombre: data.nombre || '',
            fecha_ingreso: data.fecha_ingreso || '',
            fecha_egreso: data.fecha_egreso || '',
            noches: Number(data.noches) || 0,
            valor_total: Number(data.valor_total ?? data.precio_total) || 0,
            sena: Number(data.sena) || 0,
            saldo: Number(data.saldo) || 0,
            numero_contacto: data.numero_contacto || '',
            comunicacion: data.comunicacion || 'WhatsApp',
            estado_reserva: data.estado_reserva || 'confirmada',
            estado_contrato: data.estado_contrato || 'pendiente_envio',
            contrato_adjunto: data.contrato_adjunto || null,
            notas: data.notas || data.observaciones || '',
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          });
        });

        // Guardar copia de respaldo en localStorage
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY_RESERVAS, JSON.stringify(items));
        } catch {
          // ignore
        }

        onUpdate(items);
      },
      (error) => {
        console.warn('Aviso de conexión en suscripción Firestore (operando con datos locales):', error);
        // Si hay una interrupción temporal o modo offline, proveer las reservas locales para que la app no quede en blanco
        const fallbackItems = getLocalReservasForMigration();
        if (fallbackItems.length > 0) {
          onUpdate(fallbackItems);
        }
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Error al inicializar suscripción a Firestore:', err);
    const fallbackItems = getLocalReservasForMigration();
    if (fallbackItems.length > 0) {
      onUpdate(fallbackItems);
    }
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Obtener todas las reservas de Firestore
 */
export async function getReservasFromFirestore(): Promise<Reserva[]> {
  try {
    const reservasQuery = query(collection(db, RESERVAS_COLLECTION), orderBy('fecha_ingreso', 'asc'));
    const snapshot = await getDocs(reservasQuery);

    if (snapshot.empty) {
      return await seedInitialDataIfEmpty();
    }

    const items: Reserva[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      items.push({
        id: docSnap.id,
        nombre: data.nombre || '',
        fecha_ingreso: data.fecha_ingreso || '',
        fecha_egreso: data.fecha_egreso || '',
        noches: Number(data.noches) || 0,
        valor_total: Number(data.valor_total ?? data.precio_total) || 0,
        sena: Number(data.sena) || 0,
        saldo: Number(data.saldo) || 0,
        numero_contacto: data.numero_contacto || '',
        comunicacion: data.comunicacion || 'WhatsApp',
        estado_reserva: data.estado_reserva || 'confirmada',
        estado_contrato: data.estado_contrato || 'pendiente_envio',
        contrato_adjunto: data.contrato_adjunto || null,
        notas: data.notas || data.observaciones || '',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      });
    });

    return items;
  } catch (err) {
    console.error('Error al consultar Firestore:', err);
    return getLocalReservasForMigration();
  }
}

/**
 * Crear nueva reserva en Firestore
 */
export async function createReservaInFirestore(
  reservaData: Omit<Reserva, 'id'>
): Promise<{ success: boolean; data?: Reserva; error?: string }> {
  try {
    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newReserva: Reserva = {
      ...reservaData,
      id,
      created_at: now,
      updated_at: now,
    };

    const docRef = doc(db, RESERVAS_COLLECTION, id);
    await setDoc(docRef, newReserva);

    return { success: true, data: newReserva };
  } catch (err: any) {
    console.error('Error al crear reserva en Firestore:', err);
    return { success: false, error: err.message || 'Error al guardar en la nube' };
  }
}

/**
 * Actualizar reserva existente en Firestore
 */
export async function updateReservaInFirestore(
  id: string,
  updates: Partial<Reserva>
): Promise<{ success: boolean; data?: Reserva; error?: string }> {
  try {
    const docRef = doc(db, RESERVAS_COLLECTION, id);
    const updatedPayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedPayload);
    return { success: true, data: { ...updates, id } as Reserva };
  } catch (err: any) {
    console.error('Error al actualizar reserva en Firestore:', err);
    return { success: false, error: err.message || 'Error al actualizar en la nube' };
  }
}

/**
 * Eliminar reserva de Firestore
 */
export async function deleteReservaFromFirestore(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, RESERVAS_COLLECTION, id);
    await deleteDoc(docRef);

    // Limpiar también inmediatamente de la caché local de localStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RESERVAS);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((r: any) => r.id !== id);
          localStorage.setItem(LOCAL_STORAGE_KEY_RESERVAS, JSON.stringify(filtered));
        }
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar reserva en Firestore:', err);
    return { success: false, error: err.message || 'Error al eliminar en la nube' };
  }
}

/**
 * Sincronización en tiempo real de la configuración del dueño
 */
export function subscribeToConfiguracionDueno(
  onUpdate: (config: ConfiguracionDueno) => void
): () => void {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DUENO_DOC_ID);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ConfiguracionDueno;
          onUpdate({ ...DEFAULT_CONFIG_DUENO, ...data });
        }
      },
      (error) => {
        console.warn('Suscripción a configuración en modo offline / reconectando:', error);
      }
    );
  } catch (e) {
    console.error('Error al suscribir a configuracion:', e);
    return () => {};
  }
}

/**
 * Guardar configuración del dueño en Firestore
 */
export async function saveConfiguracionDuenoToFirestore(config: ConfiguracionDueno): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DUENO_DOC_ID);
    await setDoc(docRef, config, { merge: true });
  } catch (e) {
    console.error('Error al guardar configuracion en Firestore:', e);
  }
}
