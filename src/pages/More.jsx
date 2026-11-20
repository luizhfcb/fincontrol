import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useApp } from '../context/AppContext.jsx';
import { countStockAlerts } from '../core/stock-alerts.mjs';

export default function More() {
  const {
    isFirebase, modules, goals, group, theme, toggleTheme,
    hideValues, toggleHideValues, resetDemo, fmt,
  } = useApp();
  const [resetMsg, setResetMsg] = useState(false);

  const alerts = countStockAlerts(modules);
  const unpaid = modules.bills.filter((b) => !b.paid).length;
  const subsTotal = modules.subscriptions.reduce((s, x) => s + x.value, 0);
  const memberCount = group?.members?.length || 0;
  const walletCount = group?.wallets?.length || 0;

  const items = [
    {
      to: '/mais/metas',
      icon: 'target',
      color: '#A78BFA',
      title: 'Metas financeiras',
      sub: `${goals.length} ${goals.length === 1 ? 'meta ativa' : 'metas ativas'}`,
    },
    {
      to: '/mais/compartilhamento',
      icon: 'users',
      color: '#38BDF8',
      title: 'Carteiras e compartilhamento',
      sub: `${memberCount} pessoas · ${walletCount} carteiras`,
    },
    {
      to: '/mais/limites',
      icon: 'sliders',
      color: '#34D399',
      title: 'Limites por categoria',
      sub: `${modules.limits.length} tetos mensais definidos`,
    },
    {
      to: '/mais/assinaturas',
      icon: 'creditCard',
      color: '#06B6D4',
      title: 'Assinaturas recorrentes',
      sub: `${modules.subscriptions.length} ativas · ${fmt(subsTotal)}/mês`,
    },
    {
      to: '/mais/contas',
      icon: 'receipt',
      color: '#FB7185',
      title: 'Contas fixas',
      sub: unpaid ? `${unpaid} pendente${unpaid > 1 ? 's' : ''} neste mês` : 'Todas em dia',
      warn: unpaid > 0,
    },
    {
      to: '/mais/estoque',
      icon: 'box',
      color: '#FBBF24',
      title: 'Estoque doméstico',
      sub: alerts ? `${alerts} ${alerts === 1 ? 'item para repor' : 'itens para repor'}` : 'Estoque abastecido',
      warn: alerts > 0,
    },
    {
      to: '/mais/categorias',
      icon: 'tag',
      color: '#818CF8',
      title: 'Categorias personalizadas',
      sub: `${modules.categories.length} cadastradas`,
    },
  ];

  const onReset = async () => {
    await resetDemo();
    setResetMsg(true);
    setTimeout(() => setResetMsg(false), 2500);
  };

  return (
    <>
      <div className="section-title" style={{ marginTop: 4 }}>Módulos de gestão</div>

      <div className="cards-grid">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="link-card">
            <span
              className="ico"
              style={{
                background: `${item.color}1F`,
                borderColor: `${item.color}45`,
                color: item.color,
              }}
            >
              <Icon name={item.icon} />
            </span>
            <div className="grow" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b>{item.title}</b>
                {item.warn && <span className="badge warn">Atenção</span>}
              </div>
              <small className="muted">{item.sub}</small>
            </div>
            <Icon name="right" />
          </Link>
        ))}
      </div>

      <div className="section-title">Preferências &amp; Ambiente</div>
      <section className="card">
        <div className="row">
          <span className="ico"><Icon name={theme === 'dark' ? 'moon' : 'sun'} /></span>
          <div className="grow">
            <b>Aparência da interface</b>
            <small className="muted">Alternar entre modo escuro e modo claro</small>
          </div>
          <button type="button" className="btn ghost sm" onClick={toggleTheme}>
            {theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
          </button>
        </div>

        <div className="row">
          <span className="ico"><Icon name={hideValues ? 'eyeOff' : 'eye'} /></span>
          <div className="grow">
            <b>Modo privacidade</b>
            <small className="muted">Ocultar saldos e valores monetários na tela</small>
          </div>
          <button type="button" className="btn ghost sm" onClick={toggleHideValues}>
            {hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          </button>
        </div>

        {!isFirebase && (
          <div className="row">
            <span className="ico"><Icon name="refresh" /></span>
            <div className="grow">
              <b>Dados de demonstração</b>
              <small className="muted">Restaurar transações, metas e carteiras originais</small>
            </div>
            <button type="button" className="btn ghost sm" onClick={onReset}>
              {resetMsg ? 'Restaurado!' : 'Restaurar'}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
