import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { fetchProducts } from '../services/api';
import styles from './ProductsSection.module.css';

function useInView(threshold = 0.08) {
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

const CAT_META = {
  'Prescription':    { icon: '📋', color: '#0d9488', bg: '#ccfbf1' },
  'OTC Medicines':   { icon: '💊', color: '#0891b2', bg: '#cffafe' },
  'Vitamins':        { icon: '🌿', color: '#16a34a', bg: '#dcfce7' },
  'Cardiac Care':    { icon: '❤️', color: '#dc2626', bg: '#fee2e2' },
  'Diabetes Care':   { icon: '🩸', color: '#9333ea', bg: '#f3e8ff' },
  'First Aid':       { icon: '🩹', color: '#ea580c', bg: '#ffedd5' },
  'Personal Care':   { icon: '🧴', color: '#0284c7', bg: '#e0f2fe' },
  'Baby & Mother':   { icon: '👶', color: '#db2777', bg: '#fce7f3' },
  'General':         { icon: '🏥', color: '#0d9488', bg: '#ccfbf1' },
};

export default function ProductsSection({ onOrderClick }) {
  const { t } = useLang();
  const p = t.products;
  const [secRef, visible] = useInView();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const categories = [p.filterAll, ...new Set(products.map(pr => pr.category || 'General'))];
  const filtered = activeFilter === p.filterAll
    ? products
    : products.filter(pr => (pr.category || 'General') === activeFilter);

  return (
    <section className={styles.products} id="products" ref={secRef}>
      <div className={styles.container}>
        {/* Header */}
        <div className={`${styles.header} ${visible ? styles.visible : ''}`}>
          <div className={styles.headerLeft}>
            <div className={styles.tag}>
              <span className={styles.tagCross}>✚</span>{p.tag}
            </div>
            <h2 className={styles.heading}>
              {p.heading1} <em className={styles.italic}>{p.heading2}</em><br />{p.heading3}
            </h2>
          </div>
          <div className={styles.headerRight}>
            <p className={styles.headerDesc}>{p.desc}</p>
            <div className={styles.stockBadge}>
              <span className={styles.stockDot} />
              <span>{p.stockBadge}</span>
            </div>
          </div>
        </div>

        {/* Category filter */}
        {!loading && (
          <div className={`${styles.filters} ${visible ? styles.visible : ''}`}>
            {categories.map(cat => {
              const meta = CAT_META[cat] || CAT_META['General'];
              return (
                <button key={cat}
                  className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterActive : ''}`}
                  style={activeFilter === cat && cat !== p.filterAll
                    ? { background: meta.bg, borderColor: meta.color, color: meta.color }
                    : activeFilter === cat
                    ? { background: 'var(--teal)', borderColor: 'var(--teal)', color: '#fff' }
                    : {}}
                  onClick={() => setActiveFilter(cat)}>
                  {cat !== p.filterAll && <span>{meta.icon}</span>}
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((prod, i) => {
              const meta = CAT_META[prod.category] || CAT_META['General'];
              return (
                <div key={prod.id}
                  className={`${styles.card} ${visible ? styles.cardIn : ''}`}
                  style={{ animationDelay: `${0.05 + (i % 6) * 0.07}s` }}>
                  {prod.category === 'Prescription' && (
                    <div className={styles.rxBadge}>Rx</div>
                  )}
                  <div className={styles.cardIconWrap} style={{ background: meta.bg }}>
                    <span className={styles.cardIconEmoji}>{meta.icon}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.cardCat} style={{ color: meta.color }}>
                      {prod.category || 'General'}
                    </span>
                    <h3 className={styles.cardName}>{prod.name}</h3>
                    {prod.description && <p className={styles.cardDesc}>{prod.description}</p>}
                  </div>
                  <div className={styles.cardFooter}>
                    <div>
                      <span className={styles.cardPrice}>${prod.price.toFixed(2)}</span>
                      <span className={styles.cardUnit}>{p.perUnit}</span>
                    </div>
                    <button className={styles.orderBtn} onClick={onOrderClick}>
                      {p.orderBtn} <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA banner */}
        <div className={`${styles.ctaBanner} ${visible ? styles.visible : ''}`}>
          <div className={styles.ctaBannerLeft}>
            <span className={styles.ctaBannerCross}>✚</span>
            <div>
              <p className={styles.ctaBannerTitle}>{p.ctaTitle}</p>
              <p className={styles.ctaBannerSub}>{p.ctaSub}</p>
            </div>
          </div>
          <button className={styles.ctaBannerBtn} onClick={onOrderClick}>
            {p.ctaBtn}
          </button>
        </div>
      </div>
    </section>
  );
}
