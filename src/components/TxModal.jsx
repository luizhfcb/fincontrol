import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  createAmountState,
  formatAmountDisplay,
  formatAmountExpression,
  getAmountValue,
  pressAmountKey,
} from '../core/amount-keypad.mjs';
import { DEFAULT_CATEGORIES } from '../core/constants.js';
import { toLocalDateInputValue } from '../core/local-date.mjs';
import { useDialogA11y } from '../core/useDialogA11y.js';
import CategoryBadge, { CATEGORY_ICON_CHOICES } from './CategoryIcon.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import Icon from './Icon.jsx';

const KEYPAD_ROWS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['0', ',', '=', '+'],
];

const OPERATORS = new Set(['÷', '×', '−', '+']);

function renderAmountValue(state, showDetails) {
  if (!showDetails && typeof state?.current === 'string' && state.current.endsWith(',')) {
    const intRaw = state.current.slice(0, -1) || '0';
    const intNumber = Number(intRaw);
    const intFormatted = Number.isFinite(intNumber)
      ? intNumber.toLocaleString('pt-BR')
      : intRaw;
    return (
      <>
        <span>{intFormatted},</span>
        <span className="tx-keypad-comma-pending" aria-hidden="true">00</span>
      </>
    );
  }
  return <span>{formatAmountDisplay(state)}</span>;
}

export default function TxModal() {
  const {
    txModal, closeTxModal, saveTransaction, deleteTransaction, modules, updateModules,
    group, visibleWallets, walletId, toast, fmt,
  } = useApp();
  const editing = txModal.tx;
  const wallets = visibleWallets?.length ? visibleWallets : (group?.wallets || []);

  const [type, setType] = useState(editing?.type || txModal?.defaultType || 'expense');
  const [amountState, setAmountState] = useState(() =>
    createAmountState(editing?.val || 0, { replace: Boolean(editing) }),
  );
  const [showDetails, setShowDetails] = useState(Boolean(editing));
  const [desc, setDesc] = useState(editing?.desc || '');
  const [cat, setCat] = useState(editing?.cat || '');
  const [catOpen, setCatOpen] = useState(false);
  const [catDropUp, setCatDropUp] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [date, setDate] = useState(toLocalDateInputValue(editing?.date || new Date()));
  const [wallet, setWallet] = useState(
    editing?.walletId || (walletId !== 'all' ? walletId : (wallets[0]?.id || '')),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sheetRef = useRef(null);
  const descRef = useRef(null);
  const catWrapRef = useRef(null);
  const catTriggerRef = useRef(null);
  const catDropdownRef = useRef(null);
  const newCatRef = useRef(null);
  const keyHandlerRef = useRef(null);
  const openCatViaKeyRef = useRef(false);
  const swipeStartYRef = useRef(null);
  const swipeDeltaYRef = useRef(0);

  const handleDialogEscape = useCallback(() => {
    if (catOpen) {
      setCatOpen(false);
      catTriggerRef.current?.focus();
      return;
    }
    if (addingCat) {
      setAddingCat(false);
      return;
    }
    closeTxModal();
  }, [catOpen, addingCat, closeTxModal]);

  useDialogA11y(true, handleDialogEscape, sheetRef);

  const rawCategories = modules?.categories?.length ? modules.categories : DEFAULT_CATEGORIES;
  const names = [...new Set([
    ...rawCategories.filter((c) => !c.type || c.type === type).map((c) => c.name),
    ...(type === 'income' ? ['Trabalho'] : []),
    ...(editing?.cat && editing.type === type ? [editing.cat] : []),
    'Outros',
  ])];
  const catValue = names.includes(cat) ? cat : (names[0] || 'Outros');

  const handleTypeChange = (nextType) => {
    setType(nextType);
    const currentMeta = rawCategories.find((c) => c.name === cat);
    if (currentMeta?.type && currentMeta.type !== nextType) {
      setCat('');
    }
  };

  const onPressKey = (key) => {
    setError('');
    setAmountState((prev) => pressAmountKey(prev, key));
  };

  const finishAmount = () => {
    let nextState = amountState;
    if (nextState.operator && nextState.stored !== null) {
      nextState = pressAmountKey(nextState, '=');
      setAmountState(nextState);
    }
    const val = getAmountValue(nextState);
    if (!(val > 0)) {
      setError('Digite um valor maior que zero.');
      return;
    }
    setError('');
    setShowDetails(true);
    setTimeout(() => descRef.current?.focus(), 40);
  };

  // Suporte a teclado físico quando a calculadora de valor estiver aberta
  keyHandlerRef.current = (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (showDetails || confirmDelete) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (/^\d$/.test(e.key)) { e.preventDefault(); onPressKey(e.key); }
    else if (e.key === ',' || e.key === '.') { e.preventDefault(); onPressKey(','); }
    else if (e.key === 'Backspace') { e.preventDefault(); onPressKey('backspace'); }
    else if (e.key === 'Delete') { e.preventDefault(); onPressKey('clear'); }
    else if (e.key === '+') { e.preventDefault(); onPressKey('+'); }
    else if (e.key === '-') { e.preventDefault(); onPressKey('−'); }
    else if (e.key === '*') { e.preventDefault(); onPressKey('×'); }
    else if (e.key === '/') { e.preventDefault(); onPressKey('÷'); }
    else if (e.key === '=') { e.preventDefault(); onPressKey('='); }
    else if (e.key === 'Enter') {
      if (e.target?.closest?.('.tx-keypad-clear, .tx-type-switch, .sheet-head .icon-btn')) return;
      e.preventDefault();
      finishAmount();
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => keyHandlerRef.current?.(e);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Ajusta altura máxima do modal quando o teclado virtual reduz a viewport no mobile
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const syncViewportHeight = () => {
      const el = sheetRef.current;
      if (!el) return;
      if (vv.height < window.innerHeight - 40) {
        el.style.maxHeight = `${Math.max(240, Math.floor(vv.height * 0.94))}px`;
      } else {
        el.style.maxHeight = '';
      }
    };
    syncViewportHeight();
    vv.addEventListener('resize', syncViewportHeight);
    vv.addEventListener('scroll', syncViewportHeight);
    return () => {
      vv.removeEventListener('resize', syncViewportHeight);
      vv.removeEventListener('scroll', syncViewportHeight);
    };
  }, []);

  // Fecha o dropdown de categoria ao clicar fora e posiciona (para cima/baixo) conforme espaço disponível
  useEffect(() => {
    if (!catOpen) {
      openCatViaKeyRef.current = false;
      return undefined;
    }

    const triggerRect = catTriggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      const vpHeight = window.visualViewport?.height || window.innerHeight;
      const spaceBelow = vpHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      setCatDropUp(spaceBelow < 200 && spaceAbove > spaceBelow);
    }

    const raf = requestAnimationFrame(() => {
      const dropdown = catDropdownRef.current;
      if (!dropdown) return;
      const selected = dropdown.querySelector('.cat-option.on') || dropdown.querySelector('.cat-option');
      selected?.scrollIntoView({ block: 'nearest' });
      if (openCatViaKeyRef.current) {
        selected?.focus();
        openCatViaKeyRef.current = false;
      }
    });

    const onDoc = (e) => {
      if (catWrapRef.current && !catWrapRef.current.contains(e.target)) setCatOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [catOpen]);

  const onCatTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!catOpen) {
        openCatViaKeyRef.current = true;
        setCatOpen(true);
      } else {
        const opts = catDropdownRef.current?.querySelectorAll('.cat-option');
        if (opts?.length) {
          const target = e.key === 'ArrowDown' ? opts[0] : opts[opts.length - 1];
          target?.focus();
        }
      }
    } else if (e.key === 'Escape' && catOpen) {
      e.preventDefault();
      e.stopPropagation();
      setCatOpen(false);
    }
  };

  const onCatListKeyDown = (e) => {
    const opts = Array.from(catDropdownRef.current?.querySelectorAll('.cat-option') || []);
    if (!opts.length) return;
    const idx = opts.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = opts[(idx + 1) % opts.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = opts[(idx - 1 + opts.length) % opts.length];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      opts[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      opts[opts.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setCatOpen(false);
      catTriggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setCatOpen(false);
    }
  };

  const onHandleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    swipeStartYRef.current = e.touches[0].clientY;
    swipeDeltaYRef.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const onHandleTouchMove = (e) => {
    if (swipeStartYRef.current === null || !e.touches.length) return;
    const deltaY = Math.max(0, e.touches[0].clientY - swipeStartYRef.current);
    swipeDeltaYRef.current = deltaY;
    if (sheetRef.current) {
      sheetRef.current.style.transform = deltaY > 0 ? `translateY(${deltaY}px)` : '';
    }
  };

  const onHandleTouchEnd = () => {
    if (swipeStartYRef.current === null) return;
    const deltaY = swipeDeltaYRef.current;
    swipeStartYRef.current = null;
    swipeDeltaYRef.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    if (deltaY > 80) closeTxModal();
  };

  const scrollFieldIntoView = (target) => {
    setTimeout(() => {
      target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }, 120);
  };

  const handleSaveNewCat = async () => {
    const name = newCatName.trim();
    if (!name) { newCatRef.current?.focus(); return; }
    const exists = rawCategories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    try {
      if (!exists) {
        const nextCats = [...rawCategories, { id: String(Date.now()), name, type, ...(newCatIcon ? { icon: newCatIcon } : {}) }];
        await updateModules({ ...modules, categories: nextCats });
        toast('Categoria criada.');
      }
      setCat(name);
      setNewCatName('');
      setNewCatIcon('');
      setAddingCat(false);
    } catch (ex) {
      toast(ex?.message || 'Erro ao criar categoria.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await deleteTransaction(editing.id);
      toast('Transação excluída.', 'info');
      closeTxModal();
    } catch (ex) {
      toast(ex?.message || 'Erro ao excluir transação.', 'error');
    } finally {
      setConfirmDelete(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!showDetails) {
      finishAmount();
      return;
    }
    if (saving) return;

    const value = getAmountValue(amountState);
    if (!(value > 0)) {
      setShowDetails(false);
      return setError('Digite um valor maior que zero.');
    }
    if (!desc.trim()) {
      descRef.current?.focus();
      return setError('Informe uma descrição.');
    }

    setSaving(true);
    try {
      await saveTransaction({
        id: editing?.id,
        desc: desc.trim(),
        val: value,
        type,
        cat: catValue,
        date,
        walletId: wallet,
      });
      toast(editing ? 'Alterações salvas.' : (type === 'expense' ? 'Gasto adicionado.' : 'Entrada adicionada.'), 'success');
      closeTxModal();
    } catch (ex) {
      setError(ex?.message || 'Erro ao salvar lançamento.');
      setSaving(false);
    }
  };

  const isExpense = type === 'expense';
  const isCommaPending = !showDetails && typeof amountState?.current === 'string' && amountState.current.endsWith(',');
  const expression = amountState.error
    || formatAmountExpression(amountState)
    || (isCommaPending ? 'Digite os centavos' : '');
  const title = editing
    ? (isExpense ? 'Editar gasto' : 'Editar entrada')
    : (isExpense ? 'Novo gasto' : 'Nova entrada');

  return (
    <>
      <div className="overlay" onClick={closeTxModal}>
        <form
          ref={sheetRef}
          className={`sheet tx-sheet ${showDetails ? 'shows-details' : ''}`}
          data-tx-type={type}
          onClick={(e) => e.stopPropagation()}
          onSubmit={submit}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          <div
            className="sheet-handle"
            aria-hidden="true"
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            onTouchCancel={onHandleTouchEnd}
          />

          <div className="sheet-head">
            <div>
              <span className="eyebrow-sm">{editing ? 'Editar movimentação' : 'Nova movimentação'}</span>
              <h2>{title}</h2>
            </div>
            <div className="sheet-head-actions">
              {editing && (
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Excluir lançamento"
                  title="Excluir lançamento"
                >
                  <Icon name="trash" size={17} />
                </button>
              )}
              <button type="button" className="icon-btn" onClick={closeTxModal} aria-label="Fechar">
                <Icon name="close" />
              </button>
            </div>
          </div>

          <div className="tx-type-switch" role="radiogroup" aria-label="Tipo da transação">
            <button
              type="button"
              role="radio"
              aria-checked={!isExpense}
              className={`tx-type-btn income ${!isExpense ? 'active' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              <Icon name="arrowDown" size={15} /> Entrada
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isExpense}
              className={`tx-type-btn expense ${isExpense ? 'active' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              <Icon name="arrowUp" size={15} /> Gasto
            </button>
          </div>

        <button
          type="button"
          className={`tx-amount-card ${isExpense ? 'is-expense' : 'is-income'} ${showDetails ? 'is-compact' : ''}`}
          onClick={() => { setShowDetails(false); setError(''); }}
          aria-label="Editar valor"
        >
          <span className="tac-label">{isExpense ? 'Valor do gasto' : 'Valor da entrada'}</span>
          <strong className="num">
            <small>R$</small>
            {renderAmountValue(amountState, showDetails)}
          </strong>
          {!showDetails && (
            <em className={amountState.error ? 'neg' : ''} aria-live="polite">
              {expression || '\u00A0'}
            </em>
          )}
          {showDetails && <span className="tac-edit">Editar</span>}
        </button>

        {!showDetails ? (
          <div className="tx-keypad">
            <div className="tx-keypad-toolbar">
              <span>Digite ou calcule o valor</span>
              <button
                type="button"
                onClick={() => onPressKey('backspace')}
                aria-label="Apagar último número"
              >
                ⌫
              </button>
            </div>

            <div className="tx-keypad-grid" role="group" aria-label="Teclado de valor">
              {KEYPAD_ROWS.flat().map((k) => (
                <button
                  type="button"
                  key={k}
                  className={OPERATORS.has(k) ? 'is-operator' : k === '=' ? 'is-equals' : ''}
                  onClick={() => onPressKey(k)}
                >
                  {k}
                </button>
              ))}
            </div>

            {error && <p className="neg tiny tx-error" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>{error}</p>}

            <div className="tx-keypad-actions">
              <button type="button" className="tx-keypad-clear" onClick={() => onPressKey('clear')}>
                Limpar
              </button>
              <button
                type="button"
                className={`tx-keypad-done ${isExpense ? 'is-expense' : 'is-income'}`}
                onClick={finishAmount}
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="tx-details">
            <div className="field">
              <label htmlFor="d">Descrição</label>
              <input
                ref={descRef}
                id="d"
                className="input"
                enterKeyHint="done"
                placeholder={isExpense ? 'Ex.: Mercado, Uber, almoço…' : 'Ex.: Salário, freelance…'}
                value={desc}
                onChange={(e) => { setDesc(e.target.value); if (error) setError(''); }}
                onFocus={(e) => scrollFieldIntoView(e.target)}
                autoComplete="off"
              />
            </div>

            <div className="field" ref={catWrapRef}>
              <label id="cat-label" onClick={() => catTriggerRef.current?.focus()}>Categoria</label>
              <div className="cat-select">
                <button
                  ref={catTriggerRef}
                  type="button"
                  className={`cat-trigger ${catOpen ? 'open' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={catOpen}
                  aria-labelledby="cat-label"
                  onKeyDown={onCatTriggerKeyDown}
                  onClick={() => setCatOpen((o) => !o)}
                >
                  <span className="cat-trigger-main">
                    <CategoryBadge cat={catValue} type={type} size="sm" />
                    <span className="cat-trigger-label">{catValue}</span>
                  </span>
                  <Icon name="right" className={`cat-trigger-chev ${catOpen ? 'open' : ''}`} />
                </button>

                {catOpen && (
                  <div
                    ref={catDropdownRef}
                    className={`cat-dropdown ${catDropUp ? 'cat-dropdown-up' : ''}`.trim()}
                    role="listbox"
                    aria-labelledby="cat-label"
                    onKeyDown={onCatListKeyDown}
                  >
                    {names.map((n) => {
                      const on = n === catValue;
                      return (
                        <button
                          type="button"
                          key={n}
                          role="option"
                          aria-selected={on}
                          className={`cat-option ${on ? 'on' : ''}`}
                          onClick={() => {
                            setCat(n);
                            setCatOpen(false);
                            catTriggerRef.current?.focus();
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <CategoryBadge cat={n} type={type} size="sm" />
                            <span>{n}</span>
                          </span>
                          {on && <Icon name="check" size={16} />}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="cat-option cat-option-new"
                      onClick={() => {
                        setCatOpen(false);
                        setAddingCat(true);
                        setTimeout(() => newCatRef.current?.focus(), 30);
                      }}
                    >
                      <Icon name="plus" size={16} />
                      <span>Nova categoria</span>
                    </button>
                  </div>
                )}
              </div>

              {addingCat && (
                <div className="inline-cat-box">
                  <div className="inline-cat-form">
                    <input
                      ref={newCatRef}
                      type="text"
                      className="input"
                      placeholder="Nome da categoria…"
                      maxLength={32}
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onFocus={(e) => scrollFieldIntoView(e.target)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveNewCat(); }
                        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAddingCat(false); }
                      }}
                    />
                    <div className="inline-cat-actions">
                      <button type="button" className="btn ghost sm" onClick={() => setAddingCat(false)}>
                        Cancelar
                      </button>
                      <button type="button" className="btn sm" onClick={handleSaveNewCat}>
                        Salvar
                      </button>
                    </div>
                  </div>
                  <div className="icon-picker" role="group" aria-label="Ícone da categoria">
                    {CATEGORY_ICON_CHOICES.map((ch) => (
                      <button
                        type="button"
                        key={ch.key || 'auto'}
                        className={`icon-pick-btn ${newCatIcon === ch.key ? 'active' : ''}`}
                        title={ch.label}
                        aria-label={ch.label}
                        aria-pressed={newCatIcon === ch.key}
                        onClick={() => setNewCatIcon(ch.key)}
                      >
                        {ch.key ? <Icon name={ch.key} size={15} /> : <span className="tiny">Auto</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="tx-row-2">
              <div className="field">
                <label htmlFor="dt">Data</label>
                <input id="dt" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="w">Carteira</label>
                <select id="w" className="input" value={wallet} onChange={(e) => setWallet(e.target.value)}>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}{w.shared ? ' · Grupo' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="neg tiny tx-error" role="alert">{error}</p>}

            <div className="tx-footer">
              <button type="button" className="btn ghost" onClick={closeTxModal}>Cancelar</button>
              <button
                type="submit"
                disabled={saving}
                className={`btn tx-submit ${isExpense ? 'is-expense' : 'is-income'}`}
              >
                {saving
                  ? 'Salvando...'
                  : editing
                    ? 'Salvar alterações'
                    : (isExpense ? 'Adicionar gasto' : 'Adicionar entrada')}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>

    <ConfirmDialog
      open={confirmDelete}
      title="Excluir transação?"
      message={editing ? `Deseja excluir "${editing.desc}" (${fmt(editing.val)})? Esta ação não pode ser desfeita.` : ''}
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      danger
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(false)}
    />
  </>
  );
}
