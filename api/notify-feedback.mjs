import { validateFeedbackPayload } from '../js/core/feedback-validation.mjs';

const ALLOWED_HOSTS = ['controlfin1.vercel.app', 'localhost', '127.0.0.1'];

function isAllowedOrigin(req) {
  const originHeader = req.headers.origin || req.headers.referer;
  if (!originHeader) return false;
  try {
    const { hostname } = new URL(originHeader);
    return ALLOWED_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }

  const { type, message, userEmail } = req.body || {};
  const { valid, error } = validateFeedbackPayload({ type, message });
  if (!valid) {
    res.status(400).json({ ok: false, error });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    res.status(200).json({ ok: false, error: 'Telegram not configured' });
    return;
  }

  const header = type === 'bug' ? '🐞 Novo bug reportado' : '💡 Nova sugestão';
  const text = `${header}\nDe: ${userEmail || 'desconhecido'}\n"${message.trim()}"`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(200).json({ ok: false, error: 'Telegram request failed' });
  }
}
