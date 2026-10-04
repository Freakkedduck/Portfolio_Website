document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const siteHeader = document.getElementById('siteHeader');
  const menuButton = document.getElementById('menuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  let menuPinned = false;

  const setMenuState = (open, pin = false) => {
    if (!siteHeader || !mobileMenu) return;
    if (!open) menuPinned = false;
    else if (pin) menuPinned = true;
    siteHeader.classList.toggle('is-expanded', open);
    mobileMenu.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close section navigation' : 'Open section navigation');
      menuButton.textContent = open ? '×' : '☰';
    }
  };

  if (siteHeader && mobileMenu) {
    menuButton?.addEventListener('click', () => {
      if (menuPinned) setMenuState(false);
      else setMenuState(true, true);
    });
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuState(false)));

    siteHeader.addEventListener('focusout', event => {
      if (!siteHeader.contains(event.relatedTarget)) setMenuState(false);
    });
    document.addEventListener('pointerdown', event => {
      if (siteHeader.classList.contains('is-expanded') && !siteHeader.contains(event.target)) setMenuState(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !siteHeader.classList.contains('is-expanded')) return;
      setMenuState(false);
      menuButton?.focus();
    });
  }

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
    capabilityList.querySelectorAll('.capability').forEach(capability => {
      const focus = () => {
        capabilityList.classList.add('has-focus');
        capabilityList.querySelectorAll('.capability').forEach(item => item.classList.toggle('is-active', item === capability));
      };
      capability.addEventListener('mouseenter', focus);
      capability.addEventListener('focusin', focus);
    });
    capabilityList.addEventListener('mouseleave', () => {
      capabilityList.classList.remove('has-focus');
      capabilityList.querySelectorAll('.capability').forEach(item => item.classList.remove('is-active'));
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

  const revealItems = document.querySelectorAll('.section-heading, .story-heading, .journey, .numbers-heading, .metric, .timeline-item, .experience-feature, .project-card, .capability, .education-entry, .cert-list');
  revealItems.forEach((item, index) => item.classList.add('reveal', `reveal-delay-${Math.min(index % 4, 3)}`));
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  if (reducedMotion) revealItems.forEach(item => item.classList.add('is-visible'));
  else revealItems.forEach(item => revealObserver.observe(item));

  const metrics = document.querySelectorAll('[data-count]');
  const countMetric = metric => {
    const target = Number(metric.dataset.count);
    const suffix = metric.dataset.suffix || '';
    if (reducedMotion) {
      metric.textContent = `${target}${suffix}`;
      return;
    }
    const start = performance.now();
    const update = now => {
      const progress = Math.min((now - start) / 900, 1);
      const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      metric.textContent = `${value}${suffix}`;
      if (progress < 1) window.requestAnimationFrame(update);
    };
    window.requestAnimationFrame(update);
  };
  const metricObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countMetric(entry.target);
        metricObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  metrics.forEach(metric => metricObserver.observe(metric));

  const sections = Array.from(document.querySelectorAll('section[id]'));
  const navLinks = document.querySelectorAll('.desktop-nav a, .mobile-menu a[href^="#"]');
  const setActiveSection = section => {
    navLinks.forEach(link => {
      const isCurrent = link.getAttribute('href') === `#${section.id}`;
      link.classList.toggle('current', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const sectionObserver = new IntersectionObserver(entries => {
    const visibleSections = entries.filter(entry => entry.isIntersecting);
    if (!visibleSections.length) return;
    const viewportCenter = window.innerHeight / 2;
    const activeEntry = visibleSections.reduce((closest, entry) => {
      const bounds = entry.boundingClientRect;
      const distance = bounds.top > viewportCenter ? bounds.top - viewportCenter : bounds.bottom < viewportCenter ? viewportCenter - bounds.bottom : 0;
      const closestBounds = closest.boundingClientRect;
      const closestDistance = closestBounds.top > viewportCenter ? closestBounds.top - viewportCenter : closestBounds.bottom < viewportCenter ? viewportCenter - closestBounds.bottom : 0;
      return distance < closestDistance ? entry : closest;
    });
    setActiveSection(activeEntry.target);
  }, { rootMargin: '-42% 0px -48% 0px', threshold: 0 });
  sections.forEach(section => sectionObserver.observe(section));
});
