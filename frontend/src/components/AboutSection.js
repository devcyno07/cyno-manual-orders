import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import styles from './AboutSection.module.css';

function useInView(threshold = 0.12) {
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

export default function AboutSection() {
  const { t } = useLang();
  const a = t.about;
  const [secRef, visible] = useInView();

  const CERTS = [
    { code: 'GDP', name: a.cert1 },
    { code: 'ISO', name: a.cert2 },
    { code: 'Rx',  name: a.cert3 },
    { code: 'GMP', name: a.cert4 },
  ];

  // Double the strip items for seamless loop
  const stripItems = [...a.stripItems, ...a.stripItems];

  return (
    <section className={styles.about} id="about" ref={secRef}>
      <div className={styles.topStrip}>
        <div className={styles.stripInner}>
          {stripItems.map((item, i) => (
            <React.Fragment key={i}>
              <span className={styles.stripItem}>
                <span className={styles.stripCross}>✚</span>{item}
              </span>
              <span className={styles.stripDivider}>·</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className={styles.container}>
        <div className={`${styles.sectionLabel} ${visible ? styles.fadeIn : ''}`}>
          <div className={styles.labelLine} />
          <span>{a.sectionLabel}</span>
          <div className={styles.labelLine} />
        </div>

        <div className={`${styles.headingRow} ${visible ? styles.slideUp : ''}`}>
          <h2 className={styles.heading}>
            {a.heading1}<br />
            <em className={styles.italic}>{a.heading2}</em>
          </h2>
          <p className={styles.headingSub}>{a.headingSub}</p>
        </div>

        <div className={styles.twoCol}>
          <div className={`${styles.storyCol} ${visible ? styles.slideInLeft : ''}`}>
            <p className={styles.body}>{a.body1}</p>
            <p className={styles.body}>{a.body2}</p>
            <div className={styles.certGrid}>
              {CERTS.map(({ code, name }) => (
                <div className={styles.certCard} key={code}>
                  <span className={styles.certCode}>{code}</span>
                  <span className={styles.certName}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.timelineCol} ${visible ? styles.slideInRight : ''}`}>
            <h3 className={styles.timelineTitle}>{a.journeyTitle}</h3>
            <div className={styles.timeline}>
              {a.milestones.map((m, i) => (
                <div key={m.year}
                  className={`${styles.milestone} ${visible ? styles.milestoneIn : ''}`}
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <div className={styles.milestoneLeft}>
                    <span className={styles.milestoneYear}>{m.year}</span>
                    <div className={styles.milestoneConnector}>
                      <div className={styles.milestoneDot} />
                      {i < a.milestones.length - 1 && <div className={styles.milestoneLine} />}
                    </div>
                  </div>
                  <p className={styles.milestoneText}>{m.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.servicesTitle} ${visible ? styles.fadeIn : ''}`}>
          <h3>{a.servicesTitle}</h3>
        </div>
        <div className={styles.servicesGrid}>
          {a.services.map((s, i) => (
            <div key={s.title}
              className={`${styles.serviceCard} ${visible ? styles.serviceIn : ''}`}
              style={{ animationDelay: `${0.4 + i * 0.08}s` }}>
              <div className={styles.serviceIcon}>{s.icon}</div>
              <h4 className={styles.serviceTitle}>{s.title}</h4>
              <p className={styles.serviceDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.quoteStrip} ${visible ? styles.fadeIn : ''}`}>
        <div className={styles.quoteInner}>
          <span className={styles.quoteQmark}>"</span>
          <blockquote className={styles.quote}>{a.quote}</blockquote>
          <cite className={styles.quoteAuthor}>{a.quoteAuthor}</cite>
        </div>
      </div>
    </section>
  );
}
