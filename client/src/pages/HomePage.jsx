import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import OfflineBanner from '../components/OfflineBanner';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [dictamenes, setDictamenes] = useState([]);
  const [cargando, setCargando]     = useState(true);

  useEffect(() => {
    api.get('/galaxy/dictamenes?limit=20')
      .then(({ data }) => setDictamenes(data.data))
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  const crearNuevo = async () => {
    try {
      const { data } = await api.post('/galaxy/dictamenes');
      navigate(`/chat/${data._id}`);
    } catch {
      // Sin conexión: generar ID local y ir offline
      const id = `offline_${crypto.randomUUID()}`;
      navigate(`/chat/${id}`);
    }
  };

  const estadoColor = {
    borrador:    '#5f6368',
    en_progreso: '#1a73e8',
    completado:  '#1e8e3e',
    aprobado:    '#1e8e3e',
    rechazado:   '#d93025',
  };

  return (
    <div className={styles.page}>
      <OfflineBanner />

      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>🌳 Galaxy</h1>
          <p className={styles.sub}>{usuario?.tenant_id}</p>
        </div>
        <button className={styles.logout} onClick={logout} title="Cerrar sesión">↩</button>
      </header>

      <main className={styles.main}>
        <button className={styles.nuevo} onClick={crearNuevo}>
          + Nuevo Dictamen
        </button>

        {cargando ? (
          <p className={styles.hint}>Cargando…</p>
        ) : dictamenes.length === 0 ? (
          <p className={styles.hint}>Aún no hay dictámenes. ¡Crea el primero!</p>
        ) : (
          <ul className={styles.lista}>
            {dictamenes.map((d) => (
              <li key={d._id} className={styles.item} onClick={() => navigate(`/chat/${d._id}`)}>
                <div className={styles.itemLeft}>
                  <span className={styles.norma}>{d.norma_aplicada?.clave ?? '—'}</span>
                  <span className={styles.dir}>
                    {d.localizacion?.alcaldia} · {d.localizacion?.calle_num ?? '—'}
                  </span>
                </div>
                <span
                  className={styles.estado}
                  style={{ color: estadoColor[d.estado] ?? '#5f6368' }}
                >
                  {d.estado}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
