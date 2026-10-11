document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const desk = document.getElementById('desk');
  const stage = document.getElementById('stage');
  const fan = document.getElementById('fan');
  const folder = document.getElementById('folder');
  const cards = Array.from(fan.querySelectorAll('.card'));
  const reader = document.getElementById('reader');
  const sheet = document.getElementById('sheet');
  const sheetScroll = document.getElementById('sheetScroll');
  const sheetNum = document.getElementById('sheetNum');
  const sheetTitle = document.getElementById('sheetTitle');
  const prevPage = document.getElementById('prevPage');
  const nextPage = document.getElementById('nextPage');
  const docs = Array.from(document.querySelectorAll('.doc'));

  const PAGES = docs.map(doc => doc.dataset.page);
  // Old anchors from the previous version of the site keep working.
  const ALIASES = { top: 'about', approach: 'about', projects: 'work', skills: 'capabilities', next: 'contact' };
  const pad = n => String(n).padStart(2, '0');
  const titleOf = id => docs.find(d => d.dataset.page === id)?.dataset.title || id;

  const state = { open: false, pinned: false, current: null, zone: null, closeTimer: null, suppressHover: false, animating: false };

  /* ------------------------------------------------------------
     Page footers ("Page 2 of 6 · Next: Work →")
     ------------------------------------------------------------ */
  docs.forEach((doc, i) => {
    const foot = document.createElement('footer');
    foot.className = 'doc-foot';
    const next = PAGES[i + 1];
    foot.innerHTML = `<span>Page ${i + 1} of ${PAGES.length}</span>` +
      (next ? `<a href="#${next}"><span>Next</span> ${titleOf(next)} →</a>` : `<a href="#" data-close><span>Back to</span> folder ↺</a>`);
    doc.appendChild(foot);
  });

  /* ------------------------------------------------------------
     Layout: where each page sits inside the folder and in the fan
     ------------------------------------------------------------ */
  const layout = () => {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const narrow = W < 640;

    const fw = narrow ? Math.max(170, Math.min(210, W * 0.52)) : 260;
    const fh = fw * 0.73;
    let cw = narrow ? Math.min(112, (W - 40 - 20) / 3) : (W < 900 ? 116 : 128);
    let ch = cw * 1.3;

    let ox = [], oy = [], or = [];
    let folderTop;

    if (!narrow) {
      // Pages fan out in an arc above the folder.
      const thetaMax = 60 * Math.PI / 180;
      const Rw = (W / 2 - cw * 0.62 - 24) / Math.sin(thetaMax);
      const Rdesired = Math.min(340, Rw);
      // Sit a little below centre so the opened fan reads as one centred composition.
      const lift = (Rdesired + ch / 2 - fh / 2 - 40) / 4;
      const folderCY = Math.min(Math.max(H / 2 + lift, Rdesired + ch / 2 + 80), H - fh / 2 - 70);
      const R = Math.max(fh / 2 + ch / 2 + 18, Math.min(Rdesired, folderCY - ch / 2 - 80));
      folderTop = folderCY - fh / 2;
      cards.forEach((_, i) => {
        const t = -thetaMax + (2 * thetaMax) * (i / (cards.length - 1));
        const cx = W / 2 + R * Math.sin(t);
        const cy = folderCY - R * Math.cos(t);
        ox.push(cx - cw / 2);
        oy.push(cy - ch / 2);
        or.push(t * 180 / Math.PI * 0.2);
      });
    } else {
      // Phones: two gently tilted rows of three above the folder.
      const gap = 10, rowGap = 16;
      const needed = 2 * ch + rowGap + 28 + 84;
      const folderCY = Math.min(Math.max(H / 2 + 30, needed + fh / 2), H - fh / 2 - 64);
      folderTop = folderCY - fh / 2;
      const avail = folderTop - 28 - 84;
      if (2 * ch + rowGap > avail) { ch = Math.max(90, (avail - rowGap) / 2); cw = ch / 1.3; }
      const rowW = 3 * cw + 2 * gap;
      const tilts = [-4, 1.5, 4, -3, 2, -1.5];
      cards.forEach((_, i) => {
        const row = Math.floor(i / 3), col = i % 3;
        const bottom = folderTop - 28;
        const cy = bottom - ch / 2 - (1 - row) * (ch + rowGap) - (col === 1 ? 8 : 0);
        const cx = (W - rowW) / 2 + col * (cw + gap) + cw / 2;
        ox.push(cx - cw / 2);
        oy.push(cy - ch / 2);
        or.push(tilts[i]);
      });
    }

    stage.style.setProperty('--fw', `${fw}px`);
    stage.style.setProperty('--fh', `${fh}px`);
    stage.style.setProperty('--ft', `${folderTop}px`);

    // Closed: pages tucked into the folder, tops peeking above the front flap.
    const frontTop = folderTop + fh * 0.2;
    const scale = 0.7;
    const closedCY = frontTop - fh * 0.08 + (ch * scale) / 2;
    const jitterX = [-0.13, -0.07, -0.02, 0.03, 0.08, 0.13];
    const jitterY = [6, 0, 4, -2, 3, 7];
    const jitterR = [-7, -3, 1, -2, 4, 7];

    cards.forEach((card, i) => {
      card.style.setProperty('--cw', `${cw}px`);
      card.style.setProperty('--cx', `${W / 2 + jitterX[i] * fw - cw / 2}px`);
      card.style.setProperty('--cy', `${closedCY + jitterY[i] - ch / 2}px`);
      card.style.setProperty('--cr', `${jitterR[i]}deg`);
      card.style.setProperty('--ox', `${ox[i]}px`);
      card.style.setProperty('--oy', `${oy[i]}px`);
      card.style.setProperty('--or', `${or[i]}deg`);
    });

    // The area that keeps the folder open while a mouse hovers over it.
    const P = 36;
    state.zone = {
      left: Math.min(...ox, W / 2 - fw / 2) - P,
      right: Math.max(...ox.map(x => x + cw), W / 2 + fw / 2) + P,
      top: Math.min(...oy) - P,
      bottom: folderTop + fh + 50
    };
  };

  let layoutFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      stage.classList.add('instant');
      layout();
      void stage.offsetWidth;
      stage.classList.remove('instant');
    });
  });
  layout();

  /* ------------------------------------------------------------
     Folder open / close
     ------------------------------------------------------------ */
  const setFolder = (open, { pin = false } = {}) => {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
    state.open = open;
    state.pinned = open && (pin || state.pinned);
    if (!open) state.pinned = false;
    stage.classList.toggle('is-open', open);
    folder.setAttribute('aria-expanded', String(open));
    folder.setAttribute('aria-label', open ? 'Close portfolio folder' : 'Open portfolio folder');
    fan.inert = !open;
  };
  fan.inert = true;

  folder.addEventListener('pointerenter', e => {
    if (e.pointerType === 'mouse' && !state.open && !state.suppressHover && !state.current) setFolder(true);
  });
  folder.addEventListener('pointerleave', () => { state.suppressHover = false; });
  folder.addEventListener('click', () => {
    if (state.open) { setFolder(false); state.suppressHover = true; }
    else setFolder(true, { pin: true });
  });

  // Hover intent: close shortly after the mouse leaves the folder + pages area.
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !state.open || state.pinned || state.current) return;
    const z = state.zone;
    const inside = z && e.clientX >= z.left && e.clientX <= z.right && e.clientY >= z.top && e.clientY <= z.bottom;
    if (inside) { clearTimeout(state.closeTimer); state.closeTimer = null; }
    else if (!state.closeTimer) state.closeTimer = setTimeout(() => setFolder(false), 320);
  });
  document.documentElement.addEventListener('pointerleave', () => {
    if (state.open && !state.pinned && !state.current) state.closeTimer = setTimeout(() => setFolder(false), 320);
  });

  // Tap / click on empty desk closes the folder.
  desk.addEventListener('click', e => {
    if (!state.open || state.current) return;
    if (e.target.closest('.card, .folder, .corner')) return;
    setFolder(false);
  });

  /* ------------------------------------------------------------
     Reader: a page grows out of its card
     ------------------------------------------------------------ */
  const cardFor = id => cards.find(c => c.dataset.page === id);

  const transformFromCard = card => {
    const c = card.getBoundingClientRect();
    const s = sheet.getBoundingClientRect();
    if (!s.width || !s.height) return 'none';
    return `translate(${c.left - s.left}px, ${c.top - s.top}px) scale(${c.width / s.width}, ${c.height / s.height})`;
  };

  const showDoc = id => {
    docs.forEach(doc => doc.classList.toggle('is-active', doc.dataset.page === id));
    const i = PAGES.indexOf(id);
    sheetNum.textContent = pad(i + 1);
    sheetTitle.textContent = titleOf(id);
    prevPage.href = `#${PAGES[Math.max(0, i - 1)]}`;
    nextPage.href = `#${PAGES[Math.min(PAGES.length - 1, i + 1)]}`;
    prevPage.classList.toggle('is-disabled', i === 0);
    nextPage.classList.toggle('is-disabled', i === PAGES.length - 1);
    sheetScroll.scrollTop = 0;
    cards.forEach(c => c.classList.toggle('is-lifted', c.dataset.page === id));
    document.title = `${titleOf(id)} — Kunal Rao`;
  };

  const openReader = id => {
    state.current = id;
    if (!state.open) {
      stage.classList.add('instant');
      setFolder(true, { pin: true });
      void stage.offsetWidth;
      stage.classList.remove('instant');
    }
    state.pinned = true;
    reader.hidden = false;
    desk.inert = true;
    showDoc(id);

    const card = cardFor(id);
    if (!reducedMotion && card) {
      sheet.style.transition = 'none';
      sheet.style.transform = transformFromCard(card);
      void sheet.offsetWidth;
      sheet.style.transition = '';
      requestAnimationFrame(() => {
        sheet.style.transform = '';
        reader.classList.add('is-open');
      });
    } else {
      reader.classList.add('is-open');
    }
    setTimeout(() => sheetTitle.focus({ preventScroll: true }), reducedMotion ? 0 : 400);
  };

  const closeReader = () => {
    const id = state.current;
    state.current = null;
    const card = cardFor(id);
    reader.classList.remove('is-open');
    document.title = "Kunal's Portfolio";

    const finish = () => {
      reader.hidden = true;
      sheet.style.transform = '';
      sheet.style.transition = '';
      desk.inert = false;
      cards.forEach(c => c.classList.remove('is-lifted'));
      card?.focus({ preventScroll: true });
    };

    if (!reducedMotion && card) {
      sheet.style.transform = transformFromCard(card);
      let done = false;
      const end = () => { if (!done) { done = true; finish(); } };
      sheet.addEventListener('transitionend', e => { if (e.propertyName === 'transform') end(); }, { once: true });
      setTimeout(end, 650);
    } else finish();
  };

  /* ------------------------------------------------------------
     Routing (#about, #experience …) — deep links + back button work
     ------------------------------------------------------------ */
  const resolve = hash => {
    const key = decodeURIComponent((hash || '').replace(/^#/, '')).toLowerCase();
    if (!key) return null;
    const id = ALIASES[key] || key;
    return PAGES.includes(id) ? id : null;
  };

  const render = () => {
    const id = resolve(location.hash);
    if (id && !state.current) openReader(id);
    else if (id && state.current !== id) { state.current = id; showDoc(id); }
    else if (!id && state.current) closeReader();
  };

  const goHome = () => {
    history.pushState(null, '', location.pathname + location.search);
    render();
  };

  window.addEventListener('hashchange', render);
  window.addEventListener('popstate', render);
  reader.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); goHome(); }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.current) goHome();
      else if (state.open) { setFolder(false); folder.focus(); }
      return;
    }
    if (!state.current || e.altKey || e.metaKey || e.ctrlKey) return;
    const i = PAGES.indexOf(state.current);
    if (e.key === 'ArrowRight' && i < PAGES.length - 1) location.hash = PAGES[i + 1];
    if (e.key === 'ArrowLeft' && i > 0) location.hash = PAGES[i - 1];
  });

  // Keep keyboard focus inside the open page.
  sheet.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(sheet.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null && !el.classList.contains('is-disabled'));
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  render();

  /* ------------------------------------------------------------
     Content interactions (from the previous site)
     ------------------------------------------------------------ */
  const activateGroup = selector => {
    document.querySelectorAll(selector).forEach(item => {
      const activate = () => {
        document.querySelectorAll(selector).forEach(candidate => {
          const isActive = candidate === item;
          candidate.classList.toggle('is-active', isActive);
          candidate.setAttribute('aria-expanded', String(isActive));
        });
      };
      item.addEventListener('mouseenter', activate);
      item.addEventListener('focus', activate);
      item.addEventListener('click', activate);
    });
  };
  activateGroup('.journey-stage');
  activateGroup('.feature-stage');

  const capabilityList = document.querySelector('.capability-list');
  if (capabilityList) {
    const items = capabilityList.querySelectorAll('.capability');
    items.forEach(capability => {
      const focus = () => {
        capabilityList.classList.add('has-focus');
        items.forEach(item => item.classList.toggle('is-active', item === capability));
      };
      capability.addEventListener('mouseenter', focus);
      capability.addEventListener('focusin', focus);
    });
    capabilityList.addEventListener('mouseleave', () => {
      capabilityList.classList.remove('has-focus');
      items.forEach(item => item.classList.remove('is-active'));
    });
  }

  const heroWord = document.getElementById('heroWord');
  if (heroWord && !reducedMotion) {
    const words = ['data.', 'insight.', 'decisions.', 'action.'];
    let wordIndex = 0;
    window.setInterval(() => {
      heroWord.classList.add('is-changing');
      window.setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        heroWord.textContent = words[wordIndex];
        heroWord.classList.remove('is-changing');
      }, 350);
    }, 3200);
  }
});
