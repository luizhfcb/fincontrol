import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { assignDistinctDonutColors } from '../core/chart-colors.mjs';
import { CATEGORY_COLORS } from '../core/constants.js';
import { compactDonutCategories } from '../core/insights.js';

const R = 46;
const C = 2 * Math.PI * R;

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !target) { setValue(target); return undefined; }
    let raf;
    const started = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - started) / duration);
      setValue(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/**
 * Donut SVG animado (fatias desenhadas em sequência), com seleção por fatia
 * ou legenda e leitura do valor exato. Porta do renderDonutCharts original.
 */
export default function DonutChart({ rows, isIncome = false, limit = 6, showValues = true }) {
  const { fmt, fmtCompact } = useApp();
  const [active, setActive] = useState(null);

  const slices = useMemo(() => {
    const compact = compactDonutCategories(rows, limit);
    const colors = assignDistinctDonutColors(compact.map((r) => r.cat), isIncome, CATEGORY_COLORS);
    return compact.map((r, i) => ({ ...r, color: colors[i] }));
  }, [rows, isIncome, limit]);

  const total = slices.reduce((s, r) => s + r.value, 0);
  const animated = useCountUp(total);
  const categoryCount = slices.reduce((n, s) => n + (s.grouped ? s.grouped.length : 1), 0);
  const key = slices.map((s) => `${s.cat}:${s.value}`).join('|');

  useEffect(() => { setActive(null); }, [key]);

  if (!slices.length || !total) {
    return <p className="empty">{isIncome ? 'Sem receitas neste mês.' : 'Sem gastos neste mês.'}</p>;
  }

  let offset = 0;
  const arcs = slices.map((s, i) => {
    const len = (s.value / total) * C;
    const visible = Math.max(1, len - (slices.length > 1 ? 2.2 : 0));
    const arc = { ...s, i, visible, start: -offset };
    offset += len;
    return arc;
  });

  const toggle = (i) => setActive((cur) => (cur === i ? null : i));
  const sel = active != null ? slices[active] : null;

  return (
    <div className="donut-wrap">
      <div className="donut-layout">
        <div className="donut-svg-box">
          <svg viewBox="0 0 120 120" className="donut-svg" role="img" aria-label="Distribuição por categoria">
            <circle className="donut-track" cx="60" cy="60" r={R} fill="none" strokeWidth="9" />
            {arcs.map((a) => (
              <g key={`${key}-${a.i}`}>
                <circle
                  className={`donut-arc ${active === a.i ? 'active' : ''} ${active != null && active !== a.i ? 'dim' : ''}`}
                  cx="60" cy="60" r={R} fill="none"
                  stroke={a.color}
                  strokeWidth="9"
                  strokeLinecap="butt"
                  strokeDasharray={`${a.visible} ${C - a.visible}`}
                  strokeDashoffset={a.start}
                  transform="rotate(-90 60 60)"
                  style={{ '--arc-hidden': `${a.visible + a.start}`, '--arc-start': `${a.start}`, animationDelay: `${a.i * 90}ms` }}
                />
                <circle
                  className="donut-hit"
                  cx="60" cy="60" r={R} fill="none" stroke="transparent" strokeWidth="22"
                  strokeDasharray={`${a.visible} ${C - a.visible}`}
                  strokeDashoffset={a.start}
                  transform="rotate(-90 60 60)"
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.cat}: ${fmt(a.value)}`}
                  onClick={() => toggle(a.i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(a.i); } }}
                />
              </g>
            ))}
          </svg>
          <div className="donut-hole">
            {sel ? (
              <>
                <span className="donut-center-label">{sel.cat}</span>
                <strong className={`num ${isIncome ? 'pos' : 'neg'}`}>{fmtCompact(sel.value)}</strong>
                <small>{sel.percent.toFixed(0)}% do total</small>
              </>
            ) : (
              <>
                <span className="donut-center-label">{isIncome ? 'Receitas' : 'Gastos'}</span>
                <strong className={`num ${isIncome ? 'pos' : 'neg'}`}>{fmtCompact(animated)}</strong>
                <small>{categoryCount} {categoryCount === 1 ? 'categoria' : 'categorias'}</small>
              </>
            )}
          </div>
        </div>

        <div className="donut-list">
          {slices.map((s, i) => (
            <button
              type="button"
              key={s.cat}
              className={`donut-row ${active === i ? 'active' : ''}`}
              onClick={() => toggle(i)}
              title={s.grouped ? s.grouped.join(', ') : s.cat}
            >
              <i className="donut-dot" style={{ background: s.color }} />
              <span className="d-name">{s.cat}</span>
              <span className="d-pct num">{s.percent.toFixed(0)}%</span>
              {showValues && <span className="d-val num">{fmt(s.value)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={`chart-readout ${sel ? 'show' : ''}`} aria-live="polite">
        {sel && (
          <>
            <span>{sel.cat}{sel.grouped ? ` (${sel.grouped.join(', ')})` : ''}</span>
            <strong className={`num ${isIncome ? 'pos' : 'neg'}`}>{fmt(sel.value)}</strong>
          </>
        )}
      </div>
    </div>
  );
}
