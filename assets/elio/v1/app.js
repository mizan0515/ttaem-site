const timeline = document.querySelector('.timeline');
const scenes = Array.from(document.querySelectorAll('.timeline .item'));
const moments = Array.from(document.querySelectorAll('.timeline .watch-moment'));
const spoilerItems = [...scenes, ...moments];
const sceneLinks = Array.from(document.querySelectorAll('.scene-nav__link'));
const currentSceneLabel = document.getElementById('scene-current-label');
const spoilerToggle = document.getElementById('spoiler-toggle');
const spoilerToggleLabel = spoilerToggle?.querySelector('.spoiler-toggle__label');

function setCurrentScene(sceneId) {
  const active = sceneLinks.find((link) => link.dataset.scene === sceneId);
  if (!active) return;
  sceneLinks.forEach((link) => {
    if (link === active) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
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

function setItemCovered(item, covered) {
  const cover = item.querySelector('.spoiler-cover');
  item.querySelectorAll('.copy, .visual, .watch-moment__card').forEach((content) => {
    content.toggleAttribute('inert', covered);
    if (covered) content.setAttribute('aria-hidden', 'true');
    else content.removeAttribute('aria-hidden');
  });
  if (cover) cover.hidden = !covered;
  item.classList.toggle('spoiler-revealed', !covered);
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

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setCurrentScene(visible.target.id);
  }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.25, 0.5] });
  scenes.forEach((scene) => observer.observe(scene));
}

window.addEventListener('hashchange', revealAnchor);
revealAnchor();
