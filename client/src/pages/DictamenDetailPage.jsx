import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import styles from './DictamenDetailPage.module.css';

const ESTADO_COLOR = {
  borrador:    '#5f6368',
  en_progreso: '#1a73e8',
  completado:  '#f9ab00',
  aprobado:    '#1e8e3e',
  rechazado:   '#d93025',
};

export default function DictamenDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [dictamen, setDictamen]     = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando]   = useState(false);

  useEffect(() => {
    api.get(`/galaxy/dictamenes/${id}`)
      .then(({ data }) => setDictamen(data))
      .catch(() => navigate(-1))
      .finally(() => setCargando(false));
  }, [id]);

  const cambiarEstado = async (estado) => {
    setGuardando(true);
    try {
      const { data } = await api.patch(`/galaxy/dictamenes/${id}/estado`, { estado, observacion });
      setDictamen((prev) => ({ ...prev, estado: data.estado, historial_estados: data.historial }));
      setObservacion('');
    } catch (e) {
      alert(e.response?.data?.msg || 'Error');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className={styles.hint}>Cargando…</div>;
  if (!dictamen) return null;

  const d = dictamen;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>←</button>
        <h1 className={styles.titulo}>Dictamen</h1>
        <span
          className={styles.estado}
          style={{ background: ESTADO_COLOR[d.estado] + '22', color: ESTADO_COLOR[d.estado] }}
        >
          {d.estado}
        </span>
      </header>

      <div className={styles.body}>

        {/* Resumen */}
        <Section titulo="Identificación">
          <Row label="Norma" val={d.norma_aplicada?.clave} />
          <Row label="Tipo"  val={d.tipo_elemento} />
          <Row label="Folio JUDIAPS" val={d.folio?.judiaps} />
          <Row label="Inspector" val={d.inspector_id} mono />
        </Section>

        {/* Localización */}
        <Section titulo="Localización">
          <Row label="Alcaldía" val={d.localizacion?.alcaldia} />
          <Row label="Calle"    val={d.localizacion?.calle_num} />
          <Row label="Colonia"  val={d.localizacion?.colonia} />
          <Row label="Referencia" val={d.localizacion?.referencia} />
          {d.localizacion?.coordenadas?.coordinates && (
            <Row label="Coordenadas"
              val={`${d.localizacion.coordenadas.coordinates[1]}, ${d.localizacion.coordenadas.coordinates[0]}`}
            />
          )}
        </Section>

        {/* Datos del árbol (si aplica) */}
        {d.datos_arbol && (
          <Section titulo="Datos del árbol">
            <Row label="Nombre común"    val={d.datos_arbol.nombre_comun} />
            <Row label="Nombre científico" val={d.datos_arbol.nombre_cientifico} italic />
            <Row label="Altura total"    val={d.datos_arbol.altura_total_m != null ? `${d.datos_arbol.altura_total_m} m` : null} />
            <Row label="DAP"             val={d.datos_arbol.dap_cm != null ? `${d.datos_arbol.dap_cm} cm` : null} />
            <Row label="Condición general" val={d.datos_arbol.condicion_general} />
          </Section>
        )}

        {/* Transcripciones */}
        {d.transcripciones?.length > 0 && (
          <Section titulo={`Transcripciones (${d.transcripciones.length})`}>
            {d.transcripciones.map((t, i) => (
              <div key={i} className={styles.transcripcion}>
                <span className={styles.campo}>{t.campo_id}</span>
                <p className={styles.txt}>"{t.transcript}"</p>
                <span className={styles.conf}>confianza {Math.round(t.confidence * 100)}%</span>
              </div>
            ))}
          </Section>
        )}

        {/* Historial */}
        <Section titulo="Historial de estados">
          {d.historial_estados?.map((h, i) => (
            <div key={i} className={styles.histItem}>
              <span
                className={styles.hEstado}
                style={{ color: ESTADO_COLOR[h.estado] }}
              >{h.estado}</span>
              {h.observacion && <p className={styles.hObs}>{h.observacion}</p>}
              <span className={styles.hFecha}>
                {new Date(h.fecha).toLocaleString('es-MX')}
              </span>
            </div>
          ))}
        </Section>

        {/* Acciones de supervisor/admin */}
        {(usuario?.role === 'supervisor' || usuario?.role === 'admin') && d.estado === 'completado' && (
          <Section titulo="Revisión">
            <textarea
              className={styles.obs}
              placeholder="Observación (opcional)"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
            />
            <div className={styles.btnRow}>
              <button
                className={`${styles.btnAcc} ${styles.approve}`}
                onClick={() => cambiarEstado('aprobado')}
                disabled={guardando}
              >
                ✓ Aprobar
              </button>
              <button
                className={`${styles.btnAcc} ${styles.reject}`}
                onClick={() => cambiarEstado('rechazado')}
                disabled={guardando}
              >
                ✗ Rechazar
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ titulo, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTit}>{titulo}</h2>
      {children}
    </section>
  );
}

function Row({ label, val, mono, italic }) {
  if (!val) return null;
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.val} ${mono ? styles.mono : ''} ${italic ? styles.italic : ''}`}>
        {val}
      </span>
    </div>
  );
}
