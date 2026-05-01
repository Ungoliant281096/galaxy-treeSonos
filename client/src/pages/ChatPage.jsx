import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { guardarOffline } from '../db/offline';
import ChatBubble from '../components/ChatBubble';
import MicButton  from '../components/MicButton';
import OfflineBanner from '../components/OfflineBanner';
import styles from './ChatPage.module.css';

export default function ChatPage() {
  const { id: dictamen_id } = useParams();
  const navigate = useNavigate();

  const [mensajes, setMensajes] = useState([]);
  const [input, setInput]       = useState('');
  const [cargando, setCargando] = useState(false);
  const scrollRef = useRef(null);

  // Mensaje de bienvenida al montar
  useEffect(() => {
    enviarMensaje('hola');
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const agregarMensaje = (rol, texto, extra = {}) =>
    setMensajes((prev) => [...prev, { rol, texto, ...extra }]);

  const enviarMensaje = async (texto) => {
    if (!texto?.trim()) return;
    if (texto !== 'hola') agregarMensaje('user', texto);
    setCargando(true);
    try {
      const { data } = await api.post('/galaxy/chat', { mensaje: texto, dictamen_id });
      agregarMensaje('bot', data.respuesta || data.siguiente_pregunta || '¿Siguiente campo?');
    } catch (err) {
      if (!navigator.onLine) {
        agregarMensaje('bot', '📵 Sin conexión. Respuesta guardada localmente.');
        await guardarOffline({ _id: dictamen_id, _ultimo_mensaje: texto });
      } else {
        agregarMensaje('bot', 'Ocurrió un error, intenta de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  const enviarAudio = async (blob) => {
    if (!dictamen_id) return;
    agregarMensaje('user', '🎙 [audio grabado]');
    setCargando(true);
    try {
      const form = new FormData();
      form.append('audio', blob, 'respuesta.webm');
      form.append('dictamen_id', dictamen_id);
      form.append('campo_id',    'libre');
      const { data } = await api.post('/galaxy/dictamen/audio', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Mostrar la transcripción y enviarla al chatbot
      const transcript = data.transcript;
      agregarMensaje('user', transcript, { transcript, requiere_revision: data.requiere_revision });
      await enviarMensaje(transcript);
    } catch (err) {
      agregarMensaje('bot', 'No pude procesar el audio. Escribe tu respuesta si quieres.');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    enviarMensaje(input);
    setInput('');
  };

  return (
    <div className={styles.page}>
      <OfflineBanner />

      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>←</button>
        <h1 className={styles.titulo}>Dictamen</h1>
        {dictamen_id && (
          <span className={styles.id} title={dictamen_id}>
            #{dictamen_id.slice(-6)}
          </span>
        )}
      </header>

      <div className={styles.mensajes}>
        {mensajes.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {cargando && (
          <div className={`${styles.burbuja} ${styles.bot}`}>
            <span className={styles.typing}>···</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <footer className={styles.footer}>
        <MicButton onAudio={enviarAudio} disabled={cargando} />
        <form className={styles.textForm} onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="O escribe aquí…"
            disabled={cargando}
          />
          <button type="submit" className={styles.send} disabled={cargando || !input.trim()}>
            ➤
          </button>
        </form>
      </footer>
    </div>
  );
}
