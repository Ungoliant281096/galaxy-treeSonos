import { useEffect, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import styles from './MicButton.module.css';

/**
 * Props:
 *  onAudio(blob) — llamado al terminar la grabación
 *  disabled      — bloquea mientras el server procesa
 */
export default function MicButton({ onAudio, disabled }) {
  const { recording, blob, error, start, stop, reset } = useAudioRecorder();

  useEffect(() => {
    if (blob) {
      onAudio(blob);
      reset();
    }
  }, [blob]);

  const handleClick = () => {
    if (disabled) return;
    recording ? stop() : start();
  };

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${recording ? styles.active : ''}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label={recording ? 'Detener grabación' : 'Grabar respuesta'}
        title={recording ? 'Toca para terminar' : 'Toca para hablar'}
      >
        {recording ? '⏹' : '🎙'}
      </button>
      {recording && <span className={styles.pulse} />}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
