import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CategoryBadge, { CATEGORY_ICON_CHOICES } from '../components/CategoryIcon.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { buildLimitProgress } from '../core/analytics.js';
import { DEFAULT_CATEGORIES } from '../core/constants.js';
import { parsePtBrNumber } from '../core/parse-number.mjs';
import { listStockAlerts } from '../core/stock-alerts.mjs';

const uid = () => String(Date.now() + Math.random());
const CUSTOM_OPTION = '__custom__';

function buildNormalizedCategories(modules) {
  const source = modules?.categories?.length ? modules.categories : DEFAULT_CATEGORIES;
  const seen = new Set();
  const list = [];
  for (const c of source) {
    if (c.type && c.type !== 'expense') continue;
    const name = String(c.name || '').trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(name);
  }
  if (!seen.has('outros')) list.push('Outros');
  return list;
}

function AddForm({ title, fields, onAdd, label = 'Adicionar' }) {
  const buildBlank = () => Object.fromEntries(
    fields.map((f) => [f.key, f.defaultValue ?? (f.options?.[0]?.value ?? '')]),
  );
  const [v, setV] = useState(buildBlank);
  const [customs, setCustoms] = useState({});
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const out = {};
    for (const f of fields) {
      let raw = String(v[f.key] ?? '').trim();
      if (f.allowCustom && raw === CUSTOM_OPTION) {
        raw = String(customs[f.key] ?? '').trim();
      }
      if (!raw && !f.optional) return setErr(`Preencha ${f.label.toLowerCase()}.`);
      if (f.number) {
        const parsed = parsePtBrNumber(raw);
        if (!Number.isFinite(parsed)) return setErr(`${f.label} inválido.`);
        if (f.positive && !(parsed > 0)) return setErr(`${f.label} deve ser maior que zero.`);
        if (f.integer && !Number.isInteger(parsed)) return setErr(`${f.label} deve ser um número inteiro.`);
        if (f.min != null && parsed < f.min) {
          return setErr(
            f.max != null
              ? `${f.label} deve estar entre ${f.min} e ${f.max}.`
              : `${f.label} deve ser no mínimo ${f.min}.`,
          );
        }
        if (f.max != null && parsed > f.max) {
          return setErr(`${f.label} deve estar entre ${f.min ?? 0} e ${f.max}.`);
        }
        out[f.key] = parsed;
      } else {
        out[f.key] = raw;
      }
    }
    setSubmitting(true);
    try {
      const customErr = await onAdd(out);
      if (typeof customErr === 'string' && customErr) {
        setErr(customErr);
        return;
      }
      setErr('');
      setV(buildBlank());
      setCustoms({});
    } catch (ex) {
      setErr(ex?.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      {title && <h3>{title}</h3>}
      <div className="filters">
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`f-${f.key}`}>{f.label}</label>
            {f.options ? (
              <>
                <select
                  id={`f-${f.key}`}
                  className="input"
                  value={v[f.key]}
                  onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
                >
                  {f.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  {f.allowCustom && <option value={CUSTOM_OPTION}>Outra categoria...</option>}
                </select>
                {f.allowCustom && v[f.key] === CUSTOM_OPTION && (
                  <input
                    id={`f-${f.key}-custom`}
                    className="input"
                    style={{ marginTop: 8 }}
                    placeholder={f.customPlaceholder || 'Digite a categoria'}
                    aria-label={f.customPlaceholder || `Personalizar ${f.label.toLowerCase()}`}
                    value={customs[f.key] || ''}
                    onChange={(e) => setCustoms({ ...customs, [f.key]: e.target.value })}
                  />
                )}
              </>
            ) : (
              <input
                id={`f-${f.key}`}
                className="input"
                placeholder={f.placeholder}
                inputMode={f.number ? (f.integer ? 'numeric' : 'decimal') : 'text'}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      {err && <p className="neg tiny" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
      <button className="btn" type="submit" disabled={submitting}>
        <Icon name="plus" size={17} /> {submitting ? 'Salvando...' : label}
      </button>
    </form>
  );
}

function Del({ onClick, label, small = false }) {
  return (
    <button
      type="button"
      className={`icon-btn ${small ? 'sm-btn' : ''} danger`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name="trash" size={small ? 15 : 17} />
    </button>
  );
}

function EditBtn({ onClick, label, active }) {
  return (
    <button
      type="button"
      className="icon-btn sm-btn"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <Icon name="edit" size={15} />
    </button>
  );
}

export default function Modules() {
  const { section } = useParams();
  const { modules, updateModules, monthlyTransactions, fmt, hideValues, toast } = useApp();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editErr, setEditErr] = useState('');

  useEffect(() => {
    setEditing(null);
    setEditErr('');
  }, [section]);

  const patch = (key, fn) => updateModules({ ...modules, [key]: fn(modules[key]) });
  const remove = async (key, id, feedback) => {
    try {
      await patch(key, (l) => l.filter((x) => x.id !== id));
      toast(feedback || 'Item removido.', 'info');
    } catch (ex) {
      toast(ex?.message || 'Erro ao remover item.', 'error');
    }
  };
  const askDelete = (key, id, title, message, feedback) => setPendingDelete({ key, id, title, message, feedback });
  const cancelEdit = () => {
    setEditing(null);
    setEditErr('');
  };

  let body;

  if (section === 'limites') {
    const rows = buildLimitProgress(modules.limits, monthlyTransactions);
    const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
    const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
    const STATUS_LABEL = { ok: ['good', 'Dentro do limite'], warn: ['warn', 'Atenção'], over: ['bad', 'Excedido'] };
    const categoryOptions = buildNormalizedCategories(modules).map((name) => ({ value: name, label: name }));

    const startEditLimit = (r) => {
      setEditing({ id: r.id, limit: String(r.limit ?? '').replace('.', ',') });
      setEditErr('');
    };

    const saveEditLimit = async (e, id) => {
      e.preventDefault();
      const limit = parsePtBrNumber(editing?.limit);
      if (!(limit > 0)) return setEditErr('Limite deve ser maior que zero.');
      try {
        await patch('limits', (l) => l.map((x) => (x.id === id ? { ...x, limit } : x)));
        cancelEdit();
        toast('Limite atualizado.');
      } catch (ex) {
        setEditErr(ex?.message || 'Erro ao atualizar limite.');
      }
    };

    body = (
      <>
        <div className="page-toolbar">
          <MonthBar />
        </div>

        <div className="grid2">
          <div className="card stat-card">
            <div className="stat-head"><span>Total orçado</span></div>
            <strong className="num">{fmt(totalLimit)}</strong>
          </div>
          <div className="card stat-card">
            <div className="stat-head"><span>Utilizado no mês</span></div>
            <strong className={`num ${totalSpent > totalLimit && totalLimit > 0 ? 'neg' : 'pos'}`}>{fmt(totalSpent)}</strong>
          </div>
        </div>

        <div className="bento-2">
          <section className="card">
            <h3>Acompanhamento mensal</h3>
            {rows.length === 0 && (
              <EmptyState
                compact
                icon="sliders"
                title="Nenhum limite definido"
                description="Use o formulário ao lado para criar um teto mensal por categoria."
              />
            )}
            {rows.map((r) => {
              const [tone, txt] = STATUS_LABEL[r.status];
              const isEditing = editing?.id === r.id;
              return (
                <div className="row module-row" key={r.id} style={{ alignItems: 'flex-start' }}>
                  <CategoryBadge cat={r.category} size="md" />
                  <div className="grow">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b>{r.category}</b>
                      <span className={`badge ${tone}`}>{txt} · {hideValues ? '••%' : `${r.percent.toFixed(0)}%`}</span>
                    </div>
                    <small className="muted tiny num">{fmt(r.spent)} gastos de {fmt(r.limit)}</small>
                    <div className={`bar ${r.status}`}>
                      <span style={{ width: `${hideValues ? 0 : Math.min(100, r.percent)}%` }} />
                    </div>
                    {isEditing && (
                      <form className="inline-edit-form" onSubmit={(e) => saveEditLimit(e, r.id)}>
                        <div className="field">
                          <label htmlFor={`el-${r.id}`}>Novo limite mensal (R$)</label>
                          <input
                            id={`el-${r.id}`}
                            className="input"
                            inputMode="decimal"
                            value={editing.limit}
                            onChange={(e) => { setEditing({ ...editing, limit: e.target.value }); if (editErr) setEditErr(''); }}
                            autoFocus
                          />
                        </div>
                        {editErr && <p className="neg tiny" role="alert" style={{ marginBottom: 8 }}>{editErr}</p>}
                        <div className="wallet-rename-actions">
                          <button type="button" className="btn ghost sm" onClick={cancelEdit}>Cancelar</button>
                          <button type="submit" className="btn sm">Salvar</button>
                        </div>
                      </form>
                    )}
                  </div>
                  <div className="module-row-end actions-only">
                    <div className="wallet-card-actions">
                      <EditBtn
                        label={`Editar limite de ${r.category}`}
                        active={isEditing}
                        onClick={() => (isEditing ? cancelEdit() : startEditLimit(r))}
                      />
                      <Del
                        small
                        label={`Remover limite de ${r.category}`}
                        onClick={() => askDelete('limits', r.id, 'Remover limite', `Deseja remover o limite da categoria "${r.category}"?`, 'Limite removido.')}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <AddForm
            key={section}
            title="Novo teto de gasto"
            label="Definir limite"
            fields={[
              {
                key: 'category',
                label: 'Categoria',
                defaultValue: categoryOptions[0]?.value || 'Outros',
                options: categoryOptions,
                allowCustom: true,
                customPlaceholder: 'Ex.: Educação, Pets...',
              },
              { key: 'limit', label: 'Limite mensal (R$)', placeholder: '500,00', number: true, positive: true },
            ]}
            onAdd={async (o) => {
              await patch('limits', (l) => [...l, { id: uid(), ...o }]);
              toast('Limite definido.');
            }}
          />
        </div>
      </>
    );
  } else if (section === 'assinaturas') {
    const total = modules.subscriptions.reduce((s, x) => s + x.value, 0);

    const startEditSub = (s) => {
      setEditing({
        id: s.id,
        name: s.name || '',
        value: String(s.value ?? '').replace('.', ','),
        day: String(s.day ?? ''),
      });
      setEditErr('');
    };

    const saveEditSub = async (e, id) => {
      e.preventDefault();
      const name = editing?.name.trim();
      const value = parsePtBrNumber(editing?.value);
      const day = parsePtBrNumber(editing?.day);
      if (!name) return setEditErr('Informe o nome do serviço.');
      if (!(value > 0)) return setEditErr('Valor mensal deve ser maior que zero.');
      if (!Number.isInteger(day) || day < 1 || day > 31) return setEditErr('Dia da cobrança deve estar entre 1 e 31.');
      try {
        await patch('subscriptions', (l) => l.map((x) => (x.id === id ? { ...x, name, value, day } : x)));
        cancelEdit();
        toast('Assinatura atualizada.');
      } catch (ex) {
        setEditErr(ex?.message || 'Erro ao atualizar assinatura.');
      }
    };

    body = (
      <>
        <div className="grid2">
          <div className="card stat-card">
            <div className="stat-head"><span>Custo mensal</span></div>
            <strong className="num neg">{fmt(total)}</strong>
          </div>
          <div className="card stat-card">
            <div className="stat-head"><span>Impacto anual (12x)</span></div>
            <strong className="num">{fmt(total * 12)}</strong>
          </div>
        </div>

        <div className="bento-2">
          <section className="card">
            <h3>Serviços ativos ({modules.subscriptions.length})</h3>
            {modules.subscriptions.length === 0 && (
              <EmptyState
                compact
                icon="creditCard"
                title="Nenhuma assinatura cadastrada"
                description="Adicione seus serviços recorrentes para acompanhar o impacto mensal e anual."
              />
            )}
            {modules.subscriptions.map((s) => {
              const isEditing = editing?.id === s.id;
              return (
                <div className="row module-row" key={s.id} style={isEditing ? { alignItems: 'flex-start' } : undefined}>
                  <span className="ico" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                    <Icon name="creditCard" />
                  </span>
                  <div className="grow">
                    <b>{s.name}</b>
                    <div className="row-meta">
                      <span>Cobrança todo dia {s.day}</span>
                      {s.plan && <span className="meta-tag">{s.plan}</span>}
                    </div>
                    {isEditing && (
                      <form className="inline-edit-form" onSubmit={(e) => saveEditSub(e, s.id)}>
                        <div className="filters">
                          <div className="field">
                            <label htmlFor={`esn-${s.id}`}>Serviço</label>
                            <input
                              id={`esn-${s.id}`}
                              className="input"
                              value={editing.name}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              autoFocus
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`esv-${s.id}`}>Valor (R$)</label>
                            <input
                              id={`esv-${s.id}`}
                              className="input"
                              inputMode="decimal"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`esd-${s.id}`}>Dia da cobrança</label>
                            <input
                              id={`esd-${s.id}`}
                              className="input"
                              inputMode="numeric"
                              value={editing.day}
                              onChange={(e) => setEditing({ ...editing, day: e.target.value })}
                            />
                          </div>
                        </div>
                        {editErr && <p className="neg tiny" role="alert" style={{ marginBottom: 8 }}>{editErr}</p>}
                        <div className="wallet-rename-actions">
                          <button type="button" className="btn ghost sm" onClick={cancelEdit}>Cancelar</button>
                          <button type="submit" className="btn sm">Salvar</button>
                        </div>
                      </form>
                    )}
                  </div>
                  <div className="module-row-end">
                    <span className="amt num">{fmt(s.value)}</span>
                    <div className="wallet-card-actions">
                      <EditBtn
                        label={`Editar ${s.name}`}
                        active={isEditing}
                        onClick={() => (isEditing ? cancelEdit() : startEditSub(s))}
                      />
                      <Del
                        small
                        label={`Remover ${s.name}`}
                        onClick={() => askDelete('subscriptions', s.id, 'Remover assinatura', `Deseja remover a assinatura "${s.name}"?`, 'Assinatura removida.')}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <AddForm
            key={section}
            title="Cadastrar assinatura"
            fields={[
              { key: 'name', label: 'Serviço', placeholder: 'Ex.: Netflix, Spotify, Academia...' },
              { key: 'value', label: 'Valor mensal (R$)', placeholder: '39,90', number: true, positive: true },
              { key: 'day', label: 'Dia da cobrança', placeholder: '10', number: true, integer: true, min: 1, max: 31 },
            ]}
            onAdd={async (o) => {
              await patch('subscriptions', (l) => [...l, { id: uid(), plan: 'Recorrente', ...o }]);
              toast('Assinatura cadastrada.');
            }}
          />
        </div>
      </>
    );
  } else if (section === 'contas') {
    const paidSum = modules.bills.filter((b) => b.paid).reduce((s, b) => s + b.value, 0);
    const pendingSum = modules.bills.filter((b) => !b.paid).reduce((s, b) => s + b.value, 0);

    const startEditBill = (b) => {
      setEditing({
        id: b.id,
        name: b.name || '',
        value: String(b.value ?? '').replace('.', ','),
        day: String(b.day ?? ''),
      });
      setEditErr('');
    };

    const saveEditBill = async (e, id) => {
      e.preventDefault();
      const name = editing?.name.trim();
      const value = parsePtBrNumber(editing?.value);
      const day = parsePtBrNumber(editing?.day);
      if (!name) return setEditErr('Informe a descrição da conta.');
      if (!(value > 0)) return setEditErr('Valor deve ser maior que zero.');
      if (!Number.isInteger(day) || day < 1 || day > 31) return setEditErr('Dia do vencimento deve estar entre 1 e 31.');
      try {
        await patch('bills', (l) => l.map((x) => (x.id === id ? { ...x, name, value, day } : x)));
        cancelEdit();
        toast('Conta fixa atualizada.');
      } catch (ex) {
        setEditErr(ex?.message || 'Erro ao atualizar conta.');
      }
    };

    const toggleBill = async (b) => {
      const nextPaid = !b.paid;
      try {
        await patch('bills', (l) => l.map((x) => (x.id === b.id ? { ...x, paid: nextPaid } : x)));
        toast(nextPaid ? 'Conta marcada como paga.' : 'Conta marcada como pendente.', 'info');
      } catch (ex) {
        toast(ex?.message || 'Erro ao atualizar conta.', 'error');
      }
    };

    body = (
      <>
        <div className="grid2">
          <div className="card stat-card">
            <div className="stat-head"><span>A pagar neste mês</span></div>
            <strong className="num neg">{fmt(pendingSum)}</strong>
          </div>
          <div className="card stat-card">
            <div className="stat-head"><span>Já quitado</span></div>
            <strong className="num pos">{fmt(paidSum)}</strong>
          </div>
        </div>

        <div className="bento-2">
          <section className="card">
            <h3>Checklist de vencimentos</h3>
            {modules.bills.length === 0 && (
              <EmptyState
                compact
                icon="receipt"
                title="Nenhuma conta fixa cadastrada"
                description="Cadastre suas contas mensais para acompanhar o que falta pagar."
              />
            )}
            {modules.bills.map((b) => {
              const isEditing = editing?.id === b.id;
              return (
                <div className="row module-row module-row-check" key={b.id} style={isEditing ? { alignItems: 'flex-start' } : undefined}>
                  <button
                    type="button"
                    className={`check-btn ${b.paid ? 'checked' : ''}`}
                    role="checkbox"
                    aria-checked={b.paid}
                    aria-label={`Marcar ${b.name} como ${b.paid ? 'pendente' : 'paga'}`}
                    onClick={() => toggleBill(b)}
                  >
                    <Icon name="check" />
                  </button>
                  <div className="grow">
                    <b style={b.paid ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}>{b.name}</b>
                    <div className="row-meta">
                      <span>Vence dia {b.day}</span>
                      <span className={`badge ${b.paid ? 'good' : 'warn'}`}>{b.paid ? 'Paga' : 'Pendente'}</span>
                    </div>
                    {isEditing && (
                      <form className="inline-edit-form" onSubmit={(e) => saveEditBill(e, b.id)}>
                        <div className="filters">
                          <div className="field">
                            <label htmlFor={`ebn-${b.id}`}>Descrição</label>
                            <input
                              id={`ebn-${b.id}`}
                              className="input"
                              value={editing.name}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              autoFocus
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`ebv-${b.id}`}>Valor (R$)</label>
                            <input
                              id={`ebv-${b.id}`}
                              className="input"
                              inputMode="decimal"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`ebd-${b.id}`}>Dia do vencimento</label>
                            <input
                              id={`ebd-${b.id}`}
                              className="input"
                              inputMode="numeric"
                              value={editing.day}
                              onChange={(e) => setEditing({ ...editing, day: e.target.value })}
                            />
                          </div>
                        </div>
                        {editErr && <p className="neg tiny" role="alert" style={{ marginBottom: 8 }}>{editErr}</p>}
                        <div className="wallet-rename-actions">
                          <button type="button" className="btn ghost sm" onClick={cancelEdit}>Cancelar</button>
                          <button type="submit" className="btn sm">Salvar</button>
                        </div>
                      </form>
                    )}
                  </div>
                  <div className="module-row-end">
                    <span className="amt num">{fmt(b.value)}</span>
                    <div className="wallet-card-actions">
                      <EditBtn
                        label={`Editar ${b.name}`}
                        active={isEditing}
                        onClick={() => (isEditing ? cancelEdit() : startEditBill(b))}
                      />
                      <Del
                        small
                        label={`Remover ${b.name}`}
                        onClick={() => askDelete('bills', b.id, 'Remover conta fixa', `Deseja remover a conta "${b.name}"?`, 'Conta removida.')}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <AddForm
            key={section}
            title="Nova conta fixa"
            fields={[
              { key: 'name', label: 'Descrição', placeholder: 'Ex.: Aluguel, Condomínio, Luz...' },
              { key: 'value', label: 'Valor (R$)', placeholder: '250,00', number: true, positive: true },
              { key: 'day', label: 'Dia do vencimento', placeholder: '15', number: true, integer: true, min: 1, max: 31 },
            ]}
            onAdd={async (o) => {
              await patch('bills', (l) => [...l, { id: uid(), category: 'Despesa Fixa', paid: false, ...o }]);
              toast('Conta fixa adicionada.');
            }}
          />
        </div>
      </>
    );
  } else if (section === 'estoque') {
    const low = new Set(listStockAlerts(modules).map((i) => i.id));
    const qty = async (id, d) => {
      try {
        await patch('stockItems', (l) => l.map((x) => (x.id === id ? { ...x, qty: Math.max(0, x.qty + d) } : x)));
      } catch (ex) {
        toast(ex?.message || 'Erro ao atualizar estoque.', 'error');
      }
    };
    body = (
      <div className="bento-2">
        <section className="card">
          <div className="card-head">
            <h3>Itens monitorados</h3>
            {low.size > 0 ? (
              <span className="badge warn">{low.size} para repor</span>
            ) : (
              <span className="badge good">Tudo em dia</span>
            )}
          </div>
          {modules.stockItems.length === 0 && (
            <EmptyState
              compact
              icon="box"
              title="Despensa vazia"
              description="Adicione itens para controlar quantidades e alertas de reposição."
            />
          )}
          {modules.stockItems.map((i) => (
            <div className="row module-row" key={i.id}>
              <span className="ico"><Icon name="box" /></span>
              <div className="grow">
                <b>{i.name}</b>
                <div className="row-meta">
                  <span>Mínimo ideal: {i.min}</span>
                  {low.has(i.id) && <span className="badge bad">Repor estoque</span>}
                </div>
              </div>
              <div className="module-row-end">
                <div className="stepper">
                  <button type="button" onClick={() => qty(i.id, -1)} aria-label={`Diminuir ${i.name}`}>−</button>
                  <b className={`num ${low.has(i.id) ? 'neg' : ''}`}>{i.qty}</b>
                  <button type="button" onClick={() => qty(i.id, 1)} aria-label={`Aumentar ${i.name}`}>+</button>
                </div>
                <Del
                  label={`Remover ${i.name}`}
                  onClick={() => askDelete('stockItems', i.id, 'Remover item', `Deseja remover "${i.name}" do estoque?`, 'Item removido do estoque.')}
                />
              </div>
            </div>
          ))}
        </section>

        <AddForm
          key={section}
          title="Adicionar item ao estoque"
          fields={[
            { key: 'name', label: 'Produto / Item', placeholder: 'Ex.: Café, Azeite, Sabão...' },
            { key: 'qty', label: 'Quantidade atual', placeholder: '2', number: true, min: 0 },
            { key: 'min', label: 'Quantidade mínima', placeholder: '1', number: true, min: 0 },
          ]}
          onAdd={async (o) => {
            await patch('stockItems', (l) => [...l, { id: uid(), ...o }]);
            toast('Item adicionado ao estoque.');
          }}
        />
      </div>
    );
  } else if (section === 'categorias') {
    const setIcon = async (id, icon) => {
      try {
        await patch('categories', (l) => l.map((x) => (x.id === id ? { ...x, icon } : x)));
      } catch (ex) {
        toast(ex?.message || 'Erro ao atualizar ícone.', 'error');
      }
    };
    body = (
      <div className="bento-2">
        <section className="card">
          <h3>Categorias ativas ({modules.categories.length})</h3>
          {modules.categories.length === 0 && (
            <EmptyState
              compact
              icon="tag"
              title="Nenhuma categoria cadastrada"
              description="Crie categorias personalizadas para classificar seus gastos e receitas."
            />
          )}
          {modules.categories.map((c) => (
            <div className="row module-row" key={c.id}>
              <CategoryBadge cat={c.name} type={c.type} icon={c.icon} size="md" />
              <div className="grow">
                <b>{c.name}</b>
                <small className="muted tiny">{c.type === 'income' ? 'Receita' : 'Despesa'}</small>
              </div>
              <div className="module-row-end">
                <select
                  className="cat-ico-select"
                  aria-label={`Ícone de ${c.name}`}
                  value={c.icon || ''}
                  onChange={(e) => setIcon(c.id, e.target.value)}
                >
                  {CATEGORY_ICON_CHOICES.map((ch) => (
                    <option key={ch.key || 'auto'} value={ch.key}>{ch.label}</option>
                  ))}
                </select>
                <Del
                  label={`Remover ${c.name}`}
                  onClick={() => askDelete('categories', c.id, 'Remover categoria', `Deseja remover a categoria "${c.name}"?`, 'Categoria removida.')}
                />
              </div>
            </div>
          ))}
        </section>

        <AddForm
          key={section}
          title="Nova categoria"
          fields={[
            { key: 'name', label: 'Nome da categoria', placeholder: 'Ex.: Educação, Pets, Investimentos...' },
            {
              key: 'type',
              label: 'Tipo de lançamento',
              defaultValue: 'expense',
              options: [
                { value: 'expense', label: 'Despesa' },
                { value: 'income', label: 'Receita' },
              ],
            },
            {
              key: 'icon',
              label: 'Ícone',
              defaultValue: '',
              optional: true,
              options: CATEGORY_ICON_CHOICES.map((ch) => ({ value: ch.key, label: ch.label })),
            },
          ]}
          onAdd={async (o) => {
            if (modules.categories.some((c) => c.name.toLowerCase() === o.name.toLowerCase())) {
              return 'Já existe uma categoria com esse nome.';
            }
            await patch('categories', (l) => [...l, { id: uid(), ...o }]);
            toast('Categoria criada.');
            return null;
          }}
        />
      </div>
    );
  } else {
    return (
      <>
        <Link to="/mais" className="back"><Icon name="left" size={16} /> Voltar aos módulos</Link>
        <EmptyState
          icon="more"
          title="Seção não encontrada"
          description="Volte à central de módulos para acessar todas as ferramentas."
          actionLabel="Ir para Módulos"
          actionTo="/mais"
        />
      </>
    );
  }

  return (
    <>
      <Link to="/mais" className="back back-mobile"><Icon name="left" size={16} /> Voltar aos módulos</Link>
      {body}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title || 'Confirmar exclusão'}
        message={pendingDelete?.message || ''}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete.key, pendingDelete.id, pendingDelete.feedback);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
