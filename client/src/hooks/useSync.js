import { useState, useEffect, useCallback } from 'react';
import { obtenerPendientes, eliminarPendiente, contarPendientes } from '../db/offline';
import api from '../services/api';

export function useSync() {
  const [pendientes, setPendientes] = useState(0);
  const [syncing, setSyncing]       = useState(false);
  const [online, setOnline]         = useState(navigator.onLine);

  useEffect(() => {
    contarPendientes().then(setPendientes);
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Sync automático al recuperar conexión
  useEffect(() => {
    if (online && pendientes > 0) sync();
  }, [online]);

  const sync = useCallback(async () => {
    const cola = await obtenerPendientes();
    if (!cola.length) return;
    setSyncing(true);
    try {
      // Enviar en lotes de 50 (límite del backend)
      for (let i = 0; i < cola.length; i += 50) {
        const lote = cola.slice(i, i + 50);
        const { data } = await api.post('/galaxy/sync', { dictamenes: lote });
        // Eliminar los sincronizados exitosamente
        for (const d of lote) await eliminarPendiente(d._id);
        console.log(`[Sync] ${data.sincronizados} sincronizados, ${data.fallidos} fallidos`);
      }
      setPendientes(0);
    } catch (err) {
      console.warn('[Sync] Error — se reintentará más tarde', err.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  return { pendientes, syncing, online, sync };
}
