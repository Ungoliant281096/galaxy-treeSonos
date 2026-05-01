import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import BarChart from '../components/BarChart';
import styles from './ReportesPage.module.css';

const COLORES_ESTADO = {
  aprobados:   '#1e8e3e',
  rechazados:  '#d93025',
  completados: '#f9ab00',
  en_progreso: '#1a73e8',
};

export default function ReportesPage() {
  const navigate = useNavigate();

  const [alcaldias, setAlcaldias]     = useState([]);
  const [porDia, setPorDia]           = useState([]);
  const [inspectores, setInspectores] = useState([]);
  const [dias, setDias]               = useState(30);
  const [cargando, setCargando]       = useState(false);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      api.get('/galaxy/reportes/alcaldia'),
      api.get(`/galaxy/reportes/por-dia?dias=${dias}`),
      api.get('/galaxy/reportes/inspectores?top=5'),
    ])
      .then(([r1, r2, r3]) => {
        setAlcaldias(r1.data);
        setPorDia(r2.data);
        setInspectores(r3.data);
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [dias]);

  const totalGlobal = alcaldias.reduce((s, a) => s + a.total, 0);
  const aprobadosGlobal = alcaldias.reduce((s, a) => s + a.aprobados, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>←</button>
        <h1 className={styles.titulo}>Reportes</h1>
      </header>

      {cargando ? (
        <p className={styles.hint}>Calculando…</p>
      ) : (
        <div className={styles.body}>

          {/* KPIs */}
          <div className={styles.kpis}>
            <Kpi label="Total dictámenes" val={totalGlobal} color="var(--primary)" />
            <Kpi label="Aprobados"  val={aprobadosGlobal}          color="#1e8e3e" />
            <Kpi label="Tasa aprobación"
              val={totalGlobal ? `${Math.round(aprobadosGlobal / totalGlobal * 100)}%` : '—'}
              color="#1e8e3e"
            />
          </div>

          {/* Actividad diaria */}
          <Card titulo={`Actividad últimos ${dias} días`} action={
            <select
              className={styles.select}
              value={dias}
              onChange={(e) => setDias(+e.target.value)}
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          }>
            <BarChart
              data={porDia.map((d) => ({ label: d._id?.slice(5), value: d.total }))}
              height={160}
            />
          </Card>

          {/* Por alcaldía */}
          <Card titulo="Dictámenes por alcaldía">
            <BarChart
              data={alcaldias.slice(0, 8).map((a) => ({
                label: a._id ?? 'Sin datos',
                value: a.total,
              }))}
              height={180}
            />
            <table className={styles.table}>
              <thead>
                <tr><th>Alcaldía</th><th>Total</th><th>Aprobados</th><th>Rechazados</th></tr>
              </thead>
              <tbody>
                {alcaldias.map((a) => (
                  <tr key={a._id}>
                    <td>{a._id ?? '—'}</td>
                    <td className={styles.num}>{a.total}</td>
                    <td className={styles.num} style={{ color: '#1e8e3e' }}>{a.aprobados}</td>
                    <td className={styles.num} style={{ color: '#d93025' }}>{a.rechazados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Top inspectores */}
          <Card titulo="Top 5 inspectores">
            <BarChart
              data={inspectores.map((i) => ({
                label: i._id?.slice(-6),
                value: i.total,
              }))}
              height={140}
            />
          </Card>

        </div>
      )}
    </div>
  );
}

function Kpi({ label, val, color }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiVal} style={{ color }}>{val}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  );
}

function Card({ titulo, children, action }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTit}>{titulo}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
