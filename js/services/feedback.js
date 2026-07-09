import { addDoc, collection, db, serverTimestamp } from '../config/firebase.js';
import { state } from '../core/state.js';
import { validateFeedbackPayload } from '../core/feedback-validation.mjs';
import { showToast } from '../ui/feedback.js';

async function notifyFeedback(type, message, userEmail) {
  try {
    await fetch('/api/notify-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message, userEmail }),
    });
  } catch (error) {
    console.error('Falha ao notificar feedback:', error);
  }
}

export async function submitFeedback(type, message) {
  if (!state.currentUser) return false;

  const trimmedMessage = (message || '').trim();
  const { valid, error } = validateFeedbackPayload({ type, message: trimmedMessage });
  if (!valid) {
    showToast(error, true);
    return false;
  }

  try {
    await addDoc(collection(db, 'feedback'), {
      uid: state.currentUser.uid,
      userEmail: state.currentUser.email || '',
      type,
      message: trimmedMessage,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    showToast('Erro ao enviar feedback.', true);
    return false;
  }

  await notifyFeedback(type, trimmedMessage, state.currentUser.email || '');
  return true;
}
