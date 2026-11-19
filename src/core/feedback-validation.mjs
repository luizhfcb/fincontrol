const VALID_TYPES = ['bug', 'suggestion'];
const MAX_MESSAGE_LENGTH = 2000;

export function validateFeedbackPayload({ type, message }) {
  if (!VALID_TYPES.includes(type)) {
    return { valid: false, error: 'Tipo de feedback inválido.' };
  }
  if (typeof message !== 'string' || !message.trim()) {
    return { valid: false, error: 'Mensagem não pode ser vazia.' };
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres.` };
  }
  return { valid: true };
}
