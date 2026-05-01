import styles from './ChatBubble.module.css';

export default function ChatBubble({ msg }) {
  const esBot = msg.rol === 'bot';
  return (
    <div className={`${styles.wrap} ${esBot ? styles.bot : styles.user}`}>
      <div className={styles.bubble}>
        {msg.texto}
        {msg.requiere_revision && (
          <span className={styles.badge} title="Transcripción con baja confianza">⚠️</span>
        )}
      </div>
      {msg.transcript && !esBot && (
        <p className={styles.transcript}>"{msg.transcript}"</p>
      )}
    </div>
  );
}
