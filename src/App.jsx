import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { useApp } from './context/AppContext.jsx';
import Analytics from './pages/Analytics.jsx';
import Goals from './pages/Goals.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Modules from './pages/Modules.jsx';
import More from './pages/More.jsx';
import Shared from './pages/Shared.jsx';
import Transactions from './pages/Transactions.jsx';

export default function App() {
  const { user, booting, modules } = useApp();
  if (booting) return null;
  if (!user || !modules) return <Login />;
  return (
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
  );
}
