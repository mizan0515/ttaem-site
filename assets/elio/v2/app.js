const timeline = document.querySelector('.timeline');
const page = document.querySelector('.page');
const scenes = Array.from(document.querySelectorAll('.timeline .item'));
const moments = Array.from(document.querySelectorAll('.timeline .watch-moment'));
const guideModules = Array.from(document.querySelectorAll('.reader-guide'));
const spoilerItems = [...scenes, ...moments, ...guideModules];
const sceneLinks = Array.from(document.querySelectorAll('.scene-nav__link'));
const currentSceneLabel = document.getElementById('scene-current-label');
const spoilerToggle = document.getElementById('spoiler-toggle');
const spoilerToggleLabel = spoilerToggle?.querySelector('.spoiler-toggle__label');
const sceneNav = document.querySelector('.scene-nav');
const sceneDock = document.getElementById('scene-dock');
const sceneDockCurrent = document.getElementById('scene-dock-current');
const sceneDockCount = document.getElementById('scene-dock-count');
const sceneDockLabel = document.getElementById('scene-dock-label');
const sceneDockPrevious = document.getElementById('scene-dock-previous');
const sceneDockNext = document.getElementById('scene-dock-next');
const watchEnding = document.querySelector('.ending');
const watchFxLayer = document.getElementById('watch-fx-layer');
const watchLiveStatus = document.getElementById('watch-live-status');
let watchTransitionTimer;
let activeSceneLink = sceneLinks.find((link) => link.getAttribute('aria-current') === 'step');
let activeScene = activeSceneLink
  ? document.getElementById(activeSceneLink.dataset.scene || '')
  : undefined;
let scenePositions = [];
let sceneScrollFrame;
let sceneGeometryFrame;
let sceneNavigationUnlockTimer;
let sceneNavigationLockUntil = 0;
const SCENE_MARKER_RATIO = 0.42;
const SCENE_SWITCH_HYSTERESIS = 36;

document.documentElement.classList.add('motion-ready');
requestAnimationFrame(() => document.documentElement.classList.add('motion-loaded'));

function sceneNumber(link) {
  return String(sceneLinks.indexOf(link) + 1).padStart(2, '0');
}

function sceneIsCovered(scene) {
  return Boolean(timeline?.classList.contains('spoilers-on') && scene && !scene.classList.contains('spoiler-revealed'));
}

function sceneDisplayTitle(link, scene) {
  return sceneIsCovered(scene) ? `장면 ${sceneNumber(link)} · 숨겨진 이야기` : (link?.dataset.title || '');
}

function updateSceneLinkLabel(link, scene) {
  if (!link) return;
  const number = sceneNumber(link);
  const label = sceneIsCovered(scene)
    ? `장면 ${number}, 내용 보기`
    : `장면 ${number}, ${link.dataset.title || ''}`;
  link.setAttribute('aria-label', label);
}

function updateActiveScenePresentation() {
  if (!activeSceneLink) return;
  const title = sceneDisplayTitle(activeSceneLink, activeScene);
  if (currentSceneLabel) currentSceneLabel.textContent = title;
  if (sceneDockLabel) sceneDockLabel.textContent = title;
  updateSceneLinkLabel(activeSceneLink, activeScene);
}

function lockSceneNavigation(duration = 1050) {
  sceneNavigationLockUntil = performance.now() + duration;
  window.clearTimeout(sceneNavigationUnlockTimer);
  sceneNavigationUnlockTimer = window.setTimeout(() => scheduleSceneSync(), duration + 40);
}

function setCurrentScene(sceneId) {
  const active = sceneLinks.find((link) => link.dataset.scene === sceneId);
  if (!active) return;
  const nextScene = document.getElementById(sceneId);
  if (activeSceneLink !== active) {
    activeSceneLink?.removeAttribute('aria-current');
    activeScene?.classList.remove('is-current');
    active.setAttribute('aria-current', 'step');
    nextScene?.classList.add('is-current');
    activeSceneLink = active;
    activeScene = nextScene;
  } else if (nextScene && !nextScene.classList.contains('is-current')) {
    nextScene.classList.add('is-current');
    activeScene = nextScene;
  }
  const sceneIndex = sceneLinks.indexOf(active);
  if (sceneDockCount) {
    sceneDockCount.textContent = `${String(sceneIndex + 1).padStart(2, '0')} / ${String(sceneLinks.length).padStart(2, '0')}`;
  }
  updateActiveScenePresentation();
  if (sceneDockCurrent) sceneDockCurrent.href = `#${sceneId}`;
  sceneDockPrevious?.toggleAttribute('disabled', sceneIndex <= 0);
  sceneDockNext?.toggleAttribute('disabled', sceneIndex >= sceneLinks.length - 1);
  if (sceneDock) {
    const accent = getComputedStyle(active).getPropertyValue('--nav-accent').trim();
    if (accent) sceneDock.style.setProperty('--dock-accent', accent);
  }
}

function moveToScene(offset) {
  if (!activeSceneLink) return;
  const currentIndex = sceneLinks.indexOf(activeSceneLink);
  const targetLink = sceneLinks[currentIndex + offset];
  if (!targetLink) return;
  const target = document.getElementById(targetLink.dataset.scene || '');
  lockSceneNavigation();
  setCurrentScene(targetLink.dataset.scene || '');
  history.replaceState(null, '', `#${targetLink.dataset.scene}`);
  markSceneArrival(target);
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function revealAnchor() {
  let fragment;
  try { fragment = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
  const target = document.getElementById(fragment);
  if (target?.classList.contains('item') || target?.classList.contains('watch-moment')) {
    lockSceneNavigation(650);
    if (target.classList.contains('item')) setCurrentScene(fragment);
    requestAnimationFrame(() => target.scrollIntoView());
  }
}

function markSceneArrival(item) {
  if (!item) return;
  item.classList.remove('is-arriving');
  requestAnimationFrame(() => item.classList.add('is-arriving'));
  window.setTimeout(() => item.classList.remove('is-arriving'), 1050);
}

function setItemCovered(item, covered) {
  const cover = item.querySelector('.spoiler-cover');
  item.querySelectorAll('.copy, .visual, .watch-moment__card, .reader-guide__content').forEach((content) => {
    content.toggleAttribute('inert', covered);
    if (covered) content.setAttribute('aria-hidden', 'true');
    else content.removeAttribute('aria-hidden');
  });
  if (cover) cover.hidden = !covered;
  item.classList.toggle('spoiler-revealed', !covered);
  if (item.classList.contains('item')) {
    const link = sceneLinks.find((sceneLink) => sceneLink.dataset.scene === item.id);
    updateSceneLinkLabel(link, item);
  }
  if (item === activeScene) updateActiveScenePresentation();
  if (!covered) {
    item.classList.remove('is-uncovering');
    requestAnimationFrame(() => item.classList.add('is-uncovering'));
    window.setTimeout(() => item.classList.remove('is-uncovering'), 780);
  }
}

function setSpoilerMode(enabled) {
  page?.classList.toggle('spoilers-on', enabled);
  timeline?.classList.toggle('spoilers-on', enabled);
  spoilerToggle?.setAttribute('aria-pressed', String(enabled));
  if (spoilerToggleLabel) spoilerToggleLabel.textContent = enabled ? '스포일러 모두 보기' : '스포일러 가리기';
  spoilerItems.forEach((item) => setItemCovered(item, enabled));
  updateActiveScenePresentation();
}

spoilerToggle?.addEventListener('click', () => {
  setSpoilerMode(spoilerToggle.getAttribute('aria-pressed') !== 'true');
});

spoilerItems.forEach((item) => {
  item.querySelector('.spoiler-cover')?.addEventListener('click', () => setItemCovered(item, false));
});

sceneLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const target = document.getElementById(link.dataset.scene || '');
    lockSceneNavigation();
    setCurrentScene(link.dataset.scene || '');
    markSceneArrival(target);
  });
});

sceneDockPrevious?.addEventListener('click', () => moveToScene(-1));
sceneDockNext?.addEventListener('click', () => moveToScene(1));
sceneDockCurrent?.addEventListener('click', () => {
  lockSceneNavigation();
  markSceneArrival(activeScene);
});
if (activeSceneLink) setCurrentScene(activeSceneLink.dataset.scene || '');

function refreshSceneGeometry() {
  sceneGeometryFrame = undefined;
  scenePositions = scenes.map((scene) => {
    const bounds = scene.getBoundingClientRect();
    return bounds.top + window.scrollY + Math.min(bounds.height * 0.18, 96);
  });
  syncSceneFromScroll(true);
}

function scheduleSceneGeometryRefresh() {
  if (sceneGeometryFrame) return;
  sceneGeometryFrame = requestAnimationFrame(refreshSceneGeometry);
}

function sceneIndexAt(marker) {
  let low = 0;
  let high = scenePositions.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (scenePositions[middle] <= marker) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

function syncSceneFromScroll(force = false) {
  sceneScrollFrame = undefined;
  if (!scenePositions.length || performance.now() < sceneNavigationLockUntil) return;
  const marker = window.scrollY + window.innerHeight * SCENE_MARKER_RATIO;
  const candidateIndex = sceneIndexAt(marker);
  const currentIndex = Math.max(0, scenes.indexOf(activeScene));
  if (!force && candidateIndex > currentIndex
      && marker < scenePositions[candidateIndex] + SCENE_SWITCH_HYSTERESIS) return;
  if (!force && candidateIndex < currentIndex
      && marker > scenePositions[currentIndex] - SCENE_SWITCH_HYSTERESIS) return;
  if (candidateIndex !== currentIndex) setCurrentScene(scenes[candidateIndex]?.id || '');
}

function scheduleSceneSync() {
  if (sceneScrollFrame) return;
  sceneScrollFrame = requestAnimationFrame(() => syncSceneFromScroll(false));
}

window.addEventListener('scroll', scheduleSceneSync, { passive: true });
window.addEventListener('resize', scheduleSceneGeometryRefresh, { passive: true });
window.addEventListener('load', scheduleSceneGeometryRefresh, { once: true });
if ('ResizeObserver' in window && timeline) {
  const sceneGeometryObserver = new ResizeObserver(scheduleSceneGeometryRefresh);
  sceneGeometryObserver.observe(timeline);
}
scheduleSceneGeometryRefresh();

if ('IntersectionObserver' in window) {
  if (sceneDock && sceneNav && timeline) {
    let sceneNavVisible = true;
    let timelineVisible = false;
    let watchEndingVisible = false;
    const updateDockVisibility = () => {
      const visible = !sceneNavVisible && timelineVisible && !watchEndingVisible;
      sceneDock.hidden = !visible;
      sceneDock.setAttribute('aria-hidden', String(!visible));
    };
    const dockVisibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === sceneNav) sceneNavVisible = entry.isIntersecting;
        if (entry.target === timeline) timelineVisible = entry.isIntersecting;
        if (entry.target === watchEnding) watchEndingVisible = entry.isIntersecting;
      });
      updateDockVisibility();
    }, { threshold: 0 });
    dockVisibilityObserver.observe(sceneNav);
    dockVisibilityObserver.observe(timeline);
    if (watchEnding) dockVisibilityObserver.observe(watchEnding);
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  document.querySelectorAll('.item, .watch-moment, .story-phase, .reader-guide, .ending, .catalog-card').forEach((item, index) => {
    item.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 55}ms`);
    item.classList.add('reveal-ready');
    revealObserver.observe(item);
  });
} else {
  document.querySelectorAll('.item, .watch-moment, .story-phase, .reader-guide, .ending, .catalog-card')
    .forEach((item) => item.classList.add('is-visible'));
}

if (window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.visual').forEach((visual) => {
    let pointerFrame;
    let pointerBounds;
    let pointerX = 0;
    let pointerY = 0;
    const applyPointerTilt = () => {
      if (!pointerBounds) return;
      const x = (pointerX - pointerBounds.left) / pointerBounds.width - 0.5;
      const y = (pointerY - pointerBounds.top) / pointerBounds.height - 0.5;
      visual.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
      visual.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
      visual.style.setProperty('--glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      visual.style.setProperty('--glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
      pointerFrame = undefined;
    };
    visual.addEventListener('pointerenter', () => {
      pointerBounds = visual.getBoundingClientRect();
    });
    visual.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(applyPointerTilt);
    });
    visual.addEventListener('pointerleave', () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = undefined;
      pointerBounds = undefined;
      visual.style.removeProperty('--tilt-x');
      visual.style.removeProperty('--tilt-y');
      visual.style.removeProperty('--glow-x');
      visual.style.removeProperty('--glow-y');
    });
  });
}

function showWatchTransition({ streamer, provider, providerLabel, time, transitionText }) {
  if (!watchFxLayer) return;
  window.clearTimeout(watchTransitionTimer);
  watchFxLayer.querySelector('.watch-transition')?.remove();

  const overlay = document.createElement('span');
  overlay.className = 'watch-transition';
  overlay.dataset.provider = provider;

  const space = document.createElement('span');
  space.className = 'watch-transition__space';
  for (let index = 0; index < 24; index += 1) {
    const star = document.createElement('i');
    star.style.setProperty('--star-x', `${(index * 37) % 101}%`);
    star.style.setProperty('--star-y', `${(index * 61) % 97}%`);
    star.style.setProperty('--star-delay', `${(index % 7) * -90}ms`);
    star.style.setProperty('--star-scale', String(0.6 + (index % 5) * 0.22));
    space.appendChild(star);
  }

  const warp = document.createElement('span');
  warp.className = 'watch-transition__warp';
  for (let index = 0; index < 12; index += 1) {
    const streak = document.createElement('i');
    streak.style.setProperty('--warp-angle', `${index * 30}deg`);
    streak.style.setProperty('--warp-delay', `${(index % 4) * 55}ms`);
    warp.appendChild(streak);
  }

  const panel = document.createElement('span');
  panel.className = 'watch-transition__panel';
  const gate = document.createElement('span');
  gate.className = 'watch-transition__gate';
  for (let index = 0; index < 3; index += 1) {
    const ring = document.createElement('span');
    ring.className = 'watch-transition__gate-ring';
    gate.appendChild(ring);
  }
  const portal = document.createElement('span');
  portal.className = 'watch-transition__portal';
  gate.appendChild(portal);
  const eyebrow = document.createElement('small');
  eyebrow.textContent = `WATCH PORTAL · ${providerLabel}`;
  const heading = document.createElement('strong');
  heading.textContent = transitionText || `${streamer}의 ${providerLabel} 같이보기로 이동합니다`;
  const detail = document.createElement('span');
  detail.className = 'watch-transition__detail';
  detail.textContent = time ? `${time} 장면에서 이어집니다.` : '전체 방송을 새 탭에서 엽니다.';
  const progress = document.createElement('span');
  progress.className = 'watch-transition__progress';
  panel.append(eyebrow, gate, heading, detail, progress);
  overlay.appendChild(panel);
  overlay.prepend(space, warp);
  watchFxLayer.appendChild(overlay);
  watchTransitionTimer = window.setTimeout(() => overlay.remove(), 2150);
}

function launchWatchEffect(link, event, { showTransition = false } = {}) {
  const streamer = link.dataset.streamer || '방송';
  const provider = link.dataset.provider || 'external';
  const time = link.dataset.time;
  const transitionText = link.dataset.watchText;
  const providerLabel = provider === 'chzzk' ? 'CHZZK' : provider === 'youtube' ? 'YouTube' : '다시보기';
  const destination = time ? `${streamer} ${time} 같이보기` : `${streamer} 전체 방송`;
  if (watchLiveStatus) {
    watchLiveStatus.textContent = `${destination} 링크를 새 창에서 엽니다.`;
  }
  link.classList.remove('is-launching');
  requestAnimationFrame(() => link.classList.add('is-launching'));
  window.setTimeout(() => link.classList.remove('is-launching'), 700);
  if (showTransition) {
    showWatchTransition({ streamer, provider, providerLabel, time, transitionText });
  }
  if (!watchFxLayer) return;

  const rect = link.getBoundingClientRect();
  const x = event.clientX || rect.left + rect.width / 2;
  const y = event.clientY || rect.top + rect.height / 2;
  const effect = document.createElement('span');
  effect.className = 'watch-jump-fx';
  effect.dataset.provider = provider;
  effect.style.setProperty('--x', `${x}px`);
  effect.style.setProperty('--y', `${y}px`);
  for (let index = 0; index < 2; index += 1) {
    const ring = document.createElement('span');
    ring.className = 'watch-jump-fx__ring';
    effect.appendChild(ring);
  }
  for (let index = 0; index < 8; index += 1) {
    const spark = document.createElement('span');
    spark.className = 'watch-jump-fx__spark';
    spark.style.setProperty('--angle', `${index * 45}deg`);
    effect.appendChild(spark);
  }
  watchFxLayer.appendChild(effect);
  document.querySelector('.watch-jump-toast')?.remove();
  const toast = document.createElement('span');
  toast.className = 'watch-jump-toast';
  const badge = document.createElement('small');
  badge.textContent = providerLabel;
  const message = document.createElement('span');
  message.textContent = transitionText || `${destination}로 이동합니다`;
  toast.append(badge, message);
  document.body.appendChild(toast);
  window.setTimeout(() => effect.remove(), 950);
  window.setTimeout(() => toast.remove(), 1100);
}

document.addEventListener('click', (event) => {
  const pickerSummary = event.target.closest('.streamer-picker > summary');
  if (pickerSummary) {
    document.querySelectorAll('.streamer-picker[open]').forEach((picker) => {
      if (picker !== pickerSummary.parentElement) picker.removeAttribute('open');
    });
    window.requestAnimationFrame(() => {
      const picker = pickerSummary.parentElement;
      if (!picker?.open) return;
      picker.querySelector('.streamer-picker__panel')?.scrollIntoView({
        block: 'nearest', inline: 'nearest', behavior: 'smooth',
      });
    });
    return;
  }
  if (!event.target.closest('.streamer-picker')) {
    document.querySelectorAll('.streamer-picker[open]').forEach((picker) => picker.removeAttribute('open'));
  }
  const link = event.target.closest('a[data-watch-transition="true"]');
  if (!link) return;
  link.closest('.streamer-picker')?.removeAttribute('open');
  // A click event is already the browser's primary activation signal. Some
  // embedded browsers omit `button` for synthetic or accessibility-driven
  // activations, so gating on `event.button === 0` can skip the travel overlay
  // and let the target open immediately. Modifier keys still preserve the
  // browser's explicit open-in-new-tab/window gestures.
  const plainActivation = !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  const delayedExternalLink = plainActivation && link.matches('a[href]');
  if (!delayedExternalLink) {
    launchWatchEffect(link, event);
    return;
  }

  event.preventDefault();
  const destination = link.href;
  launchWatchEffect(link, event, { showTransition: true });
  window.setTimeout(() => {
    const opened = window.open(destination, '_blank');
    if (opened) opened.opener = null;
    else window.location.assign(destination);
  }, 1750);
});

window.addEventListener('hashchange', revealAnchor);
revealAnchor();

document.querySelectorAll('.reader-guide__disclosure, .reader-guide__sources').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    const guide = detail.closest('.reader-guide');
    guide?.classList.toggle('is-disclosure-active', detail.open);
  });
});
