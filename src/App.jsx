import { useEffect, useState, useCallback } from 'react';
import { sorted, categories, images } from './projects';
import './App.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmt = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
const toIdx = (ym) => { const [y, m] = ym.split('-'); return +y * 12 + (+m - 1); };

const minI = Math.min(...sorted.map((p) => toIdx(p.start)));
const maxI = Math.max(...sorted.map((p) => toIdx(p.end))) + 1;
const span = maxI - minI;
const ticks = Array.from({ length: span }, (_, i) => minI + i);

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
        <p className="lead">Recorrido por todo lo que construimos de {fmt(sorted[0].start)} hasta el día de hoy.</p>
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
      <h2>Línea de tiempo</h2>
      <div className="gantt">
        <div className="months">
          {ticks.map((t) => (
            <span key={t} style={{ width: `${100 / span}%` }}>
              {t % 12 === 0 ? <b>{Math.floor(t / 12)}</b> : MONTHS[t % 12]}
            </span>
          ))}
        </div>
        {sorted.map((p, i) => {
          const left = ((toIdx(p.start) - minI) / span) * 100;
          const width = ((toIdx(p.end) - toIdx(p.start) + 1) / span) * 100;
          return (
            <button key={p.id} className={`row ${active === i ? 'on' : ''}`} onClick={() => go(i + 2)}
              style={{ animationDelay: `${i * 40}ms` }}>
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
          <p className="dates">📅 {fmt(p.start)}{p.end !== p.start && ` → ${fmt(p.end)}`}</p>
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
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
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
                <span>{p.emoji}</span>{p.name}<small>{fmt(p.start)}</small>
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
