const timeline = document.querySelector('.timeline');
const scenes = Array.from(document.querySelectorAll('.timeline .item'));
const moments = Array.from(document.querySelectorAll('.timeline .watch-moment'));
const spoilerItems = [...scenes, ...moments];
const sceneLinks = Array.from(document.querySelectorAll('.scene-nav__link'));
const currentSceneLabel = document.getElementById('scene-current-label');
const spoilerToggle = document.getElementById('spoiler-toggle');
const spoilerToggleLabel = spoilerToggle?.querySelector('.spoiler-toggle__label');
const watchFxLayer = document.getElementById('watch-fx-layer');
const watchLiveStatus = document.getElementById('watch-live-status');
let watchTransitionTimer;

document.documentElement.classList.add('motion-ready');
requestAnimationFrame(() => document.documentElement.classList.add('motion-loaded'));

function setCurrentScene(sceneId) {
  const active = sceneLinks.find((link) => link.dataset.scene === sceneId);
  if (!active) return;
  sceneLinks.forEach((link) => {
    if (link === active) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  scenes.forEach((scene) => scene.classList.toggle('is-current', scene.id === sceneId));
  if (currentSceneLabel) currentSceneLabel.textContent = active.dataset.title || '';
}

function revealAnchor() {
  let fragment;
  try { fragment = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
  const target = document.getElementById(fragment);
  if (target?.classList.contains('item') || target?.classList.contains('watch-moment')) {
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
  item.querySelectorAll('.copy, .visual, .watch-moment__card').forEach((content) => {
    content.toggleAttribute('inert', covered);
    if (covered) content.setAttribute('aria-hidden', 'true');
    else content.removeAttribute('aria-hidden');
  });
  if (cover) cover.hidden = !covered;
  item.classList.toggle('spoiler-revealed', !covered);
  if (!covered) {
    item.classList.remove('is-uncovering');
    requestAnimationFrame(() => item.classList.add('is-uncovering'));
    window.setTimeout(() => item.classList.remove('is-uncovering'), 780);
  }
}

function setSpoilerMode(enabled) {
  timeline?.classList.toggle('spoilers-on', enabled);
  spoilerToggle?.setAttribute('aria-pressed', String(enabled));
  if (spoilerToggleLabel) spoilerToggleLabel.textContent = enabled ? '스포일러 모두 보기' : '스포일러 가리기';
  spoilerItems.forEach((item) => setItemCovered(item, enabled));
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
    setCurrentScene(link.dataset.scene || '');
    markSceneArrival(target);
  });
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setCurrentScene(visible.target.id);
  }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.25, 0.5] });
  scenes.forEach((scene) => observer.observe(scene));

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

const pageProgress = document.createElement('span');
pageProgress.className = 'page-progress';
pageProgress.setAttribute('aria-hidden', 'true');
document.body.appendChild(pageProgress);
let progressFrame;
function updatePageProgress() {
  const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const pageRatio = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
  pageProgress.style.setProperty('--page-progress', pageRatio);
  if (timeline) {
    const rect = timeline.getBoundingClientRect();
    const start = window.innerHeight * 0.48;
    const storyRange = Math.max(rect.height - window.innerHeight * 0.28, 1);
    const storyRatio = Math.min(Math.max((start - rect.top) / storyRange, 0), 1);
    timeline.style.setProperty('--story-progress', storyRatio);
  }
  progressFrame = undefined;
}
function queueProgressUpdate() {
  if (!progressFrame) progressFrame = requestAnimationFrame(updatePageProgress);
}
window.addEventListener('scroll', queueProgressUpdate, { passive: true });
window.addEventListener('resize', queueProgressUpdate);
updatePageProgress();

if (window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.visual').forEach((visual) => {
    visual.addEventListener('pointermove', (event) => {
      const rect = visual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      visual.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
      visual.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
      visual.style.setProperty('--glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      visual.style.setProperty('--glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    visual.addEventListener('pointerleave', () => {
      visual.style.removeProperty('--tilt-x');
      visual.style.removeProperty('--tilt-y');
      visual.style.removeProperty('--glow-x');
      visual.style.removeProperty('--glow-y');
    });
  });
}

function showWatchTransition({ streamer, provider, providerLabel, time }) {
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
  heading.textContent = `${streamer}의 ${providerLabel} 같이보기로 이동합니다`;
  const detail = document.createElement('span');
  detail.className = 'watch-transition__detail';
  detail.textContent = time ? `${time} 장면에서 이어집니다.` : '전체 방송을 새 탭에서 엽니다.';
  const progress = document.createElement('span');
  progress.className = 'watch-transition__progress';
  panel.append(eyebrow, gate, heading, detail, progress);
  overlay.appendChild(panel);
  overlay.prepend(space, warp);
  watchFxLayer.appendChild(overlay);
  watchTransitionTimer = window.setTimeout(() => overlay.remove(), 1550);
}

function launchWatchEffect(link, event, { showTransition = false } = {}) {
  const streamer = link.dataset.streamer || '방송';
  const provider = link.dataset.provider || 'external';
  const time = link.dataset.time;
  const providerLabel = provider === 'chzzk' ? 'CHZZK' : provider === 'youtube' ? 'YouTube' : '다시보기';
  const destination = time ? `${streamer} ${time} 같이보기` : `${streamer} 전체 방송`;
  if (watchLiveStatus) {
    watchLiveStatus.textContent = `${destination} 링크를 새 창에서 엽니다.`;
  }
  link.classList.remove('is-launching');
  requestAnimationFrame(() => link.classList.add('is-launching'));
  window.setTimeout(() => link.classList.remove('is-launching'), 700);
  if (showTransition) {
    showWatchTransition({ streamer, provider, providerLabel, time });
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
  message.textContent = `${destination}로 이동합니다`;
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
    return;
  }
  if (!event.target.closest('.streamer-picker')) {
    document.querySelectorAll('.streamer-picker[open]').forEach((picker) => picker.removeAttribute('open'));
  }
  const link = event.target.closest('a[data-watch-transition="true"]');
  if (!link) return;
  link.closest('.streamer-picker')?.removeAttribute('open');
  const plainPrimaryClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  const delayedExternalLink = plainPrimaryClick && link.matches('a[href]');
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
  }, 1220);
});

window.addEventListener('hashchange', revealAnchor);
revealAnchor();
