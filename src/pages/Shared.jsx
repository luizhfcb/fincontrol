import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { totals } from '../core/analytics.js';

export default function Shared() {
  const {
    isFirebase, user, group, visibleWallets, updateGroup, createInviteCode, joinByInviteCode,
    allTransactions, month, year, fmt,
  } = useApp();
  const wallets = visibleWallets?.length ? visibleWallets : group.wallets;
  const [invite, setInvite] = useState({ name: '', email: '', walletId: wallets.find((w) => w.shared)?.id || wallets[0].id });
  const [codeWallet, setCodeWallet] = useState(wallets.find((w) => w.shared)?.id || wallets[0].id);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState({ type: '', text: '' });
  const [walletName, setWalletName] = useState('');
  const [err, setErr] = useState('');

  const myUid = user?.uid || 'u1';
  const monthTxs = allTransactions.filter((t) => t.month === month && t.year === year);
  const nameOf = (id) => group.members.find((m) => m.id === id)?.name || 'Membro';

  const handleGenerateCode = async () => {
    setErr('');
    try {
      const code = await createInviteCode(codeWallet);
      setGeneratedCode(code);
      setCopied(false);
    } catch (e) {
      setErr(e?.message || 'Erro ao gerar código.');
    }
  };

  const copyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinMsg({ type: '', text: '' });
    try {
      await joinByInviteCode(joinCode);
      setJoinCode('');
      setJoinMsg({ type: 'ok', text: isFirebase ? 'Você entrou no grupo familiar!' : 'Código validado (modo demonstração).' });
    } catch (ex) {
      setJoinMsg({ type: 'err', text: ex?.message || 'Não foi possível entrar no grupo.' });
    }
  };

  const addMember = (e) => {
    e.preventDefault();
    if (!invite.name.trim() || !/^\S+@\S+\.\S+$/.test(invite.email)) return setErr('Informe nome e um e-mail válido.');
    if (group.members.some((m) => m.email.toLowerCase() === invite.email.toLowerCase())) return setErr('Essa pessoa já está no grupo.');
    setErr('');
    const id = `u${Date.now()}`;
    updateGroup({
      ...group,
      members: [...group.members, { id, name: invite.name.trim(), email: invite.email.trim() }],
      wallets: group.wallets.map((w) => (w.id === invite.walletId ? { ...w, shared: true, memberIds: [...w.memberIds, id] } : w)),
    });
    setInvite({ ...invite, name: '', email: '' });
  };

  const addWallet = (e) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    updateGroup({
      ...group,
      wallets: [...group.wallets, { id: `w${Date.now()}`, name: walletName.trim(), shared: false, memberIds: [myUid] }],
    });
    setWalletName('');
  };

  const removeFromWallet = (wallet, memberId) => {
    if (wallet.memberIds.length <= 1) return;
    updateGroup({
      ...group,
      wallets: group.wallets.map((w) => (w.id === wallet.id ? { ...w, memberIds: w.memberIds.filter((m) => m !== memberId) } : w)),
    });
  };

  return (
    <>
      <div className="page-toolbar">
        <Link to="/mais" className="back" style={{ margin: 0 }}><Icon name="left" size={16} /> Voltar aos módulos</Link>
        <MonthBar />
      </div>

      <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="ico" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--border2)' }}>
            <Icon name="users" />
          </span>
          <div>
            <h3 style={{ marginBottom: 2 }}>Grupo {group.name}</h3>
            <small className="muted">{group.members.length} {group.members.length === 1 ? 'participante' : 'participantes'} · {group.wallets.length} {group.wallets.length === 1 ? 'carteira' : 'carteiras'}</small>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {group.members.map((m) => (
            <div key={m.id} className="avatar" title={`${m.name}${m.email ? ` (${m.email})` : ''}`} style={{ width: 36, height: 36, fontSize: 12 }}>
              {m.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      </section>

      <div className="cards-grid">
        {wallets.map((w) => {
          const txs = monthTxs.filter((t) => t.walletId === w.id);
          const t = totals(txs);
          return (
            <section className="card" key={w.id}>
              <div className="card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="ico" style={{ width: 38, height: 38 }}>
                    <Icon name={w.shared ? 'users' : 'wallet'} size={18} />
                  </span>
                  <div>
                    <h3 style={{ marginBottom: 0 }}>{w.name}</h3>
                    <small className="muted tiny">{w.memberIds.length} {w.memberIds.length === 1 ? 'membro' : 'membros'}</small>
                  </div>
                </div>
                <span className={`badge ${w.shared ? 'good' : 'neutral'}`}>
                  {w.shared ? 'Compartilhada' : 'Individual'}
                </span>
              </div>

              <div className="grid2" style={{ marginTop: 10, marginBottom: w.shared ? 14 : 0 }}>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--card2)' }}>
                  <small className="muted tiny">Receitas</small>
                  <div className="num pos" style={{ fontWeight: 700 }}>{fmt(t.income)}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--card2)' }}>
                  <small className="muted tiny">Despesas</small>
                  <div className="num neg" style={{ fontWeight: 700 }}>{fmt(t.expense)}</div>
                </div>
              </div>

              {w.shared && (
                <div style={{ paddingTop: 6 }}>
                  <small className="muted tiny" style={{ fontWeight: 600 }}>DIVISÃO DE SAÍDAS NO MÊS</small>
                  {w.memberIds.map((mid) => {
                    const spent = txs.filter((x) => x.uid === mid && x.type === 'expense').reduce((s, x) => s + x.val, 0);
                    const pct = t.expense > 0 ? (spent / t.expense) * 100 : 0;
                    return (
                      <div className="row" key={mid}>
                        <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {nameOf(mid).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="grow">
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <b>{nameOf(mid)}</b>
                            <span className="amt num">{fmt(spent)}</span>
                          </div>
                          <div className="bar" style={{ height: 6, marginTop: 6 }}>
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        {w.memberIds.length > 1 && mid !== myUid && (
                          <button
                            className="icon-btn danger"
                            aria-label={`Remover ${nameOf(mid)} de ${w.name}`}
                            onClick={() => removeFromWallet(w, mid)}
                          >
                            <Icon name="close" size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Convite por código (Modo Família)</h3>
          <p className="muted tiny" style={{ marginBottom: 14 }}>
            Gere um código curto e envie pelo WhatsApp para outra pessoa entrar na carteira com a conta Google dela.
          </p>
          <div className="field">
            <label htmlFor="cw">Carteira para compartilhar</label>
            <select id="cw" className="input" value={codeWallet} onChange={(e) => setCodeWallet(e.target.value)}>
              {group.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn" onClick={handleGenerateCode}>
            <Icon name="users" size={17} /> Gerar código de convite
          </button>

          {generatedCode && (
            <div className="invite-code-box">
              <strong className="num">{generatedCode}</strong>
              <button type="button" className="btn ghost sm" onClick={copyCode}>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}

          <form onSubmit={handleJoin} style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className="field">
              <label htmlFor="jc">Recebeu um código? Entrar em um grupo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="jc"
                  className="input"
                  placeholder="Ex.: FAM-7K3M"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button type="submit" className="btn sm">Entrar</button>
              </div>
            </div>
            {joinMsg.text && (
              <p className={`tiny ${joinMsg.type === 'err' ? 'neg' : 'pos'}`} role="alert">{joinMsg.text}</p>
            )}
          </form>
        </section>

        <div className="stack">
          <form className="card" onSubmit={addWallet}>
            <h3>Nova carteira</h3>
            <p className="muted tiny" style={{ marginBottom: 12 }}>
              Crie carteiras separadas para viagens, projetos, empresa ou despesas da casa.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Ex.: Viagem, Reserva..."
                aria-label="Nome da carteira"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
              />
              <button className="btn sm" type="submit">Criar</button>
            </div>
          </form>

          {!isFirebase && (
            <form className="card" onSubmit={addMember}>
              <h3>Simular participante (Demo)</h3>
              <div className="filters">
                <div className="field">
                  <label htmlFor="in">Nome</label>
                  <input id="in" className="input" placeholder="Ex.: Maria" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="ie">E-mail</label>
                  <input id="ie" type="email" className="input" placeholder="maria@exemplo.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="iw">Carteira</label>
                <select id="iw" className="input" value={invite.walletId} onChange={(e) => setInvite({ ...invite, walletId: e.target.value })}>
                  {group.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {err && <p className="neg tiny" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
              <button className="btn ghost" type="submit">Adicionar ao grupo demo</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
