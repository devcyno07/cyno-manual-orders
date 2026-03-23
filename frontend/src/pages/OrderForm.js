import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProducts, fetchBankDetails, submitOrder } from '../services/api';
import { useLang } from '../i18n/LangContext';
import styles from './OrderForm.module.css';

const COUNTRIES = [
  'Bangladesh','China','India','United States','United Kingdom','Canada',
  'Australia','UAE','Germany','France','Singapore','Nigeria','Kenya',
  'South Africa','Brazil','Mexico','Japan','South Korea','Indonesia','Philippines',
];

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const CheckSvg = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Spinner = () => <span className={styles.spinner} />;

function Field({ label, error, required, hint, children }) {
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.req}>*</span>}
        {hint && <span className={styles.hint}>{hint}</span>}
      </label>
      {children}
      {error && (
        <span className={styles.errorMsg}>
          <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={12} />
          {error}
        </span>
      )}
    </div>
  );
}

function Input({ error, ...props }) {
  return <input className={`${styles.input} ${error ? styles.inputError : ''}`} {...props} />;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button type="button" className={styles.copyBtn} onClick={copy} title="Copy">
      {copied
        ? <CheckSvg size={12} />
        : <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" size={12} />}
    </button>
  );
}

function SectionHeader({ number, icon, title, sub }) {
  return (
    <div className={styles.sectionHeader}>
      {number && <div className={styles.sectionNum}>{number}</div>}
      <div className={styles.sectionTitleIcon}>{icon}</div>
      <div>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {sub && <p className={styles.sectionSub}>{sub}</p>}
      </div>
    </div>
  );
}

function SuccessScreen({ result, email, onReset, f }) {
  return (
    <div className={styles.successWrap}>
      <div className={styles.successRing}>
        <span className={styles.ripple} />
        <span className={styles.ripple2} />
        <div className={styles.successCheck}><CheckSvg size={28} /></div>
      </div>
      <h2 className={styles.successTitle}>{f.successTitle}</h2>
      <p className={styles.successSub}>
        {f.successSub1} <strong className={styles.successEmail}>{email}</strong>{f.successSub2}
      </p>
      <div className={styles.successMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>{f.orderId}</span>
          <span className={styles.metaVal}>{result.orderId}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>{f.total}</span>
          <span className={styles.metaVal}>${result.totalAmount?.toFixed(2)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaKey}>{f.status}</span>
          <span className={`${styles.metaVal} ${styles.statusBadge}`}>{f.statusVal}</span>
        </div>
      </div>
      <button className={styles.btnPrimary} onClick={onReset}>{f.newOrder}</button>
    </div>
  );
}

const INITIAL_FORM = {
  customerName: '', customerEmail: '', contactNumber: '',
  items: [],
  paymentProof: null,
  remitterName: '', addressFullName: '', sex: '', age: '',
  addressLine1: '', addressLine2: '',
  city: '', state: '', postalCode: '', country: '',
  addressPhone: '',
};

// ── Per-field validators ─────────────────────────────────────────────────────
const validateField = (k, v, f) => {
  switch (k) {
    case 'customerName':
      if (!v.trim()) return f.fullName + ' is required';
      if (v.trim().length < 2) return 'Name must be at least 2 characters';
      return null;

    case 'customerEmail':
      if (!v.trim()) return f.email + ' is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Please enter a valid email address';
      return null;

    case 'contactNumber':
      if (!v.trim()) return f.contact + ' is required';
      if (!/^\+?[\d\s\-().]{7,20}$/.test(v.trim())) return 'Enter a valid phone number e.g. +86 138 0000 0000';
      return null;

    case 'remitterName':
      if (!v.trim()) return f.remitterName + ' is required';
      if (v.trim().length < 2) return 'Name must be at least 2 characters';
      return null;

    case 'addressFullName':
      if (!v.trim()) return f.recipientName + ' is required';
      if (v.trim().length < 2) return 'Name must be at least 2 characters';
      return null;

    case 'sex':
      if (!v.trim()) return f.sex + ' is required';
      return null;

    case 'age':
      if (!v.trim()) return f.age + ' is required';
      if (!/^\d+$/.test(v.trim())) return 'Age must be a number';
      if (parseInt(v) < 1 || parseInt(v) > 120) return 'Please enter a valid age (1–120)';
      return null;

    case 'addressPhone':
      if (v && !/^\+?[\d\s\-().]{7,20}$/.test(v.trim())) return 'Enter a valid phone number';
      return null;

    case 'addressLine1':
      if (!v.trim()) return f.street + ' is required';
      if (v.trim().length < 5) return 'Please enter a complete street address';
      return null;

    case 'city':
      if (!v.trim()) return f.city + ' is required';
      return null;

    case 'state':
      if (!v.trim()) return f.state + ' is required';
      return null;

    case 'postalCode':
      if (!v.trim()) return f.postal + ' is required';
      if (!/^[a-zA-Z0-9\s\-]{3,10}$/.test(v.trim())) return 'Enter a valid postal/ZIP code';
      return null;

    case 'country':
      if (!v) return f.country + ' is required';
      return null;

    default:
      return null;
  }
};

export default function OrderForm({ embedded = false }) {
  const { t } = useLang();
  const f = t.form;
  const steps = f.steps;

  const [form, setForm]         = useState(INITIAL_FORM);
  const [errors, setErrors]     = useState({});
  const [touched, setTouched]   = useState({});  // track which fields user has interacted with
  const [products, setProducts] = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [bankDetails, setBankDetails]   = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(null);
  const [apiError, setApiError]         = useState('');
  const [dragging, setDragging]         = useState(false);

  const fileRef    = useRef();
  const formTopRef = useRef();

  useEffect(() => {
    fetchProducts()
      .then(p => { setProducts(p); setLoadingProds(false); })
      .catch(() => setLoadingProds(false));
    fetchBankDetails().then(setBankDetails).catch(console.error);
  }, []);

  const total = form.items.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── Smart set: restricts input + validates in real time ──────────────────
  const set = useCallback((k, v) => {
    setForm(fr => ({ ...fr, [k]: v }));
    // Only show error in real time if field has been touched
    setTouched(t => ({ ...t, [k]: true }));
    setErrors(e => {
      const err = validateField(k, v, f);
      if (err) return { ...e, [k]: err };
      const n = { ...e };
      delete n[k];
      return n;
    });
  }, [f]);

  // ── Blur handler: validate when user leaves a field ──────────────────────
  const handleBlur = useCallback((k) => {
    setTouched(t => ({ ...t, [k]: true }));
    setErrors(e => {
      const err = validateField(k, form[k], f);
      if (err) return { ...e, [k]: err };
      const n = { ...e };
      delete n[k];
      return n;
    });
  }, [form, f]);

  const addProduct = (e) => {
    const id = e.target.value;
    if (!id) return;
    const product = products.find(p => p.id === id);
    if (!product) return;
    setForm(fr => {
      const existing = fr.items.find(i => i.id === id);
      const items = existing
        ? fr.items.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...fr.items, { ...product, quantity: 1 }];
      return { ...fr, items };
    });
    setErrors(e => { const n = { ...e }; delete n.items; return n; });
    e.target.value = '';
  };

  const updateQty = (id, delta) => {
    setForm(fr => ({
      ...fr,
      items: fr.items
        .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0),
    }));
  };

  const removeItem = (id) => setForm(fr => ({ ...fr, items: fr.items.filter(i => i.id !== id) }));

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(jpg|jpeg|png|webp|pdf)$/i.test(file.name))
      return alert('Only JPG, PNG, WebP, or PDF files are allowed.');
    if (file.size > 5 * 1024 * 1024)
      return alert('File must be under 5MB.');
    setForm(fr => ({ ...fr, paymentProof: file }));
    setErrors(e => { const n = { ...e }; delete n.paymentProof; return n; });
  };

  // ── Full validate on submit ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    const fields = ['customerName','customerEmail','contactNumber','remitterName',
      'addressFullName','sex','age','addressLine1','city','state','postalCode','country'];
    fields.forEach(k => {
      const err = validateField(k, form[k], f);
      if (err) e[k] = err;
    });
    if (form.addressPhone) {
      const err = validateField('addressPhone', form.addressPhone, f);
      if (err) e.addressPhone = err;
    }
    if (!form.items.length) e.items = f.noSelected;
    if (!form.paymentProof) e.paymentProof = f.uploadRequired || 'Payment proof is required';
    setErrors(e);
    // Mark all fields as touched
    setTouched(Object.fromEntries(fields.map(k => [k, true])));
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        const el = document.querySelector('.' + styles.fieldError);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      const fd = new FormData();
      fd.append('customerName',    form.customerName);
      fd.append('customerEmail',   form.customerEmail);
      fd.append('contactNumber',   form.contactNumber);
      fd.append('items',           JSON.stringify(form.items));
      fd.append('remitterName',    form.remitterName);
      fd.append('addressFullName', form.addressFullName || form.customerName);
      fd.append('sex',             form.sex);
      fd.append('age',             form.age);
      fd.append('addressLine1',    form.addressLine1);
      fd.append('addressLine2',    form.addressLine2 || '');
      fd.append('city',            form.city);
      fd.append('state',           form.state);
      fd.append('postalCode',      form.postalCode);
      fd.append('country',         form.country);
      fd.append('addressPhone',    form.addressPhone || form.contactNumber);
      if (form.paymentProof) fd.append('paymentProof', form.paymentProof);
      const result = await submitOrder(fd);
      setSubmitted(result.data);
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.errors?.join(', ')
        || 'Something went wrong. Please try again.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm(INITIAL_FORM); setSubmitted(null); setErrors({}); setTouched({}); setApiError('');
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (submitted) {
    const screen = <SuccessScreen result={submitted} email={form.customerEmail} onReset={reset} f={f} />;
    return embedded ? <div className={styles.card} ref={formTopRef}>{screen}</div> : screen;
  }

  const formContent = (
    <div className={styles.card} ref={formTopRef}>

      {/* ══ SECTION 1 — PERSONAL INFO ══════════════════════ */}
      <div className={styles.formSection}>
        <SectionHeader number="1" icon={steps[0].icon} title={steps[0].title} sub={steps[0].sub} />
        <div className={styles.sectionBody}>
          <div className={styles.grid2}>

            {/* Full Name — letters + spaces only */}
            <Field label={f.fullName} error={errors.customerName} required>
              <Input
                placeholder={f.fullNamePh}
                value={form.customerName}
                error={errors.customerName}
                maxLength={60}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  set('customerName', val);
                }}
                onBlur={() => handleBlur('customerName')}
              />
            </Field>

            {/* Email */}
            <Field label={f.email} error={errors.customerEmail} required>
              <Input
                type="email"
                placeholder={f.emailPh}
                value={form.customerEmail}
                error={errors.customerEmail}
                maxLength={100}
                onChange={e => set('customerEmail', e.target.value.trim())}
                onBlur={() => handleBlur('customerEmail')}
              />
            </Field>
          </div>

          {/* Contact Number — digits, +, spaces, dashes, brackets only */}
          <Field label={f.contact} error={errors.contactNumber} required hint={f.contactHint}>
            <Input
              placeholder={f.contactPh}
              value={form.contactNumber}
              error={errors.contactNumber}
              inputMode="tel"
              maxLength={20}
              onChange={e => {
                const val = e.target.value.replace(/[^\d\s+\-().]/g, '');
                set('contactNumber', val);
              }}
              onBlur={() => handleBlur('contactNumber')}
            />
          </Field>
        </div>
      </div>

      <div className={styles.sectionDivider} />

      {/* ══ SECTION 2 — PRODUCTS + PAYMENT ════════════════= */}
      <div className={styles.formSection}>

        {/* Products */}
        <SectionHeader number="2" icon={steps[1].icon} title={steps[1].title} sub={steps[1].sub} />
        <div className={styles.sectionBody}>
          <Field label={f.addProduct} error={errors.items} required>
            <div className={styles.selectWrap}>
              {loadingProds ? (
                <div className={styles.selectSkeleton}><Spinner /> Loading products from catalog…</div>
              ) : (
                <select className={`${styles.input} ${styles.select} ${errors.items ? styles.inputError : ''}`}
                  defaultValue="" onChange={addProduct}>
                  <option value="" disabled>{f.selectPh}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · ${p.price.toFixed(2)}{p.category ? ` · ${p.category}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <span className={styles.chevron}>▾</span>
            </div>
            {!loadingProds && products.length === 0 && (
              <p className={styles.noProducts}>{f.noProducts}</p>
            )}
          </Field>

          {form.items.length > 0 && (
            <div className={styles.cartWrap}>
              <div className={styles.cartHead}>
                <span>{f.product}</span>
                <span className={styles.tcenter}>{f.qty}</span>
                <span className={styles.tright}>{f.unitPrice}</span>
                <span className={styles.tright}>{f.subtotal}</span>
                <span />
              </div>
              {form.items.map(item => (
                <div className={styles.cartRow} key={item.id}>
                  <div className={styles.cartProduct}>
                    <span className={styles.productDot} />
                    <div>
                      <span className={styles.productName}>{item.name}</span>
                      {item.category && <span className={styles.productCat}>{item.category}</span>}
                    </div>
                  </div>
                  <div className={styles.qtyCtrl}>
                    <button type="button" onClick={() => updateQty(item.id, -1)} className={styles.qtyBtn}>−</button>
                    <span className={styles.qtyNum}>{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)} className={styles.qtyBtn}>+</button>
                  </div>
                  <span className={styles.tright} style={{ fontSize: 14, color: 'var(--text-3)' }}>
                    ${item.price.toFixed(2)}
                  </span>
                  <span className={styles.rowSubtotal}>${(item.price * item.quantity).toFixed(2)}</span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)} title="Remove">
                    <Icon d="M18 6L6 18M6 6l12 12" size={13} />
                  </button>
                </div>
              ))}
              <div className={styles.cartFooter}>
                <div className={styles.cartSummaryLine}>
                  <span>{form.items.reduce((s, i) => s + i.quantity, 0)} item{form.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</span>
                  <div className={styles.totalBlock}>
                    <span className={styles.totalLabel}>{f.totalLabel}</span>
                    <span className={styles.totalValue}>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {form.items.length === 0 && !loadingProds && (
            <div className={styles.emptyCart}>
              <span className={styles.emptyIcon}>⊞</span>
              <p>{f.noSelected}</p>
              <p className={styles.emptyHint}>{f.noSelectedHint}</p>
            </div>
          )}
        </div>

        {/* Payment sub-section */}
        <div className={styles.paymentSubSection}>
          <SectionHeader number="3" icon={steps[2].icon} title={steps[2].title} sub={steps[2].sub} />
          <div className={styles.sectionBody}>
            {bankDetails && (
              <div className={styles.bankCard}>
                <div className={styles.bankCardTop}>
                  <div className={styles.bankTopLeft}>
                    <span className={styles.bankChip}>⬡</span>
                    <div>
                      <span className={styles.bankCardLabel}>{f.bankTitle}</span>
                      <span className={styles.bankSecure}>{f.bankSecure}</span>
                    </div>
                  </div>
                  <div className={styles.amountPill}>
                    {f.pay} <strong>${total.toFixed(2)}</strong>
                  </div>
                </div>
                <div className={styles.bankGrid}>
                  {[
                    { k: f.bankFields[0], v: bankDetails.bankName },
                    { k: f.bankFields[1], v: bankDetails.accountHolder },
                    { k: f.bankFields[2], v: bankDetails.accountNumber },
                    { k: f.bankFields[3], v: bankDetails.routing },
                    { k: f.bankFields[4], v: bankDetails.swift },
                    { k: f.bankFields[5], v: bankDetails.branch },
                  ].map(({ k, v }) => (
                    <div className={styles.bankField} key={k}>
                      <span className={styles.bankKey}>{k}</span>
                      <div className={styles.bankValueRow}>
                        <span className={styles.bankValue}>{v}</span>
                        <CopyButton text={v} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.bankNote}>
                  <Icon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={14} />
                  {bankDetails.referenceNote}
                </div>
              </div>
            )}

            {/* Upload */}
            <div className={styles.uploadSection}>
              <label className={styles.label}>
                {f.uploadLabel}
                <span className={styles.req}>*</span>
                <span className={styles.hint}>{f.uploadHint}</span>
              </label>
              <div
                className={`${styles.uploadZone} ${dragging ? styles.uploadDragging : ''} ${form.paymentProof ? styles.uploadDone : ''} ${errors.paymentProof ? styles.uploadError : ''}`}
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              >
                {form.paymentProof ? (
                  <>
                    <div className={styles.uploadIconDone}><CheckSvg size={22} /></div>
                    <p className={styles.uploadFileName}>{form.paymentProof.name}</p>
                    <p className={styles.uploadSub}>{(form.paymentProof.size / 1024).toFixed(0)} KB · Click to replace</p>
                  </>
                ) : (
                  <>
                    <div className={`${styles.uploadIconDefault} ${errors.paymentProof ? styles.uploadIconError : ''}`}>
                      <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" size={24} />
                    </div>
                    <p className={styles.uploadCta}>{f.uploadCta}</p>
                    <p className={styles.uploadSub}>{f.uploadSub}</p>
                  </>
                )}
              </div>
              {errors.paymentProof && (
                <span className={styles.errorMsg}>
                  <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={12} />
                  {errors.paymentProof}
                </span>
              )}
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionDivider} />

      {/* ══ SECTION 3 — SHIPPING ════════════════════════════ */}
      <div className={styles.formSection}>
        <SectionHeader number="4" icon={steps[3].icon} title={steps[3].title} sub={steps[3].sub} />
        <div className={styles.sectionBody}>
          <div className={styles.grid2}>

            {/* Remitter Name — letters + spaces only */}
            <Field label={f.remitterName} error={errors.remitterName} required>
              <Input
                placeholder={f.remitterPh}
                value={form.remitterName}
                error={errors.remitterName}
                maxLength={60}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  set('remitterName', val);
                }}
                onBlur={() => handleBlur('remitterName')}
              />
            </Field>

            {/* Recipient Name — letters + spaces only */}
            <Field label={f.recipientName} error={errors.addressFullName} required>
              <Input
                placeholder={f.recipientPh}
                value={form.addressFullName}
                error={errors.addressFullName}
                maxLength={60}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  set('addressFullName', val);
                }}
                onBlur={() => handleBlur('addressFullName')}
              />
            </Field>
          </div>

          <div className={styles.grid2}>

            {/* Sex — dropdown */}
            <Field label={f.sex} error={errors.sex} required>
              <div className={styles.selectWrap}>
                <select
                  className={`${styles.input} ${styles.select} ${errors.sex ? styles.inputError : ''}`}
                  value={form.sex}
                  onChange={e => set('sex', e.target.value)}
                  onBlur={() => handleBlur('sex')}
                >
                  <option value="">{f.sexPh || 'Select gender'}</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <span className={styles.chevron}>▾</span>
              </div>
            </Field>

            {/* Age — numbers only, max 3 digits */}
            <Field label={f.age} error={errors.age} required>
              <Input
                placeholder={f.agePh}
                value={form.age}
                error={errors.age}
                inputMode="numeric"
                maxLength={3}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  set('age', val);
                }}
                onBlur={() => handleBlur('age')}
              />
            </Field>
          </div>

          {/* Delivery Phone — optional, digits + + - () spaces */}
          <Field label={f.deliveryPhone} error={errors.addressPhone}>
            <Input
              placeholder={f.deliveryPhonePh}
              value={form.addressPhone}
              error={errors.addressPhone}
              inputMode="tel"
              maxLength={20}
              onChange={e => {
                const val = e.target.value.replace(/[^\d\s+\-().]/g, '');
                set('addressPhone', val);
              }}
              onBlur={() => handleBlur('addressPhone')}
            />
          </Field>

          {/* Street Address */}
          <Field label={f.street} error={errors.addressLine1} required>
            <Input
              placeholder={f.streetPh}
              value={form.addressLine1}
              error={errors.addressLine1}
              maxLength={100}
              onChange={e => set('addressLine1', e.target.value)}
              onBlur={() => handleBlur('addressLine1')}
            />
          </Field>

          {/* Apt/Suite — optional, no restriction */}
          <Field label={f.apt}>
            <Input
              placeholder={f.aptPh}
              value={form.addressLine2}
              maxLength={60}
              onChange={e => set('addressLine2', e.target.value)}
            />
          </Field>

          <div className={styles.grid3}>

            {/* City — letters + spaces only */}
            <Field label={f.city} error={errors.city} required>
              <Input
                placeholder={f.cityPh}
                value={form.city}
                error={errors.city}
                maxLength={50}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  set('city', val);
                }}
                onBlur={() => handleBlur('city')}
              />
            </Field>

            {/* State — letters + spaces only */}
            <Field label={f.state} error={errors.state} required>
              <Input
                placeholder={f.statePh}
                value={form.state}
                error={errors.state}
                maxLength={50}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  set('state', val);
                }}
                onBlur={() => handleBlur('state')}
              />
            </Field>

            {/* Postal Code — alphanumeric only */}
            <Field label={f.postal} error={errors.postalCode} required>
              <Input
                placeholder={f.postalPh}
                value={form.postalCode}
                error={errors.postalCode}
                inputMode="text"
                maxLength={10}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9\s\-]/g, '').toUpperCase();
                  set('postalCode', val);
                }}
                onBlur={() => handleBlur('postalCode')}
              />
            </Field>
          </div>

          {/* Country — dropdown */}
          <Field label={f.country} error={errors.country} required>
            <div className={styles.selectWrap}>
              <select
                className={`${styles.input} ${styles.select} ${errors.country ? styles.inputError : ''}`}
                value={form.country}
                onChange={e => set('country', e.target.value)}
                onBlur={() => handleBlur('country')}
              >
                <option value="">{f.countryPh}</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className={styles.chevron}>▾</span>
            </div>
          </Field>

          {form.items.length > 0 && (
            <div className={styles.orderSummary}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryTitle}>{f.orderSummary}</span>
                <span className={styles.summaryCount}>{form.items.length}</span>
              </div>
              <div className={styles.summaryList}>
                {form.items.map(item => (
                  <div className={styles.summaryRow} key={item.id}>
                    <span className={styles.summaryItemName}>{item.name} × {item.quantity}</span>
                    <span className={styles.summaryItemAmt}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.summaryTotal}>
                <span>{f.grandTotal}</span>
                <span className={styles.summaryTotalAmt}>${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ API ERROR + SUBMIT ══════════════════════════════ */}
      {apiError && (
        <div className={styles.apiError}>
          <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={15} />
          {apiError}
        </div>
      )}

      <div className={styles.submitBar}>
        <div className={styles.submitBarLeft}>
          {form.items.length > 0 && (
            <span className={styles.submitTotal}>
              {f.grandTotal}: <strong>${total.toFixed(2)}</strong>
            </span>
          )}
        </div>
        <button type="button"
          className={`${styles.btnPrimary} ${styles.btnSubmit}`}
          onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><Spinner /> {f.placing}</> : f.placeOrder}
        </button>
      </div>

    </div>
  );

  return embedded ? formContent : <div className={styles.page}>{formContent}</div>;
}