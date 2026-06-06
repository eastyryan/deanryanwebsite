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

  /* ---- Contact form -> mailto ---- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var name = get('name');
      var email = get('email');
      var phone = get('phone');
      var service = get('service');
      var message = get('message');

      var subject = 'Website Inquiry' + (service ? ' — ' + service : '');
      var bodyLines = [
        'Name: ' + name,
        'Email: ' + email,
        'Phone: ' + phone,
        'Service Required: ' + service,
        '',
        message
      ];
      var href = 'mailto:deanryans@rogers.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(bodyLines.join('\n'));
      window.location.href = href;

      var note = document.getElementById('form-note');
      if (note) note.classList.remove('hidden');
    });
  }
});
