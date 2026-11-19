import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CategoryBadge, { CATEGORY_ICON_CHOICES } from '../components/CategoryIcon.jsx';
import Icon from '../components/Icon.jsx';
import { useApp } from '../context/AppContext.jsx';
import { buildLimitProgress } from '../core/analytics.js';
import { listStockAlerts } from '../core/stock-alerts.mjs';

const uid = () => String(Date.now() + Math.random());

function AddForm({ title, fields, onAdd, label = 'Adicionar' }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? '']));
  const [v, setV] = useState(blank);
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      const raw = String(v[f.key] ?? '').trim();
      if (!raw && !f.optional) return setErr(`Preencha ${f.label.toLowerCase()}.`);
      out[f.key] = f.number ? Number(raw.replace(',', '.')) : raw;
      if (f.number && !(out[f.key] >= 0)) return setErr(`${f.label} inválido.`);
    }
    setErr('');
    setV(blank);
    onAdd(out);
  };
  return (
    <form className="card" onSubmit={submit}>
      {title && <h3>{title}</h3>}
      <div className="filters">
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`f-${f.key}`}>{f.label}</label>
            {f.options ? (
              <select
                id={`f-${f.key}`}
                className="input"
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              >
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={`f-${f.key}`}
                className="input"
                placeholder={f.placeholder}
                inputMode={f.number ? 'decimal' : 'text'}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      {err && <p className="neg tiny" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
      <button className="btn" type="submit"><Icon name="plus" size={17} /> {label}</button>
    </form>
  );
}

function Del({ onClick, label }) {
  return (
    <button className="icon-btn danger" onClick={onClick} aria-label={label} title={label}>
      <Icon name="trash" size={17} />
    </button>
  );
}

export default function Modules() {
  const { section } = useParams();
  const { modules, updateModules, monthlyTransactions, fmt } = useApp();
  const patch = (key, fn) => updateModules({ ...modules, [key]: fn(modules[key]) });
  const remove = (key, id) => patch(key, (l) => l.filter((x) => x.id !== id));

  let title;
  let body;

  if (section === 'limites') {
    title = 'Limites por categoria';
    const rows = buildLimitProgress(modules.limits, monthlyTransactions);
    const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
    const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
    const STATUS_LABEL = { ok: ['good', 'Dentro do limite'], warn: ['warn', 'Atenção'], over: ['bad', 'Excedido'] };

    body = (
      <>
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
            {rows.length === 0 && <p className="empty">Defina um limite para acompanhar seus gastos.</p>}
            {rows.map((r) => {
              const [tone, txt] = STATUS_LABEL[r.status];
              return (
                <div className="row" key={r.id} style={{ alignItems: 'flex-start' }}>
                  <CategoryBadge cat={r.category} size="md" />
                  <div className="grow">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <b>{r.category}</b>
                      <span className={`badge ${tone}`}>{txt} · {r.percent.toFixed(0)}%</span>
                    </div>
                    <small className="muted tiny num">{fmt(r.spent)} gastos de {fmt(r.limit)}</small>
                    <div className={`bar ${r.status}`}>
                      <span style={{ width: `${Math.min(100, r.percent)}%` }} />
                    </div>
                  </div>
                  <Del label={`Remover limite de ${r.category}`} onClick={() => remove('limits', r.id)} />
                </div>
              );
            })}
          </section>

          <AddForm
            title="Novo teto de gasto"
            label="Definir limite"
            fields={[
              { key: 'category', label: 'Categoria', placeholder: 'Ex.: Alimentação, Lazer...' },
              { key: 'limit', label: 'Limite mensal (R$)', placeholder: '500,00', number: true },
            ]}
            onAdd={(o) => patch('limits', (l) => [...l, { id: uid(), ...o }])}
          />
        </div>
      </>
    );
  } else if (section === 'assinaturas') {
    title = 'Assinaturas recorrentes';
    const total = modules.subscriptions.reduce((s, x) => s + x.value, 0);
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
            {modules.subscriptions.length === 0 && <p className="empty">Nenhuma assinatura cadastrada.</p>}
            {modules.subscriptions.map((s) => (
              <div className="row" key={s.id}>
                <span className="ico" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                  <Icon name="creditCard" />
                </span>
                <div className="grow">
                  <b>{s.name}</b>
                  <div className="row-meta">
                    <span>Cobrança todo dia {s.day}</span>
                    {s.plan && <span className="meta-tag">{s.plan}</span>}
                  </div>
                </div>
                <span className="amt num">{fmt(s.value)}</span>
                <Del label={`Remover ${s.name}`} onClick={() => remove('subscriptions', s.id)} />
              </div>
            ))}
          </section>

          <AddForm
            title="Cadastrar assinatura"
            fields={[
              { key: 'name', label: 'Serviço', placeholder: 'Ex.: Netflix, Spotify, Academia...' },
              { key: 'value', label: 'Valor mensal (R$)', placeholder: '39,90', number: true },
              { key: 'day', label: 'Dia da cobrança', placeholder: '10', number: true },
            ]}
            onAdd={(o) => patch('subscriptions', (l) => [...l, { id: uid(), plan: 'Recorrente', ...o }])}
          />
        </div>
      </>
    );
  } else if (section === 'contas') {
    title = 'Contas fixas';
    const paidSum = modules.bills.filter((b) => b.paid).reduce((s, b) => s + b.value, 0);
    const pendingSum = modules.bills.filter((b) => !b.paid).reduce((s, b) => s + b.value, 0);

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
            {modules.bills.length === 0 && <p className="empty">Nenhuma conta fixa cadastrada.</p>}
            {modules.bills.map((b) => (
              <div className="row" key={b.id}>
                <button
                  type="button"
                  className={`check-btn ${b.paid ? 'checked' : ''}`}
                  role="checkbox"
                  aria-checked={b.paid}
                  aria-label={`Marcar ${b.name} como ${b.paid ? 'pendente' : 'paga'}`}
                  onClick={() => patch('bills', (l) => l.map((x) => (x.id === b.id ? { ...x, paid: !x.paid } : x)))}
                >
                  <Icon name="check" />
                </button>
                <div className="grow">
                  <b style={b.paid ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}>{b.name}</b>
                  <div className="row-meta">
                    <span>Vence dia {b.day}</span>
                    <span className={`badge ${b.paid ? 'good' : 'warn'}`}>{b.paid ? 'Paga' : 'Pendente'}</span>
                  </div>
                </div>
                <span className="amt num">{fmt(b.value)}</span>
                <Del label={`Remover ${b.name}`} onClick={() => remove('bills', b.id)} />
              </div>
            ))}
          </section>

          <AddForm
            title="Nova conta fixa"
            fields={[
              { key: 'name', label: 'Descrição', placeholder: 'Ex.: Aluguel, Condomínio, Luz...' },
              { key: 'value', label: 'Valor (R$)', placeholder: '250,00', number: true },
              { key: 'day', label: 'Dia do vencimento', placeholder: '15', number: true },
            ]}
            onAdd={(o) => patch('bills', (l) => [...l, { id: uid(), category: 'Despesa Fixa', paid: false, ...o }])}
          />
        </div>
      </>
    );
  } else if (section === 'estoque') {
    title = 'Estoque doméstico';
    const low = new Set(listStockAlerts(modules).map((i) => i.id));
    const qty = (id, d) => patch('stockItems', (l) => l.map((x) => (x.id === id ? { ...x, qty: Math.max(0, x.qty + d) } : x)));
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
          {modules.stockItems.length === 0 && <p className="empty">Adicione itens para controlar a despensa.</p>}
          {modules.stockItems.map((i) => (
            <div className="row" key={i.id}>
              <span className="ico"><Icon name="box" /></span>
              <div className="grow">
                <b>{i.name}</b>
                <div className="row-meta">
                  <span>Mínimo ideal: {i.min}</span>
                  {low.has(i.id) && <span className="badge bad">Repor estoque</span>}
                </div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => qty(i.id, -1)} aria-label={`Diminuir ${i.name}`}>−</button>
                <b className={`num ${low.has(i.id) ? 'neg' : ''}`}>{i.qty}</b>
                <button type="button" onClick={() => qty(i.id, 1)} aria-label={`Aumentar ${i.name}`}>+</button>
              </div>
              <Del label={`Remover ${i.name}`} onClick={() => remove('stockItems', i.id)} />
            </div>
          ))}
        </section>

        <AddForm
          title="Adicionar item ao estoque"
          fields={[
            { key: 'name', label: 'Produto / Item', placeholder: 'Ex.: Café, Azeite, Sabão...' },
            { key: 'qty', label: 'Quantidade atual', placeholder: '2', number: true },
            { key: 'min', label: 'Quantidade mínima', placeholder: '1', number: true },
          ]}
          onAdd={(o) => patch('stockItems', (l) => [...l, { id: uid(), ...o }])}
        />
      </div>
    );
  } else if (section === 'categorias') {
    title = 'Categorias personalizadas';
    const setIcon = (id, icon) => patch('categories', (l) => l.map((x) => (x.id === id ? { ...x, icon } : x)));
    body = (
      <div className="bento-2">
        <section className="card">
          <h3>Categorias ativas ({modules.categories.length})</h3>
          {modules.categories.map((c) => (
            <div className="row" key={c.id}>
              <CategoryBadge cat={c.name} type={c.type} icon={c.icon} size="md" />
              <div className="grow">
                <b>{c.name}</b>
                <small className="muted tiny">{c.type === 'income' ? 'Receita' : 'Despesa'}</small>
              </div>
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
              <Del label={`Remover ${c.name}`} onClick={() => remove('categories', c.id)} />
            </div>
          ))}
        </section>

        <AddForm
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
          onAdd={(o) => {
            if (modules.categories.some((c) => c.name.toLowerCase() === o.name.toLowerCase())) return;
            patch('categories', (l) => [...l, { id: uid(), ...o }]);
          }}
        />
      </div>
    );
  } else {
    return <p className="empty">Seção não encontrada.</p>;
  }

  return (
    <>
      <Link to="/mais" className="back"><Icon name="left" size={16} /> Voltar aos módulos</Link>
      <div className="section-title" style={{ marginTop: 4 }}>{title}</div>
      {body}
    </>
  );
}
