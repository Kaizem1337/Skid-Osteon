document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.menu-button');
  const navLinks = document.querySelector('.nav-links');
  const dialog = document.querySelector('.modal-backdrop');
  const modalForm = document.getElementById('modal-form');
  const modalBody = document.getElementById('modal-body');
  const modalSuccess = document.getElementById('modal-success');
  const contactForm = document.getElementById('contact-form');
  const contactSuccess = document.getElementById('contact-success');
  const requests = new WeakMap();
  let trigger = null;
  let previousOverflow = '';
  const menuIcon = '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"/></svg>';
  const closeIcon = '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>';

  function closeMenu() {
    navLinks.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open navigation');
    menuBtn.innerHTML = menuIcon;
  }
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuBtn.innerHTML = open ? closeIcon : menuIcon;
  });
  navLinks.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('osteon:appearance-open', closeMenu);
  const mobileNavigation = window.matchMedia('(max-width: 1100px)');
  mobileNavigation.addEventListener('change', () => closeMenu());
  const navigation = document.querySelector('.nav');
  document.addEventListener('focusin', event => {
    if (!navigation.contains(event.target) && navLinks.classList.contains('is-open')) closeMenu();
  });
  document.addEventListener('click', event => {
    // The toggle replaces its SVG; use the original event path after that node is detached.
    if (!event.composedPath().includes(navigation) && navLinks.classList.contains('is-open')) closeMenu();
  });

  // Keep section links shareable without leaving hash fragments in the URL.
  const sectionPaths = {
    top: '/', main: '/', about: '/about', gallery: '/gallery',
    services: '/procedures', team: '/team', faq: '/faq', contact: '/contact'
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sectionAnchors = [...document.querySelectorAll('a[href^="#"]')];
  sectionAnchors.forEach(link => {
    const id = link.hash.slice(1);
    if (!Object.hasOwn(sectionPaths, id)) return;
    link.dataset.scrollTarget = id;
    if (location.protocol !== 'file:') link.setAttribute('href', sectionPaths[id]);
  });
  const patientRightsLink = document.querySelector('a[href="terms.html#patient-rights"]');
  if (patientRightsLink && location.protocol !== 'file:') patientRightsLink.href = '/terms/patient-rights';

  if (location.protocol !== 'file:') {
    history.scrollRestoration = 'manual';
    document.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest('a[data-scroll-target]') : null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const id = link.dataset.scrollTarget;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      const path = sectionPaths[id];
      if (location.pathname !== path || location.hash) history.pushState(null, '', path);
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      if (id === 'main') {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
    function showLocationSection() {
      const legacyId = location.hash.slice(1);
      const id = Object.hasOwn(sectionPaths, legacyId)
        ? legacyId
        : Object.keys(sectionPaths).find(section => sectionPaths[section] === location.pathname);
      if (Object.hasOwn(sectionPaths, legacyId)) history.replaceState(null, '', sectionPaths[legacyId]);
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
      else if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.addEventListener('popstate', () => requestAnimationFrame(showLocationSection));
    if (location.pathname !== '/' || location.hash) {
      requestAnimationFrame(() => requestAnimationFrame(showLocationSection));
      window.addEventListener('load', showLocationSection, { once: true });
    }
  }

  // Native scrolling stays in control. The header updates at most once per frame.
  const sectionLinks = [...navLinks.querySelectorAll('a[data-scroll-target]')];
  const navigationSections = sectionLinks.map(link => document.getElementById(link.dataset.scrollTarget));
  let scrollScheduled = false;
  function updateNavigation() {
    navigation.classList.toggle('is-scrolled', window.scrollY > 12);
    const current = navigationSections.find(section => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 150 && rect.bottom > 150;
    });
    sectionLinks.forEach(link => {
      if (current && link.dataset.scrollTarget === current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      window.requestAnimationFrame(updateNavigation);
    }
  }, { passive: true });
  updateNavigation();

  // Lay out disclosures once, then animate visible neighbours using transforms.
  // Animating height relayouts the entire page on every frame on mobile.
  const disclosureAnimations = new Set();
  function clearDisclosureAnimations() {
    disclosureAnimations.forEach(animation => animation.cancel());
    disclosureAnimations.clear();
  }
  function animateDisclosure(element, frames, duration = 220) {
    const animation = element.animate(frames, {
      duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
    disclosureAnimations.add(animation);
    animation.onfinish = () => disclosureAnimations.delete(animation);
  }
  document.querySelectorAll('details.service-row, details.faq-item').forEach(item => {
    const summary = item.querySelector('summary');
    summary.addEventListener('click', event => {
      if (reducedMotion.matches || !item.animate) return;
      event.preventDefault();
      const neighbours = [...item.parentElement.children].filter(node => node !== item);
      const section = item.closest('section');
      if (section?.nextElementSibling) neighbours.push(section.nextElementSibling);
      const before = neighbours.map(element => ({ element, rect: element.getBoundingClientRect() }));
      clearDisclosureAnimations();
      item.open = !item.open;
      // Batch all layout reads before creating any animations.
      const moves = before.map(({ element, rect }) => ({ element, rect, next: element.getBoundingClientRect() }));
      moves.forEach(({ element, rect, next }) => {
        const offset = rect.top - next.top;
        const visible = (rect.bottom > 0 && rect.top < innerHeight) || (next.bottom > 0 && next.top < innerHeight);
        if (visible && Math.abs(offset) > 1) {
          animateDisclosure(element, { transform: [`translateY(${offset}px)`, 'translateY(0)'] });
        }
      });
      if (item.open) {
        const answer = item.querySelector('.service-answer, .faq-answer');
        animateDisclosure(answer, { opacity: [0, 1], transform: ['translateY(-6px)', 'translateY(0)'] }, 180);
      }
    });
  });
  window.addEventListener('resize', clearDisclosureAnimations);
  reducedMotion.addEventListener('change', clearDisclosureAnimations);

  const gallery = document.querySelector('.gallery');
  if (gallery) {
    const track = gallery.querySelector('.gallery-track');
    const slides = [...track.querySelectorAll('.gallery-slide')];
    const dots = [...gallery.querySelectorAll('[data-gallery-index]')];
    const status = gallery.querySelector('.gallery-status');
    const lightbox = document.querySelector('.gallery-lightbox');
    let zoomTrigger;
    let zoomCloseTimer;
    let zoomOverflow = '';
    let suppressZoomUntil = 0;
    let current = 0;
    let holdUntil = 0;
    let visible = false;
    let timer;
    let touchStart;
    gallery.classList.add('gallery-ready');
    gallery.querySelector('.gallery-controls').hidden = false;

    function schedule() {
      clearTimeout(timer);
      if (!reducedMotion.matches && visible && !document.hidden && !touchStart && !lightbox.open) {
        const remainingHold = holdUntil - Date.now();
        timer = setTimeout(() => showCase(current + 1, true), remainingHold > 0 ? remainingHold : 3000);
      }
    }
    function showCase(index, automatic = false) {
      if (!automatic) holdUntil = Date.now() + 15000;
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      dots.forEach((dot, i) => {
        if (i === current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      status.setAttribute('aria-live', automatic ? 'off' : 'polite');
      status.textContent = `Case ${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      // Prepare the next pair before the timer advances to it.
      slides[(current + 1) % slides.length].querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
      schedule();
    }
    gallery.querySelectorAll('.gallery-zoom').forEach(link => {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (Date.now() < suppressZoomUntil) return;
        const source = link.querySelector('img');
        const enlarged = lightbox.querySelector('img');
        enlarged.src = source.src;
        enlarged.alt = source.alt;
        document.getElementById('gallery-zoom-title').textContent = source.alt;
        zoomTrigger = link;
        zoomOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        lightbox.showModal();
        schedule();
      });
    });
    function closeZoom() {
      if (!lightbox.open || lightbox.classList.contains('is-closing')) return;
      if (reducedMotion.matches) { lightbox.close(); return; }
      lightbox.classList.add('is-closing');
      // Fallback also closes the dialog if animation events are interrupted.
      zoomCloseTimer = setTimeout(() => lightbox.close(), 240);
    }
    lightbox.addEventListener('animationend', event => {
      if (event.target === lightbox && event.animationName === 'zoom-out') lightbox.close();
    });
    lightbox.addEventListener('cancel', event => { event.preventDefault(); closeZoom(); });
    lightbox.querySelector('.gallery-zoom-close').addEventListener('click', closeZoom);
    lightbox.addEventListener('click', event => {
      const rect = lightbox.getBoundingClientRect();
      if (event.target === lightbox && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeZoom();
    });
    lightbox.addEventListener('close', () => {
      clearTimeout(zoomCloseTimer);
      lightbox.classList.remove('is-closing');
      document.body.style.overflow = zoomOverflow;
      zoomTrigger?.focus({ preventScroll: true });
      holdUntil = Date.now() + 15000;
      schedule();
    });
    gallery.querySelectorAll('[data-gallery-step]').forEach(button => {
      button.addEventListener('click', () => showCase(current + Number(button.dataset.galleryStep)));
    });
    dots.forEach(button => button.addEventListener('click', () => showCase(Number(button.dataset.galleryIndex))));
    track.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      showCase(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    track.addEventListener('touchstart', event => {
      const touch = event.touches[0];
      touchStart = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
      clearTimeout(timer);
    }, { passive: true });
    track.addEventListener('touchend', event => {
      const touch = event.changedTouches[0];
      if (touchStart && touch) {
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          suppressZoomUntil = Date.now() + 500;
          showCase(current + (dx < 0 ? 1 : -1));
        }
      }
      touchStart = null;
      schedule();
    }, { passive: true });
    track.addEventListener('touchcancel', () => { touchStart = null; schedule(); }, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', schedule);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0 }).observe(track);
    } else visible = true;
    showCase(0, true);
  }
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const revealElements = document.querySelectorAll('.about-grid > div, .team-head, .team-card, .services-head, .service-row, .faq-head, .faq-list, .offers .section-title, .offer, .partners-grid > div, .contact-grid > div');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
    revealElements.forEach(element => {
      // Do not hide the initial viewport, including direct links to sections.
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.setAttribute('data-reveal', '');
      element.classList.add('reveal-pending');
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        revealElements.forEach(element => element.classList.remove('reveal-pending'));
      }
    });
    // Pages restored from browser history must not retain concealed content.
    window.addEventListener('pageshow', event => {
      if (event.persisted) revealElements.forEach(element => element.classList.remove('reveal-pending'));
    });
  }

  function resetForm(form) {
    form.reset();
    requests.delete(form);
    form.removeAttribute('aria-busy');
    form.querySelector('button[type="submit"]').disabled = false;
    form.querySelector('.form-error').hidden = true;
  }
  function openModal(kind) {
    trigger = document.activeElement;
    closeMenu();
    const consultation = kind === 'consultation';
    const portal = kind === 'portal';
    dialog.dataset.kind = kind;
    document.getElementById('modal-eyebrow').textContent = portal ? 'Coming soon' : consultation ? 'Consultation' : 'Membership';
    document.getElementById('modal-title').textContent = portal ? 'Patient Portal' : consultation ? 'Book Your 1:1' : 'Become an Osteon member';
    document.getElementById('modal-desc').textContent = portal
      ? 'Your private patient workspace is being prepared. For help with your care, contact Team Osteon directly.'
      : consultation
      ? 'A €10 conversation for surgery planning, morphs, and bookings. Tell us a little about where you are now.'
      : 'A private community with 24/7 access to Team Osteon for €15/month. Ask questions, share updates, and feel less alone in the process.';
    document.getElementById('modal-msg-label').textContent = consultation ? 'What would you like to understand?' : 'What would you like support with?';
    document.getElementById('modal-submit-text').textContent = consultation ? 'Request Consultation' : 'Request membership';
    modalForm.action = consultation ? '/api/consultation-requests' : '/api/enquiries';
    modalForm.hidden = portal;
    document.getElementById('modal-form-note').hidden = portal;
    document.getElementById('portal-info').hidden = !portal;
    modalBody.hidden = false;
    modalSuccess.hidden = true;
    resetForm(modalForm);
    dialog.hidden = false;
    previousOverflow = document.body.style.overflow;
    dialog.showModal(); // Native dialog provides focus trapping and makes the background inert.
    document.body.style.overflow = 'hidden';
    document.getElementById(portal ? 'portal-contact' : 'modal-name').focus();
  }
  function closeModal() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    dialog.hidden = true;
    document.body.style.overflow = previousOverflow;
    if (trigger?.getClientRects().length) trigger.focus();
    else menuBtn.focus();
  });
  document.querySelectorAll('[data-open-modal]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.openModal)));
  document.querySelector('.modal-close').addEventListener('click', closeModal);
  document.getElementById('portal-contact').addEventListener('click', closeModal);
  document.getElementById('modal-success-return').addEventListener('click', closeModal);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeModal(); });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.open && navLinks.classList.contains('is-open')) {
      closeMenu();
      menuBtn.focus();
    }
  });

  for (const form of [contactForm, modalForm]) {
    const trap = document.createElement('div');
    trap.className = 'honeypot';
    trap.setAttribute('aria-hidden', 'true');
    const trapId = `${form.id}-website`;
    trap.innerHTML = `<label for="${trapId}">Website</label><input id="${trapId}" name="website" autocomplete="off" tabindex="-1">`;
    form.append(trap);
    const error = document.createElement('p');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');
    error.tabIndex = -1;
    error.hidden = true;
    form.querySelector('button[type="submit"]').before(error);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (requests.get(form)?.busy) return;
      const fields = new FormData(form);
      const kind = form === contactForm ? 'contact' : dialog.dataset.kind;
      if (kind === 'portal') return; // Patient authentication is a separate future feature.
      const payload = { kind, name: fields.get('name'), email: fields.get('email'), visitorType: fields.get('type') || '', message: fields.get('message'), website: fields.get('website') || '' };
      const fingerprint = JSON.stringify(payload);
      const prior = requests.get(form);
      const operation = { fingerprint, id: prior?.fingerprint === fingerprint ? prior.id : crypto.randomUUID(), busy: true };
      requests.set(form, operation);
      const button = form.querySelector('button[type="submit"]');
      const label = button.querySelector('[data-submit-label]');
      const originalLabel = label.textContent;
      label.textContent = 'Sending…';
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      error.hidden = true;
      try {
        const response = await fetch(kind === 'consultation' ? '/api/consultation-requests' : '/api/enquiries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, submissionId: operation.id }), signal: AbortSignal.timeout(15000),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'We could not save your request. Please try again.');
        if (requests.get(form) !== operation) return; // A newly opened dialog owns its own state.
        if (form === contactForm) {
          form.hidden = true;
          contactSuccess.hidden = false;
          contactSuccess.focus();
        } else {
          modalBody.hidden = true;
          modalSuccess.hidden = false;
          // Keep the accessible dialog name present when the form body is hidden.
          dialog.setAttribute('aria-label', 'Request received');
          dialog.removeAttribute('aria-labelledby');
          dialog.removeAttribute('aria-describedby');
          modalSuccess.focus();
        }
        form.reset();
      } catch (reason) {
        if (requests.get(form) !== operation) return;
        error.textContent = reason.name === 'TimeoutError' || reason.name === 'TypeError'
          ? 'Connection interrupted. Please try again; your request will not be duplicated.'
          : reason.message;
        error.hidden = false;
        if (form.getClientRects().length) error.focus();
      } finally {
        operation.busy = false;
        if (requests.get(form) === operation) {
          button.disabled = false;
          label.textContent = originalLabel;
          form.removeAttribute('aria-busy');
        }
      }
    });
  }
  dialog.addEventListener('close', () => {
    dialog.removeAttribute('aria-label');
    dialog.setAttribute('aria-labelledby', 'modal-title');
    dialog.setAttribute('aria-describedby', 'modal-desc');
  });
  document.getElementById('contact-reset-btn').addEventListener('click', () => {
    resetForm(contactForm);
    contactForm.hidden = false;
    contactSuccess.hidden = true;
    document.getElementById('contact-name').focus();
  });
});
