import { useEffect, useState, useCallback, useMemo } from 'react';
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

// SLIDES INDEX:
// 0: Portada
// 1: Línea de tiempo (con filtro opcional de hitos)
// 2: Seniority & Evolución de Liderazgo (Punto 2 para RRHH)
// 3: Hitos Estratégicos de la Compañía (Punto 9 aparte)
// 4 .. 4 + sorted.length - 1: Fichas de Proyectos (con Impacto & Arquitectura)
// 4 + sorted.length: Cierre & Métricas Globales
const PROJECT_OFFSET = 4;
const TOTAL = sorted.length + 5;

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
      <div className="cover-content">
        <div className="brand-badge">
          <span className="brand-dot-pulse">
            <span className="brand-dot-core" />
            <span className="brand-dot-ring" />
          </span>
          <span className="brand-badge-company">Mi Gusto</span>
          <span className="brand-badge-divider">·</span>
          <span className="brand-badge-label">Desarrollos digitales & de infraestructura</span>
        </div>
        <h1>{sorted.length} proyectos.<br /><span>Ecosistema & Resultados.</span></h1>
        <p className="lead">De soluciones puntuales a la digitalización integral de planta, marketing y sucursales ({fmtMonthYear(sorted[0].start)} → Actualidad).</p>
        
        <div className="cover-quick-actions">
          <button className="btn-brand" onClick={() => { playSfx('click'); go(2); }}>
            ⭐ Ver Evolución de Seniority
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(1); }}>
            📅 Desarrollos 2025
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(3); }}>
            🚀 Desarrollos 2026
          </button>
        </div>

        <div className="stats">
          {counts.map((cat) => (
            <div key={cat.key} className="stat" style={{ '--c': cat.color }} onMouseEnter={() => playSfx('hover')}>
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
        <div className="cover-logo-wrapper">
          <img src="/logo.png" alt="Mi Gusto Logo" className="cover-logo" />
          <div className="glow-sphere" />
        </div>
      </div>
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
        animationDelay: `${idx * 22}ms`,
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
                  onClick={() => { playSfx('click'); go(3); }}
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

// Slide 2: Evolución del Rol & Seniority (Punto 2)
function SenioritySlide({ go }) {
  return (
    <section className="slide seniority-slide">
      <div className="slide-header">
        <p className="eyebrow">Talento · Evolución de Competencias & Liderazgo</p>
        <h2>Progresión hacia Senior Technical Lead</h2>
        <p className="slide-subtitle">Trayectoria documentada de responsabilidades, autonomía arquitectónica y aporte directo al negocio.</p>
      </div>

      <div className="seniority-grid">
        {seniorityProgression.map((item, idx) => (
          <div key={idx} className="seniority-card" onMouseEnter={() => playSfx('hover')}>
            <div className="card-phase">Fase 0{idx + 1}</div>
            <div className="card-period">{item.period}</div>
            <h3>{item.role}</h3>
            <p className="card-stage">{item.stage}</p>
            <div className="card-scope">
              <b>Alcance y foco:</b> {item.scope}
            </div>
            <ul className="card-achievements">
              {item.achievements?.map((ach, ai) => (
                <li key={ai}>
                  <span className="check-icon">✓</span>
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="seniority-footer">
        <div className="seniority-badge">
          <b>Autonomía de Entrega:</b> Del requerimiento inicial al despliegue productivo y soporte en locales.
        </div>
        <div className="seniority-badge highlight">
          <b>ROI para Mi Gusto:</b> Cero dependencia de agencias externas y software adaptado 100% al ADN de la empresa.
        </div>
      </div>
    </section>
  );
}

// Slide 3: Hitos Estratégicos de la Empresa (Punto 9 aparte)
function MilestonesSlide({ go }) {
  return (
    <section className="slide milestones-slide">
      <div className="slide-header">
        <p className="eyebrow">Alineación Estratégica · Impacto Organizacional</p>
        <h2>Hitos Clave de Mi Gusto (2025 – 2026)</h2>
        <p className="slide-subtitle">Cómo el desarrollo tecnológico acompañó y potenció cada meta comercial y operativa de la compañía.</p>
      </div>

      <div className="milestones-timeline">
        {companyMilestones.map((m, idx) => (
          <div key={m.id} className="milestone-node" onMouseEnter={() => playSfx('hover')}>
            <div className="node-icon-wrapper">
              <span className="node-icon">{m.icon}</span>
              <span className="node-line" />
            </div>
            <div className="node-content">
              <div className="node-meta">
                <span className="node-category">{m.category}</span>
                <span className="node-date">📅 {fmtDate(m.date)}</span>
              </div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="milestones-banner">
        <span>💡 Cada hito se sostuvo en software propio, garantizando flexibilidad, velocidad de respuesta y control total de datos.</span>
        <button className="btn-brand" onClick={() => { playSfx('click'); go(1); }}>
          Ver en el Timeline →
        </button>
      </div>
    </section>
  );
}

// Slide: Catálogo de Desarrollos por Año (2025 / 2026)
function YearProjectsSlide({ year, go }) {
  const [filter, setFilter] = useState('all');

  const yearProjects = sorted.filter((p) => p.start.startsWith(String(year)));
  const visible = filter === 'all' ? yearProjects : yearProjects.filter((p) => p.cat === filter);

  const countsByCat = Object.fromEntries(
    Object.keys(categories).map((k) => [k, yearProjects.filter((p) => p.cat === k).length])
  );

  return (
    <section className="slide year-slide">
      <header className="year-header">
        <div className="year-title-block">
          <div className="year-eyebrow-row">
            <span className="year-badge">PORTAFOLIO ANUAL · MI GUSTO SISTEMAS</span>
            <button className="year-back-btn" onClick={() => { playSfx('click'); go(0); }}>
              ← Volver a Portada
            </button>
          </div>
          <h2>Desarrollos <span>{year}</span></h2>
          <p className="year-subtitle">
            {year === 2025
              ? '10 desarrollos · Fundación digital, herramientas internas de automatización y primeras campañas masivas (Mayo — Noviembre 2025).'
              : '20 desarrollos · Transformación industrial (MES, Planta), sucursales en vivo, eventos masivos y consolidación operativa (Febrero — Actualidad).'}
          </p>
        </div>

        <div className="year-switcher">
          <button
            className={`year-switch-btn ${year === 2025 ? 'active' : ''}`}
            onClick={() => { playSfx('click'); go(1); }}
          >
            📅 Desarrollos 2025 <b>10</b>
          </button>
          <button
            className={`year-switch-btn ${year === 2026 ? 'active' : ''}`}
            onClick={() => { playSfx('click'); go(3); }}
          >
            🚀 Desarrollos 2026 <b>20</b>
          </button>
        </div>
      </header>

      <div className="year-filters">
        <button
          className={`year-chip ${filter === 'all' ? 'on' : ''}`}
          onClick={() => { playSfx('click'); setFilter('all'); }}
        >
          ✨ Todos <b>{yearProjects.length}</b>
        </button>
        {Object.entries(categories).map(([k, c]) => {
          const count = countsByCat[k] || 0;
          if (count === 0) return null;
          return (
            <button
              key={k}
              className={`year-chip ${filter === k ? 'on' : ''}`}
              style={{ '--c': c.color }}
              onClick={() => { playSfx('click'); setFilter(k); }}
            >
              {c.icon} {c.label} <b>{count}</b>
            </button>
          );
        })}
      </div>

      <div className="year-grid-container">
        <div className="year-grid">
          {visible.map((p) => {
            const cat = categories[p.cat];
            const projectIdx = indexById[p.id];
            return (
              <div
                key={p.id}
                className="year-card"
                style={{ '--c': cat.color }}
                onClick={() => { playSfx('click'); go(projectIdx + PROJECT_OFFSET); }}
                onMouseEnter={() => playSfx('hover')}
              >
                <div className="year-card-top">
                  <div className="year-card-header">
                    <span className="year-card-emoji">{p.emoji}</span>
                    <div className="year-card-names">
                      <h4>{p.name}</h4>
                      <span className="year-card-cat" style={{ color: cat.color }}>
                        {cat.icon} {cat.label}
                      </span>
                    </div>
                  </div>
                  <span className="year-card-duration">{calcDuration(p.start, p.end)}</span>
                </div>

                <p className="year-card-tagline">{p.tagline}</p>

                {p.impact && (
                  <div className="year-card-impact">
                    <b>📈</b> <span>{p.impact}</span>
                  </div>
                )}

                <div className="year-card-footer">
                  <div className="year-card-stack">
                    {p.stack.slice(0, 3).map((st) => (
                      <span key={st}>{st}</span>
                    ))}
                    {p.stack.length > 3 && <span className="more">+{p.stack.length - 3}</span>}
                  </div>
                  <span className="year-card-cta">Ver ficha →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Slide de cada proyecto (con Puntos 1, 13 y 14)
function ProjectSlide({ p, i }) {
  const c = categories[p.cat];
  const shots = images[p.id] || [];
  const [zoom, setZoom] = useState(null);

  return (
    <div className="scroller" style={{ '--c': c.color }}>
      <section className="slide project">
        <div className="num">{String(i + 1).padStart(2, '0')}</div>
        <div className="info">
          <div className="project-category-tag">
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </div>
          <h2>{p.name}</h2>
          <p className="tagline">{p.tagline}</p>
          <p className="desc">{p.desc}</p>

          {/* Punto 1: Impacto de Negocio y Métricas */}
          {p.impact && (
            <div className="project-callout impact-callout">
              <div className="callout-label">
                <span>📈</span>
                <strong>Impacto de Negocio & Eficiencia:</strong>
              </div>
              <p>{p.impact}</p>
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
        </div>

        <div className="visual">
          {shots[0] ? (
            <div className="hero-shot-container" onClick={() => { playSfx('click'); setZoom(shots[0]); }}>
              <img className="hero-shot" src={shots[0]} alt={p.name} />
              <div className="shot-zoom-hint">🔍 Clic para ampliar</div>
            </div>
          ) : (
            <div className="orb" onMouseEnter={() => playSfx('hover')}>{p.emoji}</div>
          )}
        </div>
        {shots.length > 0 && <div className="scroll-hint">↓ Scrolleá para ver {shots.length} captura{shots.length > 1 ? 's' : ''}</div>}
      </section>

      {shots.length > 0 && (
        <section className="gallery">
          {shots.map((s, k) => (
            <figure key={s} style={{ animationDelay: `${k * 60}ms` }} onClick={() => { playSfx('click'); setZoom(s); }}>
              <img src={s} alt={`${p.name} captura ${k + 1}`} loading="lazy" />
            </figure>
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
      <div className="closing-content">
        <p className="eyebrow">Resumen de Capacidades & Stack</p>
        <h1>Construyendo el futuro de <span>Mi Gusto</span></h1>
        
        <div className="closing-kpis">
          <div className="kpi-box">
            <strong>{sorted.length}</strong>
            <span>Proyectos Entregados</span>
          </div>
          <div className="kpi-box">
            <strong>100%</strong>
            <span>Desarrollo In-House</span>
          </div>
          <div className="kpi-box">
            <strong>4</strong>
            <span>Áreas Clave Impactadas</span>
          </div>
          <div className="kpi-box">
            <strong>0$</strong>
            <span>Dependencia de Agencias</span>
          </div>
        </div>

        <div className="cloud-wrapper">
          <p className="cloud-title">Ecosistema Tecnológico Dominado</p>
          <div className="cloud">
            {top.map(([s, n]) => (
              <span key={s} style={{ fontSize: `${1 + n / 7}rem` }} onMouseEnter={() => playSfx('hover')}>
                {s}<sup>{n}</sup>
              </span>
            ))}
          </div>
        </div>

        <div className="closing-cta">
          <button className="btn-brand" onClick={() => { playSfx('click'); go(2); }}>
            Revisar Evolución de Seniority
          </button>
          <button className="btn-secondary" onClick={() => { playSfx('click'); go(0); }}>
            Volver al Inicio
          </button>
        </div>
      </div>
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
      else if (e.key.toLowerCase() === 's') go(2);
      else if (e.key.toLowerCase() === 'h') go(3);
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
  else if (idx === 1) content = <YearProjectsSlide year={2025} go={go} />;
  else if (idx === 2) content = <SenioritySlide go={go} />;
  else if (idx === 3) content = <YearProjectsSlide year={2026} go={go} />;
  else if (idx === TOTAL - 1) content = <Closing go={go} />;
  else content = <ProjectSlide p={sorted[idx - PROJECT_OFFSET]} i={idx - PROJECT_OFFSET} />;

  return (
    <main className="deck">
      <div className="bg" />
      <div className="stage" key={idx}>{content}</div>

      {grid && (
        <div className="grid-overlay" onClick={() => setGrid(false)}>
          <div className="grid">
            <button className="grid-special-btn" onClick={() => go(0)}>
              <span>🏠</span>Portada
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(1)}>
              <span>📅</span>Desarrollos 2025
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(2)}>
              <span>⭐</span>Seniority & Liderazgo
            </button>
            <button className="grid-special-btn highlight" onClick={() => go(3)}>
              <span>🚀</span>Desarrollos 2026
            </button>
            {sorted.map((p, i) => (
              <button key={p.id} style={{ '--c': categories[p.cat].color }} onClick={() => go(i + PROJECT_OFFSET)}>
                <span>{p.emoji}</span>{p.name}<small>{fmtDate(p.start)}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="controls">
        <button id="prev" className="btn-nav" onClick={() => go(idx - 1)} aria-label="Anterior">←</button>
        <button id="btn-2025" className={idx === 1 ? 'active' : ''} onClick={() => go(1)}><span>📅</span> 2025</button>
        <button id="seniority" className={idx === 2 ? 'active' : ''} onClick={() => go(2)}><span>⭐</span> Seniority</button>
        <button id="btn-2026" className={idx === 3 ? 'active' : ''} onClick={() => go(3)}><span>🚀</span> 2026</button>
        <span className="counter">
          <strong className="counter-current">{idx + 1}</strong>
          <span className="counter-sep">/</span>
          <span className="counter-total">{TOTAL}</span>
        </span>
        <button id="next" className="btn-nav" onClick={() => go(idx + 1)} aria-label="Siguiente">→</button>
      </nav>
      <div className="progress" style={{ width: `${((idx + 1) / TOTAL) * 100}%` }} />
    </main>
  );
}

