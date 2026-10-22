import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sorted, categories, images, companyMilestones, seniorityProgression } from './projects';
import './App.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Audio sintético sutil para micro-interacciones (Web Audio API - punto 14)
let audioCtx = null;
const playSfx = (type = 'click') => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'slide') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'hover') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch {
    // Si el navegador bloquea audio, continúa silenciosamente
  }
};

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

// Contador numérico animado suave y visible estilo GSAP / Motion con delay y curva natural
function AnimatedNumber({ value, duration = 0.95, delay = 0.1, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const targetNum = typeof value === 'number' 
    ? value 
    : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;

  useEffect(() => {
    // Si se pasa en ms (> 10) se utiliza directo, si no en segundos
    const durMs = duration > 10 ? Math.min(duration, 1300) : Math.max(350, duration * 1000);
    const delMs = delay > 10 ? Math.min(delay, 300) : Math.max(0, delay * 1000);

    let startTime = null;
    let animationFrame = null;
    const timeout = setTimeout(() => {
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / durMs, 1);
        // easeOutCubic natural: velocidad visible y fluida, frena suave en el valor final
        const ease = 1 - Math.pow(1 - progress, 3);
        const rounded = targetNum % 1 !== 0 
          ? (targetNum * ease).toFixed(1) 
          : Math.round(targetNum * ease);
        const display = Math.abs(rounded) >= 1000 
          ? Number(rounded).toLocaleString('es-AR') 
          : rounded;
        setDisplayValue(display);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        }
      };
      animationFrame = requestAnimationFrame(step);
    }, delMs);

    return () => {
      clearTimeout(timeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [targetNum, duration, delay]);

  return <>{prefix}{displayValue}{suffix}</>;
}

// Rango temporal global del timeline (desde 1 de Mayo 2025 hasta 31 de Octubre 2026)
const timelineStart = new Date('2025-05-01T00:00:00').getTime();
const timelineEnd = new Date('2026-10-31T23:59:59').getTime();
const totalTimelineSpan = timelineEnd - timelineStart;

// Timeline helpers
const toTime = (d, endOfDay) => new Date(d + (endOfDay ? 'T23:59:59' : 'T00:00:00')).getTime();
const toPct = (t) => ((t - timelineStart) / totalTimelineSpan) * 100;

const axisMonths = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(2025, 4 + i, 1);
  return { key: i, label: MONTHS[d.getMonth()], left: toPct(d.getTime()), isJan: d.getMonth() === 0 };
}).map((m, i, arr) => ({ ...m, width: (arr[i + 1]?.left ?? 100) - m.left }));
const yearDivider = toPct(new Date(2026, 0, 1).getTime());
const todayPct = toPct(Date.now());
const showToday = todayPct > 0 && todayPct < 100;

const indexById = Object.fromEntries(sorted.map((p, i) => [p.id, i]));
const catCounts = Object.fromEntries(Object.keys(categories).map((k) => [k, sorted.filter((p) => p.cat === k).length]));

const LABEL_CHAR = 0.52;
const LABEL_PAD = 1.8;

function layoutItem(p) {
  const s = toTime(p.start);
  const e = toTime(p.end, true);
  const left = toPct(s);
  const actualW = toPct(e) - left;
  const barW = Math.max(0.7, actualW);
  const labelW = (p.name.length + 3) * LABEL_CHAR + LABEL_PAD;

  const vStart = left;
  const flip = left + labelW > 98.5;
  const vEnd = flip ? (left + barW) : (left + Math.max(barW, labelW));
  const packedStart = flip ? Math.max(0, left - labelW) : vStart;

  return { p, left, actualW, barW, flip, vStart: packedStart, vEnd };
}

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

// Paleta de colores oficiales por tecnología para hover interactivo
export const techColors = {
  'React': '#61DAFB',
  'Supabase': '#3ECF8E',
  'Tailwind CSS': '#38BDF8',
  'TypeScript': '#3178C6',
  'GSAP': '#88CE02',
  'Vite': '#bd34fe',
  'Python': '#4B8BBE',
  'SMTP': '#5aa9ff',
  'Framer Motion': '#FF0055',
  'Lucide': '#F56565',
  'Bootstrap': '#7952B3',
  'Three.js': '#049EF4',
  'EmailJS': '#FF7F00',
  'Mailchimp': '#FFE01B',
  'Web Speech API': '#FF4D4D',
  'Speech Synthesis': '#FFB020',
  'GUI': '#3dd6a5',
  'Tkinter GUI': '#00A8E8',
  'HTML Editor': '#E34F26',
  'CustomTkinter': '#1F6AA5',
  'Pandas': '#130754',
  'Threading': '#A0AEC0',
  'IMAP/SMTP': '#5aa9ff',
  'Phaser': '#8E44AD',
  'Howler.js': '#E67E22',
  'WebSockets': '#FF6B6B',
  'Offline Sync': '#3DD6A5',
  'Recharts': '#22B5BF',
  'Leaflet': '#199900',
  'BPM': '#FFB020',
};

// SLIDES INDEX:
// 0: Portada
// 1: Línea de tiempo interactiva
// 2: Hitos Clave de la Empresa
// 3 .. 12: Desarrollos 2025 (Fichas individuales de proyectos 2025)
// 13 .. 32: Desarrollos 2026 (Fichas individuales de proyectos 2026)
// 33: Retorno de Inversión (ROI) & Ahorro Operativo para Mi Gusto
// 34: Seniority & Evolución de Liderazgo (Semi Senior Technical Lead)
// 35: Cierre & Métricas Globales (Resumen de Capacidades & Stack)
// 36: Agradecimiento & Fin de la Presentación
const FIRST_2025_INDEX = 3;
const FIRST_2026_INDEX = FIRST_2025_INDEX + sorted.filter((p) => p.start.startsWith('2025')).length; // 13
const ROI_INDEX = FIRST_2025_INDEX + sorted.length; // 33
const SENIORITY_INDEX = ROI_INDEX + 1; // 34
const CLOSING_INDEX = SENIORITY_INDEX + 1; // 35
const THANKS_INDEX = CLOSING_INDEX + 1; // 36
const TOTAL = THANKS_INDEX + 1; // 37
const PROJECT_OFFSET = FIRST_2025_INDEX; // 3

function Cover({ go }) {
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
      <motion.div
        className="cover-content"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="brand-badge">
          <span className="brand-dot-pulse">
            <span className="brand-dot-core" />
            <span className="brand-dot-ring" />
          </span>
          <span className="brand-badge-company">Mi Gusto</span>
          <span className="brand-badge-divider">·</span>
          <span className="brand-badge-label">Desarrollos digitales & de infraestructura</span>
        </div>
        <h1>
          <AnimatedNumber value={sorted.length} delay={0.15} /> proyectos.<br />
          <span>Ecosistema & Resultados.</span>
        </h1>
        <p className="lead">De soluciones puntuales a la digitalización integral de planta, marketing y sucursales ({fmtMonthYear(sorted[0].start)} → Actualidad).</p>
        
        <div className="cover-quick-actions">
          <button className="btn-brand" onClick={() => { playSfx('click'); go(ROI_INDEX); }}>
            💰 Retorno de Inversión (ROI)
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(SENIORITY_INDEX); }}>
            ⭐ Ver Seniority
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(FIRST_2025_INDEX); }}>
            📅 Desarrollos
          </button>
        </div>

        <div className="stats">
          {counts.map((cat, idx) => (
            <motion.div
              key={cat.key}
              className="stat"
              style={{ '--c': cat.color }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => playSfx('hover')}
            >
              <div className="stat-top">
                <strong><AnimatedNumber value={cat.count} delay={0.35 + idx * 0.08} /></strong>
                <span className="stat-icon">{cat.icon}</span>
              </div>
              <div className="stat-info">
                <span className="stat-label">{cat.label}</span>
                <span className="stat-desc">{cat.desc}</span>
              </div>
              <div className="stat-bar-wrap">
                <div className="stat-bar-bg">
                  <motion.div
                    className="stat-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.pct}%` }}
                    transition={{ duration: 1.1, delay: 0.45 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: cat.color }}
                  />
                </div>
                <span className="stat-pct">
                  <AnimatedNumber value={cat.pct} suffix="%" delay={0.35 + idx * 0.08} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="cover-visual"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="cover-logo-wrapper">
          <img src="/logo.png" alt="Mi Gusto Logo" className="cover-logo" />
          <div className="glow-sphere" />
        </div>
      </motion.div>
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
        animationDelay: `${Math.min(idx * 12, 180)}ms`,
      }}
      onMouseEnter={(e) => { playSfx('hover'); onHover(p, e); }}
      onMouseMove={(e) => onHover(p, e)}
      onMouseLeave={onLeave}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onHover(p, { clientX: r.left, clientY: r.bottom });
      }}
      onBlur={onLeave}
      onClick={() => { playSfx('click'); go(idx + PROJECT_OFFSET); }}
      aria-label={`${p.name}: ${fmtDate(p.start)} a ${fmtDate(p.end)}`}
    >
      <span className="tl-label">{p.emoji} {p.name}</span>
    </button>
  );
}

function TlTooltip({ hover }) {
  const { p, x, y } = hover;
  const c = categories[p.cat];
  const W = 330;
  const H = 280;
  const left = x + W + 24 > window.innerWidth ? Math.max(12, x - W - 16) : x + 16;
  const top = y + H + 24 > window.innerHeight ? Math.max(12, y - H - 12) : y + 16;
  return (
    <div className="tl-tip" style={{ left, top, '--c': c.color }}>
      <span className="tl-tip-cat">{c.icon} {c.label}</span>
      <h4>{p.emoji} {p.name}</h4>
      <p>{p.tagline}</p>
      {p.impact && (
        <div className="tl-tip-impact">
          <b>📈 Impacto:</b> {p.impact}
        </div>
      )}
      <div className="tl-tip-dates">
        <span>📅 {fmtDate(p.start)}{p.end !== p.start ? ` → ${fmtDate(p.end)}` : ''}</span>
        <b>{calcDuration(p.start, p.end)}</b>
      </div>
      <div className="tl-tip-stack">{p.stack.slice(0, 5).map((s) => <span key={s}>{s}</span>)}</div>
      <div className="tl-tip-cta">Click para abrir ficha técnica y arquitectura →</div>
    </div>
  );
}

function Timeline({ go }) {
  const [view, setView] = useState('lanes');
  const [filter, setFilter] = useState('all');
  const [hover, setHover] = useState(null);
  const [showMilestones, setShowMilestones] = useState(true);

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
          <p className="eyebrow">Visión Temporal 2025 — 2026</p>
          <h2>Línea de tiempo de entregables</h2>
        </div>
        <div className="tl-actions">
          <button
            className={`btn-chip-toggle ${showMilestones ? 'active' : ''}`}
            onClick={() => { playSfx('click'); setShowMilestones(!showMilestones); }}
            title="Mostrar u ocultar los hitos estratégicos de la empresa en el tiempo"
          >
            🎯 {showMilestones ? 'Ocultar hitos empresa' : 'Superponer hitos empresa'}
          </button>
          <div className="tl-toggle" role="tablist" aria-label="Tipo de vista">
            <button id="tl-view-lanes" role="tab" aria-selected={view === 'lanes'} className={view === 'lanes' ? 'on' : ''} onClick={() => { playSfx('click'); setView('lanes'); }}>☰ Por carriles</button>
            <button id="tl-view-chrono" role="tab" aria-selected={view === 'chrono'} className={view === 'chrono' ? 'on' : ''} onClick={() => { playSfx('click'); setView('chrono'); }}>↘ Cronológica</button>
          </div>
        </div>
      </header>

      <div className="tl-filters">
        <button id="tl-filter-all" className={`tl-chip ${filter === 'all' ? 'on' : ''}`} onClick={() => { playSfx('click'); setFilter('all'); }}>
          ✨ Todos <b>{sorted.length}</b>
        </button>
        {Object.entries(categories).map(([k, c]) => (
          <button key={k} id={`tl-filter-${k}`} className={`tl-chip ${filter === k ? 'on' : ''}`} style={{ '--c': c.color }} onClick={() => { playSfx('click'); setFilter(k); }}>
            {c.icon} {c.label} <b>{catCounts[k]}</b>
          </button>
        ))}
        <span className="tl-total">{visible.length} proyectos · Mayo 2025 → Octubre 2026</span>
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

            {/* Marcadores de hitos estratégicos superpuestos */}
            {showMilestones && companyMilestones.map((m) => {
              const pos = toPct(toTime(m.date));
              return (
                <div
                  key={m.id}
                  className="tl-milestone-marker"
                  style={{ left: `${pos}%` }}
                  title={`${m.title} (${fmtDate(m.date)})`}
                  onClick={() => { playSfx('click'); go(2); }}
                >
                  <span className="marker-dot">{m.icon}</span>
                  <span className="marker-name">{m.title}</span>
                </div>
              );
            })}

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

// Slide: Retorno de Inversión (ROI) & Ahorro Operativo para Mi Gusto
function RoiSlide({ go }) {
  const roiKpis = [
    {
      color: '#3dd6a5',
      category: 'Desarrollo a Medida',
      icon: '💼',
      value: 55000,
      prefix: '+$',
      suffix: ' USD',
      equiv: '≈ $65.000.000 ARS',
      title: 'Ahorro en Fábricas de Software',
      desc: 'Costo promedio de mercado para diseñar, programar e integrar 30 plataformas web, móviles y tótems.',
      tag: '100% In-House sin Deuda',
    },
    {
      color: '#ffb020',
      category: 'Licencias & SaaS',
      icon: '🛡️',
      value: 5400,
      prefix: '+$',
      suffix: ' USD/año',
      equiv: '≈ $450 USD mensuales',
      title: 'Suscripciones SaaS Eliminadas',
      desc: 'Cartelería local por local (ScreenFlow), envíos masivos (MultiMail) y protocolos de cata (INF-D003).',
      tag: '$0 de Gasto Recurrente',
    },
    {
      color: '#38bdf8',
      category: 'Tiempo Operativo',
      icon: '⚡',
      value: 2400,
      prefix: '+',
      suffix: ' hs/año',
      equiv: '≈ 200 hs de trabajo / mes',
      title: 'Horas de Personal Optimizadas',
      desc: 'Facturación B2B automática (IAE), respuesta inicial (AutoAnswers) y reportes de planta central.',
      tag: 'Productividad Automatizada',
    },
    {
      color: '#ff4d4d',
      category: 'Time-to-Market',
      icon: '🚀',
      value: 3,
      prefix: '',
      suffix: 'x',
      equiv: '1 a 3 semanas por entrega',
      title: 'Agilidad de Despliegue en Vivo',
      desc: 'Frente a 3 a 6 meses de licitaciones, burocracia de contratos y demoras de proveedores externos.',
      tag: 'Soporte Directo Inmediato',
    },
  ];

  return (
    <section className="slide roi-slide">
      <header className="roi-header">
        <div className="brand-badge">
          <span className="brand-dot-pulse">
            <span className="brand-dot-core" style={{ background: '#3dd6a5', boxShadow: '0 0 8px #3dd6a5' }} />
            <span className="brand-dot-ring" style={{ background: 'rgba(61, 214, 165, 0.45)' }} />
          </span>
          <span className="brand-badge-company">Mi Gusto</span>
          <span className="brand-badge-divider">·</span>
          <span className="brand-badge-label">Eficiencia Financiera & Retorno de Inversión</span>
        </div>
        <h1>
          Retorno de Inversión (ROI) <span>& Ahorro Directo</span>
        </h1>
        <p className="lead">
          Cómo el desarrollo 100% in-house transformó costos operativos externos en activos tecnológicos propios, alta rentabilidad y soberanía digital.
        </p>
      </header>

      {/* 4 Métricas de Gran Impacto */}
      <div className="roi-grid-kpis">
        {roiKpis.map((kpi, idx) => (
          <motion.article
            key={idx}
            className="roi-kpi-card"
            style={{ '--c': kpi.color }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 + idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => playSfx('hover')}
          >
            <div>
              <div className="roi-card-top">
                <span className="roi-category-badge">
                  <span>●</span> {kpi.category}
                </span>
                <div className="roi-card-icon">{kpi.icon}</div>
              </div>

              <div className="roi-metric-row">
                <span className="roi-big-metric">
                  <AnimatedNumber value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} delay={0.12 + idx * 0.07} duration={0.9} />
                </span>
                <span className="roi-equiv-pill">{kpi.equiv}</span>
              </div>

              <h3 className="roi-card-title">{kpi.title}</h3>
              <p className="roi-card-desc">{kpi.desc}</p>
            </div>

            <div className="roi-card-tag">
              <span>✓</span> {kpi.tag}
            </div>
          </motion.article>
        ))}
      </div>

      {/* Comparativa Estratégica: Tercerizado vs In-House */}
      <div className="roi-comparison-wrapper">
        <motion.div
          className="roi-model-card external"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <div className="model-card-header">
            <span className="model-badge red">MODELO TERCERIZADO (AGENCIA)</span>
            <h4>Software Factory Externa</h4>
          </div>
          <ul className="model-list">
            <li>
              <span className="cross-icon">✕</span>
              <div>
                <strong>Costos Variables en Dólares:</strong> Cobro por hora, adicionales por cada ajuste menor y fees de mantenimiento mensual obligado.
              </div>
            </li>
            <li>
              <span className="cross-icon">✕</span>
              <div>
                <strong>Burocracia & Espera:</strong> Semanas para cotizar, demoras en tickets y nula respuesta en fines de semana o eventos.
              </div>
            </li>
            <li>
              <span className="cross-icon">✕</span>
              <div>
                <strong>Código Cautivo:</strong> Dependencia técnica forzada, servidores ajenos y falta de conocimiento de la cultura Mi Gusto.
              </div>
            </li>
          </ul>
        </motion.div>

        <motion.div
          className="roi-model-card inhouse"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <div className="model-card-header">
            <span className="model-badge green">MODELO PROPIO (EQUIPO IN-HOUSE)</span>
            <h4>Desarrollo Interno Mi Gusto</h4>
          </div>
          <ul className="model-list">
            <li>
              <span className="check-icon">✓</span>
              <div>
                <strong>Inversión Fija y Predecible:</strong> Desarrollo ilimitado de 30 plataformas con amortización directa sobre el sueldo interno.
              </div>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <div>
                <strong>Velocidad & Respuesta Viva:</strong> Despliegues en 1 a 3 semanas, soporte inmediato en planta, aperturas y eventos masivos (Lolla).
              </div>
            </li>
            <li>
              <span className="check-icon">✓</span>
              <div>
                <strong>Soberanía Tecnológica 100%:</strong> Todo el código fuente, datos y sistemas son propiedad exclusiva de Mi Gusto.
              </div>
            </li>
          </ul>
        </motion.div>
      </div>

      {/* Banner inferior de conclusión ejecutiva */}
      <motion.div
        className="roi-banner-modern"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.42 }}
      >
        <div className="banner-badge-terminal">
          <span className="terminal-dot" style={{ background: '#3dd6a5', boxShadow: '0 0 8px #3dd6a5' }} />
          <span style={{ color: '#3dd6a5' }}>BALANCE FINANCIERO POSITIVO</span>
        </div>
        <p className="roi-banner-statement">
          El equipo no representa un costo operativo, sino una <strong>unidad de alto retorno</strong> que amortizó con creces la inversión salarial de la empresa, generando ahorro permanente y soberanía tecnológica.
        </p>
        <div className="roi-quick-actions">
          <button className="btn-brand" onClick={() => { playSfx('click'); go(SENIORITY_INDEX); }}>
            ⭐ Ver Seniority →
          </button>
        </div>
      </motion.div>
    </section>
  );
}

// Slide: Evolución del Rol & Seniority (Semi Senior Technical Lead)
function SenioritySlide({ go }) {
  return (
    <section className="slide seniority-slide">
      <div className="seniority-header">
        <div className="brand-badge">
          <span className="brand-dot-pulse">
            <span className="brand-dot-core" />
            <span className="brand-dot-ring" />
          </span>
          <span className="brand-badge-company">Mi Gusto</span>
          <span className="brand-badge-divider">·</span>
          <span className="brand-badge-label">Evolución de Competencias & Seniority</span>
        </div>
        <h1>
          Progresión hacia <span>Semi Senior Technical Lead</span>
        </h1>
        <p className="seniority-subtitle">
          Trayectoria documentada de responsabilidades, autonomía técnica y aporte directo a los objetivos del negocio.
        </p>
      </div>

      <div className="seniority-grid">
        {seniorityProgression.map((item, idx) => (
          <motion.article
            key={idx}
            className="seniority-card"
            style={{ '--c': item.color }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => playSfx('hover')}
          >
            <div className="seniority-card-header">
              <div className="seniority-phase-row">
                <div className="seniority-phase-badge">
                  <span className="phase-num">FASE {item.phase || `0${idx + 1}`}</span>
                  <span className="phase-year">{item.period}</span>
                </div>
                <div className="seniority-icon-wrap">{item.icon || '⭐'}</div>
              </div>
              <h3 className="seniority-role">{item.role}</h3>
              <div className="seniority-tag-pill">{item.tag || item.stage}</div>
            </div>

            <div className="seniority-card-body">
              <div className="seniority-scope-box">
                <span className="scope-label">FOCO & ALCANCE</span>
                <p>{item.scope}</p>
              </div>

              <div className="seniority-achievements-title">Aportes Clave:</div>
              <ul className="seniority-achievements-list">
                {item.achievements?.map((ach, ai) => (
                  <li key={ai}>
                    <span className="achievement-check">✓</span>
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="seniority-banner-modern">
        <div className="banner-badge-terminal">
          <span className="terminal-dot" />
          <span>CRECIMIENTO & ROI</span>
        </div>
        <p className="banner-statement">
          Evolución sostenida de <strong>ejecutor fullstack a referente técnico</strong>: capacidad probada para transformar requerimientos de negocio en software productivo robusto sin dependencias externas.
        </p>
        <div className="banner-kpi-chip">
          <span>AUTONOMÍA INTEGRAL COMPROBADA</span>
        </div>
      </div>
    </section>
  );
}

const milestoneMeta = [
  {
    year: '2025',
    phase: '01',
    color: '#ff4d4d',
    tag: 'Web & Marca',
    highlights: ['Sitio Web Oficial React', 'Identidad & CDN Global'],
    scope: 'Fundación del ecosistema digital',
    kpi: '+120k visitas/mes',
  },
  {
    year: '2025',
    phase: '02',
    color: '#ffb020',
    tag: 'Marketing Masivo',
    highlights: ['Alianza Flamin Hot & IAE', 'Tráfico masivo concurrente'],
    scope: 'Tráfico viral & co-branding',
    kpi: 'Alta concurrencia',
  },
  {
    year: '2026',
    phase: '03',
    color: '#b070ff',
    tag: 'Innovación en Tiendas',
    highlights: ['Tótems táctiles MG Games', 'Llamadores realtime cocina'],
    scope: 'Hardware táctil & interactivos',
    kpi: 'Hardware en local',
  },
  {
    year: '2026',
    phase: '04',
    color: '#3dd6a5',
    tag: 'Industria 4.0',
    highlights: ['MES de planta industrial', 'Logística Orbital con GPS'],
    scope: 'Producción nuclear & stock',
    kpi: 'Industria & Logística',
  },
  {
    year: '2026',
    phase: '05',
    color: '#38bdf8',
    tag: 'Calidad & Personas',
    highlights: ['MG Capacitaciones BPM', 'AuditApp scoring sucursales'],
    scope: 'Auditoría en vivo y calidad',
    kpi: 'Gobierno operativo',
  },
];

// Slide 3: Hitos Estratégicos de la Empresa (2025 - 2026)
function MilestonesSlide() {
  return (
    <section className="slide milestones-slide">
      <header className="milestones-header">
        <div className="brand-badge">
          <span className="brand-dot-pulse">
            <span className="brand-dot-core" />
            <span className="brand-dot-ring" />
          </span>
          <span className="brand-badge-company">Mi Gusto</span>
          <span className="brand-badge-divider">·</span>
          <span className="brand-badge-label">Alineación Estratégica & Impacto Organizacional</span>
        </div>
        <h1>Hitos Clave de Mi Gusto <span>(2025 – 2026)</span></h1>
        <p className="lead">
          De soluciones puntuales a la digitalización integral: cómo el desarrollo in-house acompañó y potenció cada meta estratégica.
        </p>
      </header>

      <div className="milestones-track-wrapper">
        <div className="milestones-years-bar">
          <div className="year-capsule y2025">
            <span className="brand-dot-pulse">
              <span className="brand-dot-core" style={{ background: '#ff4d4d', boxShadow: '0 0 8px #ff4d4d' }} />
              <span className="brand-dot-ring" style={{ background: 'rgba(255, 77, 77, 0.45)' }} />
            </span>
            <span className="capsule-title"><strong>2025</strong> · Ecosistema Digital & Marketing Masivo</span>
            <span className="capsule-count">2 Hitos</span>
          </div>
          <div className="year-capsule y2026">
            <span className="brand-dot-pulse">
              <span className="brand-dot-core" style={{ background: '#3dd6a5', boxShadow: '0 0 8px #3dd6a5' }} />
              <span className="brand-dot-ring" style={{ background: 'rgba(61, 214, 165, 0.45)' }} />
            </span>
            <span className="capsule-title"><strong>2026</strong> · Escalamiento, Industria 4.0 & Operaciones en Vivo</span>
            <span className="capsule-count">3 Hitos</span>
          </div>
        </div>

        <div className="milestones-grid">
          {companyMilestones.map((m, idx) => {
            const meta = milestoneMeta[idx] || {};
            return (
              <motion.article
                key={m.id}
                className="milestone-card"
                style={{ '--c': meta.color }}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => playSfx('hover')}
              >
                <div className="milestone-card-body">
                  <div className="milestone-top">
                    <div className="milestone-phase">
                      <span className="phase-num">{meta.phase}</span>
                      <span className="phase-year">{meta.year}</span>
                    </div>
                    <div className="milestone-icon-wrap">
                      <span className="milestone-icon">{m.icon}</span>
                    </div>
                  </div>

                  <div className="milestone-meta">
                    <span className="milestone-cat" style={{ color: meta.color }}>
                      {m.category}
                    </span>
                    <span className="milestone-date">📅 {fmtDate(m.date)}</span>
                  </div>

                  <h3 className="milestone-title">{m.title}</h3>
                  <p className="milestone-desc">{m.desc}</p>

                  {meta.highlights && (
                    <ul className="milestone-deliverables">
                      {meta.highlights.map((h, hi) => (
                        <li key={hi}>
                          <span className="deliverable-bullet" style={{ color: meta.color }}>✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="milestone-footer">
                  <div className="milestone-scope">
                    <span className="scope-dot" style={{ background: meta.color }} />
                    <span>{meta.scope}</span>
                  </div>
                  {meta.kpi && <span className="milestone-kpi">{meta.kpi}</span>}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <div className="milestones-banner-modern">
        <div className="banner-badge-terminal">
          <span className="terminal-dot" />
          <span>MODELO OPERATIVO</span>
        </div>
        <p className="banner-statement">
          Cada hito se sostuvo en software desarrollado <strong>100% in-house</strong>: autonomía arquitectónica, cero costo de licencias externas y adaptabilidad inmediata al ritmo de la empresa.
        </p>
        <div className="banner-kpi-chip">
          <span>AGILIDAD & CONTROL TOTAL</span>
        </div>
      </div>
    </section>
  );
}

// Diccionario de métricas y gráficos para cada proyecto (Impacto de Negocio & Eficiencia)
export const projectKpis = {
  site: { value: 95, metric: '+120k', label: 'Visitas mensuales', type: 'donut', sublabel: 'Alcance Nacional' },
  autoanswers: { value: 75, metric: '-75%', label: 'Tiempo de respuesta', type: 'bar', sublabel: 'Automatizado' },
  translate: { value: 100, metric: '$0', label: 'Costo APIs cloud', type: 'donut', sublabel: 'Web Speech API' },
  flamin: { value: 92, metric: '+25.000', label: 'Usuarios semana 1', type: 'bar', sublabel: 'Co-Branding 3D' },
  multimail: { value: 100, metric: '100%', label: 'Ahorro en SaaS', type: 'donut', sublabel: 'Multi-SMTP' },
  massivemail: { value: 99.8, metric: '99.8%', label: 'Entregabilidad', type: 'bar', sublabel: '+5.000 emails' },
  crunchy: { value: 100, metric: '< 5s', label: 'Validación en caja', type: 'donut', sublabel: 'Zero Duplicados' },
  iae: { value: 100, metric: '100%', label: 'Automatización B2B', type: 'bar', sublabel: 'End-to-End' },
  influencers: { value: 95, metric: '100%', label: 'Trazabilidad canjes', type: 'donut', sublabel: 'Control PIN' },
  rooms: { value: 90, metric: '100%', label: 'In-house colaborativo', type: 'bar', sublabel: 'Tiempo Real' },
  games: { value: 96, metric: '+18.000', label: 'Partidas jugadas', type: 'bar', sublabel: 'Engagement Tótems' },
  ordercaller: { value: 75, metric: '3x', label: 'Velocidad mostrador', type: 'donut', sublabel: 'Zero Demoras' },
  golden: { value: 90, metric: '+90%', label: 'Retención Mi Gusto Lovers', type: 'bar', sublabel: 'Fidelización' },
  qr: { value: 100, metric: '$0', label: 'Costo de suscripción', type: 'donut', sublabel: 'Vectorial SVG' },
  lolla: { value: 100, metric: '100%', label: 'Operatividad Offline', type: 'donut', sublabel: 'Zero Downtime' },
  mes: { value: 30, metric: '-30%', label: 'Tiempos de reporte', type: 'bar', sublabel: 'Industria 4.0' },
  orbital: { value: 100, metric: '24/7', label: 'Trazabilidad GPS', type: 'donut', sublabel: 'Flota & Stock' },
  day: { value: 95, metric: '+10.000', label: 'Leads en 24hs', type: 'bar', sublabel: 'Alta Demanda' },
  degu: { value: 100, metric: '100%', label: 'Cupos cubiertos', type: 'donut', sublabel: 'Zero Sobreventa' },
  tech: { value: 98, metric: '+500', label: 'Activos IT auditados', type: 'bar', sublabel: 'Control Central' },
  sagrada: { value: 90, metric: '+85%', label: 'Engagement viral', type: 'bar', sublabel: 'Lanzamiento' },
  copa: { value: 98, metric: '98%', label: 'Participación BPM', type: 'donut', sublabel: 'Certificación Planta' },
  carta: { value: 100, metric: 'Instantáneo', label: 'Sincronización menú', type: 'donut', sublabel: 'Toda la Red' },
  capa: { value: 95, metric: '100%', label: 'Autogestión operarios', type: 'bar', sublabel: 'Onboarding' },
  roulette: { value: 92, metric: '+8.000', label: 'Clientes captados', type: 'bar', sublabel: 'Aperturas' },
  screenflow: { value: 100, metric: '$0', label: 'Costo cloud & software', type: 'donut', sublabel: 'Edición Local' },
  audit: { value: 60, metric: '-60%', label: 'Tiempo de auditoría', type: 'bar', sublabel: 'Calidad Sucursales' },
  consolidado: { value: 100, metric: '100%', label: 'Consolidación diaria', type: 'bar', sublabel: 'Directorio' },
  mgops: { value: 100, metric: '1 Hub', label: 'Portal unificado', type: 'donut', sublabel: 'Centralización' },
  sensorial: { value: 100, metric: '100%', label: 'Protocolo INF-D003', type: 'donut', sublabel: 'Catas Bromatología' },
};

// Mini Gráfico Donut (Torta circular animada con Motion)
function MiniDonut({ value, color = '#3dd6a5', size = 46 }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="mini-donut-wrap" style={{ width: size, height: size }} title={`${value}% de meta alcanzada`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="mini-donut-text">
        <AnimatedNumber value={value} suffix="%" delay={0.12} duration={0.95} />
      </span>
    </div>
  );
}

// Mini Barra de Progreso con animación de carga fluida
function MiniProgressBar({ value, color = '#3dd6a5' }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="mini-bar-wrap" title={`${value}% de eficiencia`}>
      <div className="mini-bar-labels">
        <span className="mini-bar-pct">
          <AnimatedNumber value={value} suffix="%" delay={0.12} duration={0.95} />
        </span>
        <span className="mini-bar-target">Meta alcanzada</span>
      </div>
      <div className="mini-bar-track">
        <motion.div
          className="mini-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// Slide de cada proyecto (Ficha interactiva en pantalla completa con scroll reveal)
function ProjectSlide({ p, i }) {
  const c = categories[p.cat];
  const shots = images[p.id] || [];
  const [zoom, setZoom] = useState(null);
  const year = p.start.slice(0, 4);
  const kpi = projectKpis[p.id];

  return (
    <div className="scroller" style={{ '--c': c.color }}>
      <section className="slide project">
        <div className="num">{String(i + 1).padStart(2, '0')}</div>
        <motion.div
          className="info"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        >
          <div className="project-tags-row">
            <div className="project-category-tag">
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </div>
            <span className="project-year-pill">{year}</span>
          </div>
          <h2>{p.name}</h2>
          <p className="tagline">{p.tagline}</p>
          <p className="desc">{p.desc}</p>

          {/* Punto 1: Impacto de Negocio y Métricas con Gráficos */}
          {p.impact && (
            <div className="project-callout impact-callout modern-impact-card">
              <div className="impact-card-top">
                <div className="callout-label">
                  <span className="impact-icon-badge">📈</span>
                  <strong>Impacto de Negocio & Eficiencia:</strong>
                </div>
                {kpi?.sublabel && (
                  <span className="impact-sublabel-pill">{kpi.sublabel}</span>
                )}
              </div>

              <div className="impact-card-content">
                {kpi && (
                  <div className="impact-visual-container">
                    {kpi.type === 'bar' ? (
                      <MiniProgressBar value={kpi.value} color="#3dd6a5" />
                    ) : (
                      <MiniDonut value={kpi.value} color="#3dd6a5" size={46} />
                    )}
                  </div>
                )}

                <div className="impact-text-container">
                  {kpi?.metric && (
                    <div className="impact-metric-row">
                      <span className="impact-metric-pill">{kpi.metric}</span>
                      <span className="impact-metric-title">{kpi.label}</span>
                    </div>
                  )}
                  <p className="impact-desc-text">{p.impact}</p>
                </div>
              </div>
            </div>
          )}

          {/* Punto 13: Arquitectura & Robustez Técnica */}
          {p.arch && (
            <div className="project-callout arch-callout">
              <div className="callout-label">
                <span>🛡️</span>
                <strong>Arquitectura & Robustez Técnica:</strong>
              </div>
              <p>{p.arch}</p>
            </div>
          )}

          <div className="chips">
            {p.stack.map((s) => (
              <span key={s} onMouseEnter={() => playSfx('hover')}>{s}</span>
            ))}
          </div>

          <p className="dates">
            📅 {fmtDate(p.start)}{p.end !== p.start ? ` → ${fmtDate(p.end)}` : ''}
            <span className="duration-pill">{calcDuration(p.start, p.end)}</span>
          </p>
        </motion.div>

        <motion.div
          className="visual"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
        >
          {shots[0] ? (
            <div className="hero-shot-container" onClick={() => { playSfx('click'); setZoom(shots[0]); }}>
              <img className="hero-shot" src={shots[0]} alt={p.name} />
              <div className="shot-zoom-hint">🔍 Clic para ampliar</div>
            </div>
          ) : (
            <div className="orb" onMouseEnter={() => playSfx('hover')}>{p.emoji}</div>
          )}
        </motion.div>
        {shots.length > 0 && <div className="scroll-hint">↓ Scrolleá para ver {shots.length} captura{shots.length > 1 ? 's' : ''}</div>}
      </section>

      {shots.length > 0 && (
        <section className="gallery">
          {shots.map((s, k) => (
            <motion.figure
              key={s}
              initial={{ opacity: 0, y: 35, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: (k % 4) * 0.08 }}
              onClick={() => { playSfx('click'); setZoom(s); }}
            >
              <img src={s} alt={`${p.name} captura ${k + 1}`} loading="lazy" />
            </motion.figure>
          ))}
        </section>
      )}

      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </div>
  );
}

function Closing({ go }) {
  const stack = {};
  sorted.forEach((p) => p.stack.forEach((s) => { stack[s] = (stack[s] || 0) + 1; }));
  const top = Object.entries(stack).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <section className="slide closing">
      <motion.div
        className="closing-content"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      >
        <p className="eyebrow">Resumen de Capacidades & Stack</p>
        <h1>Construyendo el futuro de <span>Mi Gusto</span></h1>
        
        <div className="closing-kpis">
          <motion.div
            className="kpi-box"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <strong><AnimatedNumber value={sorted.length} delay={0.05} duration={0.5} /></strong>
            <span>Proyectos Entregados</span>
          </motion.div>
          <motion.div
            className="kpi-box"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <strong><AnimatedNumber value={100} suffix="%" delay={0.08} duration={0.5} /></strong>
            <span>Desarrollo In-House</span>
          </motion.div>
          <motion.div
            className="kpi-box"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.11 }}
          >
            <strong><AnimatedNumber value={4} delay={0.11} duration={0.4} /></strong>
            <span>Áreas Clave Impactadas</span>
          </motion.div>
          <motion.div
            className="kpi-box"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
          >
            <strong><AnimatedNumber value={0} prefix="$" delay={0.14} duration={0.3} /></strong>
            <span>Dependencia de Agencias</span>
          </motion.div>
        </div>

        <div className="cloud-wrapper">
          <p className="cloud-title">Ecosistema Tecnológico Dominado</p>
          <div className="cloud">
            {top.map(([s, n], idx) => {
              const color = techColors[s] || '#ffb020';
              return (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 + idx * 0.025 }}
                  style={{
                    fontSize: `${1 + n / 7}rem`,
                    '--tech-c': color,
                  }}
                  onMouseEnter={() => playSfx('hover')}
                >
                  {s}
                  <motion.sup
                    initial={{ opacity: 0, y: -4, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, delay: 0.08 + idx * 0.025 }}
                  >
                    <AnimatedNumber value={n} delay={0.08 + idx * 0.025} duration={0.45} />
                  </motion.sup>
                </motion.span>
              );
            })}
          </div>
        </div>

        <div className="closing-cta">
          <button className="btn-brand" onClick={() => { playSfx('click'); go(THANKS_INDEX); }}>
            Agradecimiento & Cierre →
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(SENIORITY_INDEX); }}>
            Revisar Seniority
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(0); }}>
            Volver al Inicio
          </button>
        </div>
      </motion.div>
    </section>
  );
}

// Slide Final: Agradecimiento por el espacio & Cierre de la Presentación
function ThankYouSlide({ go }) {
  return (
    <section className="slide thank-slide">
      <motion.div
        className="thank-content"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      >
        <div className="brand-badge">
          <span className="brand-dot-pulse">
            <span className="brand-dot-core" />
            <span className="brand-dot-ring" />
          </span>
          <span className="brand-badge-company">Mi Gusto</span>
          <span className="brand-badge-divider">·</span>
          <span className="brand-badge-label">Fin de la Presentación</span>
        </div>

        <h1>
          ¡Muchas gracias por <span>el espacio!</span>
        </h1>
        <p className="thank-lead">
          Comprometido con seguir impulsando la digitalización integral, la autonomía arquitectónica y soluciones ágiles de alto impacto para todo el ecosistema Mi Gusto.
        </p>

        <div className="thank-cards-grid">
          <motion.div
            className="thank-card"
            style={{ '--c': '#ff4d4d' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            onMouseEnter={() => playSfx('hover')}
          >
            <div className="thank-card-icon">🚀</div>
            <h3>Innovación Continua</h3>
            <p>Evolución tecnológica constante adaptada a la velocidad y crecimiento comercial.</p>
          </motion.div>

          <motion.div
            className="thank-card"
            style={{ '--c': '#ffb020' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            onMouseEnter={() => playSfx('hover')}
          >
            <div className="thank-card-icon">🛡️</div>
            <h3>Autonomía & Robustez</h3>
            <p>Sistemas 100% in-house, sin costos de licenciamiento externo y control total.</p>
          </motion.div>

          <motion.div
            className="thank-card"
            style={{ '--c': '#3dd6a5' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
            onMouseEnter={() => playSfx('hover')}
          >
            <div className="thank-card-icon">🎯</div>
            <h3>Foco en el Negocio</h3>
            <p>Software alineado directamente con la eficiencia en planta, locales y ventas.</p>
          </motion.div>
        </div>

        <motion.div
          className="thank-footer-banner"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.48 }}
        >
          <div className="banner-badge-terminal">
            <span className="terminal-dot" />
            <span>DISPONIBILIDAD & COMPROMISO</span>
          </div>
          <p className="banner-statement">
            Espacio abierto para responder preguntas, profundizar en detalles técnicos de cualquier sistema o coordinar los próximos pasos.
          </p>
        </motion.div>

        <div className="thank-actions">
          <button className="btn-brand" onClick={() => { playSfx('click'); go(0); }}>
            🏠 Volver a la Portada
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(1); }}>
            📊 Ver Línea de Tiempo
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(SENIORITY_INDEX); }}>
            ⭐ Repasar Seniority
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(CLOSING_INDEX); }}>
            📈 Resumen de Capacidades
          </button>
        </div>
      </motion.div>

      <motion.div
        className="thank-visual"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        <div className="cover-logo-wrapper">
          <img src="/logo.png" alt="Mi Gusto Logo" className="thank-logo" />
          <div className="glow-sphere" />
        </div>
      </motion.div>
    </section>
  );
}

export default function App() {
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const go = useCallback((n) => {
    setIdx(Math.max(0, Math.min(TOTAL - 1, n)));
    setGrid(false);
    playSfx('slide');
  }, []);

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
      else if (e.key.toLowerCase() === 'h') go(2);
      else if (e.key === '1') go(FIRST_2025_INDEX);
      else if (e.key === '2') go(FIRST_2026_INDEX);
      else if (e.key.toLowerCase() === 'r') go(ROI_INDEX);
      else if (e.key.toLowerCase() === 's') go(SENIORITY_INDEX);
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
  if (idx === 0) content = <Cover go={go} />;
  else if (idx === 1) content = <Timeline go={go} />;
  else if (idx === 2) content = <MilestonesSlide go={go} />;
  else if (idx >= FIRST_2025_INDEX && idx < ROI_INDEX) {
    const pIdx = idx - FIRST_2025_INDEX;
    content = <ProjectSlide p={sorted[pIdx]} i={pIdx} />;
  }
  else if (idx === ROI_INDEX) content = <RoiSlide go={go} />;
  else if (idx === SENIORITY_INDEX) content = <SenioritySlide go={go} />;
  else if (idx === CLOSING_INDEX) content = <Closing go={go} />;
  else if (idx === THANKS_INDEX) content = <ThankYouSlide go={go} />;
  else content = <Cover go={go} />;

  return (
    <main className="deck">
      <div className="bg" />
      <div className="stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            className="stage-motion-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      {grid && (
        <div className="grid-overlay" onClick={() => setGrid(false)}>
          <div className="grid">
            <button className="grid-special-btn" onClick={() => go(0)}>
              <span>🏠</span>Portada
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(1)}>
              <span>📊</span>Línea de Tiempo
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(2)}>
              <span>🎯</span>Hitos de la Empresa
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(FIRST_2025_INDEX)}>
              <span>📅</span>Desarrollos 2025 ({sorted.filter((p) => p.start.startsWith('2025')).length})
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(FIRST_2026_INDEX)}>
              <span>🚀</span>Desarrollos 2026 ({sorted.filter((p) => p.start.startsWith('2026')).length})
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(ROI_INDEX)}>
              <span>💰</span>Retorno de Inversión (ROI) & Ahorro
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(SENIORITY_INDEX)}>
              <span>⭐</span>Seniority & Liderazgo
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(CLOSING_INDEX)}>
              <span>📈</span>Resumen de Capacidades
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(THANKS_INDEX)}>
              <span>🤝</span>Agradecimiento & Cierre
            </button>
            {sorted.map((p, i) => (
              <button key={p.id} style={{ '--c': categories[p.cat].color }} onClick={() => go(i + FIRST_2025_INDEX)}>
                <span>{p.emoji}</span>{p.name}<small>{fmtDate(p.start)}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="controls">
        <button id="prev" className="btn-nav" onClick={() => go(idx - 1)} aria-label="Anterior">←</button>
        <button id="timeline" className={idx === 1 ? 'active' : ''} onClick={() => go(1)}><span>📊</span> Timeline</button>
        <button id="milestones" className={idx === 2 ? 'active' : ''} onClick={() => go(2)}><span>🎯</span> Hitos</button>
        <button id="btn-2025" className={idx >= FIRST_2025_INDEX && idx < FIRST_2026_INDEX ? 'active' : ''} onClick={() => go(FIRST_2025_INDEX)}><span>📅</span> 2025</button>
        <button id="btn-2026" className={idx >= FIRST_2026_INDEX && idx < ROI_INDEX ? 'active' : ''} onClick={() => go(FIRST_2026_INDEX)}><span>🚀</span> 2026</button>
        <button id="btn-roi" className={idx === ROI_INDEX ? 'active' : ''} onClick={() => go(ROI_INDEX)}><span>💰</span> Retorno & Ahorro</button>
        <button id="seniority" className={idx === SENIORITY_INDEX ? 'active' : ''} onClick={() => go(SENIORITY_INDEX)}><span>⭐</span> Seniority</button>
        <span className="counter">
          <strong className="counter-current">{idx + 1}</strong>
          <span className="counter-sep">/</span>
          <span className="counter-total">{TOTAL}</span>
        </span>
        <button id="next" className="btn-nav" onClick={() => go(idx + 1)} aria-label="Siguiente">→</button>
      </nav>
      <motion.div
        className="progress"
        initial={false}
        animate={{ width: `${((idx + 1) / TOTAL) * 100}%` }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </main>
  );
}

