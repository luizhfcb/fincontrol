import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Icon from './components/Icon.jsx';
import Layout from './components/Layout.jsx';
import { useApp } from './context/AppContext.jsx';

const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Modules = lazy(() => import('./pages/Modules.jsx'));
const More = lazy(() => import('./pages/More.jsx'));
const Shared = lazy(() => import('./pages/Shared.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));

function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite" aria-label="Carregando">
      <div className="boot-mark">
        <span className="brand-mark"><Icon name="trend" /></span>
        <span>Carregando FinControl...</span>
      </div>
    </div>
  );
}

export default function App() {
  const { user, booting, modules } = useApp();
  if (booting || (user && !modules)) return <BootScreen />;
  if (!user) {
    return (
      <Suspense fallback={<BootScreen />}>
        <Login />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<BootScreen />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="transacoes" element={<Transactions />} />
          <Route path="analises" element={<Analytics />} />
          <Route path="mais" element={<More />} />
          <Route path="mais/metas" element={<Goals />} />
          <Route path="mais/compartilhamento" element={<Shared />} />
          <Route path="mais/:section" element={<Modules />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
