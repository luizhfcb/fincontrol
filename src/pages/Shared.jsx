import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { totals } from '../core/analytics.js';
import { PERSONAL_WALLET_ID, deleteWallet, renameWallet } from '../core/family.js';

export default function Shared() {
  const {
    isFirebase, user, group, visibleWallets, updateGroup, createInviteCode, joinByInviteCode,
    allTransactions, month, year, fmt, walletId, setWalletId,
  } = useApp();
  const allWallets = group?.wallets || [];
  const wallets = visibleWallets?.length ? visibleWallets : allWallets;
  const shareableWallets = wallets.filter((w) => w.id !== PERSONAL_WALLET_ID);
  const defaultWalletId = shareableWallets.find((w) => w.shared)?.id || shareableWallets[0]?.id || '';

  const [walletsOpen, setWalletsOpen] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', walletId: defaultWalletId });
  const [codeWallet, setCodeWallet] = useState(defaultWalletId);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState({ type: '', text: '' });
  const [walletName, setWalletName] = useState('');
  const [err, setErr] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editErr, setEditErr] = useState('');
  const [confirmDeleteWallet, setConfirmDeleteWallet] = useState(null);

  const selectedCodeWallet = shareableWallets.some((w) => w.id === codeWallet)
    ? codeWallet
    : (shareableWallets.find((w) => w.shared)?.id || shareableWallets[0]?.id || '');
  const selectedInviteWallet = shareableWallets.some((w) => w.id === invite.walletId)
    ? invite.walletId
    : (shareableWallets.find((w) => w.shared)?.id || shareableWallets[0]?.id || '');

  const myUid = user?.uid || 'u1';
  const monthTxs = allTransactions.filter((t) => t.month === month && t.year === year);
  const nameOf = (id) => (group?.members || []).find((m) => m.id === id)?.name || 'Membro';

  const handleGenerateCode = async () => {
    setCodeErr('');
    if (!selectedCodeWallet) {
      setCodeErr('Crie uma carteira acima (ex.: Viagem ou Casa) para compartilhar.');
      return;
    }
    try {
      const code = await createInviteCode(selectedCodeWallet);
      setGeneratedCode(code);
      setCopied(false);
    } catch (e) {
      setCodeErr(e?.message || 'Erro ao gerar código.');
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
      setWalletsOpen(true);
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
      wallets: allWallets.map((w) => (w.id === selectedInviteWallet ? { ...w, shared: true, memberIds: [...w.memberIds, id] } : w)),
    });
    setInvite({ ...invite, name: '', email: '' });
    setWalletsOpen(true);
  };

  const addWallet = (e) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    const newId = `w${Date.now()}`;
    updateGroup({
      ...group,
      wallets: [...allWallets, { id: newId, name: walletName.trim(), shared: false, memberIds: [myUid] }],
    });
    setCodeWallet(newId);
    setWalletName('');
    setWalletsOpen(true);
  };

  const removeFromWallet = (wallet, memberId) => {
    if (wallet.memberIds.length <= 1) return;
    updateGroup({
      ...group,
      wallets: allWallets.map((w) => (w.id === wallet.id ? { ...w, memberIds: w.memberIds.filter((m) => m !== memberId) } : w)),
    });
  };

  const startEditWallet = (w) => {
    setEditingWalletId(w.id);
    setEditingName(w.name);
    setEditErr('');
  };

  const cancelEditWallet = () => {
    setEditingWalletId(null);
    setEditingName('');
    setEditErr('');
  };

  const saveEditWallet = async (e, wId) => {
    e.preventDefault();
    const res = renameWallet(group, wId, editingName);
    if (!res.ok) {
      setEditErr(res.error);
      return;
    }
    await updateGroup(res.group);
    cancelEditWallet();
  };

  const handleDeleteWallet = async (w) => {
    const res = deleteWallet(group, w.id);
    if (!res.ok) return;
    await updateGroup(res.group);
    if (walletId === w.id) setWalletId('all');
    if (editingWalletId === w.id) cancelEditWallet();
  };

  return (
    <>
      <div className="page-toolbar">
        <Link to="/mais" className="back" style={{ margin: 0 }}><Icon name="left" size={16} /> Voltar aos módulos</Link>
        <MonthBar />
      </div>

      {/* 1º bloco: Criar carteira + Convite por código */}
      <div className="grid-2">
        <div className="stack">
          <form className="card" onSubmit={addWallet}>
            <h3>Nova carteira</h3>
            <p className="muted tiny" style={{ marginBottom: 12 }}>
              Crie carteiras separadas para viagens, projetos, empresa ou despesas da casa.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Ex.: Viagem, Casa, Reserva..."
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
                <select
                  id="iw"
                  className="input"
                  value={selectedInviteWallet}
                  onChange={(e) => setInvite({ ...invite, walletId: e.target.value })}
                  disabled={shareableWallets.length === 0}
                >
                  {shareableWallets.length === 0 ? (
                    <option value="">Crie uma carteira primeiro</option>
                  ) : (
                    shareableWallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)
                  )}
                </select>
              </div>
              {err && <p className="neg tiny" role="alert" style={{ marginBottom: 10 }}>{err}</p>}
              <button className="btn ghost" type="submit" disabled={shareableWallets.length === 0}>Adicionar ao grupo demo</button>
            </form>
          )}
        </div>

        <section className="card">
          <h3>Convite por código (Modo Família)</h3>
          <p className="muted tiny" style={{ marginBottom: 14 }}>
            Gere um código curto e envie pelo WhatsApp para outra pessoa entrar na carteira com a conta Google dela.
          </p>
          <div className="field">
            <label htmlFor="cw">Carteira para compartilhar</label>
            <select
              id="cw"
              className="input"
              value={selectedCodeWallet}
              onChange={(e) => setCodeWallet(e.target.value)}
              disabled={shareableWallets.length === 0}
            >
              {shareableWallets.length === 0 ? (
                <option value="">Crie uma carteira (ex.: Viagem ou Casa) primeiro</option>
              ) : (
                shareableWallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)
              )}
            </select>
          </div>
          <button type="button" className="btn" onClick={handleGenerateCode} disabled={shareableWallets.length === 0}>
            <Icon name="users" size={17} /> Gerar código de convite
          </button>
          {codeErr && <p className="neg tiny" role="alert" style={{ marginTop: 8 }}>{codeErr}</p>}

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
      </div>

      {/* 2º bloco: Menu dropdown "Minhas carteiras" */}
      <section className={`card wallets-accordion ${walletsOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="wallets-toggle"
          aria-expanded={walletsOpen}
          aria-controls="myWalletsList"
          onClick={() => setWalletsOpen((o) => !o)}
        >
          <span className="ico" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--border2)' }}>
            <Icon name="wallet" />
          </span>
          <div className="wt-copy">
            <h3>Minhas carteiras</h3>
            <small className="muted">
              {wallets.length} {wallets.length === 1 ? 'carteira' : 'carteiras'} · {group.members.length} {group.members.length === 1 ? 'participante' : 'participantes'}
            </small>
          </div>
          <div className="wt-right">
            <div className="wt-avatars" aria-hidden="true">
              {group.members.slice(0, 4).map((m) => (
                <span key={m.id} className="avatar" title={`${m.name}${m.email ? ` (${m.email})` : ''}`}>
                  {m.name.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
            <span className={`wt-chev ${walletsOpen ? 'open' : ''}`} aria-hidden="true">
              <Icon name="right" size={18} />
            </span>
          </div>
        </button>

        {walletsOpen && (
          <div id="myWalletsList" className="wallets-panel">
            <div className="cards-grid" style={{ marginBottom: 0 }}>
              {wallets.map((w) => {
                const txs = monthTxs.filter((t) => t.walletId === w.id);
                const t = totals(txs);
                const isCustom = w.id !== PERSONAL_WALLET_ID;
                const isEditing = editingWalletId === w.id;
                return (
                  <article className="wallet-subcard" key={w.id}>
                    <div className="wallet-sub-head">
                      <span className="ico" style={{ width: 38, height: 38 }}>
                        <Icon name={w.shared ? 'users' : 'wallet'} size={18} />
                      </span>
                      <div className="wallet-sub-title">
                        <h4>{w.name}</h4>
                      </div>
                      {isCustom && (
                        <div className="wallet-card-actions">
                          <button
                            type="button"
                            className="icon-btn sm-btn"
                            aria-label={`Renomear carteira ${w.name}`}
                            title="Renomear carteira"
                            onClick={() => (isEditing ? cancelEditWallet() : startEditWallet(w))}
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn sm-btn danger"
                            aria-label={`Excluir carteira ${w.name}`}
                            title="Excluir carteira"
                            onClick={() => setConfirmDeleteWallet(w)}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="wallet-sub-meta">
                      <span className={`badge ${w.shared ? 'good' : 'neutral'}`}>
                        {w.shared ? 'Compartilhada' : 'Individual'}
                      </span>
                      <span className="muted tiny">
                        · {w.memberIds.length} {w.memberIds.length === 1 ? 'membro' : 'membros'}
                      </span>
                    </div>

                    {isEditing && (
                      <form className="wallet-rename-form" onSubmit={(e) => saveEditWallet(e, w.id)}>
                        <input
                          className="input"
                          maxLength={40}
                          placeholder="Nome da carteira"
                          aria-label={`Novo nome para ${w.name}`}
                          value={editingName}
                          onChange={(e) => { setEditingName(e.target.value); if (editErr) setEditErr(''); }}
                          onKeyDown={(e) => { if (e.key === 'Escape') cancelEditWallet(); }}
                          autoFocus
                        />
                        {editErr && <p className="neg tiny" role="alert" style={{ marginTop: 6 }}>{editErr}</p>}
                        <div className="wallet-rename-actions">
                          <button type="button" className="btn ghost sm" onClick={cancelEditWallet}>Cancelar</button>
                          <button type="submit" className="btn sm">Salvar</button>
                        </div>
                      </form>
                    )}

                    <div className="grid2" style={{ marginTop: 12, marginBottom: w.shared ? 14 : 0 }}>
                      <div className="wallet-metric-box">
                        <small className="muted tiny">Receitas</small>
                        <div className="num pos" style={{ fontWeight: 700 }}>{fmt(t.income)}</div>
                      </div>
                      <div className="wallet-metric-box">
                        <small className="muted tiny">Despesas</small>
                        <div className="num neg" style={{ fontWeight: 700 }}>{fmt(t.expense)}</div>
                      </div>
                    </div>

                    {w.shared && (
                      <div style={{ paddingTop: 4 }}>
                        <small className="muted tiny" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>DIVISÃO DE SAÍDAS NO MÊS</small>
                        {w.memberIds.map((mid) => {
                          const spent = txs.filter((x) => x.uid === mid && x.type === 'expense').reduce((s, x) => s + x.val, 0);
                          const pct = t.expense > 0 ? (spent / t.expense) * 100 : 0;
                          const canRemove = w.memberIds.length > 1 && mid !== myUid;
                          return (
                            <div className="wallet-member-row" key={mid}>
                              <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                                {nameOf(mid).slice(0, 1).toUpperCase()}
                              </div>
                              <div className="grow">
                                <div className="wm-top">
                                  <b>{nameOf(mid)}</b>
                                  <span className="amt num">{fmt(spent)}</span>
                                </div>
                                <div className="wm-sub">
                                  <span className="muted tiny num">{pct.toFixed(0)}% das saídas</span>
                                  {canRemove && (
                                    <>
                                      <span className="muted tiny" aria-hidden="true">·</span>
                                      <button
                                        type="button"
                                        className="member-remove-link"
                                        aria-label={`Remover ${nameOf(mid)} de ${w.name}`}
                                        onClick={() => setConfirmRemove({ wallet: w, memberId: mid, memberName: nameOf(mid) })}
                                      >
                                        Remover
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="bar" style={{ height: 6, marginTop: 6 }}>
                                  <span style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title="Remover participante"
        message={confirmRemove ? `Deseja remover ${confirmRemove.memberName} da carteira "${confirmRemove.wallet.name}"?` : ''}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => {
          if (confirmRemove) removeFromWallet(confirmRemove.wallet, confirmRemove.memberId);
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteWallet)}
        title="Excluir carteira"
        message={confirmDeleteWallet
          ? `Deseja excluir a carteira "${confirmDeleteWallet.name}"? Os lançamentos já registrados continuam salvos em "Todas as carteiras".`
          : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => {
          if (confirmDeleteWallet) handleDeleteWallet(confirmDeleteWallet);
          setConfirmDeleteWallet(null);
        }}
        onCancel={() => setConfirmDeleteWallet(null)}
      />
    </>
  );
}
