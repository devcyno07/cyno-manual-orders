import React, { useRef, useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import styles from './OrderSection.module.css';
import OrderForm from '../pages/OrderForm';

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
          <div className={styles.headerRight}>
            {o.trust.map(({ icon, title, desc }) => (
              <div className={styles.trustCard} key={title}>
                <span className={styles.trustIcon}>{icon}</span>
                <div>
                  <div className={styles.trustTitle}>{title}</div>
                  <div className={styles.trustDesc}>{desc}</div>
                </div>
              </div>
            ))}
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
              <div className={styles.footerLogoName}>MediCare Pharmacy</div>
              <div className={styles.footerLogoSub}>Licensed & GDP Certified</div>
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
