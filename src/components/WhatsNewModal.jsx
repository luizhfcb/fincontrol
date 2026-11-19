import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import Icon from './Icon.jsx';

const STORAGE_PREFIX = 'fc_whats_new_family_v1';

function storageKey(uid) {
  return `${STORAGE_PREFIX}_${uid || 'default'}`;
}

function hasSeen(uid) {
  try {
    return localStorage.getItem(storageKey(uid)) === '1';
  } catch {
    return false;
  }
}

function markSeen(uid) {
  try {
    localStorage.setItem(storageKey(uid), '1');
  } catch { /* ignore private mode */ }
}

const SLIDES = [
  {
    badge: 'Novidade',
    title: 'Carteiras em Família',
    desc: 'Crie uma carteira dedicada para viagens, despesas da casa ou projetos em grupo — tudo sincronizado em tempo real, sem misturar com o seu dia a dia.',
    visual: (
      <div className="wn-art">
        <div className="wn-art-glow" />
        <div className="wn-art-orbit">
          <span className="wn-art-bubble b1"><Icon name="wallet" size={18} /></span>
          <span className="wn-art-center"><Icon name="users" size={30} /></span>
          <span className="wn-art-bubble b2"><Icon name="sparkles" size={18} /></span>
        </div>
      </div>
    ),
  },
  {
    badge: 'Simples de convidar',
    title: 'Convide por código no WhatsApp',
    desc: 'Gere um código curto para qualquer carteira e envie para quem for participar. Cada familiar entra com a própria conta Google em segundos.',
    visual: (
      <div className="wn-art">
        <div className="wn-art-glow" />
        <div className="wn-code-preview">
          <small>CÓDIGO DA CARTEIRA</small>
          <div className="wn-code-row">
            <strong className="num">FAM-7K3M</strong>
            <span className="wn-code-chip">Copiar</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    badge: 'Privacidade garantida',
    title: 'Seu pessoal continua privado',
    desc: 'Ninguém enxerga os gastos da sua carteira Pessoal. Nas carteiras compartilhadas, todos acompanham o total e quanto cada pessoa gastou no mês.',
    visual: (
      <div className="wn-art">
        <div className="wn-art-glow" />
        <div className="wn-privacy-preview">
          <div className="wn-priv-row">
            <span className="wn-priv-ico"><Icon name="shield" size={16} /></span>
            <div className="wn-priv-txt">
              <b>Pessoal</b>
              <small>Visível só para você</small>
            </div>
            <span className="badge neutral">Privada</span>
          </div>
          <div className="wn-priv-row">
            <span className="wn-priv-ico shared"><Icon name="users" size={16} /></span>
            <div className="wn-priv-txt">
              <b>Viagem em Família</b>
              <small>Divisão automática por pessoa</small>
            </div>
            <span className="badge good">Grupo</span>
          </div>
        </div>
      </div>
    ),
  },
];

export default function WhatsNewModal() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => Boolean(user && !hasSeen(user.uid)));
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (user && !hasSeen(user.uid)) {
      setOpen(true);
      setStep(0);
    }
  }, [user]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        markSeen(user?.uid);
        setOpen(false);
      } else if (e.key === 'ArrowRight' && step < SLIDES.length - 1) {
        setStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep((s) => s - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, user]);

  if (!open) return null;

  const dismiss = () => {
    markSeen(user?.uid);
    setOpen(false);
  };

  const goExplore = () => {
    markSeen(user?.uid);
    setOpen(false);
    navigate('/mais/compartilhamento');
  };

  const current = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="overlay wn-overlay" onClick={dismiss}>
      <div
        className="wn-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wnTitle"
      >
        <div className="wn-top">
          <span className="badge neutral">{current.badge}</span>
          <button type="button" className="wn-skip" onClick={dismiss}>
            Pular
          </button>
        </div>

        <div className="wn-slide" key={step}>
          {current.visual}
          <h2 id="wnTitle">{current.title}</h2>
          <p>{current.desc}</p>
        </div>

        <div className="wn-dots" role="tablist" aria-label="Passos da novidade">
          {SLIDES.map((s, idx) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={idx === step}
              aria-label={`Slide ${idx + 1} de ${SLIDES.length}`}
              className={`wn-dot ${idx === step ? 'active' : ''}`}
              onClick={() => setStep(idx)}
            />
          ))}
        </div>

        <div className="wn-actions">
          {step > 0 ? (
            <button type="button" className="btn ghost" onClick={() => setStep((s) => s - 1)}>
              Voltar
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={dismiss}>
              Agora não
            </button>
          )}

          {isLast ? (
            <button type="button" className="btn" onClick={goExplore}>
              Conhecer agora <Icon name="right" size={16} />
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => setStep((s) => s + 1)}>
              Próximo <Icon name="right" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
