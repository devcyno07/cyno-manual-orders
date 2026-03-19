import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProducts, fetchBankDetails, submitOrder } from '../services/api';
import { useLang } from '../i18n/LangContext';
import styles from './OrderChatBot.module.css';

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const COUNTRIES = [
  'Bangladesh','China','India','United States','United Kingdom','Canada',
  'Australia','UAE','Germany','France','Singapore','Nigeria','Kenya',
  'South Africa','Brazil','Mexico','Japan','South Korea','Indonesia','Philippines',
];

const STEPS = [
  { id: 'welcome',       type: 'info' },
  { id: 'customerName',  type: 'text',     field: 'customerName' },
  { id: 'customerEmail', type: 'email',    field: 'customerEmail' },
  { id: 'contactNumber', type: 'text',     field: 'contactNumber' },
  { id: 'products',      type: 'products', field: 'items' },
  { id: 'bankInfo',      type: 'info' },
  { id: 'paymentProof',  type: 'file',     field: 'paymentProof' },
  { id: 'remitterName',  type: 'text',     field: 'remitterName' },
  { id: 'consigneeName', type: 'text',     field: 'addressFullName' },
  { id: 'sex',           type: 'choice',   field: 'sex',     choices: ['Male', 'Female'] },
  { id: 'age',           type: 'text',     field: 'age' },
  { id: 'address',       type: 'text',     field: 'addressLine1' },
  { id: 'apt',           type: 'text',     field: 'addressLine2', optional: true },
  { id: 'city',          type: 'text',     field: 'city' },
  { id: 'province',      type: 'text',     field: 'state' },
  { id: 'postalCode',    type: 'text',     field: 'postalCode' },
  { id: 'country',       type: 'choice',   field: 'country', choices: COUNTRIES },
  { id: 'phone',         type: 'text',     field: 'addressPhone' },
  { id: 'review',        type: 'review' },
  { id: 'done',          type: 'done' },
];

const REVIEW_IDX = STEPS.findIndex(s => s.id === 'review');

const BOT_QUESTIONS = {
  en: {
    welcome:       "👋 Hi! I'm your **Cyno Pharmacy** order assistant.\n\nI'll guide you through placing your order step by step. Ready to begin?",
    customerName:  "What's your **full name**?",
    customerEmail: "What's your **email address**? (We'll send your order confirmation here)",
    contactNumber: "What's your **contact number**? (Include country code e.g. +86)",
    products:      "Now let's select your **medicines**. Choose from the list below and adjust quantities:",
    bankInfo:      null,
    paymentProof:  "Please **upload your payment proof** (bank transfer receipt). JPG, PNG, or PDF · Max 5MB",
    remitterName:  "What's the **remitter name**? (Name of the person who made the payment)",
    consigneeName: "What's the **consignee name**? (Full name of the recipient)",
    sex:           "What's the consignee's **sex**?",
    age:           "What's the consignee's **age**?",
    address:       "What's the **delivery address**? (Street & building number)",
    apt:           "Any **apartment, floor, or building** details? (Type 'skip' to skip)",
    city:          "Which **city**?",
    province:      "Which **province / state**?",
    postalCode:    "What's the **postal / ZIP code**?",
    country:       "Which **country**?",
    phone:         "What's the **phone number** at the delivery address?",
    review:        "📋 Here's your **order summary**. Review and edit any field, or confirm to place your order.",
    done:          "🎉 **Order placed successfully!** You'll receive a confirmation email shortly.",
  },
  zh: {
    welcome:       "👋 您好！我是 **Cyno Pharmacy** 的订单助手。\n\n我将一步步引导您完成下单流程。准备好开始了吗？",
    customerName:  "请问您的**全名**是什么？",
    customerEmail: "请问您的**电子邮件地址**是什么？（我们将把订单确认发送到此处）",
    contactNumber: "请问您的**联系电话**是什么？（请包含国家代码，例如 +86）",
    products:      "现在让我们选择您需要的**药品**。请从下方列表中选择并调整数量：",
    bankInfo:      null,
    paymentProof:  "请**上传您的付款凭证**（银行转账收据）。JPG、PNG 或 PDF · 最大 5MB",
    remitterName:  "请问**汇款人姓名**是什么？（付款人的姓名）",
    consigneeName: "请问**收货人姓名**是什么？（收件人全名）",
    sex:           "收货人的**性别**是什么？",
    age:           "收货人的**年龄**是多少？",
    address:       "请问**收货地址**是什么？（街道和门牌号）",
    apt:           "有**公寓、楼层或楼名**详情吗？（输入'跳过'可跳过此步骤）",
    city:          "哪个**城市**？",
    province:      "哪个**省份/州**？",
    postalCode:    "**邮政编码**是什么？",
    country:       "哪个**国家**？",
    phone:         "收货地址的**联系电话**是什么？",
    review:        "📋 以下是您的**订单摘要**。请检查并编辑任何字段，或确认提交订单。",
    done:          "🎉 **订单提交成功！** 您将很快收到一封确认邮件。",
  },
};

function BotText({ text }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i}>{p}</strong>
          : <span key={i}>{p.split('\n').flatMap((line, j, arr) => j < arr.length - 1 ? [line, <br key={j} />] : [line])}</span>
      )}
    </span>
  );
}

export default function OrderChatBot() {
  const { t, lang } = useLang();
  const questions = BOT_QUESTIONS[lang] || BOT_QUESTIONS.en;

  const [open, setOpen]                     = useState(false);
  const [messages, setMessages]             = useState([]);
  const [stepIdx, setStepIdx]               = useState(0);
  const [input, setInput]                   = useState('');
  const [formData, setFormData]             = useState({});
  const [products, setProducts]             = useState([]);
  const [bankDetails, setBankDetails]       = useState(null);
  const [cartItems, setCartItems]           = useState([]);
  const [submitting, setSubmitting]         = useState(false);
  const [orderResult, setOrderResult]       = useState(null);
  const [typing, setTyping]                 = useState(false);
  const [proofFile, setProofFile]           = useState(null);
  const [started, setStarted]               = useState(false);
  const [pulse, setPulse]                   = useState(true);
  const [history, setHistory]               = useState([]);
  const [editingFromReview, setEditingFromReview] = useState(false); // ← key fix

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const fileRef        = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(console.error);
    fetchBankDetails().then(setBankDetails).catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const addMessage = useCallback((role, content, extra = {}) => {
    setMessages(prev => [...prev, { role, content, extra, id: Date.now() + Math.random() }]);
  }, []);

  const botSay = useCallback((text, extra = {}, delay = 600) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage('bot', text, extra);
    }, delay);
  }, [addMessage]);

  // ── Helper: re-show question without going through advance ────────────────
  const reaskQuestion = useCallback((stepId) => {
    const q = BOT_QUESTIONS[lang]?.[stepId] || BOT_QUESTIONS.en[stepId];
    if (!q) return;
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages(m => [...m, { role: 'bot', content: q, extra: {}, id: Date.now() + Math.random() }]);
      }, 500);
    }, 100);
  }, [lang]);

  const startChat = useCallback(() => {
    if (started) return;
    setStarted(true);
    setStepIdx(0);
    botSay(questions.welcome, { type: 'welcome' }, 400);
    setTimeout(() => {
      botSay(questions.customerName, {}, 1200);
      setStepIdx(1);
    }, 1800);
  }, [started, questions, botSay]);

  useEffect(() => {
    if (open && !started) startChat();
  }, [open, started, startChat]);

  const currentStep = STEPS[stepIdx] || STEPS[STEPS.length - 1];

  // ── Go Back ───────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setStepIdx(prev.stepIdx);
    setFormData(prev.formData);
    setCartItems(prev.cartItems);
    setInput('');
    setEditingFromReview(false);

    setMessages(m => {
      const copy = [...m];
      while (copy.length > 0 && copy[copy.length - 1].role === 'bot') copy.pop();
      if (copy.length > 0 && copy[copy.length - 1].role === 'user') copy.pop();
      while (copy.length > 0 && copy[copy.length - 1].role === 'bot') copy.pop();
      return copy;
    });

    const prevStep = STEPS[prev.stepIdx];
    if (!prevStep) return;

    if (prevStep.id === 'products') {
      reaskQuestion('products');
      return;
    }
    if (prevStep.id === 'bankInfo') {
      reaskQuestion('paymentProof');
      return;
    }
    reaskQuestion(prevStep.id);
  }, [history, reaskQuestion]);

  // ── Advance ───────────────────────────────────────────────────────────────
  const advance = useCallback((nextIdx, data = {}) => {
    const merged = { ...formData, ...data };
    setFormData(merged);
    setHistory(prev => [...prev, { stepIdx, formData: { ...formData }, cartItems: [...cartItems] }]);

    const step = STEPS[nextIdx];
    if (!step) return;
    setStepIdx(nextIdx);

    if (step.id === 'bankInfo' && bankDetails) {
      const bankMsg = lang === 'zh'
        ? `🏦 **银行转账详情**\n\n🔔 现在只接受通过银行电汇（TT/Cable/Wire）汇款到印度公司账户。\n\n**银行：** ${bankDetails.bankName}\n**账户持有人：** ${bankDetails.accountHolder}\n**账户号码：** ${bankDetails.accountNumber}\n**公司地址：** ${bankDetails.routing}\n**SWIFT：** ${bankDetails.swift}\n**支行：** ${bankDetails.branch}\n\n💰 **应付金额：** $${cartItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}\n\n⚠️ ${bankDetails.referenceNote}`
        : `🏦 **Bank Transfer Details**\n\n🔔 Remittance only TT / Cable / wire transfer by Bank to Company account in India is acceptable now.\n\n**Bank:** ${bankDetails.bankName}\n**Account Holder:** ${bankDetails.accountHolder}\n**Account No:** ${bankDetails.accountNumber}\n**Company Address:** ${bankDetails.routing}\n**SWIFT:** ${bankDetails.swift}\n**Bank Branch:** ${bankDetails.branch}\n\n💰 **Amount to Pay:** $${cartItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}\n\n⚠️ ${bankDetails.referenceNote}`;
      botSay(bankMsg, { type: 'bank' }, 500);
      setTimeout(() => {
        botSay(questions.paymentProof, { type: 'file' }, 1400);
        setStepIdx(nextIdx + 1);
      }, 2200);
      return;
    }

    if (step.id === 'review') {
      botSay(questions.review, { type: 'review', formData: merged, cartItems }, 500);
      return;
    }

    if (step.id === 'products') {
      botSay(questions.products, { type: 'products' }, 500);
      return;
    }

    const q = questions[step.id];
    if (q) botSay(q, {}, 500);
  }, [formData, bankDetails, cartItems, questions, lang, botSay, stepIdx]);

  // ── Return to review after single field edit ──────────────────────────────
  const returnToReview = useCallback((updatedData) => {
    const merged = { ...formData, ...updatedData };
    setFormData(merged);
    setEditingFromReview(false);
    setStepIdx(REVIEW_IDX);
    botSay(questions.review, { type: 'review', formData: merged, cartItems }, 500);
  }, [formData, cartItems, questions, botSay]);

  // ── Edit a specific field from review ────────────────────────────────────
  const editField = useCallback((field) => {
    const stepToEdit = STEPS.findIndex(s => s.field === field);
    if (stepToEdit < 0) return;

    // Save review state so back button works
    setHistory(prev => [...prev, { stepIdx, formData: { ...formData }, cartItems: [...cartItems] }]);

    // Remove review card message
    setMessages(m => {
      const copy = [...m];
      while (copy.length > 0 && copy[copy.length - 1].role === 'bot') copy.pop();
      return copy;
    });

    setEditingFromReview(true);
    setStepIdx(stepToEdit);
    setInput('');

    const q = BOT_QUESTIONS[lang]?.[STEPS[stepToEdit].id] || BOT_QUESTIONS.en[STEPS[stepToEdit].id];
    if (q) botSay(q, {}, 300);
  }, [stepIdx, formData, cartItems, lang, botSay]);

  // ── Handle text submit ────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const val = input.trim();
    if (!val && currentStep.type !== 'products') return;

    const step = currentStep;

    // Skip optional
    if (step.optional && (val.toLowerCase() === 'skip' || val.toLowerCase() === '跳过' || val === '')) {
      addMessage('user', lang === 'zh' ? '跳过' : 'Skip');
      if (editingFromReview) {
        returnToReview({ [step.field]: '' });
      } else {
        advance(stepIdx + 1, { [step.field]: '' });
      }
      setInput('');
      return;
    }

    // Validations
    if (step.id === 'customerEmail' && !/^\S+@\S+\.\S+$/.test(val)) {
      botSay(lang === 'zh' ? '❌ 请输入有效的电子邮件地址。' : '❌ Please enter a valid email address.', {}, 300);
      return;
    }
    if (step.id === 'contactNumber' && !/^\+?[\d\s\-().]{7,20}$/.test(val)) {
      botSay(lang === 'zh' ? '❌ 请输入有效的电话号码，例如 +86 138 0000 0000。' : '❌ Please enter a valid phone number e.g. +86 138 0000 0000.', {}, 300);
      return;
    }
    if (step.id === 'phone' && !/^\+?[\d\s\-().]{7,20}$/.test(val)) {
      botSay(lang === 'zh' ? '❌ 请输入有效的联系电话。' : '❌ Please enter a valid phone number.', {}, 300);
      return;
    }
    if (step.id === 'age' && (!/^\d+$/.test(val) || parseInt(val) < 1 || parseInt(val) > 120)) {
      botSay(lang === 'zh' ? '❌ 请输入有效的年龄（1-120）。' : '❌ Please enter a valid age (1–120).', {}, 300);
      return;
    }
    if (step.id === 'customerName' && val.length < 2) {
      botSay(lang === 'zh' ? '❌ 请输入您的全名。' : '❌ Please enter your full name (at least 2 characters).', {}, 300);
      return;
    }
    if (step.id === 'postalCode' && !/^[\w\s\-]{3,12}$/.test(val)) {
      botSay(lang === 'zh' ? '❌ 请输入有效的邮政编码。' : '❌ Please enter a valid postal code.', {}, 300);
      return;
    }

    addMessage('user', val);
    setInput('');

    if (editingFromReview) {
      returnToReview(step.field ? { [step.field]: val } : {});
    } else {
      advance(stepIdx + 1, step.field ? { [step.field]: val } : {});
    }
  }, [input, currentStep, stepIdx, advance, addMessage, lang, botSay, editingFromReview, returnToReview]);

  // ── Handle choice ─────────────────────────────────────────────────────────
  const handleChoice = useCallback((choice) => {
    const step = currentStep;
    addMessage('user', choice);

    if (editingFromReview) {
      returnToReview({ [step.field]: choice });
    } else {
      advance(stepIdx + 1, { [step.field]: choice });
    }
  }, [currentStep, stepIdx, advance, addMessage, editingFromReview, returnToReview]);

  // ── Handle file ───────────────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!/\.(jpg|jpeg|png|webp|pdf)$/i.test(file.name)) {
      botSay(lang === 'zh' ? '❌ 只允许 JPG、PNG 或 PDF 文件。' : '❌ Only JPG, PNG, or PDF files allowed.', {}, 200);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      botSay(lang === 'zh' ? '❌ 文件必须小于 5MB。' : '❌ File must be under 5MB.', {}, 200);
      return;
    }
    setProofFile(file);
    addMessage('user', `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);

    if (editingFromReview) {
      returnToReview({ paymentProof: file });
    } else {
      advance(stepIdx + 1, { paymentProof: file });
    }
  }, [lang, botSay, stepIdx, advance, addMessage, editingFromReview, returnToReview]);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    setCartItems(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex
        ? prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCartItems(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
          .filter(i => i.quantity > 0)
    );
  }, []);

  const confirmProducts = useCallback(() => {
    if (cartItems.length === 0) {
      botSay(lang === 'zh' ? '❌ 请至少选择一种药品。' : '❌ Please select at least one medicine.', {}, 200);
      return;
    }
    const summary = cartItems.map(i => `${i.name} ×${i.quantity}`).join(', ');
    addMessage('user', summary);
    if (editingFromReview) {
      returnToReview({ items: cartItems });
    } else {
      advance(stepIdx + 1, { items: cartItems });
    }
  }, [cartItems, lang, botSay, stepIdx, advance, addMessage, editingFromReview, returnToReview]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitFinal = useCallback(async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('customerName',    formData.customerName || '');
      fd.append('customerEmail',   formData.customerEmail || '');
      fd.append('contactNumber',   formData.contactNumber || '');
      fd.append('items',           JSON.stringify(cartItems));
      fd.append('remitterName',    formData.remitterName || '');
      fd.append('addressFullName', formData.addressFullName || formData.customerName || '');
      fd.append('sex',             formData.sex || '');
      fd.append('age',             formData.age || '');
      fd.append('addressLine1',    formData.addressLine1 || '');
      fd.append('addressLine2',    formData.addressLine2 || '');
      fd.append('city',            formData.city || '');
      fd.append('state',           formData.state || '');
      fd.append('postalCode',      formData.postalCode || '');
      fd.append('country',         formData.country || '');
      fd.append('addressPhone',    formData.addressPhone || formData.contactNumber || '');
      if (proofFile) fd.append('paymentProof', proofFile);

      const result = await submitOrder(fd);
      setOrderResult(result.data);
      botSay(
        lang === 'zh'
          ? `🎉 **订单提交成功！**\n\n订单编号：**${result.data.orderId}**\n总金额：**$${result.data.totalAmount?.toFixed(2)}**\n\n确认邮件已发送至 ${formData.customerEmail}`
          : `🎉 **Order placed successfully!**\n\nOrder ID: **${result.data.orderId}**\nTotal: **$${result.data.totalAmount?.toFixed(2)}**\n\nConfirmation sent to ${formData.customerEmail}`,
        { type: 'success' }, 500
      );
      setStepIdx(STEPS.length - 1);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.join(', ') || 'Something went wrong.';
      botSay(`❌ ${msg}`, {}, 300);
    } finally {
      setSubmitting(false);
    }
  }, [formData, cartItems, proofFile, lang, botSay]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setStepIdx(0);
    setFormData({});
    setCartItems([]);
    setProofFile(null);
    setOrderResult(null);
    setStarted(false);
    setInput('');
    setHistory([]);
    setEditingFromReview(false);
  }, []);

  const total         = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const isReview      = currentStep.id === 'review';
  const isDone        = currentStep.id === 'done' || !!orderResult;
  const showTextInput = ['text', 'email'].includes(currentStep.type) && !isDone;
  const showChoices   = currentStep.type === 'choice' && !isDone;
  const showFile      = currentStep.type === 'file' && !isDone;
  const showProducts  = currentStep.type === 'products' && !isDone;
  const canGoBack     = history.length > 0 && !isDone && !isReview && started;

  return (
    <>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${pulse ? styles.triggerPulse : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Open order chat"
      >
        {open
          ? <Icon d="M18 6L6 18M6 6l12 12" size={22} />
          : <span className={styles.triggerInner}>
              <span className={styles.triggerIcon}>✚</span>
              {!open && <span className={styles.triggerBadge}>Order</span>}
            </span>
        }
        {!open && <span className={styles.triggerRing} />}
      </button>

      <div className={`${styles.window} ${open ? styles.windowOpen : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              <span>✚</span>
              <span className={styles.avatarDot} />
            </div>
            <div>
              <div className={styles.headerName}>Cyno Assistant</div>
              <div className={styles.headerSub}>
                <span className={styles.onlineDot} />
                {lang === 'zh' ? '在线 · 快速响应' : 'Online · Responds instantly'}
              </div>
            </div>
          </div>
          <div className={styles.headerActions}>
            {started && !isDone && (
              <button className={styles.resetBtn} onClick={resetChat} title="Restart">
                <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" size={14} />
              </button>
            )}
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              <Icon d="M18 6L6 18M6 6l12 12" size={16} />
            </button>
          </div>
        </div>

        {/* Progress */}
        {started && !isDone && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, (stepIdx / (STEPS.length - 1)) * 100)}%` }}
            />
          </div>
        )}

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map(msg => (
            <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgUser : styles.msgBot}`}>
              {msg.role === 'bot' && <div className={styles.msgAvatar}>✚</div>}
              <div className={styles.bubble}>
                {msg.extra?.type === 'review' ? (
                  <ReviewCard
                    formData={msg.extra.formData}
                    cartItems={msg.extra.cartItems}
                    lang={lang}
                    onEdit={editField}
                  />
                ) : msg.extra?.type === 'success' ? (
                  <div className={styles.successBubble}><BotText text={msg.content} /></div>
                ) : (
                  <BotText text={msg.content} />
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className={`${styles.msgRow} ${styles.msgBot}`}>
              <div className={styles.msgAvatar}>✚</div>
              <div className={`${styles.bubble} ${styles.typingBubble}`}>
                <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>

          {!started && (
            <button className={styles.startBtn} onClick={startChat}>
              {lang === 'zh' ? '🚀 开始下单' : '🚀 Start Order'}
            </button>
          )}

          {isReview && !isDone && (
            <div className={styles.reviewActions}>
              <button className={styles.confirmBtn} onClick={submitFinal} disabled={submitting}>
                {submitting
                  ? <><span className={styles.spinner} />{lang === 'zh' ? '提交中…' : 'Placing…'}</>
                  : lang === 'zh' ? '✅ 确认下单' : '✅ Confirm & Place Order'
                }
              </button>
              <button className={styles.editBtn} onClick={resetChat}>
                {lang === 'zh' ? '🔄 重新填写' : '🔄 Start Over'}
              </button>
            </div>
          )}

          {showProducts && (
            <div className={styles.productArea}>
              {canGoBack && (
                <button className={styles.backBtnFull} onClick={goBack}>
                  <Icon d="M19 12H5M12 19l-7-7 7-7" size={14} />
                  {lang === 'zh' ? '返回' : 'Back'}
                </button>
              )}
              <div className={styles.productGrid}>
                {products.map(p => {
                  const inCart = cartItems.find(i => i.id === p.id);
                  return (
                    <div key={p.id} className={`${styles.productCard} ${inCart ? styles.productInCart : ''}`}>
                      <div className={styles.productName}>{p.name}</div>
                      <div className={styles.productPrice}>${p.price?.toFixed(2)}</div>
                      {inCart ? (
                        <div className={styles.qtyRow}>
                          <button onClick={() => updateQty(p.id, -1)} className={styles.qtyBtn}>−</button>
                          <span className={styles.qtyNum}>{inCart.quantity}</span>
                          <button onClick={() => updateQty(p.id, 1)} className={styles.qtyBtn}>+</button>
                        </div>
                      ) : (
                        <button className={styles.addBtn} onClick={() => addToCart(p)}>
                          {lang === 'zh' ? '+ 添加' : '+ Add'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {cartItems.length > 0 && (
                <div className={styles.cartSummary}>
                  <span>{cartItems.length} {lang === 'zh' ? '种药品' : 'item(s)'} · ${total.toFixed(2)}</span>
                  <button className={styles.confirmProductsBtn} onClick={confirmProducts}>
                    {lang === 'zh' ? '确认选择 →' : 'Confirm Selection →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {showChoices && (
            <div className={styles.choicesWrap}>
              {canGoBack && (
                <button className={styles.backBtnFull} onClick={goBack}>
                  <Icon d="M19 12H5M12 19l-7-7 7-7" size={14} />
                  {lang === 'zh' ? '返回' : 'Back'}
                </button>
              )}
              <div className={styles.choices}>
                {currentStep.choices.slice(0, 20).map(c => (
                  <button key={c} className={styles.choiceBtn} onClick={() => handleChoice(c)}>{c}</button>
                ))}
                {currentStep.choices.length > 20 && (
                  <div className={styles.choiceInputWrap}>
                    <input
                      ref={inputRef}
                      className={styles.textInput}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder={lang === 'zh' ? '或直接输入…' : 'Or type here…'}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button className={styles.sendBtn} onClick={handleSend}>
                      <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {showFile && (
            <div className={styles.fileWrap}>
              {canGoBack && (
                <button className={styles.backBtnFull} onClick={goBack}>
                  <Icon d="M19 12H5M12 19l-7-7 7-7" size={14} />
                  {lang === 'zh' ? '返回' : 'Back'}
                </button>
              )}
              <div className={styles.fileArea} onClick={() => fileRef.current?.click()}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" size={20} />
                <span>{lang === 'zh' ? '点击上传付款凭证' : 'Click to upload payment proof'}</span>
                <span className={styles.fileHint}>JPG · PNG · PDF · Max 5MB</span>
              </div>
            </div>
          )}

          {showTextInput && (
            <div className={styles.textInputWrap}>
              {canGoBack && (
                <button className={styles.backBtn} onClick={goBack} title={lang === 'zh' ? '返回' : 'Back'}>
                  <Icon d="M19 12H5M12 19l-7-7 7-7" size={16} />
                </button>
              )}
              <input
                ref={inputRef}
                className={styles.textInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  currentStep.optional
                    ? (lang === 'zh' ? '输入或输入"跳过"…' : 'Type or type "skip"…')
                    : (lang === 'zh' ? '输入您的回答…' : 'Type your answer…')
                }
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
                <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={16} />
              </button>
            </div>
          )}

          {isDone && (
            <button className={styles.newOrderBtn} onClick={resetChat}>
              {lang === 'zh' ? '+ 新订单' : '+ Place Another Order'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────
function ReviewCard({ formData, cartItems, lang, onEdit }) {
  const total = cartItems?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;

  const rows = lang === 'zh'
    ? [
        ['姓名',     formData.customerName,    'customerName'],
        ['电子邮件', formData.customerEmail,   'customerEmail'],
        ['联系电话', formData.contactNumber,   'contactNumber'],
        ['汇款人',   formData.remitterName,    'remitterName'],
        ['收货人',   formData.addressFullName, 'addressFullName'],
        ['性别',     formData.sex,             'sex'],
        ['年龄',     formData.age,             'age'],
        ['地址',     [formData.addressLine1, formData.addressLine2].filter(Boolean).join(', '), 'addressLine1'],
        ['城市',     formData.city,            'city'],
        ['省份',     formData.state,           'state'],
        ['邮编',     formData.postalCode,      'postalCode'],
        ['国家',     formData.country,         'country'],
        ['电话',     formData.addressPhone,    'addressPhone'],
      ]
    : [
        ['Name',      formData.customerName,    'customerName'],
        ['Email',     formData.customerEmail,   'customerEmail'],
        ['Contact',   formData.contactNumber,   'contactNumber'],
        ['Remitter',  formData.remitterName,    'remitterName'],
        ['Consignee', formData.addressFullName, 'addressFullName'],
        ['Sex',       formData.sex,             'sex'],
        ['Age',       formData.age,             'age'],
        ['Address',   [formData.addressLine1, formData.addressLine2].filter(Boolean).join(', '), 'addressLine1'],
        ['City',      formData.city,            'city'],
        ['Province',  formData.state,           'state'],
        ['Postal',    formData.postalCode,      'postalCode'],
        ['Country',   formData.country,         'country'],
        ['Phone',     formData.addressPhone,    'addressPhone'],
      ];

  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#0d9488' }}>
        {lang === 'zh' ? '📋 订单摘要' : '📋 Order Summary'}
      </div>

      {cartItems?.map(item => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f0fdf4' }}>
          <span>💊 {item.name} ×{item.quantity}</span>
          <span style={{ fontWeight: 600, color: '#0d9488' }}>${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: '8px 0 12px', fontSize: 15, color: '#0d9488' }}>
        <span>{lang === 'zh' ? '总计' : 'Total'}</span>
        <span>${total.toFixed(2)}</span>
      </div>

      <div style={{ borderTop: '1px solid #f0fdf4', paddingTop: 8 }}>
        {rows.filter(([, v]) => v).map(([k, v, field]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #f9fffe' }}>
            <span style={{ color: '#5a8090', minWidth: 72, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</span>
            <span style={{ fontWeight: 500, flex: 1, fontSize: 13 }}>{v}</span>
            {onEdit && field && (
              <button
                onClick={() => onEdit(field)}
                title={lang === 'zh' ? '编辑' : 'Edit'}
                style={{
                  background: 'rgba(13,148,136,0.08)',
                  border: '1px solid rgba(13,148,136,0.2)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#0d9488',
                  fontSize: 11,
                  padding: '2px 7px',
                  fontWeight: 600,
                  flexShrink: 0,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,148,136,0.16)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(13,148,136,0.08)'}
              >
                {lang === 'zh' ? '编辑' : 'Edit'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}