// Vanilla JS — two behaviors only: (1) publication filter tabs, (2) mobile nav toggle.

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
});
