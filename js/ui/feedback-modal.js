import { submitFeedback } from '../services/feedback.js';
import { showToast } from './feedback.js';

let selectedFeedbackType = 'bug';

export function openFeedbackModal() {
  const modal = document.getElementById('genericFormModal');
  const titleEl = document.getElementById('gfmTitle');
  const body = document.getElementById('gfmBody');
  const confirm = document.getElementById('gfmConfirm');
  if (!modal || !titleEl || !body || !confirm) return;

  selectedFeedbackType = 'bug';
  titleEl.textContent = 'Enviar feedback';
  body.innerHTML = `
    <p class="fb-sub">Encontrou um problema ou tem uma ideia? Conta pra gente.</p>
    <div class="fb-toggle">
      <button type="button" class="fb-seg on" data-type="bug" id="fbTypeBug" onclick="setFeedbackType('bug')">
        <span class="fb-seg-ico">🐞</span> Reportar bug
      </button>
      <button type="button" class="fb-seg" data-type="suggestion" id="fbTypeSuggestion" onclick="setFeedbackType('suggestion')">
        <span class="fb-seg-ico">💡</span> Sugestão
      </button>
    </div>
    <div class="fb-field">
      <textarea class="fb-textarea" id="gfmFeedbackMsg" rows="4" maxlength="2000" placeholder="Descreva o problema ou sua sugestão com o máximo de detalhes…" oninput="updateFeedbackCounter()"></textarea>
    </div>
    <div class="fb-counter" id="fbCounter">0 / 2000</div>
  `;
  confirm.textContent = 'Enviar feedback';

  confirm.onclick = async () => {
    const message = document.getElementById('gfmFeedbackMsg')?.value.trim();
    const ok = await submitFeedback(selectedFeedbackType, message);
    if (!ok) return;
    modal.style.display = 'none';
    showToast('Feedback enviado. Obrigado!');
  };

  modal.style.display = 'flex';
  updateFeedbackCounter();
  document.getElementById('gfmFeedbackMsg')?.focus();
}

export function setFeedbackType(type) {
  selectedFeedbackType = type;
  document.getElementById('fbTypeBug')?.classList.toggle('on', type === 'bug');
  document.getElementById('fbTypeSuggestion')?.classList.toggle('on', type === 'suggestion');
}

export function updateFeedbackCounter() {
  const input = document.getElementById('gfmFeedbackMsg');
  const counter = document.getElementById('fbCounter');
  if (!input || !counter) return;
  const len = input.value.length;
  counter.textContent = `${len} / 2000`;
  counter.classList.toggle('warn', len >= 2000);
}
