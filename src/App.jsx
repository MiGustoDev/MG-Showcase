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

// Calcula la duración en días/semanas/meses/años (formato legible: ej. "1 año - 4 meses")
const calcDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const start = new Date(y1, m1 - 1, d1, 0, 0, 0);
  const end = new Date(y2, m2 - 1, d2, 23, 59, 59);
  const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  if (diffDays === 1) return '1 día';
  if (diffDays < 30) {
    if (diffDays % 7 === 0) {
      const weeks = diffDays / 7;
      return `${weeks} semana${weeks > 1 ? 's' : ''}`;
    }
    return `${diffDays} días`;
  }

  // Meses calculados de forma precisa según calendario
  let totalMonths = (y2 - y1) * 12 + (m2 - m1);
  if (d2 - d1 >= 15) totalMonths += 1;
  else if (d1 - d2 >= 15) totalMonths -= 1;
  totalMonths = Math.max(1, totalMonths);

  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;

  if (years >= 1) {
    if (remMonths > 0) {
      return `${years} año${years > 1 ? 's' : ''} - ${remMonths} mes${remMonths > 1 ? 'es' : ''}`;
    }
    return `${years} año${years > 1 ? 's' : ''}`;
  }

  return `${totalMonths} mes${totalMonths > 1 ? 'es' : ''}`;
};

// Rango temporal global del timeline (desde 1 de Mayo 2025 hasta 31 de Octubre 2026)
const timelineStart = new Date('2025-05-01T00:00:00').getTime();
const timelineEnd = new Date('2026-10-31T23:59:59').getTime();
const totalTimelineSpan = timelineEnd - timelineStart;

// ---------- Timeline: helpers de layout ----------
const toTime = (d, endOfDay) => new Date(d + (endOfDay ? 'T23:59:59' : 'T00:00:00')).getTime();
const toPct = (t) => ((t - timelineStart) / totalTimelineSpan) * 100;

// Meses del eje (posición real según días de cada mes)
const axisMonths = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(2025, 4 + i, 1);
  return { key: i, label: MONTHS[d.getMonth()], left: toPct(d.getTime()), isJan: d.getMonth() === 0 };
}).map((m, i, arr) => ({ ...m, width: (arr[i + 1]?.left ?? 100) - m.left }));
const yearDivider = toPct(new Date(2026, 0, 1).getTime());
const todayPct = toPct(Date.now());
const showToday = todayPct > 0 && todayPct < 100;

const indexById = Object.fromEntries(sorted.map((p, i) => [p.id, i]));
const catCounts = Object.fromEntries(Object.keys(categories).map((k) => [k, sorted.filter((p) => p.cat === k).length]));

// Estimación del espacio visual del nombre (en % del tablero) para evitar colisiones
const LABEL_CHAR = 0.52;
const LABEL_PAD = 1.8;

function layoutItem(p) {
  const s = toTime(p.start);
  const e = toTime(p.end, true);
  const left = toPct(s);
  // Ancho REAL y estricto del proyecto según sus fechas exactas en el calendario
  const actualW = toPct(e) - left;
  // Ancho visible mínimo (0.7% ~10px) para que proyectos de 1 día sean visibles y clicables
  const barW = Math.max(0.7, actualW);
  // Ancho del texto para empaquetar filas evitando cualquier solapamiento
  const labelW = (p.name.length + 3) * LABEL_CHAR + LABEL_PAD;

  const vStart = left;
  // Si el texto desbordaría el borde derecho del tablero (100%), se ubica a la izquierda de la barra
  const flip = left + labelW > 98.5;
  const vEnd = flip ? (left + barW) : (left + Math.max(barW, labelW));
  const packedStart = flip ? Math.max(0, left - labelW) : vStart;

  return { p, left, actualW, barW, flip, vStart: packedStart, vEnd };
}

// Agrupa en filas los proyectos que no se solapan (respetando duración y etiquetas)
function pack(items) {
  const rows = [];
  items.forEach((it) => {
    let row = rows.find((r) => r.end + 0.8 < it.vStart);
    if (!row) { row = { end: -Infinity, items: [] }; rows.push(row); }
    row.items.push(it);
    row.end = it.vEnd;
  });
  return rows;
}

const tlItems = sorted.map(layoutItem);
const laneRows = Object.fromEntries(Object.keys(categories).map((k) => [k, pack(tlItems.filter((it) => it.p.cat === k))]));

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

function TlItem({ it, go, onHover, onLeave, active }) {
  const { p, barW, flip } = it;
  const idx = indexById[p.id];
  return (
    <button
      type="button"
      id={`tl-${p.id}`}
      className={`tl-item bar${flip ? ' is-flip' : ''}${active ? ' is-hover' : ''}`}
      style={{
        left: `${it.left}%`,
        width: `${barW}%`,
        '--c': categories[p.cat].color,
        animationDelay: `${idx * 28}ms`,
      }}
      onMouseEnter={(e) => onHover(p, e)}
      onMouseMove={(e) => onHover(p, e)}
      onMouseLeave={onLeave}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onHover(p, { clientX: r.left, clientY: r.bottom });
      }}
      onBlur={onLeave}
      onClick={() => go(idx + 2)}
      aria-label={`${p.name}: ${fmtDate(p.start)} a ${fmtDate(p.end)}`}
    >
      <span className="tl-label">{p.emoji} {p.name}</span>
    </button>
  );
}

function TlTooltip({ hover }) {
  const { p, x, y } = hover;
  const c = categories[p.cat];
  const W = 320;
  const H = 260;
  const left = x + W + 24 > window.innerWidth ? Math.max(12, x - W - 16) : x + 16;
  const top = y + H + 24 > window.innerHeight ? Math.max(12, y - H - 12) : y + 16;
  return (
    <div className="tl-tip" style={{ left, top, '--c': c.color }}>
      <span className="tl-tip-cat">{c.icon} {c.label}</span>
      <h4>{p.emoji} {p.name}</h4>
      <p>{p.tagline}</p>
      <div className="tl-tip-dates">
        <span>📅 {fmtDate(p.start)}{p.end !== p.start ? ` → ${fmtDate(p.end)}` : ''}</span>
        <b>{calcDuration(p.start, p.end)}</b>
      </div>
      <div className="tl-tip-stack">{p.stack.slice(0, 5).map((s) => <span key={s}>{s}</span>)}</div>
      <div className="tl-tip-cta">Click para abrir el proyecto →</div>
    </div>
  );
}

function Timeline({ go }) {
  const [view, setView] = useState('lanes');
  const [filter, setFilter] = useState('all');
  const [hover, setHover] = useState(null);

  const visible = filter === 'all' ? tlItems : tlItems.filter((it) => it.p.cat === filter);
  const onHover = (p, e) => setHover({ p, x: e.clientX, y: e.clientY });
  const onLeave = () => setHover(null);
  const renderItem = (it) => (
    <TlItem key={it.p.id} it={it} go={go} onHover={onHover} onLeave={onLeave} active={hover?.p.id === it.p.id} />
  );

  return (
    <section className="slide timeline">
      <header className="tl-head">
        <div>
          <p className="eyebrow">Recorrido 2025 — 2026</p>
          <h2>Línea de tiempo</h2>
        </div>
        <div className="tl-toggle" role="tablist" aria-label="Tipo de vista">
          <button id="tl-view-lanes" role="tab" aria-selected={view === 'lanes'} className={view === 'lanes' ? 'on' : ''} onClick={() => setView('lanes')}>☰ Por carriles</button>
          <button id="tl-view-chrono" role="tab" aria-selected={view === 'chrono'} className={view === 'chrono' ? 'on' : ''} onClick={() => setView('chrono')}>↘ Cronológica</button>
        </div>
      </header>

      <div className="tl-filters">
        <button id="tl-filter-all" className={`tl-chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          ✨ Todos <b>{sorted.length}</b>
        </button>
        {Object.entries(categories).map(([k, c]) => (
          <button key={k} id={`tl-filter-${k}`} className={`tl-chip ${filter === k ? 'on' : ''}`} style={{ '--c': c.color }} onClick={() => setFilter(k)}>
            {c.icon} {c.label} <b>{catCounts[k]}</b>
          </button>
        ))}
        <span className="tl-total">{visible.length} proyectos · May 2025 → Oct 2026</span>
      </div>

      <div className="tl-board">
        <div className="tl-scroll">
          <div className="tl-axis">
            <div className="tl-axis-inner">
              <span className="tl-year" style={{ left: 0 }}>2025</span>
              <span className="tl-year" style={{ left: `${yearDivider}%` }}>2026</span>
              {showToday && <span className="tl-today-tag" style={{ left: `${todayPct}%` }}>Hoy</span>}
              {axisMonths.map((m) => (
                <span key={m.key} className={`tl-month ${m.isJan ? 'jan' : ''}`} style={{ left: `${m.left}%`, width: `${m.width}%` }}>{m.label}</span>
              ))}
            </div>
          </div>

          <div className={`tl-canvas tl-${view}${hover ? ' has-hover' : ''}`} key={`${view}-${filter}`}>
            <div className="tl-grid" aria-hidden="true">
              <div className="tl-zone-2026" style={{ left: `${yearDivider}%` }} />
              {axisMonths.slice(1).map((m) => <i key={m.key} className={m.isJan ? 'year' : ''} style={{ left: `${m.left}%` }} />)}
              {showToday && <div className="tl-today" style={{ left: `${todayPct}%` }} />}
            </div>

            {view === 'lanes'
              ? Object.entries(categories)
                .filter(([k]) => filter === 'all' || filter === k)
                .map(([k, c]) => (
                  <div className="tl-lane" key={k} style={{ '--c': c.color }}>
                    <div className="tl-lane-head">
                      <span>{c.icon} {c.label}</span>
                      <small>{catCounts[k]} proyectos</small>
                    </div>
                    {laneRows[k].map((r, ri) => <div className="tl-row" key={ri}>{r.items.map(renderItem)}</div>)}
                  </div>
                ))
              : visible.map((it) => <div className="tl-row" key={it.p.id}>{renderItem(it)}</div>)}
          </div>
        </div>
      </div>

      {hover && <TlTooltip key={hover.p.id} hover={hover} />}
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
            <span className="duration-pill">{calcDuration(p.start, p.end)}</span>
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
  sorted.forEach((p) => p.stack.forEach((s) => { stack[s] = (stack[s] || 0) + 1; }));
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
