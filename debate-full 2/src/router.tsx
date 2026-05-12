import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const TimerPage = lazy(() => import('./pages/TimerPage'));
const DebatePage = lazy(() => import('./pages/DebatePage'));
const WorkshopPage = lazy(() => import('./pages/WorkshopPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MyRecordsPage = lazy(() => import('./pages/MyRecordsPage'));
const MyDraftsPage = lazy(() => import('./pages/MyDraftsPage'));
const ClassPage = lazy(() => import('./pages/ClassPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const RecordDetailPage = lazy(() => import('./pages/RecordDetailPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));

function Loading() {
  return <div className="loading">加载中...</div>;
}

function withSuspense(Component: React.LazyExoticComponent<any>) {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: withSuspense(HomePage) },
      { path: 'timer', element: withSuspense(TimerPage) },
      { path: 'debate', element: withSuspense(DebatePage) },
      { path: 'workshop', element: withSuspense(WorkshopPage) },
      { path: 'settings', element: withSuspense(SettingsPage) },
      { path: 'records', element: withSuspense(MyRecordsPage) },
      { path: 'records/:id', element: withSuspense(RecordDetailPage) },
      { path: 'drafts', element: withSuspense(MyDraftsPage) },
      { path: 'class', element: withSuspense(ClassPage) },
      { path: 'teacher', element: withSuspense(TeacherDashboard) },
      { path: 'room', element: withSuspense(RoomPage) },
    ],
  },
]);
