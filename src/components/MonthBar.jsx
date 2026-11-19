import { useApp } from '../context/AppContext.jsx';
import { MONTHS } from '../core/constants.js';
import Icon from './Icon.jsx';

export default function MonthBar() {
  const { month, year, shiftMonth, goToCurrentMonth } = useApp();
  const now = new Date();
  const isCurrent = month === now.getMonth() && year === now.getFullYear();

  return (
    <div className="monthbar">
      <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
        <Icon name="left" />
      </button>
      <div className="monthbar-label">
        <Icon name="calendar" />
        <b>{MONTHS[month]} {year}</b>
        {!isCurrent && (
          <button type="button" className="today-btn" onClick={goToCurrentMonth} title="Voltar ao mês atual">
            Hoje
          </button>
        )}
      </div>
      <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
        <Icon name="right" />
      </button>
    </div>
  );
}
