import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useApp } from '../context/AppContext.jsx';

const FEATURES = [
  {
    icon: 'users',
    color: '#38BDF8',
    title: 'Carteiras Compartilhadas',
    desc: 'Separe gastos pessoais das despesas da casa ou da família com transparência.',
  },
  {
    icon: 'chart',
    color: '#34D399',
    title: 'Análises em Tempo Real',
    desc: 'Entenda para onde vai seu dinheiro por categoria, mapa de calor e período.',
  },
  {
    icon: 'target',
    color: '#A78BFA',
    title: 'Metas & Limites',
    desc: 'Defina tetos de gastos mensais e acompanhe o progresso das suas reservas.',
  },
  {
    icon: 'receipt',
    color: '#FBBF24',
    title: 'Rotina Organizada',
    desc: 'Controle assinaturas recorrentes, contas fixas e alertas de reposição.',
  },
];

export default function Login() {
  const { isFirebase, login, resetDemo, theme, toggleTheme } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleLogin = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    try {
      await login();
    } catch (e) {
      setErr(e?.message || 'Não foi possível concluir o login.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    await resetDemo();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2500);
  };

  return (
    <div className="login-page">
      <div className="login-topbar">
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>

      <div className="login-shell">
        <div className="login-pitch">
          <span className="eyebrow">
            <Icon name="sparkles" size={15} /> FinControl Web · Gestão Inteligente
          </span>
          <h1>
            Suas finanças sob controle, <span>sozinho ou em família.</span>
          </h1>
          <p>
            Acompanhe receitas, despesas, metas e carteiras compartilhadas em uma experiência rápida, clara e pensada para o dia a dia.
          </p>

          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div className="feature-item" key={f.title}>
                <span
                  className="ico"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: `${f.color}1F`,
                    borderColor: `${f.color}45`,
                    color: f.color,
                  }}
                >
                  <Icon name={f.icon} size={18} />
                </span>
                <div>
                  <b>{f.title}</b>
                  <small>{f.desc}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="login-card">
          <div className="login-brand">
            <div className="brand-mark"><Icon name="trend" /></div>
            <div>
              <strong>FinControl</strong>
              <small>{isFirebase ? 'Sincronizado com Firebase' : 'Ambiente de avaliação interativo'}</small>
            </div>
          </div>

          {!isFirebase && (
            <div className="demo-profile">
              <div className="avatar">LH</div>
              <div className="grow">
                <b style={{ display: 'block', fontSize: 14 }}>Luiz H.</b>
                <small className="muted tiny">2 carteiras · 6 meses de histórico</small>
              </div>
              <span className="badge good">Demo</span>
            </div>
          )}

          {err && <p className="neg tiny" role="alert" style={{ marginBottom: 12 }}>{err}</p>}

          <button
            className="btn"
            onClick={handleLogin}
            disabled={busy}
            style={{ padding: '14px 20px', fontSize: 15 }}
          >
            {busy ? 'Conectando...' : isFirebase ? 'Entrar com Google' : 'Entrar na demonstração'}
            {!busy && <Icon name="right" size={18} />}
          </button>

          {!isFirebase && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={handleReset}
              style={{ width: '100%', marginTop: 10 }}
            >
              <Icon name="refresh" size={15} />
              {resetDone ? 'Dados de exemplo restaurados!' : 'Restaurar dados iniciais'}
            </button>
          )}

          <p className="muted tiny" style={{ marginTop: 16, textAlign: 'center', lineHeight: 1.45 }}>
            {isFirebase
              ? 'Seus dados ficam protegidos na sua conta Google com sincronização offline automática.'
              : <>Os lançamentos ficam salvos localmente no navegador (<code style={{ fontSize: 11 }}>localStorage</code>) para você testar livremente.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
