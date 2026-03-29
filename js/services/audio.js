import { state } from '../core/state.js';
import { parseVoiceInput } from '../core/utils.js';
import { showToast } from '../ui/feedback.js';
import { buildCategories } from '../ui/categories.js';

export function handleMic() {
  if (state.isRecording) {
    return;
  }

  const micButton = document.getElementById('micBtn');
  const micHint = document.getElementById('micHint');
  const transcript = document.getElementById('transcribed');
  const confirmArea = document.getElementById('audio-confirm-area');
  const cancelRow = document.getElementById('audio-cancel-row');

  if (transcript) {
    transcript.style.display = 'none';
    transcript.textContent = '';
  }
  if (confirmArea) {
    confirmArea.style.display = 'none';
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Use o Chrome para reconhecimento de voz.', true);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  state.isRecording = true;
  micButton?.classList.add('rec');
  if (micHint) {
    micHint.textContent = 'Ouvindo… fale agora!';
  }

  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;
    const parsed = parseVoiceInput(spokenText);

    state.isRecording = false;
    micButton?.classList.remove('rec');
    if (micHint) {
      micHint.textContent = 'Toque para gravar';
    }

    if (transcript) {
      transcript.textContent = `🎙️ "${spokenText}"`;
      transcript.style.display = 'block';
    }

    const descriptionField = document.getElementById('mDescAudio');
    const valueField = document.getElementById('mValAudio');

    if (descriptionField) {
      descriptionField.value = parsed.description;
    }
    if (valueField) {
      valueField.value = parsed.value || '';
    }

    state.selectedCategory = parsed.category;
    buildCategories();

    if (cancelRow) {
      cancelRow.style.display = 'none';
    }
    if (confirmArea) {
      confirmArea.style.display = 'block';
    }
  };

  recognition.onerror = (event) => {
    state.isRecording = false;
    micButton?.classList.remove('rec');
    if (micHint) {
      micHint.textContent = 'Toque para gravar';
    }

    if (event.error === 'not-allowed') {
      showToast('Permita o acesso ao microfone.', true);
      return;
    }

    if (event.error === 'no-speech') {
      showToast('Nenhuma fala detectada.', true);
      return;
    }

    showToast(`Erro: ${event.error}`, true);
  };

  recognition.onend = () => {
    if (!state.isRecording) {
      return;
    }

    state.isRecording = false;
    micButton?.classList.remove('rec');
    if (micHint) {
      micHint.textContent = 'Toque para gravar';
    }
  };

  recognition.start();
}
