import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import Sidebar from './components/layout/Sidebar';
import './App.css';

export default function App() {
  const { user, loading, restore } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    restore();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载中...</div>;
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Outlet />
        <div className="watermark">由张卡龙制作</div>
      </main>
    </div>
  );
}
