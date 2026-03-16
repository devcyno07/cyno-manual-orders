import React, { useEffect, useRef } from 'react';
import { useLang } from '../i18n/LangContext';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const { t } = useLang();
  const h = t.hero;
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, tick = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      [
        { a: 18, f: 0.012, ph: 0,    al: 0.15, lw: 2 },
        { a: 28, f: 0.008, ph: 1.2,  al: 0.08, lw: 3 },
        { a: 10, f: 0.020, ph: 2.4,  al: 0.20, lw: 1.5 },
      ].forEach(({ a, f, ph, al, lw }) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(13,148,136,${al})`;
        ctx.lineWidth = lw;
        for (let x = 0; x <= W; x++) {
          const y = H / 2 + a * Math.sin(f * x + tick + ph) + (a / 2) * Math.sin(2 * f * x + tick * 1.3 + ph);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      [[W * 0.15, H * 0.2],[W * 0.82, H * 0.35],[W * 0.65, H * 0.75],[W * 0.1, H * 0.8]].forEach(([cx, cy], i) => {
        const s = 6 + Math.sin(tick * 0.5 + i) * 2;
        const al = 0.06 + 0.04 * Math.sin(tick * 0.4 + i);
        ctx.strokeStyle = `rgba(13,148,136,${al})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke();
      });
      tick += 0.018;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className={styles.hero} id="hero">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.bgGrad} />
      <div className={styles.bgDots} />

      <div className={styles.container}>
        {/* Left */}
        <div className={styles.left}>
          <div className={styles.tag}>
            <span className={styles.tagDot} />
            {h.badge}
          </div>

          <h1 className={styles.headline}>
            {h.line1}<br />
            <em className={styles.tealItalic}>{h.line2}</em><br />
            {h.line3}
          </h1>

          <p className={styles.sub}>{h.sub}</p>

          <div className={styles.pillStrip}>
            {[h.pill1, h.pill2, h.pill3, h.pill4].map(p => (
              <span className={styles.pill} key={p}>
                <span className={styles.pillCheck}>✓</span> {p}
              </span>
            ))}
          </div>

          <div className={styles.ctas}>
            <button className={styles.primaryBtn} onClick={() => scrollTo('order')}>
              {h.cta1}
              <span className={styles.btnArrow}>→</span>
            </button>
            <button className={styles.secondaryBtn} onClick={() => scrollTo('products')}>
              {h.cta2}
            </button>
          </div>

          <div className={styles.stats}>
            {[
              { n: h.stat1n, l: h.stat1l },
              { n: h.stat2n, l: h.stat2l },
              { n: h.stat3n, l: h.stat3l },
              { n: h.stat4n, l: h.stat4l },
            ].map(({ n, l }) => (
              <div className={styles.stat} key={l}>
                <span className={styles.statNum}>{n}</span>
                <span className={styles.statLabel}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className={styles.right}>
          <div className={styles.mainCard}>
            <div className={styles.cardTopRow}>
              <div className={styles.cardCrossLarge}>✚</div>
              <div className={styles.cardStatus}>
                <span className={styles.statusDot} /> {h.cardStatus}
              </div>
            </div>
            <div className={styles.cardRx}>Rx</div>
            <h3 className={styles.cardTitle}>{h.cardRxTitle}</h3>
            <p className={styles.cardDesc}>{h.cardRxDesc}</p>
            <div className={styles.cardMeds}>
              {['Antibiotics','Cardiovascular','Diabetes Care','Oncology','Vitamins','Pain Relief'].map(m => (
                <span className={styles.medPill} key={m}>{m}</span>
              ))}
            </div>
          </div>

          <div className={`${styles.floatCard} ${styles.floatCard1}`}>
            <span className={styles.floatIcon}>🚚</span>
            <div>
              <div className={styles.floatTitle}>{h.float1t}</div>
              <div className={styles.floatSub}>{h.float1s}</div>
            </div>
          </div>
          <div className={`${styles.floatCard} ${styles.floatCard2}`}>
            <span className={styles.floatIcon}>🔬</span>
            <div>
              <div className={styles.floatTitle}>{h.float2t}</div>
              <div className={styles.floatSub}>{h.float2s}</div>
            </div>
          </div>
          <div className={`${styles.floatCard} ${styles.floatCard3}`}>
            <span className={styles.floatIcon}>💊</span>
            <div>
              <div className={styles.floatTitle}>{h.float3t}</div>
              <div className={styles.floatSub}>{h.float3s}</div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.bottomFade} />
    </section>
  );
}
