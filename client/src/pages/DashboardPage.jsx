import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import NotifBell from '../components/NotifBell';
import styles from './DashboardPage.module.css';

const ESTADOS = ['', 'borrador', 'en_progreso', 'completado', 'aprobado', 'rechazado'];

const ESTADO_COLOR = {
  borrador:    '#5f6368',
  en_progreso: '#1a73e8',
  completado:  '#f9ab00',
  aprobado:    '#1e8e3e',
  rechazado:   '#d93025',
};

export default function DashboardPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const [dictamenes, setDictamenes] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [cargando, setCargando]     = useState(false);

  const [filtros, setFiltros] = useState({
    estado:    '',
    inspector: '',
    desde:     '',
    hasta:     '',
  });

  const cargar = useCallback(async (p = 1) => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (filtros.estado)    params.set('estado',    filtros.estado);
      if (filtros.inspector) params.set('inspector', filtros.inspector);
      if (filtros.desde)     params.set('desde',     new Date(filtros.desde).toISOString());
      if (filtros.hasta)     params.set('hasta',     new Date(filtros.hasta).toISOString());

      const { data } = await api.get(`/galaxy/dictamenes?${params}`);
      setDictamenes(data.data);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(1); }, [filtros]);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/galaxy/dictamenes/${id}/estado`, { estado });
      cargar(page);
    } catch (e) {
      alert(e.response?.data?.msg || 'Error al cambiar estado');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este dictamen? Esta acción es irreversible.')) return;
    try {
      await api.delete(`/galaxy/dictamenes/${id}`);
      cargar(page);
    } catch (e) {
      alert(e.response?.data?.msg || 'Error al eliminar');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Dashboard</h1>
          <p className={styles.sub}>{usuario?.tenant_id} · {total} dictámenes</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => navigate('/reportes')}>
            Reportes
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/inspector')}>
            + Dictamen
          </button>
          <NotifBell />
          <button className={styles.btnGhost} onClick={logout}>Salir</button>
        </div>
      </header>

      {/* Filtros */}
      <section className={styles.filtros}>
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.filter(Boolean).map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Inspector ID"
          value={filtros.inspector}
          onChange={(e) => setFiltros({ ...filtros, inspector: e.target.value })}
        />

        <input
          type="date"
          value={filtros.desde}
          onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
        />
        <input
          type="date"
          value={filtros.hasta}
          onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
        />

        <button className={styles.btnGhost} onClick={() => setFiltros({ estado: '', inspector: '', desde: '', hasta: '' })}>
          Limpiar
        </button>
      </section>

      {/* Tabla */}
      {cargando ? (
        <p className={styles.hint}>Cargando…</p>
      ) : dictamenes.length === 0 ? (
        <p className={styles.hint}>No hay dictámenes con estos filtros.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Norma</th>
                <th>Alcaldía / Calle</th>
                <th>Inspector</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dictamenes.map((d) => (
                <tr key={d._id} className={styles.row}>
                  <td className={styles.mono}>{d.norma_aplicada?.clave ?? '—'}</td>
                  <td>
                    <span className={styles.alcaldia}>{d.localizacion?.alcaldia ?? '—'}</span>
                    <br />
                    <span className={styles.calle}>{d.localizacion?.calle_num ?? '—'}</span>
                  </td>
                  <td className={styles.mono}>{d.inspector_id?.slice(-6) ?? '—'}</td>
                  <td>{new Date(d.createdAt).toLocaleDateString('es-MX')}</td>
                  <td>
                    <span
                      className={styles.badge}
                      style={{ background: ESTADO_COLOR[d.estado] + '22', color: ESTADO_COLOR[d.estado] }}
                    >
                      {d.estado}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    {/* Supervisor puede aprobar/rechazar completados */}
                    {d.estado === 'completado' && usuario?.role !== 'inspector' && (
                      <>
                        <button
                          className={`${styles.btn} ${styles.approve}`}
                          onClick={() => cambiarEstado(d._id, 'aprobado')}
                        >✓</button>
                        <button
                          className={`${styles.btn} ${styles.reject}`}
                          onClick={() => cambiarEstado(d._id, 'rechazado')}
                        >✗</button>
                      </>
                    )}
                    <button
                      className={`${styles.btn} ${styles.view}`}
                      onClick={() => navigate(`/dictamen/${d._id}`)}
                    >👁</button>
                    {usuario?.role === 'admin' && (
                      <button
                        className={`${styles.btn} ${styles.del}`}
                        onClick={() => eliminar(d._id)}
                      >🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div className={styles.paginacion}>
          <button disabled={page <= 1} onClick={() => cargar(page - 1)}>← Ant</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => cargar(page + 1)}>Sig →</button>
        </div>
      )}
    </div>
  );
}
