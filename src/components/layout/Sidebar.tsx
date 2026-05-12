import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import './Sidebar.css';

const commonItems = [
  { path: '/', icon: '🏠', label: '首页', end: true },
  { path: '/timer', icon: '⏱', label: '辩论计时器' },
  { path: '/debate', icon: '🎙', label: '模拟辩论' },
  { path: '/room', icon: '🏟', label: '在线对战' },
  { path: '/workshop', icon: '📋', label: '协作工作坊' },
];

const studentItems = [
  { path: '/records', icon: '📊', label: '练习记录' },
  { path: '/drafts', icon: '📝', label: '我的稿件' },
  { path: '/class', icon: '🏫', label: '我的班级' },
];

const teacherItems = [
  { path: '/teacher', icon: '📊', label: '教学管理' },
  { path: '/records', icon: '📋', label: '练习记录' },
  { path: '/drafts', icon: '📝', label: '我的稿件' },
  { path: '/class', icon: '🏫', label: '班级管理' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const roleItems = user?.role === 'teacher' ? teacherItems : studentItems;
  const navItems = [...commonItems, ...roleItems];

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <button className="sidebar-toggle-mobile" onClick={() => setCollapsed(!collapsed)}>
        ☰
      </button>
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">🎙</span>
          <span className="sidebar-title">AI-Debate Master</span>
        </div>
        <ul className="sidebar-nav">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => window.innerWidth < 768 && setCollapsed(true)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <span className="sidebar-user-name">{user.displayName}</span>
              <span className="sidebar-user-role">{user.role === 'teacher' ? '老师' : '学生'}</span>
            </div>
          )}
          <button className="sidebar-logout" onClick={handleLogout}>退出登录</button>
        </div>
      </nav>
      {!collapsed && <div className="sidebar-overlay" onClick={() => setCollapsed(true)} />}
    </>
  );
}
