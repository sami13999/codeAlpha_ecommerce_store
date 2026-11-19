/**
 * MAISON & CO. — ENTERPRISE MOTION & MICRO-INTERACTION MANAGER
 * Designed according to UI UX Pro Max standard motion principles.
 * Ensures 60fps interactions with complete prefers-reduced-motion accessibility.
 */

(function () {
  'use strict';

  const isReducedMotion = () => {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  const MotionManager = {
    /**
     * Initializes scroll-driven reveals for elements with .reveal-item
     */
    initScrollReveal: function (root = document) {
      const items = root.querySelectorAll('.reveal-item:not(.is-revealed)');
      if (!items || items.length === 0) return;

      if (isReducedMotion() || !('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      });

      items.forEach(el => observer.observe(el));
    },

    /**
     * Triggers a tactile pop animation on a counter badge (Cart, Wishlist)
     */
    popBadge: function (badgeElement) {
      if (!badgeElement || isReducedMotion()) return;
      badgeElement.classList.remove('animate-badge-pop');
      // Trigger reflow to restart CSS animation
      void badgeElement.offsetWidth;
      badgeElement.classList.add('animate-badge-pop');
    },

    /**
     * Triggers heart-beat feedback on wishlist toggle
     */
    heartBeat: function (heartElement) {
      if (!heartElement || isReducedMotion()) return;
      heartElement.classList.remove('animate-heart-beat');
      void heartElement.offsetWidth;
      heartElement.classList.add('animate-heart-beat');
    },

    /**
     * Animates smooth numerical counter on KPI metric cards
     */
    animateNumber: function (element, start, end, duration = 800) {
      if (!element) return;
      if (isReducedMotion()) {
        element.textContent = end.toLocaleString();
        return;
      }

      const startTime = performance.now();
      const diff = end - start;

      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic formula
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + diff * easeOut);

        element.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          element.textContent = end.toLocaleString();
        }
      };

      requestAnimationFrame(updateCounter);
    }
  };

  // Expose globally
  window.MotionManager = MotionManager;

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MotionManager.initScrollReveal());
  } else {
    MotionManager.initScrollReveal();
  }
})();
