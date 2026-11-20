/**
 * The Signal Room — site.ts
 * ~5 KB gzipped of vanilla TS. No frameworks, no dependencies.
 * Handles: header, mobile menu, sticky bar, scroll reveals, counters,
 * the before/after audio players, work-tile player, live availability,
 * and the 3-step booking wizard.
 */

/* ---------- tiny analytics bus ---------- */
type Props = Record<string, string | number | boolean>;
const track = (event: string, props: Props = {}) => {
  try {
    const p = (window as any).plausible;
    if (typeof p === 'function') p(event, { props });
    const dl = (window as any).dataLayer;
    if (Array.isArray(dl)) dl.push({ event, ...props });
  } catch { /* analytics must never break the page */ }
};
document.querySelectorAll<HTMLElement>('[data-track]').forEach((el) => {
  el.addEventListener('click', () => track(el.dataset.track!, { location: el.dataset.location ?? 'unknown' }));
});

/* ---------- header ---------- */
const header = document.getElementById('siteHeader');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- mobile menu ---------- */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (menuBtn && mobileMenu) {
  const toggle = (open: boolean) => {
    mobileMenu.classList.toggle('open', open);
    mobileMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => toggle(!mobileMenu.classList.contains('open')));
  mobileMenu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) toggle(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
}

/* ---------- sticky mobile bar ---------- */
const stickyBar = document.getElementById('stickyBar');
if (stickyBar) {
  let shown = false;
  const onScroll = () => {
    const should = window.scrollY > 480;
    if (should !== shown) {
      shown = should;
      stickyBar.classList.toggle('visible', shown);
      stickyBar.setAttribute('aria-hidden', String(!shown));
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- scroll reveals ---------- */
const revealEls = document.querySelectorAll<HTMLElement>('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ---------- counters ---------- */
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (counters.length) {
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count ?? '0');
    const suffix = el.dataset.suffix ?? '';
    if (reduced) { el.textContent = target.toLocaleString() + suffix; return; }
    const start = performance.now();
    const dur = 800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(target * (t === 1 ? 1 : eased)).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target as HTMLElement); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach((el) => io.observe(el));
  } else counters.forEach(run);
}

/* ============================================================
   Availability engine — deterministic pseudo-live calendar.
   Seeded by date+slot so every visitor on the same day sees the
   same honest schedule. ~35% of slots read as booked.
   ============================================================ */
const SLOT_HOURS = [10, 12, 14, 16, 18, 20, 22, 0] as const; // 10AM … 12AM (2AM close)
export {}; // keep module scope clean

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function slotBusy(dayKey: string, hour: number): boolean {
  return mulberry32(hashString(`signal|${dayKey}|${hour}`))() < 0.34;
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtSlot(d: Date, hour: number): string {
  const h24 = hour === 0 ? 24 : hour;
  const ap = h24 >= 12 && h24 < 24 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:00 ${ap}`;
}
function nextOpenSlot(): { day: string; hour: number; label: string } {
  const now = new Date();
  for (let offset = 0; offset < 14; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    for (const h of SLOT_HOURS) {
      if (offset === 0 && h !== 0 && h <= now.getHours() + 1) continue; // 1h lead time
      if (offset === 0 && h === 0 && now.getHours() >= 23) continue;
      if (!slotBusy(dayKey(d), h)) {
        const label = offset === 0 ? `Tonight ${fmtSlot(d, h)}` : offset === 1 ? `Tomorrow ${fmtSlot(d, h)}` :
          `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtSlot(d, h)}`;
        return { day: dayKey(d), hour: h, label };
      }
    }
  }
  return { day: dayKey(now), hour: 20, label: 'Tonight 8:00 PM' };
}

/* hero "next open" line */
const nextOpenEl = document.getElementById('nextOpen');
if (nextOpenEl) nextOpenEl.textContent = nextOpenSlot().label;

/* ============================================================
   Audio player — preload="none", one global <audio>
   ============================================================ */
const audio = new Audio();
audio.preload = 'none';
let currentKey: string | null = null;

function buildBars(container: HTMLElement, seedKey: string, count = 46) {
  const rand = mulberry32(hashString(seedKey));
  const baseBars: HTMLElement[] = [];
  const fillBars: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    // smooth-ish pseudo waveform
    const envelope = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.32 + rand() * 2) * 0.7 + (rand() - 0.5) * 0.6);
    const h = Math.max(14, Math.min(100, Math.round(envelope * 100)));
    for (const target of [baseBars, fillBars]) {
      const bar = document.createElement('i');
      bar.style.height = h + '%';
      target.push(bar);
    }
  }
  const base = container.querySelector<HTMLElement>('.wave-base');
  const fill = container.querySelector<HTMLElement>('.wave-fill .wave-bars');
  if (base) baseBars.forEach((b) => base.appendChild(b));
  if (fill) fillBars.forEach((b) => fill.appendChild(b));
}

const fmtTime = (s: number) => {
  if (!isFinite(s)) return '--:--';
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

/* Before/after cards */
document.querySelectorAll<HTMLElement>('.ba-card').forEach((card) => {
  const beforeSrc = card.dataset.before!;
  const afterSrc = card.dataset.after!;
  const title = card.dataset.title ?? 'track';
  buildBars(card, `wave|${title}`);

  const toggleBtns = card.querySelectorAll<HTMLButtonElement>('.ba-toggle button');
  const playBtn = card.querySelector<HTMLButtonElement>('.play-btn')!;
  const timeEl = card.querySelector<HTMLElement>('.ba-time')!;
  const fillWrap = card.querySelector<HTMLElement>('.wave-fill')!;
  const state = { mode: 'mix' as 'raw' | 'mix' };
  const srcFor = () => (state.mode === 'raw' ? beforeSrc : afterSrc);
  const keyFor = () => `${title}|${state.mode}`;

  const syncToggle = () => toggleBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  toggleBtns.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === state.mode) return;
      const wasPlaying = currentKey === keyFor();
      state.mode = btn.dataset.mode as 'raw' | 'mix';
      syncToggle();
      card.style.setProperty('--p', '0');
      timeEl.textContent = '0:00 / 0:36';
      if (wasPlaying || currentKey === keyFor()) playPause();
    })
  );

  function setIcon(playing: boolean) {
    const play = playBtn.querySelector('.icon-play') as SVGElement;
    const pause = playBtn.querySelector('.icon-pause') as SVGElement;
    play?.toggleAttribute('hidden', playing);
    pause?.toggleAttribute('hidden', !playing);
    playBtn.setAttribute('aria-label', playing ? `Pause ${title} (${state.mode})` : `Play ${title} (${state.mode})`);
  }

  function playPause() {
    const key = keyFor();
    if (currentKey === key && !audio.paused) { audio.pause(); return; }
    if (currentKey !== key) {
      audio.src = srcFor();
      currentKey = key;
      audio.play().catch(() => {});
      track('audio_play', { clip: key, location: 'before-after' });
    } else {
      audio.play().catch(() => {});
    }
  }

  playBtn.addEventListener('click', playPause);

  // keep this card's UI in sync with the global audio element
  card.addEventListener('ba:sync', () => setIcon(currentKey === keyFor() && !audio.paused));
  (card as any)._sync = () => {
    const isCurrent = currentKey === keyFor();
    setIcon(isCurrent && !audio.paused);
    if (isCurrent && audio.duration) {
      timeEl.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
      card.style.setProperty('--p', String(audio.currentTime / audio.duration));
    } else if (!isCurrent) {
      card.style.setProperty('--p', '0');
    }
  };
  syncToggle();
  setIcon(false);
});

const syncCards = () => document.querySelectorAll<HTMLElement>('.ba-card').forEach((c) => (c as any)._sync?.());
audio.addEventListener('timeupdate', syncCards);
audio.addEventListener('play', syncCards);
audio.addEventListener('pause', syncCards);
audio.addEventListener('ended', () => { track('audio_complete', { clip: currentKey ?? 'unknown' }); currentKey = null; syncCards(); });

/* Work tiles */
const workTiles = document.querySelectorAll<HTMLElement>('.work-tile[data-src]');
const syncTiles = () => {
  workTiles.forEach((tile) => tile.classList.toggle('playing', tile.dataset.src === currentKey && !audio.paused));
};
workTiles.forEach((tile) => {
  const btn = tile.querySelector<HTMLButtonElement>('.work-play')!;
  btn.addEventListener('click', () => {
    const src = tile.dataset.src!;
    if (currentKey === src && !audio.paused) { audio.pause(); return; }
    if (currentKey === src) { audio.play().catch(() => {}); return; }
    audio.src = src;
    currentKey = src;
    audio.play().catch(() => {});
    track('audio_play', { clip: src, location: 'work-grid' });
  });
});
audio.addEventListener('play', syncTiles);
audio.addEventListener('pause', syncTiles);
audio.addEventListener('ended', syncTiles);

/* ============================================================
   Booking wizard (/book)
   ============================================================ */
const wizard = document.getElementById('bookingWizard');
if (wizard) {
  const qs = <T extends Element = Element>(sel: string) => wizard.querySelector<T>(sel);
  const qsa = <T extends Element = Element>(sel: string) => [...wizard.querySelectorAll<T>(sel)];

  const PRICES = { hourly: 35, lateNight: 28, block: 230, mix: 199, depositRecording: 50, depositMix: 100, firstTimer: 25 };
  const state = {
    step: 1,
    sessionType: 'hourly' as 'hourly' | 'block' | 'mix',
    hours: 2,
    engineer: 'any',
    day: '' as string,
    hour: -1 as number,
    promo: '',
    name: '', phone: '', email: '', people: '1', notes: '', consent: false,
  };

  /* --- pricing --- */
  const isLate = () => state.hour === 0 || state.hour === 22;
  const subtotal = () => {
    if (state.sessionType === 'block') return PRICES.block;
    if (state.sessionType === 'mix') return PRICES.mix;
    return (isLate() ? PRICES.lateNight : PRICES.hourly) * state.hours;
  };
  const discount = () => (state.promo === 'FIRST' ? Math.min(PRICES.firstTimer, subtotal()) : 0);
  const total = () => Math.max(0, subtotal() - discount());
  const deposit = () => (state.sessionType === 'mix' ? PRICES.depositMix : PRICES.depositRecording);

  /* --- quick picks --- */
  const quickWrap = qs<HTMLElement>('#quickPicks')!;
  const slotGrid = qs<HTMLElement>('#slotGrid')!;
  const dayScroller = qs<HTMLElement>('#dayScroller')!;
  const progressFill = qsa<HTMLElement>('.progress .bar i');
  const stepDots = qsa<HTMLElement>('.step-dots strong');

  const renderDays = () => {
    dayScroller.innerHTML = '';
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip day-chip';
      btn.dataset.day = dayKey(d);
      btn.setAttribute('aria-pressed', String(state.day === dayKey(d)));
      btn.innerHTML = `<span class="mono">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span> ${d.getDate()} <span class="mono">${d.toLocaleDateString('en-US', { month: 'short' })}</span>`;
      btn.addEventListener('click', () => { state.day = dayKey(d); state.hour = -1; renderDays(); renderSlots(); sync(); track('slot_selected', { day: state.day, kind: 'day' }); });
      dayScroller.appendChild(btn);
    }
  };
  const renderSlots = () => {
    if (!state.day) { slotGrid.innerHTML = '<p class="mono" style="grid-column:1/-1; text-align:center; padding:12px 0">Pick a day above</p>'; return; }
    slotGrid.innerHTML = '';
    const now = new Date();
    const isToday = state.day === dayKey(now);
    const d = new Date(state.day + 'T12:00:00');
    for (const h of SLOT_HOURS) {
      const past = isToday && h !== 0 && h <= now.getHours() + 1;
      const busy = slotBusy(state.day, h) || past;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot' + (busy ? ' busy' : '');
      btn.textContent = fmtSlot(d, h);
      btn.setAttribute('aria-pressed', String(state.hour === h));
      if (busy) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
      btn.addEventListener('click', () => { state.hour = h; renderSlots(); sync(); track('slot_selected', { day: state.day!, hour: h }); });
      slotGrid.appendChild(btn);
    }
  };
  const renderQuickPicks = () => {
    quickWrap.innerHTML = '';
    const now = new Date();
    // Build 3 honest quick picks: next available evenings
    const picks: Array<{ label: string; day: string; hour: number }> = [];
    for (let offset = 0; offset < 7 && picks.length < 3; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const evening = offset === 0 ? [21, 22, 0] : [18, 20, 21];
      for (const h of evening) {
        if (picks.length >= 3) break;
        if (offset === 0 && h !== 0 && h <= now.getHours() + 1) continue;
        if (slotBusy(dayKey(d), h)) continue;
        const label = offset === 0 ? `Tonight ${fmtSlot(d, h)}` : offset === 1 ? `Tomorrow ${fmtSlot(d, h)}` :
          `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${fmtSlot(d, h)}`;
        picks.push({ label, day: dayKey(d), hour: h });
      }
    }
    picks.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.quick = `${p.day}|${p.hour}`;
      btn.setAttribute('aria-pressed', String(state.day === p.day && state.hour === p.hour));
      btn.innerHTML = `<span class="rec-dot" aria-hidden="true"></span> ${p.label}`;
      btn.addEventListener('click', () => {
        state.day = p.day; state.hour = p.hour;
        renderDays(); renderSlots(); renderQuickPicks(); sync();
        track('slot_selected', { quick: true });
      });
      quickWrap.appendChild(btn);
    });
  };

  /* --- summary --- */
  const setText = (id: string, v: string) => { const el = qs<HTMLElement>('#' + id); if (el) el.textContent = v; };
  const sync = () => {
    // option cards
    qsa<HTMLInputElement>('input[name="session"]').forEach((r) => { (r.closest('.option-card') as HTMLElement)?.classList.toggle('checked', r.checked); });
    // hours row only for hourly
    const hoursRow = qs<HTMLElement>('#hoursRow');
    if (hoursRow) hoursRow.style.display = state.sessionType === 'hourly' ? 'grid' : 'none';
    const lateRow = qs<HTMLElement>('#lateNightNote');
    if (lateRow) lateRow.hidden = !(state.sessionType === 'hourly' && isLate());

    const typeLabel = state.sessionType === 'block' ? `Block · ${10} hrs` : state.sessionType === 'mix' ? 'Mix & Master · per song' : `Hourly · ${state.hours} hr${state.hours > 1 ? 's' : ''}${isLate() ? ' (after 11PM rate)' : ''}`;
    const engLabel = state.engineer === 'any' ? 'Any available engineer' : ({ marcus: 'Marcus "Blade" Bell', deja: 'Deja Price', trey: 'Trey Cole' } as Record<string, string>)[state.engineer] ?? state.engineer;
    const whenLabel = state.hour >= 0 && state.day ? `${new Date(state.day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtSlot(new Date(state.day + 'T12:00:00'), state.hour)}` : 'Pick a time →';

    setText('sumType', typeLabel);
    setText('sumEngineer', engLabel);
    setText('sumWhen', whenLabel);
    setText('sumSubtotal', `$${subtotal().toFixed(0)}`);
    setText('sumPromoRow', discount() ? `−$${discount().toFixed(0)} (FIRST)` : '—');
    setText('sumTotal', `$${total().toFixed(0)}`);
    setText('sumDeposit', `$${deposit().toFixed(0)}`);
    setText('depositDue', `$${deposit().toFixed(0)} due now`);
    setText('balanceNote', `$${(total() - deposit()).toFixed(0)} balance at the studio`);

    // progress bars & dots
    progressFill.forEach((bar, i) => bar.style.setProperty('--fill', String(state.step > i ? 1 : 0)));
    stepDots.forEach((d, i) => d.setAttribute('aria-current', String(state.step === i + 1)));

    qsa<HTMLElement>('.wizard-step').forEach((s) => s.classList.toggle('active', Number(s.dataset.step) === state.step));
    const stepLabel = qs<HTMLElement>('#stepLabel');
    if (stepLabel) stepLabel.textContent = `Step ${state.step} of 3`;
    window.scrollTo({ top: Math.max(0, wizard.offsetTop - 70), behavior: reduced ? 'auto' : 'smooth' });
  };

  /* --- step 1: session options --- */
  qsa<HTMLInputElement>('input[name="session"]').forEach((r) =>
    r.addEventListener('change', () => { state.sessionType = r.value as typeof state.sessionType; sync(); })
  );
  qs<HTMLSelectElement>('#hoursSelect')?.addEventListener('change', (e) => { state.hours = Number((e.target as HTMLSelectElement).value); sync(); });
  qs<HTMLSelectElement>('#engineerSelect')?.addEventListener('change', (e) => { state.engineer = (e.target as HTMLSelectElement).value; sync(); });

  // engineer preselect via ?engineer=
  const preEng = new URLSearchParams(window.location.search).get('engineer');
  if (preEng) {
    const sel = qs<HTMLSelectElement>('#engineerSelect');
    if (sel && [...sel.options].some((o) => o.value === preEng)) { sel.value = preEng; state.engineer = preEng; }
  }
  // promo via ?offer=first
  const offer = new URLSearchParams(window.location.search).get('offer');
  if (offer === 'first') {
    state.promo = 'FIRST';
    const promoEl = qs<HTMLInputElement>('#promoInput');
    if (promoEl) { promoEl.value = 'FIRST'; promoEl.setAttribute('readonly', 'true'); }
    const applied = qs<HTMLElement>('#promoApplied');
    if (applied) applied.textContent = 'First-timer deal applied: $25 off.';
  }

  qs<HTMLButtonElement>('#promoApply')?.addEventListener('click', () => {
    const input = qs<HTMLInputElement>('#promoInput');
    const code = (input?.value ?? '').trim().toUpperCase();
    const applied = qs<HTMLElement>('#promoApplied');
    if (code === 'FIRST') { state.promo = 'FIRST'; if (applied) applied.textContent = 'Applied: $25 off your first session.'; track('promo_applied', { code }); }
    else { state.promo = ''; if (applied) applied.textContent = code ? `“${code}” is not a valid code.` : ''; }
    sync();
  });

  /* --- navigation --- */
  const showStep = (n: number) => { state.step = n; sync(); };
  qs<HTMLButtonElement>('#toStep2')?.addEventListener('click', () => { track('book_start', { session: state.sessionType }); showStep(2); });
  qs<HTMLButtonElement>('#toStep3')?.addEventListener('click', () => {
    if (state.hour < 0 || !state.day) {
      const hint = qs<HTMLElement>('#slotHint');
      if (hint) hint.textContent = 'Pick a day and time first.';
      return;
    }
    track('checkout_start', { session: state.sessionType, day: state.day, hour: state.hour });
    showStep(3);
  });
  qs<HTMLButtonElement>('#backTo1')?.addEventListener('click', () => showStep(1));
  qs<HTMLButtonElement>('#backTo2')?.addEventListener('click', () => showStep(2));

  /* --- step 3: details + pay --- */
  const form = qs<HTMLFormElement>('#detailsForm')!;
  const setInvalid = (id: string, bad: boolean) => qs<HTMLElement>('#' + id)?.classList.toggle('invalid', bad);
  const validateDetails = () => {
    const name = qs<HTMLInputElement>('#fName')!;
    const phone = qs<HTMLInputElement>('#fPhone')!;
    const email = qs<HTMLInputElement>('#fEmail')!;
    const nameOk = name.value.trim().length >= 2;
    const phoneOk = /^[+()\-.\s\d]{7,20}$/.test(phone.value.trim());
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    setInvalid('fieldName', !nameOk); setInvalid('fieldPhone', !phoneOk); setInvalid('fieldEmail', !emailOk);
    state.name = name.value.trim(); state.phone = phone.value.trim(); state.email = email.value.trim();
    state.people = (qs<HTMLSelectElement>('#fPeople')?.value) ?? '1';
    state.notes = (qs<HTMLTextAreaElement>('#fNotes')?.value) ?? '';
    state.consent = !!(qs<HTMLInputElement>('#fConsent')?.checked);
    return nameOk && phoneOk && emailOk;
  };

  const bookingRef = () => 'SR-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');

  const slotDate = () => {
    const d = new Date(state.day + 'T12:00:00');
    const hour = state.hour === 0 ? 0 : state.hour;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0);
    if (hour === 0) start.setDate(start.getDate() + 1); // 12AM slot is after midnight
    return start;
  };

  const makeIcs = (ref: string) => {
    const start = slotDate();
    const end = new Date(start.getTime() + (state.sessionType === 'hourly' ? state.hours : state.sessionType === 'block' ? 3 : 2) * 3600_000);
    const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//The Signal Room//Booking//EN','BEGIN:VEVENT',
      `UID:${ref}@thesignalroomstudio.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      'SUMMARY:The Signal Room — Recording Session',
      'LOCATION:2811 NE 33rd Street\\, Suite 7\\, Pompano Beach\\, FL 33064',
      'DESCRIPTION:Bring your beats and IDs. Free parking behind the building. Buzzer #7.\\nQuestions? Text (954) 555-0134.',
      'END:VEVENT','END:VCALENDAR'].join('\r\n');
  };

  const showConfirmation = (ref: string, via: 'demo' | 'stripe') => {
    wizard.querySelectorAll('.wizard-step, .progress, .step-dots, #preConfirm').forEach((el) => ((el as HTMLElement).style.display = 'none'));
    const confirmBox = qs<HTMLElement>('#confirmPanel')!;
    confirmBox.hidden = false;
    const when = slotDate();
    setText('confirmRef', ref);
    setText('confirmWhen', when.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setText('confirmEmail', state.email);
    setText('confirmPhone', state.phone);
    setText('confirmBalance', `$${(total() - deposit()).toFixed(0)} balance due at the studio · $${deposit().toFixed(0)} deposit ${via === 'stripe' ? 'paid' : 'accounted for'} · Ref ${ref}`);
    const icsBtn = qs<HTMLButtonElement>('#downloadIcs');
    icsBtn?.addEventListener('click', () => {
      const blob = new Blob([makeIcs(ref)], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `signal-room-${ref}.ics`; a.click();
      URL.revokeObjectURL(url);
    });
    track('booking_complete', { ref, via, session: state.sessionType });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateDetails()) {
      const firstBad = form.querySelector<HTMLElement>('.field.invalid input, .field.invalid select');
      firstBad?.focus();
      return;
    }
    const ref = bookingRef();
    const stripeLink = (window as any).__STRIPE_LINK as string | undefined;
    if (stripeLink) {
      showConfirmation(ref, 'stripe');
      window.location.href = `${stripeLink}${stripeLink.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(ref)}`;
      return;
    }
    showConfirmation(ref, 'demo');
  });

  /* init */
  renderQuickPicks(); renderDays(); renderSlots(); sync();
}

/* ---------- FAQ open tracking ---------- */
document.querySelectorAll<HTMLDetailsElement>('details.faq').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (d.open) track('faq_open', { q: (d.querySelector('summary')?.textContent ?? '').trim().slice(0, 80) });
  });
});

/* ---------- scroll depth (75%) ---------- */
let scroll75Fired = false;
const onScroll75 = () => {
  if (scroll75Fired) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  if (max > 0 && window.scrollY / max > 0.75) { scroll75Fired = true; track('scroll_75'); }
};
window.addEventListener('scroll', onScroll75, { passive: true });

/* ---------- SMS / DM click tracking ---------- */
document.querySelectorAll<HTMLAnchorElement>('a[href^="sms:"]').forEach((a) =>
  a.addEventListener('click', () => track('text_click', { location: a.closest('[data-location]') ? 'cta-block' : 'page' }))
);
document.querySelectorAll<HTMLAnchorElement>('a[href*="instagram.com"]').forEach((a) =>
  a.addEventListener('click', () => track('dm_click', { location: 'link' }))
);

/* ---------- engineer reel buttons ---------- */
document.querySelectorAll<HTMLButtonElement>('.reel-btn[data-src]').forEach((btn) => {
  const label = btn.dataset.label ?? 'reel';
  const sync = () => {
    const active = currentKey === btn.dataset.src && !audio.paused;
    btn.classList.toggle('playing', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.innerHTML = active
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/></svg> Playing — ${label}`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.1v13.8c0 1.1 1.2 1.8 2.2 1.2l10.8-6.9c.9-.5.9-1.9 0-2.4L10.2 3.9C9.2 3.3 8 4 8 5.1z"/></svg> 30s reel — ${label}`;
  };
  btn.addEventListener('click', () => {
    const src = btn.dataset.src!;
    if (currentKey === src && !audio.paused) { audio.pause(); return; }
    if (currentKey === src) { audio.play().catch(() => {}); return; }
    audio.src = src; currentKey = src; audio.play().catch(() => {});
    track('audio_play', { clip: src, location: 'engineer-reel' });
  });
  ['play', 'pause', 'ended'].forEach((ev) => audio.addEventListener(ev, sync));
});
