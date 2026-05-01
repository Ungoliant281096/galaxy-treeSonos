import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage          from './pages/LoginPage';
import HomePage           from './pages/HomePage';
import ChatPage           from './pages/ChatPage';
import DashboardPage      from './pages/DashboardPage';
import DictamenDetailPage from './pages/DictamenDetailPage';
import ReportesPage       from './pages/ReportesPage';

function Privada({ children, roles }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.role)) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return usuario.role === 'inspector'
    ? <Navigate to="/inspector" replace />
    : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Redirección inteligente por rol */}
        <Route path="/" element={<RootRedirect />} />

        {/* Inspector */}
        <Route path="/inspector" element={
          <Privada roles={['inspector', 'admin']}>
            <HomePage />
          </Privada>
        } />
        <Route path="/chat/:id" element={
          <Privada>
            <ChatPage />
          </Privada>
        } />

        {/* Supervisor / Admin */}
        <Route path="/dashboard" element={
          <Privada roles={['supervisor', 'admin']}>
            <DashboardPage />
          </Privada>
        } />
        <Route path="/dictamen/:id" element={
          <Privada>
            <DictamenDetailPage />
          </Privada>
        } />
        <Route path="/reportes" element={
          <Privada roles={['supervisor', 'admin']}>
            <ReportesPage />
          </Privada>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
