/* Dean Ryans Enterprises — site behaviour */
document.addEventListener('DOMContentLoaded', function () {

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
      }, 4500);
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

  /* ---- Contact form -> Web3Forms (email) + Supabase (database) ---- */
  var form = document.getElementById('contact-form');
  if (form) {
    var WEB3FORMS_KEY = 'db141016-8e80-4247-9acf-26ed8d3494cd';
    var SUPABASE_URL = 'https://rvlmtpcuclthdatzmnol.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2bG10cGN1Y2x0aGRhdHptbm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjcwMzcsImV4cCI6MjA5NjM0MzAzN30.AjS88fM-rBMlOV-aQ32XCxnu2GGv_bPDexrmHGsVkns';

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

      var data = {
        name: get('name'),
        email: get('email'),
        phone: get('phone'),
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
          service: data.service,
          message: data.message
        })
      }).then(function (r) { return r.json(); })
        .then(function (j) { return j && j.success === true; })
        .catch(function () { return false; });

      // 2) Supabase — stores the submission in contact_submissions
      var dbReq = fetch(SUPABASE_URL + '/rest/v1/contact_submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      }).then(function (r) { return r.ok; })
        .catch(function () { return false; });

      Promise.all([emailReq, dbReq]).then(function (results) {
        var emailOk = results[0];
        var dbOk = results[1];
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }

        if (emailOk || dbOk) {
          form.reset();
          setNote("Thanks! Your message has been sent — we'll be in touch shortly.", 'success');
          if (!emailOk) console.warn('Contact form: email delivery failed but submission was saved.');
          if (!dbOk) console.warn('Contact form: database save failed but email was sent.');
        } else {
          setNote('Sorry, something went wrong. Please call 613.825.7913 or email deanryans@rogers.com.', 'error');
        }
      });
    });
  }
});
