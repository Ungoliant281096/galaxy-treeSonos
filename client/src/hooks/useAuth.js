import { useState, useEffect } from 'react';
import api from '../services/api';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function useAuth() {
  const [usuario, setUsuario] = useState(() => {
    const t = localStorage.getItem('galaxy_token');
    return t ? parseJwt(t) : null;
  });

  const login = async (correo, password) => {
    const { data } = await api.post('/users/login', { email: correo, password });
    localStorage.setItem('galaxy_token', data.token);
    setUsuario(parseJwt(data.token));
    return data;
  };

  const logout = () => {
    localStorage.removeItem('galaxy_token');
    setUsuario(null);
  };

  return { usuario, login, logout };
}
