import { useState } from 'react';
import { useNotificaciones } from '../hooks/useNotificaciones';
import styles from './NotifBell.module.css';

export default function NotifBell() {
  const { notifs, conectado, limpiar } = useNotificaciones();
  const [open, setOpen] = useState(false);
  const noLeidas = notifs.length;

  return (
    <div className={styles.wrap}>
      <button
        className={styles.bell}
        onClick={() => setOpen((v) => !v)}
        title={conectado ? 'Conectado' : 'Sin tiempo real'}
      >
        🔔
        {noLeidas > 0 && <span className={styles.badge}>{noLeidas > 9 ? '9+' : noLeidas}</span>}
        {!conectado && <span className={styles.dot} />}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>Notificaciones</span>
            {noLeidas > 0 && (
              <button className={styles.clear} onClick={() => { limpiar(); setOpen(false); }}>
                Limpiar
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <p className={styles.empty}>Sin notificaciones nuevas</p>
          ) : (
            <ul className={styles.list}>
              {notifs.map((n, i) => (
                <li key={i} className={styles.item}>
                  <span className={styles.icon}>{n.tipo === 'nuevo' ? '📄' : '🔄'}</span>
                  <span className={styles.txt}>
                    {n.tipo === 'nuevo'
                      ? `Nuevo dictamen creado`
                      : `Dictamen → ${n.estado}`}
                  </span>
                  <span className={styles.time}>
                    {new Date(n.ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
