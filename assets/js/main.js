/* Dean Ryans Enterprises — site behaviour */
document.addEventListener('DOMContentLoaded', function () {

  /* ---- Light / dark theme toggle ---- */
  var root = document.documentElement;
  var themeToggles = Array.prototype.slice.call(document.querySelectorAll('.theme-toggle'));

  function currentTheme() {
    return root.classList.contains('light') ? 'light' : 'dark';
  }
  function syncToggleUI() {
    var isLight = currentTheme() === 'light';
    // Icon/label describe the action: in light mode, offer to switch to dark.
    var icon = isLight ? 'dark_mode' : 'light_mode';
    var label = isLight ? 'Dark Mode' : 'Light Mode';
    themeToggles.forEach(function (btn) {
      var ic = btn.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = icon;
      var lab = btn.querySelector('.theme-toggle-label');
      if (lab) lab.textContent = label;
    });
  }
  function setTheme(theme) {
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    syncToggleUI();
  }
  syncToggleUI();
  themeToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
  });

  /* ---- Mobile nav drawer ---- */
  var menuBtn = document.getElementById('menu-btn');
  var closeBtn = document.getElementById('drawer-close');
  var navDrawer = document.getElementById('nav-drawer');
  var overlay = document.getElementById('drawer-overlay');

  function openMenu() {
    if (!navDrawer) return;
    navDrawer.classList.remove('translate-x-full');
    navDrawer.classList.add('translate-x-0');
    if (overlay) {
      overlay.classList.remove('hidden');
      requestAnimationFrame(function () { overlay.classList.remove('opacity-0'); });
    }
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!navDrawer) return;
    navDrawer.classList.add('translate-x-full');
    navDrawer.classList.remove('translate-x-0');
    if (overlay) {
      overlay.classList.add('opacity-0');
      setTimeout(function () { overlay.classList.add('hidden'); }, 300);
    }
    document.body.style.overflow = '';
  }
  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  /* ---- Sticky header shadow on scroll ---- */
  var header = document.getElementById('site-header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 20) header.classList.add('shadow-lg', 'shadow-black/40');
      else header.classList.remove('shadow-lg', 'shadow-black/40');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Hero carousel ---- */
  var carousel = document.getElementById('hero-carousel');
  if (carousel) {
    var items = carousel.querySelectorAll('.carousel-item');
    if (items.length > 1) {
      var current = 0;
      setInterval(function () {
        items[current].classList.remove('active');
        current = (current + 1) % items.length;
        items[current].classList.add('active');
      }, 2500);
    }
  }

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- Gallery lightbox ---- */
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  var lightbox = document.getElementById('lightbox');
  if (lightbox && galleryItems.length) {
    var lbImg = document.getElementById('lightbox-img');
    var lbCaption = document.getElementById('lightbox-caption');
    var current = 0;

    var show = function (i) {
      current = (i + galleryItems.length) % galleryItems.length;
      var el = galleryItems[current];
      lbImg.src = el.getAttribute('data-src');
      lbImg.alt = (el.querySelector('img') || {}).alt || '';
      lbCaption.textContent = el.getAttribute('data-caption') || '';
    };
    var openLb = function (i) {
      show(i);
      lightbox.classList.remove('hidden');
      lightbox.classList.add('flex');
      document.body.style.overflow = 'hidden';
    };
    var closeLb = function () {
      lightbox.classList.add('hidden');
      lightbox.classList.remove('flex');
      document.body.style.overflow = '';
    };

    galleryItems.forEach(function (el, i) {
      el.addEventListener('click', function () { openLb(i); });
    });
    var closeBtn = document.getElementById('lightbox-close');
    var prevBtn = document.getElementById('lightbox-prev');
    var nextBtn = document.getElementById('lightbox-next');
    if (closeBtn) closeBtn.addEventListener('click', closeLb);
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lightbox.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---- Contact form -> Web3Forms (owner email) + /api (customer auto-response) ----
     The customer auto-response used to live on a Supabase Edge Function. That
     Supabase project no longer exists, which silently killed both the customer
     confirmation email and the Barrhaven contract PDF. It now runs same-origin
     as a Vercel function at /api/inquiry-autoresponse. */
  var form = document.getElementById('contact-form');
  if (form) {
    var WEB3FORMS_KEY = 'db141016-8e80-4247-9acf-26ed8d3494cd';
    var AUTORESPONSE_URL = '/api/inquiry-autoresponse';

    var note = document.getElementById('form-note');
    var submitBtn = document.getElementById('submit-btn');

    var setNote = function (msg, kind) {
      if (!note) return;
      note.textContent = msg;
      note.classList.remove('hidden', 'text-primary', 'text-error', 'text-on-surface-variant');
      note.classList.add(kind === 'error' ? 'text-error' : kind === 'muted' ? 'text-on-surface-variant' : 'text-primary');
    };

    var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot — silently drop bot submissions
      var hp = form.querySelector('[name="botcheck"]');
      if (hp && hp.checked) return;

      // Normalize postal code: strip spaces, uppercase (e.g. "k2j0a0" -> "K2J0A0")
      var postalRaw = get('postal_code');
      var postalNorm = postalRaw.replace(/\s+/g, '').toUpperCase();
      // Barrhaven auto-send area — forward sortation areas K2J and K2G
      var isBarrhaven = /^K2[JG]/.test(postalNorm);
      // The snow removal contract only auto-sends to snow leads inside that area.
      var isContractLead = isBarrhaven && /snow/i.test(get('service'));

      var data = {
        name: get('name'),
        email: get('email'),
        phone: get('phone'),
        address: get('address'),
        city: get('city'),
        postal_code: postalNorm,
        service: get('service'),
        message: get('message')
      };

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      setNote('Sending your message…', 'muted');

      // 1) Web3Forms — emails deanryans@rogers.com
      var emailReq = fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: 'New Website Inquiry' + (data.service ? ' — ' + data.service : ''),
          from_name: 'Dean Ryans Website',
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          postal_code: data.postal_code,
          service_area: isBarrhaven ? 'Barrhaven (K2J/K2G)' : 'Outside Barrhaven',
          service: data.service,
          message: data.message
        })
      }).then(function (r) { return r.json(); })
        .then(function (j) { return j && j.success === true; })
        .catch(function () { return false; });

      // 2) Customer auto-response — confirmation email, plus the service contract
      //    PDF for Barrhaven postal codes (K2J/K2G). Best-effort: a failure here
      //    must not tell the customer their inquiry was lost, since the owner
      //    notification above is what actually captures the lead. Failures are
      //    reported rather than swallowed, so this can't break silently again.
      var autoReq = fetch(AUTORESPONSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            console.error('Auto-response failed:', r.status, t);
            return false;
          });
        }
        return true;
      }).catch(function (err) {
        console.error('Auto-response request failed:', err);
        return false;
      });

      Promise.all([emailReq, autoReq]).then(function (results) {
        var emailOk = results[0];
        var autoOk = results[1];
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }

        if (emailOk) {
          form.reset();
          setNote("Thanks! Your message has been sent — we'll be in touch shortly.", 'success');
          if (!autoOk) {
            console.warn(
              'Contact form: inquiry reached Dean Ryans, but the customer confirmation email did not send' +
              (isContractLead
                ? ' (eligible snow removal lead — contract PDF was NOT delivered).'
                : '.')
            );
          }
        } else {
          setNote('Sorry, something went wrong. Please call 613.825.7913 or email deanryans@rogers.com.', 'error');
        }
      });
    });
  }
});
