import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Icon from '../components/Icon.jsx';
import { useApp } from '../context/AppContext.jsx';
import { goalProgress } from '../core/analytics.js';
import { parsePtBrNumber } from '../core/parse-number.mjs';

export default function Goals() {
  const { goals, updateGoals, group, visibleWallets, fmt } = useApp();
  const wallets = visibleWallets?.length ? visibleWallets : (group?.wallets || []);
  const [form, setForm] = useState({ name: '', target: '', deadline: '', walletId: wallets[0]?.id || '' });
  const [add, setAdd] = useState({});
  const [err, setErr] = useState('');
  const [confirmGoal, setConfirmGoal] = useState(null);

  const selectedWalletId = wallets.some((w) => w.id === form.walletId) ? form.walletId : (wallets[0]?.id || '');
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  const create = (e) => {
    e.preventDefault();
    const target = parsePtBrNumber(form.target);
    if (!form.name.trim()) return setErr('Dê um nome para a meta.');
    if (!(target > 0)) return setErr('Informe um valor alvo maior que zero.');
    setErr('');
    updateGoals([
      ...goals,
      { id: String(Date.now()), name: form.name.trim(), target, saved: 0, deadline: form.deadline, walletId: selectedWalletId },
    ]);
    setForm({ ...form, name: '', target: '', deadline: '' });
  };

  const contributeAmount = (id, rawVal) => {
    const v = parsePtBrNumber(rawVal);
    if (!(v > 0)) return;
    updateGoals(goals.map((g) => (g.id === id ? { ...g, saved: g.saved + v } : g)));
    setAdd({ ...add, [id]: '' });
  };

  return (
    <>
      <Link to="/mais" className="back"><Icon name="left" size={16} /> Voltar aos módulos</Link>

      <div className="section-head" style={{ marginTop: 4 }}>
        <div className="section-title">Metas financeiras</div>
      </div>

      {goals.length > 0 && (
        <section className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <small className="muted tiny">ACUMULADO EM METAS</small>
              <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>
                <span className="pos">{fmt(totalSaved)}</span>{' '}
                <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>de {fmt(totalTarget)}</span>
              </div>
            </div>
            <span className="badge good num">{overallPct.toFixed(0)}% concluído</span>
          </div>
          <div className="bar" style={{ height: 10, marginTop: 12 }}>
            <span style={{ width: `${overallPct}%` }} />
          </div>
        </section>
      )}

      {goals.length === 0 ? (
        <section className="card">
          <p className="empty">Crie uma meta abaixo para acompanhar sua reserva financeira.</p>
        </section>
      ) : (
        <div className="cards-grid">
          {goals.map((g) => {
            const p = goalProgress(g);
            const wallet = (group?.wallets || []).find((w) => w.id === g.walletId);
            return (
              <section className="card" key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="ico" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                      <Icon name="target" />
                    </span>
                    <div>
                      <h3 style={{ marginBottom: 2 }}>{g.name}</h3>
                      <div className="row-meta">
                        {wallet && <span className="meta-tag">{wallet.name}</span>}
                        {g.deadline && (
                          <span>até {new Date(`${g.deadline}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Excluir meta ${g.name}`}
                    onClick={() => setConfirmGoal(g)}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>

                <div className={`bar ${p.done ? 'ok' : ''}`} style={{ height: 10, marginTop: 16 }}>
                  <span style={{ width: `${p.percent}%` }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
                  <p className="num">
                    <b>{fmt(g.saved)}</b> <span className="muted tiny">de {fmt(g.target)}</span>
                  </p>
                  <span className={`badge ${p.done ? 'good' : 'neutral'} num`}>{p.percent.toFixed(0)}%</span>
                </div>

                {p.done ? (
                  <p className="pos tiny" style={{ marginTop: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="check" size={14} /> Meta alcançada com sucesso!
                  </p>
                ) : (
                  <>
                    {p.monthlyNeeded != null && (
                      <p className="muted tiny" style={{ marginTop: 6 }}>
                        Sugestão: guarde <b className="num">{fmt(p.monthlyNeeded)}</b>/mês para atingir no prazo.
                      </p>
                    )}

                    <div className="quick-amounts">
                      {[50, 100, 250].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className="quick-amt-btn num"
                          onClick={() => contributeAmount(g.id, preset)}
                        >
                          + R$ {preset}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input
                        className="input"
                        inputMode="decimal"
                        placeholder="Outro valor (R$)"
                        aria-label={`Adicionar valor a ${g.name}`}
                        value={add[g.id] || ''}
                        onChange={(e) => setAdd({ ...add, [g.id]: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => contributeAmount(g.id, add[g.id])}
                      >
                        Guardar
                      </button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      <form className="card" onSubmit={create}>
        <h3>Criar nova meta</h3>
        <div className="filters">
          <div className="field">
            <label htmlFor="gn">Nome do objetivo</label>
            <input
              id="gn"
              className="input"
              placeholder="Ex.: Reserva de emergência, Notebook..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="gt">Valor alvo (R$)</label>
            <input
              id="gt"
              className="input"
              inputMode="decimal"
              placeholder="5.000,00"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="gd">Prazo desejado</label>
            <input
              id="gd"
              type="date"
              className="input"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="gw">Carteira vinculada</label>
            <select
              id="gw"
              className="input"
              value={selectedWalletId}
              onChange={(e) => setForm({ ...form, walletId: e.target.value })}
              disabled={wallets.length === 0}
            >
              {wallets.length === 0 ? (
                <option value="">Nenhuma carteira disponível</option>
              ) : (
                wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)
              )}
            </select>
          </div>
        </div>
        {err && <p className="neg tiny" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
        <button className="btn" type="submit" style={{ marginTop: 4 }}>
          <Icon name="plus" size={17} /> Adicionar meta
        </button>
      </form>

      <ConfirmDialog
        open={Boolean(confirmGoal)}
        title="Excluir meta"
        message={confirmGoal ? `Deseja excluir a meta "${confirmGoal.name}"? Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => {
          if (confirmGoal) updateGoals(goals.filter((x) => x.id !== confirmGoal.id));
          setConfirmGoal(null);
        }}
        onCancel={() => setConfirmGoal(null)}
      />
    </>
  );
}
