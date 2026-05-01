import { useSync } from '../hooks/useSync';
import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  const { online, pendientes, syncing, sync } = useSync();

  if (online && pendientes === 0) return null;

  return (
    <div className={`${styles.banner} ${online ? styles.syncing : styles.offline}`}>
      {!online && <span>📵 Sin conexión — los datos se guardarán localmente</span>}
      {online && pendientes > 0 && (
        <span>
          ☁️ {pendientes} dictamen{pendientes !== 1 ? 'es' : ''} pendiente{pendientes !== 1 ? 's' : ''}
          {' '}
          <button className={styles.btn} onClick={sync} disabled={syncing}>
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </span>
      )}
    </div>
  );
}
