import React, { useRef, useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import styles from './OrderSection.module.css';
import OrderForm from '../pages/OrderForm';

function AnimatedCanvas() {
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
        { a: 22, f: 0.010, ph: 0,   al: 0.12, lw: 2 },
        { a: 35, f: 0.006, ph: 1.5, al: 0.07, lw: 3 },
        { a: 14, f: 0.018, ph: 2.8, al: 0.16, lw: 1.5 },
        { a: 50, f: 0.004, ph: 0.8, al: 0.04, lw: 4 },
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
      // Floating cross markers
      [[W*0.08,H*0.15],[W*0.92,H*0.25],[W*0.5,H*0.85],[W*0.75,H*0.6],[W*0.2,H*0.7]].forEach(([cx,cy],i) => {
        const s = 5 + Math.sin(tick*0.5+i)*2;
        const al = 0.05 + 0.04*Math.sin(tick*0.4+i);
        ctx.strokeStyle = `rgba(13,148,136,${al})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx-s,cy); ctx.lineTo(cx+s,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-s); ctx.lineTo(cx,cy+s); ctx.stroke();
      });
      // Floating circles
      [[W*0.3,H*0.2],[W*0.7,H*0.8],[W*0.85,H*0.45]].forEach(([cx,cy],i) => {
        const r = 40 + Math.sin(tick*0.3+i)*10;
        const al = 0.03 + 0.02*Math.sin(tick*0.4+i);
        ctx.strokeStyle = `rgba(13,148,136,${al})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
      });
      tick += 0.014;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className={styles.canvas} />;
}

function useInView(threshold = 0.05) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

export default function OrderSection() {
  const { t } = useLang();
  const o = t.orderSection;
  const [secRef, visible] = useInView();

  return (
    <section className={styles.orderSection} id="order" ref={secRef}>
      <AnimatedCanvas />
      <div className={styles.bgGrad} />
      <div className={styles.bgDots} />
      <div className={styles.topWave}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,0 L0,0 Z" fill="#f0fdfa" />
        </svg>
      </div>

      <div className={styles.container}>
        <div className={`${styles.header} ${visible ? styles.visible : ''}`}>
          <div className={styles.headerLeft}>
            <div className={styles.tag}><span>✚</span> {o.tag}</div>
            <h2 className={styles.heading}>
              {o.heading1}<br />
              <em className={styles.italic}>{o.heading2}</em>
            </h2>
            <p className={styles.sub}>{o.sub}</p>
          </div>
        </div>

        <div className={`${styles.rxNotice} ${visible ? styles.visible : ''}`}>
          <span className={styles.rxNoticeIcon}>📋</span>
          <div>{o.rxNotice}</div>
        </div>

        <div className={`${styles.formWrap} ${visible ? styles.formIn : ''}`}>
          <OrderForm embedded />
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <div className={styles.footerLogoIcon}>✚</div>
            <div>
              <div className={styles.footerLogoName}>Cyno Pharmacy</div>
              <div className={styles.footerLogoSub}>Licensed & ISO Certified</div>
            </div>
          </div>
          <div className={styles.footerContact}>
            <span>{o.footerPhone}</span>
            <span>{o.footerEmail}</span>
            <span>{o.footerHours}</span>
          </div>
          <div className={styles.footerMeta}>
            <span>{o.footerCopy}</span>
            <span>·</span>
            <span>{o.footerPrivacy}</span>
            <span>·</span>
            <span>{o.footerTerms}</span>
          </div>
        </div>
        <div className={styles.footerDisclaimer}>{o.disclaimer}</div>
      </footer>
    </section>
  );
}
