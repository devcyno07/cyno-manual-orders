import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { lang, toggle, t } = useLang();
  const n = t.nav;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.inner}>

        {/* Logo */}
        <div className={styles.logo} onClick={() => scrollTo('hero')}>
          <div className={styles.logoIcon}><span className={styles.cross}>✚</span></div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>Cyno</span>
            <span className={styles.logoTagline}>Manual Orders</span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className={styles.links}>
          {[
            [n.home,     'hero'],
            [n.about,    'about'],
            [n.products, 'products'],
            [n.order,    'order'],
          ].map(([label, id]) => (
            <button key={id} className={styles.link} onClick={() => scrollTo(id)}>
              {label}
            </button>
          ))}
          <button className={styles.ctaBtn} onClick={() => scrollTo('order')}>
            {n.orderNow}
            <span className={styles.ctaIcon}>→</span>
          </button>
        </nav>

        {/* Right side controls */}
        <div className={styles.rightControls}>
          {/* 24/7 badge */}
          <div className={styles.emergencyBadge}>
            <span className={styles.emergencyDot} />
            <span>{n.available}</span>
          </div>

          {/* Language switcher */}
          <button
            className={styles.langBtn}
            onClick={toggle}
            title={lang === 'en' ? '切换到中文' : 'Switch to English'}
            aria-label="Toggle language"
          >
            <span className={styles.langFlag}>{lang === 'en' ? '🇨🇳' : '🇬🇧'}</span>
            <span className={styles.langLabel}>{lang === 'en' ? '中文' : 'EN'}</span>
          </button>
        </div>

        {/* Hamburger */}
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileOpen : ''}`}>
        {[
          [n.home,        'hero'],
          [n.about,       'about'],
          [n.products,    'products'],
          [n.orderNow,    'order'],
        ].map(([label, id]) => (
          <button key={id} className={styles.mobileLink} onClick={() => scrollTo(id)}>
            {label}
          </button>
        ))}
        {/* Mobile lang toggle */}
        <button className={styles.mobileLangBtn} onClick={toggle}>
          {lang === 'en' ? '🇨🇳 切换到中文' : '🇬🇧 Switch to English'}
        </button>
      </div>
    </header>
  );
}
