import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { useApp } from '../context/AppContext.jsx';
import { goalProgress } from '../core/analytics.js';
import { parsePtBrNumber } from '../core/parse-number.mjs';

export default function Goals() {
  const { goals, updateGoals, group, visibleWallets, fmt, hideValues, toast } = useApp();
  const wallets = visibleWallets?.length ? visibleWallets : (group?.wallets || []);
  const [form, setForm] = useState({ name: '', target: '', deadline: '', walletId: wallets[0]?.id || '' });
  const [add, setAdd] = useState({});
  const [err, setErr] = useState('');
  const [confirmGoal, setConfirmGoal] = useState(null);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', target: '', saved: '', deadline: '' });
  const [editErr, setEditErr] = useState('');

  const selectedWalletId = wallets.some((w) => w.id === form.walletId) ? form.walletId : (wallets[0]?.id || '');
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  const create = async (e) => {
    e.preventDefault();
    const target = parsePtBrNumber(form.target);
    if (!form.name.trim()) return setErr('Dê um nome para a meta.');
    if (!(target > 0)) return setErr('Informe um valor alvo maior que zero.');
    setErr('');
    try {
      await updateGoals([
        ...goals,
        { id: String(Date.now()), name: form.name.trim(), target, saved: 0, deadline: form.deadline, walletId: selectedWalletId },
      ]);
      setForm({ ...form, name: '', target: '', deadline: '' });
      toast('Meta criada com sucesso.');
    } catch (ex) {
      setErr(ex?.message || 'Erro ao criar meta.');
    }
  };

  const contributeAmount = async (goal, rawVal, clearInput = false) => {
    const v = parsePtBrNumber(rawVal);
    if (!(v > 0)) {
      if (clearInput) toast('Informe um valor maior que zero.', 'error');
      return;
    }
    try {
      await updateGoals(goals.map((g) => (g.id === goal.id ? { ...g, saved: g.saved + v } : g)));
      if (clearInput) setAdd({ ...add, [goal.id]: '' });
      toast(`+${fmt(v)} guardado em "${goal.name}".`);
    } catch (ex) {
      toast(ex?.message || 'Erro ao atualizar meta.', 'error');
    }
  };

  const startEdit = (g) => {
    setEditingGoalId(g.id);
    setEditForm({
      name: g.name || '',
      target: String(g.target ?? '').replace('.', ','),
      saved: String(g.saved ?? 0).replace('.', ','),
      deadline: g.deadline || '',
    });
    setEditErr('');
  };

  const cancelEdit = () => {
    setEditingGoalId(null);
    setEditErr('');
  };

  const saveEdit = async (e, goalId) => {
    e.preventDefault();
    const name = editForm.name.trim();
    const target = parsePtBrNumber(editForm.target);
    const saved = editForm.saved.trim() === '' ? 0 : parsePtBrNumber(editForm.saved);
    if (!name) return setEditErr('Informe um nome para a meta.');
    if (!(target > 0)) return setEditErr('Valor alvo deve ser maior que zero.');
    if (!Number.isFinite(saved) || saved < 0) return setEditErr('Valor guardado inválido.');
    setEditErr('');
    try {
      await updateGoals(goals.map((g) => (
        g.id === goalId ? { ...g, name, target, saved, deadline: editForm.deadline } : g
      )));
      cancelEdit();
      toast('Meta atualizada.');
    } catch (ex) {
      setEditErr(ex?.message || 'Erro ao salvar meta.');
    }
  };

  return (
    <>
      <Link to="/mais" className="back back-mobile"><Icon name="left" size={16} /> Voltar aos módulos</Link>

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
            <span className="badge good num">{hideValues ? '••%' : `${overallPct.toFixed(0)}%`} concluído</span>
          </div>
          <div className="bar" style={{ height: 10, marginTop: 12 }}>
            <span style={{ width: `${hideValues ? 0 : overallPct}%` }} />
          </div>
        </section>
      )}

      {goals.length === 0 ? (
        <section className="card">
          <EmptyState
            compact
            icon="target"
            title="Nenhuma meta criada ainda"
            description="Use o formulário abaixo para planejar sua próxima reserva ou conquista."
          />
        </section>
      ) : (
        <div className="cards-grid">
          {goals.map((g) => {
            const p = goalProgress(g);
            const wallet = (group?.wallets || []).find((w) => w.id === g.walletId);
            const isEditing = editingGoalId === g.id;
            return (
              <section className="card" key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <span className="ico" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                      <Icon name="target" />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ marginBottom: 2 }}>{g.name}</h3>
                      <div className="row-meta">
                        {wallet && <span className="meta-tag">{wallet.name}</span>}
                        {g.deadline && (
                          <span>até {new Date(`${g.deadline}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="wallet-card-actions">
                    <button
                      type="button"
                      className="icon-btn sm-btn"
                      aria-label={`Editar meta ${g.name}`}
                      title="Editar meta"
                      onClick={() => (isEditing ? cancelEdit() : startEdit(g))}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn sm-btn danger"
                      aria-label={`Excluir meta ${g.name}`}
                      title="Excluir meta"
                      onClick={() => setConfirmGoal(g)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form className="inline-edit-form" onSubmit={(e) => saveEdit(e, g.id)}>
                    <div className="filters">
                      <div className="field">
                        <label htmlFor={`egn-${g.id}`}>Nome</label>
                        <input
                          id={`egn-${g.id}`}
                          className="input"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`egd-${g.id}`}>Prazo</label>
                        <input
                          id={`egd-${g.id}`}
                          type="date"
                          className="input"
                          value={editForm.deadline}
                          onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`egs-${g.id}`}>Guardado (R$)</label>
                        <input
                          id={`egs-${g.id}`}
                          className="input"
                          inputMode="decimal"
                          value={editForm.saved}
                          onChange={(e) => setEditForm({ ...editForm, saved: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`egt-${g.id}`}>Alvo (R$)</label>
                        <input
                          id={`egt-${g.id}`}
                          className="input"
                          inputMode="decimal"
                          value={editForm.target}
                          onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
                        />
                      </div>
                    </div>
                    {editErr && <p className="neg tiny" role="alert" style={{ marginBottom: 8 }}>{editErr}</p>}
                    <div className="wallet-rename-actions">
                      <button type="button" className="btn ghost sm" onClick={cancelEdit}>Cancelar</button>
                      <button type="submit" className="btn sm">Salvar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={`bar ${p.done ? 'ok' : ''}`} style={{ height: 10, marginTop: 16 }}>
                      <span style={{ width: `${hideValues ? 0 : p.percent}%` }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
                      <p className="num">
                        <b>{fmt(g.saved)}</b> <span className="muted tiny">de {fmt(g.target)}</span>
                      </p>
                      <span className={`badge ${p.done ? 'good' : 'neutral'} num`}>
                        {hideValues ? '••%' : `${p.percent.toFixed(0)}%`}
                      </span>
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
                              onClick={() => contributeAmount(g, preset)}
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
                            onClick={() => contributeAmount(g, add[g.id], true)}
                          >
                            Guardar
                          </button>
                        </div>
                      </>
                    )}
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
        onConfirm={async () => {
          const target = confirmGoal;
          setConfirmGoal(null);
          if (!target) return;
          try {
            await updateGoals(goals.filter((x) => x.id !== target.id));
            toast('Meta excluída.', 'info');
          } catch (ex) {
            toast(ex?.message || 'Erro ao excluir meta.', 'error');
          }
        }}
        onCancel={() => setConfirmGoal(null)}
      />
    </>
  );
}
