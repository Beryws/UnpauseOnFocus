// Allow video to keep playing while the tab/window is unfocused.
// Usage: allowPlayWhileUnfocused()            // all <video>
//        allowPlayWhileUnfocused('#myVideo')  // specific video
(() => {
  if (window.undoAllowUnfocusedPlay) window.undoAllowUnfocusedPlay(); // reset if re-run

  const blockedTypes = ['visibilitychange','blur','pagehide','freeze'];
  const blockers = [];
  const forced = new WeakSet();
  const origPause = HTMLMediaElement.prototype.pause;

  function installBlockers() {
    blockedTypes.forEach(type => {
      const tgt = type === 'visibilitychange' ? document : window;
      const h = e => { e.stopImmediatePropagation(); e.stopPropagation(); };
      tgt.addEventListener(type, h, true); // capture-phase, block site handlers
      blockers.push({tgt, type, h});
    });
  }

  function patchPause() {
    HTMLMediaElement.prototype.pause = function(...args) {
      if (forced.has(this) && (document.hidden || !document.hasFocus())) {
        // Ignore pause attempts caused by unfocus logic
        return;
      }
      return origPause.apply(this, args);
    };
  }

  function applyTo(selector='video') {
    document.querySelectorAll(selector).forEach(v => forced.add(v));
    // If something already paused it, resume now
    document.querySelectorAll(selector).forEach(v => { if (v.paused) v.play().catch(()=>{}); });
  }

  installBlockers();
  patchPause();
  applyTo(); // default: all videos

  window.allowPlayWhileUnfocused = (selector='video') => applyTo(selector);
  window.undoAllowUnfocusedPlay = () => {
    blockers.forEach(({tgt,type,h}) => tgt.removeEventListener(type,h,true));
    HTMLMediaElement.prototype.pause = origPause;
    console.log('Reverted: unfocus blocking removed.');
    delete window.undoAllowUnfocusedPlay;
    delete window.allowPlayWhileUnfocused;
  };

  console.log('Enabled: videos will keep playing while unfocused. Use allowPlayWhileUnfocused("<selector>") to add more; run undoAllowUnfocusedPlay() to revert.');
})();
