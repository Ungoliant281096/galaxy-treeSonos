import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Conecta al servidor vía Socket.io y escucha eventos del tenant.
 * Se une automáticamente al room `tenant:{tenant_id}` (el servidor lo asigna).
 */
export function useNotificaciones() {
  const socketRef = useRef(null);
  const [notifs, setNotifs]     = useState([]);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('galaxy_token');
    if (!token) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    socket.on('dictamen:nuevo', (data) => {
      agregar({ tipo: 'nuevo', ...data, ts: Date.now() });
    });

    socket.on('dictamen:estado', (data) => {
      agregar({ tipo: 'estado', ...data, ts: Date.now() });
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  const agregar = (n) =>
    setNotifs((prev) => [n, ...prev].slice(0, 20)); // máx 20

  const limpiar = () => setNotifs([]);

  return { notifs, conectado, limpiar };
}
