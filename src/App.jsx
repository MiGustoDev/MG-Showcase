import { useEffect, useState, useCallback } from 'react';
import { sorted, categories, images } from './projects';
import './App.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Formatea YYYY-MM-DD a "Ddd Mmm AAAA" (ej: "27 May 2025")
const fmtDate = (dStr) => {
  if (!dStr) return '';
  const [y, m, d] = dStr.split('-');
  return `${+d} ${MONTHS[+m - 1]} ${y}`;
};

// Formatea el mes inicial para la portada
const fmtMonthYear = (dStr) => {
  if (!dStr) return '';
  const [y, m] = dStr.split('-');
  return `${MONTHS_FULL[+m - 1]} ${y}`;
};

// Calcula la duración en días/semanas/meses
const calcDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  if (startStr === endStr) return '1 día';
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T23:59:59');
  const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  if (diffDays <= 7) return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffDays < 30) return `${diffWeeks} semana${diffWeeks > 1 ? 's' : ''}`;
  const diffMonths = Math.round(diffDays / 30.44);
  return `${diffMonths} mes${diffMonths > 1 ? 'es' : ''} (${diffDays} días)`;
};

// Rango temporal global del timeline (desde 1 de Mayo 2025 hasta 31 de Octubre 2026)
const timelineStart = new Date('2025-05-01T00:00:00').getTime();
const timelineEnd = new Date('2026-10-31T23:59:59').getTime();
const totalTimelineSpan = timelineEnd - timelineStart;

// Generador de meses para la cabecera del timeline
const timelineMonths = [
  { year: '2025', m: 'May', isYear: true },
  { year: '2025', m: 'Jun' },
  { year: '2025', m: 'Jul' },
  { year: '2025', m: 'Ago' },
  { year: '2025', m: 'Sep' },
  { year: '2025', m: 'Oct' },
  { year: '2025', m: 'Nov' },
  { year: '2025', m: 'Dic' },
  { year: '2026', m: 'Ene', isYear: true },
  { year: '2026', m: 'Feb' },
  { year: '2026', m: 'Mar' },
  { year: '2026', m: 'Abr' },
  { year: '2026', m: 'May' },
  { year: '2026', m: 'Jun' },
  { year: '2026', m: 'Jul' },
  { year: '2026', m: 'Ago' },
  { year: '2026', m: 'Sep' },
  { year: '2026', m: 'Oct' },
];

// slides: 0 = portada, 1 = timeline, 2..n+1 = proyectos, n+2 = cierre
const TOTAL = sorted.length + 3;

function Cover() {
  const totalProjects = sorted.length;
  const counts = Object.keys(categories).map((k) => {
    const count = sorted.filter((p) => p.cat === k).length;
    const pct = Math.round((count / totalProjects) * 100);
    return {
      key: k,
      count,
      pct,
      ...categories[k],
    };
  });
  return (
    <section className="slide cover">
      <div className="cover-content">
        <p className="eyebrow">Mi Gusto · Desarrollo Digital</p>
        <h1>{sorted.length} proyectos.<br /><span>Un mismo sabor.</span></h1>
        <p className="lead">Recorrido por todo lo que construimos de {fmtMonthYear(sorted[0].start)} hasta el día de hoy.</p>
        <div className="stats">
          {counts.map((cat) => (
            <div key={cat.key} className="stat" style={{ '--c': cat.color }}>
              <div className="stat-top">
                <strong>{cat.count}</strong>
                <span className="stat-icon">{cat.icon}</span>
              </div>
              <div className="stat-info">
                <span className="stat-label">{cat.label}</span>
                <span className="stat-desc">{cat.desc}</span>
              </div>
              <div className="stat-bar-wrap">
                <div className="stat-bar-bg">
                  <div className="stat-bar-fill" style={{ width: `${cat.pct}%` }} />
                </div>
                <span className="stat-pct">{cat.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cover-visual">
        <img src="/logo.png" alt="Mi Gusto Logo" className="cover-logo" />
      </div>
      <p className="hint">Usá ← → o espacio · T timeline · F pantalla completa</p>
    </section>
  );
}

function Timeline({ go, active }) {
  return (
    <section className="slide timeline">
      <h2>Línea de tiempo (2025 - 2026)</h2>
      <div className="gantt">
        <div className="months">
          {timelineMonths.map((tm, idx) => (
            <span key={idx} style={{ width: `${100 / timelineMonths.length}%` }}>
              {tm.isYear ? <b>{tm.m} {tm.year}</b> : tm.m}
            </span>
          ))}
        </div>
        {sorted.map((p, i) => {
          const pStart = new Date(p.start + 'T00:00:00').getTime();
          const pEnd = new Date(p.end + 'T23:59:59').getTime();
          const left = Math.max(0, Math.min(99, ((pStart - timelineStart) / totalTimelineSpan) * 100));
          const width = Math.max(2.2, Math.min(100 - left, ((pEnd - pStart) / totalTimelineSpan) * 100));
          return (
            <button key={p.id} className={`row ${active === i ? 'on' : ''}`} onClick={() => go(i + 2)}
              style={{ animationDelay: `${i * 30}ms` }} title={`${p.name} (${fmtDate(p.start)} → ${fmtDate(p.end)})`}>
              <span className="bar" style={{ left: `${left}%`, width: `${width}%`, '--c': categories[p.cat].color }}>
                <em>{p.emoji} {p.name}</em>
              </span>
            </button>
          );
        })}
      </div>
      <div className="legend">
        {Object.values(categories).map((c) => <span key={c.label} style={{ '--c': c.color }}>{c.label}</span>)}
      </div>
    </section>
  );
}

function ProjectSlide({ p, i }) {
  const c = categories[p.cat];
  const shots = images[p.id] || [];
  const [zoom, setZoom] = useState(null);
  return (
    <div className="scroller" style={{ '--c': c.color }}>
      <section className="slide project">
        <div className="num">{String(i + 1).padStart(2, '0')}</div>
        <div className="info">
          <p className="eyebrow">{c.label}</p>
          <h2>{p.name}</h2>
          <p className="tagline">{p.tagline}</p>
          <p className="desc">{p.desc}</p>
          <div className="chips">{p.stack.map((s) => <span key={s}>{s}</span>)}</div>
          <p className="dates">
            📅 {fmtDate(p.start)}{p.end !== p.start ? ` → ${fmtDate(p.end)}` : ''}
            <span className="duration-pill"> · ({calcDuration(p.start, p.end)})</span>
          </p>
        </div>
        <div className="visual">
          {shots[0] ? <img className="hero-shot" src={shots[0]} alt={p.name} onClick={() => setZoom(shots[0])} />
            : <div className="orb">{p.emoji}</div>}
        </div>
        {shots.length > 0 && <div className="scroll-hint">↓ Scrolleá para ver {shots.length} captura{shots.length > 1 ? 's' : ''}</div>}
      </section>
      {shots.length > 0 && (
        <section className="gallery">
          {shots.map((s, k) => (
            <figure key={s} style={{ animationDelay: `${k * 60}ms` }} onClick={() => setZoom(s)}>
              <img src={s} alt={`${p.name} captura ${k + 1}`} loading="lazy" />
            </figure>
          ))}
        </section>
      )}
      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </div>
  );
}

function Closing() {
  const stack = {};
  sorted.forEach((p) => p.stack.forEach((s) => (stack[s] || 0) + 1));
  const top = Object.entries(stack).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <section className="slide closing">
      <p className="eyebrow">Stack más usado</p>
      <div className="cloud">
        {top.map(([s, n]) => <span key={s} style={{ fontSize: `${1 + n / 6}rem` }}>{s}<sup>{n}</sup></span>)}
      </div>
      <h1><span>¡Gracias!</span></h1>
      <p className="lead">¿Preguntas?</p>
    </section>
  );
}

export default function App() {
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);
  const go = useCallback((n) => { setIdx(Math.max(0, Math.min(TOTAL - 1, n))); setGrid(false); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', ' '].includes(e.key)) { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft') go(idx - 1);
      else if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        document.querySelector('.scroller')?.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * window.innerHeight * 0.8, behavior: 'smooth' });
      }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(TOTAL - 1);
      else if (e.key.toLowerCase() === 't') go(1);
      else if (e.key.toLowerCase() === 'g' || e.key === 'Escape') setGrid((g) => !g);
      else if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, go]);

  let content;
  if (idx === 0) content = <Cover />;
  else if (idx === 1) content = <Timeline go={go} />;
  else if (idx === TOTAL - 1) content = <Closing />;
  else content = <ProjectSlide p={sorted[idx - 2]} i={idx - 2} />;

  return (
    <main className="deck">
      <div className="bg" />
      <div className="stage" key={idx}>{content}</div>

      {grid && (
        <div className="grid-overlay" onClick={() => setGrid(false)}>
          <div className="grid">
            {sorted.map((p, i) => (
              <button key={p.id} style={{ '--c': categories[p.cat].color }} onClick={() => go(i + 2)}>
                <span>{p.emoji}</span>{p.name}<small>{fmtDate(p.start)}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="controls">
        <button id="prev" onClick={() => go(idx - 1)} aria-label="Anterior">←</button>
        <button id="timeline" onClick={() => go(1)}>Timeline</button>
        <button id="grid" onClick={() => setGrid(!grid)}>Índice</button>
        <span className="counter">{idx + 1} / {TOTAL}</span>
        <button id="next" onClick={() => go(idx + 1)} aria-label="Siguiente">→</button>
      </nav>
      <div className="progress" style={{ width: `${((idx + 1) / TOTAL) * 100}%` }} />
    </main>
  );
}
