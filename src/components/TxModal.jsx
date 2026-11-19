import { useEffect, useRef, useState } from 'react';
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
import CategoryBadge, { CATEGORY_ICON_CHOICES } from './CategoryIcon.jsx';
import Icon from './Icon.jsx';

const KEYPAD_ROWS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['0', ',', '=', '+'],
];

const OPERATORS = new Set(['÷', '×', '−', '+']);

export default function TxModal() {
  const {
    txModal, closeTxModal, saveTransaction, modules, updateModules,
    group, visibleWallets, walletId,
  } = useApp();
  const editing = txModal.tx;
  const wallets = visibleWallets?.length ? visibleWallets : group.wallets;

  const [type, setType] = useState(editing?.type || 'expense');
  const [amountState, setAmountState] = useState(() => createAmountState(editing?.val || 0));
  const [showDetails, setShowDetails] = useState(Boolean(editing));
  const [desc, setDesc] = useState(editing?.desc || '');
  const [cat, setCat] = useState(editing?.cat || '');
  const [catOpen, setCatOpen] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [date, setDate] = useState(toLocalDateInputValue(editing?.date || new Date()));
  const [wallet, setWallet] = useState(
    editing?.walletId || (walletId !== 'all' ? walletId : wallets[0].id),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const descRef = useRef(null);
  const catWrapRef = useRef(null);
  const newCatRef = useRef(null);

  const rawCategories = modules?.categories?.length ? modules.categories : DEFAULT_CATEGORIES;
  const names = [...new Set([
    ...rawCategories.filter((c) => !c.type || c.type === type).map((c) => c.name),
    ...rawCategories.map((c) => c.name),
    ...(type === 'income' ? ['Trabalho'] : []),
    'Outros',
  ])];
  const catValue = names.includes(cat) ? cat : (names[0] || 'Outros');

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
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (catOpen) { setCatOpen(false); return; }
        if (addingCat) { setAddingCat(false); return; }
        closeTxModal();
        return;
      }
      if (showDetails) return;
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT') return;

      if (/^\d$/.test(e.key)) { e.preventDefault(); onPressKey(e.key); }
      else if (e.key === ',' || e.key === '.') { e.preventDefault(); onPressKey(','); }
      else if (e.key === 'Backspace') { e.preventDefault(); onPressKey('backspace'); }
      else if (e.key === 'Delete') { e.preventDefault(); onPressKey('clear'); }
      else if (e.key === '+') { e.preventDefault(); onPressKey('+'); }
      else if (e.key === '-') { e.preventDefault(); onPressKey('−'); }
      else if (e.key === '*') { e.preventDefault(); onPressKey('×'); }
      else if (e.key === '/') { e.preventDefault(); onPressKey('÷'); }
      else if (e.key === '=') { e.preventDefault(); onPressKey('='); }
      else if (e.key === 'Enter') { e.preventDefault(); finishAmount(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Fecha o dropdown de categoria ao clicar fora
  useEffect(() => {
    if (!catOpen) return undefined;
    const onDoc = (e) => {
      if (catWrapRef.current && !catWrapRef.current.contains(e.target)) setCatOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [catOpen]);

  const handleSaveNewCat = async () => {
    const name = newCatName.trim();
    if (!name) { newCatRef.current?.focus(); return; }
    const exists = rawCategories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const nextCats = [...rawCategories, { id: String(Date.now()), name, type, ...(newCatIcon ? { icon: newCatIcon } : {}) }];
      await updateModules({ ...modules, categories: nextCats });
    }
    setCat(name);
    setNewCatName('');
    setNewCatIcon('');
    setAddingCat(false);
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
      closeTxModal();
    } catch (ex) {
      setError(ex?.message || 'Erro ao salvar lançamento.');
      setSaving(false);
    }
  };

  const isExpense = type === 'expense';
  const expression = amountState.error || formatAmountExpression(amountState);
  const title = editing
    ? (isExpense ? 'Editar gasto' : 'Editar entrada')
    : (isExpense ? 'Novo gasto' : 'Nova entrada');

  return (
    <div className="overlay" onClick={closeTxModal}>
      <form
        className={`sheet tx-sheet ${showDetails ? 'shows-details' : ''}`}
        data-tx-type={type}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-head">
          <div>
            <span className="eyebrow-sm">Nova movimentação</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={closeTxModal} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>

        <div className="tx-type-switch" role="radiogroup" aria-label="Tipo da transação">
          <button
            type="button"
            role="radio"
            aria-checked={!isExpense}
            className={`tx-type-btn income ${!isExpense ? 'active' : ''}`}
            onClick={() => setType('income')}
          >
            <Icon name="arrowDown" size={15} /> Entrada
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isExpense}
            className={`tx-type-btn expense ${isExpense ? 'active' : ''}`}
            onClick={() => setType('expense')}
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
            <span>{formatAmountDisplay(amountState)}</span>
          </strong>
          {!showDetails && <em className={amountState.error ? 'neg' : ''}>{expression || '\u00A0'}</em>}
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
                autoComplete="off"
              />
            </div>

            <div className="field" ref={catWrapRef}>
              <label>Categoria</label>
              <div className="cat-select">
                <button
                  type="button"
                  className={`cat-trigger ${catOpen ? 'open' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={catOpen}
                  onClick={() => setCatOpen((o) => !o)}
                >
                  <span className="cat-trigger-main">
                    <CategoryBadge cat={catValue} type={type} size="sm" />
                    <span className="cat-trigger-label">{catValue}</span>
                  </span>
                  <Icon name="right" className={`cat-trigger-chev ${catOpen ? 'open' : ''}`} />
                </button>

                {catOpen && (
                  <div className="cat-dropdown" role="listbox" aria-label="Categorias">
                    {names.map((n) => {
                      const on = n === catValue;
                      return (
                        <button
                          type="button"
                          key={n}
                          role="option"
                          aria-selected={on}
                          className={`cat-option ${on ? 'on' : ''}`}
                          onClick={() => { setCat(n); setCatOpen(false); }}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveNewCat(); }
                        if (e.key === 'Escape') { e.preventDefault(); setAddingCat(false); }
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
  );
}
