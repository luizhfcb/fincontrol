import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { countStockAlerts } from '../core/stock-alerts.mjs';
import Icon from './Icon.jsx';
import TxModal from './TxModal.jsx';
import WhatsNewModal from './WhatsNewModal.jsx';

const initials = (name = 'U') =>
  name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

const PAGE_META = {
  '/': { title: 'Visão Geral', sub: 'Acompanhe seu fluxo de caixa, categorias e evolução mensal' },
  '/transacoes': { title: 'Transações', sub: 'Histórico detalhado, buscas e filtros inteligentes' },
  '/analises': { title: 'Análises & Insights', sub: 'Padrões de consumo e comparativos por período' },
  '/mais': { title: 'Central de Módulos', sub: 'Planejamento, rotina financeira e configurações' },
  '/mais/metas': { title: 'Metas Financeiras', sub: 'Planeje reservas e conquistas com prazos claros' },
  '/mais/compartilhamento': { title: 'Carteiras & Grupo', sub: 'Gestão individual e compartilhada entre membros' },
  '/mais/limites': { title: 'Limites por Categoria', sub: 'Controle de teto mensal para manter o orçamento em dia' },
  '/mais/assinaturas': { title: 'Assinaturas Recorrentes', sub: 'Serviços mensais e impacto anual estimado' },
  '/mais/contas': { title: 'Contas Fixas', sub: 'Checklist de vencimentos do mês' },
  '/mais/estoque': { title: 'Estoque Doméstico', sub: 'Controle de itens essenciais e alertas de reposição' },
  '/mais/categorias': { title: 'Categorias', sub: 'Personalize a classificação dos seus lançamentos' },
};

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target.isContentEditable);
}

function WalletPicker({ wallets, walletId, setWalletId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!wallets?.length) return null;
  const current = walletId === 'all'
    ? 'Todas as carteiras'
    : wallets.find((w) => w.id === walletId)?.name || 'Carteira';

  const pick = (id) => {
    setWalletId(id);
    setOpen(false);
  };

  return (
    <div className="wallet-dropdown" ref={ref}>
      <button
        type="button"
        className="wallet-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Selecionar carteira"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="wallet" className="wp-ico" />
        <span className="wp-label">{current}</span>
        <Icon name="right" className={`wp-chev ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="wallet-menu" role="listbox" aria-label="Carteiras">
          <button
            type="button"
            role="option"
            aria-selected={walletId === 'all'}
            className={`wallet-opt ${walletId === 'all' ? 'selected' : ''}`}
            onClick={() => pick('all')}
          >
            <div>
              <b>Todas as carteiras</b>
              <small>Visão consolidada</small>
            </div>
            {walletId === 'all' && <Icon name="check" size={16} />}
          </button>

          <div className="wallet-sep" />

          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              role="option"
              aria-selected={walletId === w.id}
              className={`wallet-opt ${walletId === w.id ? 'selected' : ''}`}
              onClick={() => pick(w.id)}
            >
              <div>
                <b>{w.name}</b>
                <small>{w.shared ? 'Compartilhada em grupo' : 'Uso individual'}</small>
              </div>
              {walletId === w.id && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const {
    user, logout, visibleWallets, modules, walletId, setWalletId,
    openTxModal, txModal, theme, toggleTheme, hideValues, toggleHideValues,
  } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const pendingSearchFocusRef = useRef(false);
  const nav = ({ isActive }) => (isActive ? 'active' : undefined);

  const meta = PAGE_META[pathname] || { title: 'FinControl', sub: 'Controle financeiro inteligente' };
  const unpaidBills = modules?.bills?.filter((b) => !b.paid).length || 0;
  const stockAlerts = modules ? countStockAlerts(modules) : 0;

  useEffect(() => {
    setAvatarMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!avatarMenuOpen) return undefined;
    const onDoc = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [avatarMenuOpen]);

  // Foca a busca ao navegar via atalho `/` (suporta rotas com React.lazy)
  useEffect(() => {
    if (pathname !== '/transacoes' || !pendingSearchFocusRef.current) return undefined;

    const tryFocus = () => {
      const input = document.getElementById('tx-search')
        || document.querySelector('.search-box input[type="search"]');
      if (!input) return false;
      pendingSearchFocusRef.current = false;
      input.focus();
      return true;
    };

    if (tryFocus()) return undefined;

    const observer = new MutationObserver(() => {
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutId = setTimeout(() => {
      pendingSearchFocusRef.current = false;
      observer.disconnect();
    }, 2000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  // Atalhos globais de teclado no desktop: `n` abre nova transação e `/` busca em Transações
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      if (txModal || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      if (e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        openTxModal();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        if (pathname === '/transacoes') {
          const input = document.getElementById('tx-search')
            || document.querySelector('.search-box input[type="search"]');
          input?.focus();
        } else {
          pendingSearchFocusRef.current = true;
          navigate('/transacoes');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [txModal, openTxModal, pathname, navigate]);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Menu lateral">
        <div className="sb-brand">
          <div className="brand-mark"><Icon name="trend" /></div>
          <div className="sb-brand-txt">
            <strong>FinControl</strong>
            <span>Pessoal &amp; Compartilhado</span>
          </div>
        </div>

        <button type="button" className="sb-cta" onClick={() => openTxModal()}>
          <Icon name="plus" /> Nova transação
        </button>

        <div className="sb-section-label">Painel</div>
        <nav className="sb-nav" aria-label="Principal desktop">
          <NavLink to="/" end className={nav}><Icon name="home" /> Visão geral</NavLink>
          <NavLink to="/transacoes" className={nav}><Icon name="list" /> Transações</NavLink>
          <NavLink to="/analises" className={nav}><Icon name="chart" /> Análises</NavLink>
        </nav>

        <div className="sb-section-label" style={{ marginTop: 12 }}>Planejamento</div>
        <nav className="sb-nav" aria-label="Módulos desktop">
          <NavLink to="/mais/metas" className={nav}><Icon name="target" /> Metas financeiras</NavLink>
          <NavLink to="/mais/compartilhamento" className={nav}><Icon name="users" /> Carteiras &amp; Grupo</NavLink>
          <NavLink to="/mais/limites" className={nav}><Icon name="sliders" /> Limites de gasto</NavLink>
          <NavLink to="/mais/assinaturas" className={nav}><Icon name="creditCard" /> Assinaturas</NavLink>
          <NavLink to="/mais/contas" className={nav}>
            <Icon name="receipt" /> Contas fixas
            {unpaidBills > 0 && <span className="sb-badge">{unpaidBills}</span>}
          </NavLink>
          <NavLink to="/mais/estoque" className={nav}>
            <Icon name="box" /> Estoque
            {stockAlerts > 0 && <span className="sb-badge">{stockAlerts}</span>}
          </NavLink>
          <NavLink to="/mais" end className={nav}><Icon name="more" /> Todos os módulos</NavLink>
        </nav>

        <div className="sb-spacer" />

        <div className="sb-user">
          <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
          <div className="who">
            <b>{user.name}</b>
            <small>{user.email}</small>
          </div>
          <button type="button" className="icon-btn danger" onClick={logout} title="Sair da conta" aria-label="Sair">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="mobile-top">
          <div className="avatar-dropdown" ref={avatarMenuRef}>
            <button
              type="button"
              className="avatar avatar-btn"
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              aria-label="Menu da conta"
              onClick={() => setAvatarMenuOpen((o) => !o)}
            >
              {initials(user.name)}
            </button>

            {avatarMenuOpen && (
              <div className="avatar-menu" role="menu" aria-label="Opções da conta">
                <div className="avatar-menu-head">
                  <b>{user.name}</b>
                  <small>{user.email}</small>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="avatar-menu-item"
                  onClick={() => {
                    toggleHideValues();
                    setAvatarMenuOpen(false);
                  }}
                >
                  <Icon name={hideValues ? 'eye' : 'eyeOff'} size={16} />
                  <span>{hideValues ? 'Mostrar valores' : 'Ocultar valores'}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="avatar-menu-item"
                  onClick={() => {
                    toggleTheme();
                    setAvatarMenuOpen(false);
                  }}
                >
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
                  <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
                </button>
                <div className="wallet-sep" />
                <button
                  type="button"
                  role="menuitem"
                  className="avatar-menu-item danger"
                  onClick={() => {
                    setAvatarMenuOpen(false);
                    logout();
                  }}
                >
                  <Icon name="logout" size={16} />
                  <span>Sair da conta</span>
                </button>
              </div>
            )}
          </div>

          <h1 className="mobile-page-title" title={meta.title}>{meta.title}</h1>

          <WalletPicker wallets={visibleWallets} walletId={walletId} setWalletId={setWalletId} />
        </header>

        <header className="desktop-top">
          <div className="dt-inner">
            <div className="dt-title">
              <h1>{meta.title}</h1>
              <p>{meta.sub}</p>
            </div>
            <div className="dt-actions">
              <WalletPicker wallets={visibleWallets} walletId={walletId} setWalletId={setWalletId} />
              <button
                type="button"
                className="icon-btn"
                onClick={toggleHideValues}
                aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
                title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              >
                <Icon name={hideValues ? 'eyeOff' : 'eye'} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
              </button>
            </div>
          </div>
        </header>

        <main className="scroll">
          <Outlet />
        </main>

        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end className={nav}><Icon name="home" />Início</NavLink>
          <NavLink to="/transacoes" className={nav}><Icon name="list" />Transações</NavLink>
          <button type="button" className="fab" onClick={() => openTxModal()} aria-label="Nova transação">
            <Icon name="plus" />
          </button>
          <NavLink to="/analises" className={nav}><Icon name="chart" />Análises</NavLink>
          <NavLink to="/mais" className={nav}><Icon name="more" />Mais</NavLink>
        </nav>
      </div>

      {txModal && <TxModal />}
      <WhatsNewModal />
    </div>
  );
}
