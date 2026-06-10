// Vanilla JS — behaviors: (1) publication filter tabs, (2) mobile nav toggle, (3) image lightbox.

document.addEventListener('DOMContentLoaded', function () {
  // (1) Publication filter tabs
  var tabs = document.querySelectorAll('.filter-btn');
  var entries = document.querySelectorAll('.pub-entry');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      var filter = tab.dataset.filter;
      entries.forEach(function (entry) {
        var show = filter === 'all' || entry.dataset.type === filter;
        entry.classList.toggle('hidden', !show);
      });
    });
  });

  // (2) Mobile nav toggle
  var menuBtn = document.querySelector('.mobile-menu-btn');
  var mobileNav = document.querySelector('.mobile-nav');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // (3) Image lightbox — click a content image to view it full-screen.
  var overlay = document.createElement('div');
  overlay.className = 'img-overlay';
  overlay.innerHTML = '<img alt="">';
  document.body.appendChild(overlay);
  var overlayImg = overlay.querySelector('img');

  document.addEventListener('click', function (e) {
    var img = e.target.closest('.post-content img');
    if (img) {
      overlayImg.src = img.currentSrc || img.src;
      overlayImg.alt = img.alt;
      overlay.classList.add('open');
    } else if (overlay.contains(e.target)) {
      overlay.classList.remove('open'); // click anywhere on the overlay closes it
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') overlay.classList.remove('open');
  });
});
