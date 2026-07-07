function initEditorSplitMode() {
  const entry = document.querySelector('[data-editor-entry]');
  const workspace = document.getElementById('youtube-editor-tools');
  const primaryBtn = document.querySelector('[data-editor-entry-primary]');
  if (!entry || !workspace || !primaryBtn) return;

  const explicitUrl = entry.getAttribute('data-editor-chzzk-url') || '';
  const sourceLink = document.querySelector('a[href*="chzzk.naver.com/video/"]');
  const chzzkUrl = explicitUrl || sourceLink?.href || '';
  let placeholder = null;
  let shell = null;

  function setEntryState(state, message) {
    entry.setAttribute('data-editor-entry-state', state);
    const status = entry.querySelector('[data-editor-entry-status]');
    if (status) {
      status.textContent = message || '';
      status.hidden = !message;
    }
  }

  function editorModeUrlOff() {
    const url = new URL(location.href);
    url.searchParams.delete('editor');
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function editorModeUrlOn() {
    const url = new URL(location.href);
    url.searchParams.set('editor', '1');
    if (!url.hash) url.hash = 'youtube-editor-tools';
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function closeSplitEditorMode() {
    if (!shell) return;
    if (placeholder && workspace) {
      placeholder.replaceWith(workspace);
    }
    shell.remove();
    shell = null;
    placeholder = null;
    document.body.classList.remove('editor-split-active');
    setEntryState('fallback', '');
    updateNavToggleVisibility();
    history.replaceState(null, '', editorModeUrlOff());
  }

  function openSplitEditorMode() {
    if (!chzzkUrl) {
      workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setEntryState('error', 'CHZZK 주소 없음');
      return;
    }
    if (shell) return;
    placeholder = document.createElement('div');
    placeholder.className = 'editor-split-placeholder';
    placeholder.setAttribute('data-editor-split-placeholder', '');
    workspace.replaceWith(placeholder);

    shell = document.createElement('section');
    shell.className = 'editor-split-shell';
    shell.setAttribute('data-editor-split-shell', '');
    shell.setAttribute('aria-label', 'CHZZK 원본과 편집자 워크스페이스 나란히 보기');
    shell.innerHTML = `
      <div class="editor-split-player" data-editor-split-player>
        <div class="editor-split-toolbar">
          <strong class="editor-split-title">CHZZK 원본 화면</strong>
          <div class="editor-split-actions">
            <a class="editor-split-action" href="${chzzkUrl}" target="_blank" rel="noopener">새 탭</a>
            <button type="button" class="editor-split-action" data-editor-split-close>요약으로 돌아가기</button>
          </div>
        </div>
        <iframe class="editor-split-frame" data-editor-chzzk-frame src="${chzzkUrl}" title="CHZZK 원본 방송 화면" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        <div class="editor-split-fallback">CHZZK가 iframe 재생을 제한하면 왼쪽의 새 탭 버튼으로 원본을 열고, 오른쪽 워크스페이스에서 컷 후보를 계속 확인합니다.</div>
      </div>
      <div class="editor-split-workspace" data-editor-split-workspace></div>
    `;
    shell.querySelector('[data-editor-split-workspace]').appendChild(workspace);
    shell.querySelector('[data-editor-split-close]').addEventListener('click', closeSplitEditorMode);
    document.body.appendChild(shell);
    document.body.classList.add('editor-split-active');
    setEntryState('fallback', '');
    updateNavToggleVisibility();
    history.replaceState(null, '', editorModeUrlOn());
  }

  let navToggleButton = null;
  function updateNavToggleVisibility() {
    if (!navToggleButton) return;
    navToggleButton.hidden = document.body.classList.contains('editor-split-active') || window.scrollY <= 220;
  }

  function installNavToggleButton() {
    const links = document.querySelector('.public-report-nav-links');
    if (!links) return;
    navToggleButton = links.querySelector('.report-editor-nav-button');
    if (!navToggleButton) {
      navToggleButton = document.createElement('button');
      navToggleButton.type = 'button';
      navToggleButton.className = 'report-editor-nav-button';
      navToggleButton.textContent = '편집자 모드로 보기';
      navToggleButton.hidden = true;
      links.appendChild(navToggleButton);
    }
    if (navToggleButton.dataset.editorNavBound === '1') return;
    navToggleButton.dataset.editorNavBound = '1';
    navToggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      openSplitEditorMode();
    });
    window.addEventListener('scroll', updateNavToggleVisibility, { passive: true });
    window.addEventListener('resize', updateNavToggleVisibility);
    updateNavToggleVisibility();
  }

  primaryBtn.addEventListener('click', (event) => {
    event.preventDefault();
    openSplitEditorMode();
  });
  installNavToggleButton();

  const params = new URLSearchParams(location.search);
  if (params.get('editor') === '1') {
    window.setTimeout(openSplitEditorMode, 0);
  }
}

function initEditorEntryState() {
  const entry = document.querySelector('[data-editor-entry]');
  if (!entry) return;
  const statusEl = entry.querySelector('[data-editor-entry-status]');
  const primaryBtn = entry.querySelector('[data-editor-entry-primary]');
  const setState = (state, message) => {
    entry.setAttribute('data-editor-entry-state', state);
    if (statusEl) {
      statusEl.textContent = message || '';
      statusEl.hidden = !message;
    }
  };
  const target = document.getElementById('youtube-editor-tools');
  setState('loading', '');
  window.setTimeout(() => {
    if (entry.getAttribute('data-editor-entry-state') !== 'loading') return;
    if (target) {
      setState('fallback', '');
    } else {
      setState('error', '워크스페이스 없음');
    }
  }, 0);
  if (primaryBtn) {
    primaryBtn.addEventListener('click', () => {
      setState('loading', '');
      window.setTimeout(() => {
        if (target) {
          setState('fallback', '');
        } else {
          setState('error', '열기 실패');
        }
      }, 180);
    });
  }
  window.addEventListener('chzzk-editor-extension-ready', () => {
    setState('installed', '');
  });
  window.addEventListener('chzzk-editor-extension-missing', () => {
    setState('missing', '');
  });
  window.addEventListener('chzzk-editor-extension-error', () => {
    setState('error', '확인 필요');
  });
}

function initViewerEditorTools() {
  const dataNode = document.getElementById('viewerEditorToolsData');
  const axisEl = document.getElementById('viewerEditorAxis');
  const evidenceEl = document.getElementById('viewerEditorEvidence');
  const cutsEl = document.getElementById('viewerEditorCuts');
  if (!dataNode || !axisEl || !evidenceEl || !cutsEl) return;
  const dataSrc = dataNode.getAttribute('data-src') || '';
  function loadMessage(message) {
    const html = `<div class="viewer-editor-empty">${message}</div>`;
    axisEl.innerHTML = html;
    evidenceEl.innerHTML = html;
    cutsEl.innerHTML = html;
  }
  function parseInlineData() {
    try { return JSON.parse(dataNode.textContent || '{}'); } catch (_err) { return {}; }
  }
  async function loadEditorToolsData() {
    if (!dataSrc) return parseInlineData();
    const response = await fetch(dataSrc, { cache: 'default' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  function startViewerEditorTools(data) {
  const events = Array.isArray(data.events) ? data.events : [];
  const eventsById = new Map(events.map((event) => [String(event && event.id || ''), event]).filter(([id]) => id));
  const editPointClusterView = data.edit_point_clusters && typeof data.edit_point_clusters === 'object' ? data.edit_point_clusters : {};
  const editPointClusters = Array.isArray(editPointClusterView.clusters) ? editPointClusterView.clusters : [];
  const buckets = Array.isArray(data.chat_buckets) ? data.chat_buckets : [];
  const subtitles = Array.isArray(data.subtitles) ? data.subtitles : [];
  const audioWaveform = data.audio_waveform && typeof data.audio_waveform === 'object' ? data.audio_waveform : {};
  const waveformSamples = Array.isArray(audioWaveform.samples) ? audioWaveform.samples : [];
  const preview = data.edit_export_preview && typeof data.edit_export_preview === 'object' ? data.edit_export_preview : {};
  const duration = Math.max(1, Number(data.duration_sec || 0), Number(audioWaveform.duration_sec || 0), ...events.map((event) => Number(event.end_sec || event.start_sec || 0)), ...buckets.map((row) => Number(row.end_sec || row.start_sec || 0)), ...waveformSamples.map((row) => Number(row.end_sec || row.start_sec || 0)));
  const labelsMap = data.labels || {};
  const viewerLabelsMap = data.viewer_labels || {};
  const colorsMap = data.colors || {};
  const purposesMap = data.purposes || {};
  const overviewOnlyLaneKinds = new Set(['audio_waveform', 'chat_volume']);
  const eventCountsByKind = events.reduce((map, event) => {
    const kind = String(event && event.kind || '');
    if (kind) map.set(kind, (map.get(kind) || 0) + 1);
    return map;
  }, new Map());
  function laneActualEventCount(kind) {
    return eventCountsByKind.get(String(kind || '')) || 0;
  }
  function shouldHideSceneLane(key) {
    return key === 'comment_replay' && laneActualEventCount('chapter') > 0;
  }
  function isRenderableSceneLane(lane) {
    const key = String(lane && lane.key || '');
    if (!key) return false;
    if (shouldHideSceneLane(key)) return false;
    const role = String(lane && lane.display_role || '').toLowerCase();
    if (role === 'overview' || overviewOnlyLaneKinds.has(key)) return false;
    if (laneActualEventCount(key) > 0) return true;
    return false;
  }
  const lanes = Array.isArray(data.lanes) && data.lanes.length
    ? data.lanes.filter(isRenderableSceneLane)
    : Array.from(new Set(events.map((event) => event.kind).filter(Boolean))).map((kind) => ({ key: kind, label: labelsMap[kind] || kind, event_count: laneActualEventCount(kind), display_role: 'scene' })).filter(isRenderableSceneLane);
  const kinds = lanes.map((lane) => lane.key);
  const filterEl = document.getElementById('viewerEditorFilter');
  const countEl = document.getElementById('viewerEditorCount');
  const copyBtn = document.getElementById('viewerEditorCopyCutsBtn');
  const copyJsonBtn = document.getElementById('viewerEditorCopyJsonBtn');
  const copyStatus = document.getElementById('viewerEditorCopyStatus');
  const zoomRange = document.getElementById('viewerEditorZoomRange');
  const zoomValue = document.getElementById('viewerEditorZoomValue');
  const zoomOutBtn = document.getElementById('viewerEditorZoomOutBtn');
  const zoomInBtn = document.getElementById('viewerEditorZoomInBtn');
  const zoomResetBtn = document.getElementById('viewerEditorZoomResetBtn');
  const densityRange = document.getElementById('viewerEditorDensityRange');
  const densityValue = document.getElementById('viewerEditorDensityValue');
  const baseTimelineWidth = Math.max(760, Math.min(1600, Math.round(duration / 22)));
  const timelineLabelColumnWidth = 144;
  let timelineZoom = 1;
  let markerDensityLevel = 6;
  let axisRendered = false;
  let selectedEventId = '';
  let renderedAxisEvents = new Map();
  let densityScrollFrame = 0;
  let cutlistConfirmed = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmt(sec) {
    const n = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    const two = (v) => String(v).padStart(2, '0');
    return h ? `${two(h)}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  }
  function displayTime(row, fallbackSec) {
    const vodLabel = String(row && row.vod_label || '').trim();
    const seek = row && row.seek_sec != null ? Number(row.seek_sec) : NaN;
    const base = Number.isFinite(seek) ? seek : fallbackSec;
    if (vodLabel) return `${vodLabel} ${fmt(base)}`;
    const tc = String(row && row.timecode || '').trim();
    return tc || fmt(base);
  }
  function near(row, sec, radius) {
    const start = Number(row && row.start_sec);
    const endRaw = row && row.end_sec != null ? Number(row.end_sec) : start;
    const end = Number.isFinite(endRaw) ? endRaw : start;
    return Number.isFinite(start) && Number.isFinite(sec) && start - radius <= sec && sec <= end + radius;
  }
  function seekUrl(sec, row) {
    const videoNo = String(row && (row.video_no || row.source_video_no) || data.video_no || '');
    if (!videoNo) return '';
    const targetSec = row && row.seek_sec != null ? row.seek_sec : sec;
    return `https://chzzk.naver.com/video/${encodeURIComponent(videoNo)}?currentTime=${Math.max(0, Math.floor(Number(targetSec || 0)))}`;
  }
  function syncSplitEditorSeek(sec, row) {
    const url = seekUrl(sec, row);
    if (!url) return '';
    const frame = document.querySelector('[data-editor-chzzk-frame]');
    if (frame) frame.setAttribute('src', url);
    const splitLink = document.querySelector('.editor-split-action[href*="chzzk.naver.com/video/"]');
    if (splitLink) splitLink.setAttribute('href', url);
    return url;
  }
  function clipUrl(uid) {
    const raw = String(uid || '').trim();
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(raw)) return '';
    if (raw === 'viewer_clip_anchor') return '';
    return `https://chzzk.naver.com/clips/${encodeURIComponent(raw)}`;
  }
  function timeLink(sec, row) {
    const url = seekUrl(sec, row);
    const label = displayTime(row, sec);
    return url ? `<a class="viewer-editor-time-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : esc(label);
  }
  function timeChip(sec, row) {
    const url = seekUrl(sec, row);
    const label = displayTime(row, sec);
    return url ? `<a class="viewer-editor-chip" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : `<span class="viewer-editor-chip">${esc(label)}</span>`;
  }
  function contextSourceRow(row) {
    const scoped = { ...(row || {}) };
    if (scoped.video_no && scoped.vod_label && scoped.seek_sec != null) return scoped;
    const samples = Array.isArray(scoped.samples) ? scoped.samples : [];
    const sample = samples.find((item) => item && (item.video_no || item.vod_label || item.seek_sec != null));
    if (!sample) return scoped;
    if (!scoped.video_no && sample.video_no) scoped.video_no = sample.video_no;
    if (!scoped.vod_label && sample.vod_label) scoped.vod_label = sample.vod_label;
    if (scoped.seek_sec == null && sample.seek_sec != null) {
      const rowStart = Number(scoped.start_sec);
      const sampleSec = Number(sample.sec);
      const sampleSeek = Number(sample.seek_sec);
      scoped.seek_sec = Number.isFinite(rowStart) && Number.isFinite(sampleSec) && Number.isFinite(sampleSeek)
        ? rowStart - (sampleSec - sampleSeek)
        : sampleSeek;
    }
    return scoped;
  }
  function timecodeToSec(value) {
    const parts = String(value || '').split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return NaN;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return NaN;
  }
  function originStartSec(event) {
    const value = event && event.anchor_origin_start_sec != null ? Number(event.anchor_origin_start_sec) : Number(event && event.start_sec);
    return Number.isFinite(value) ? value : NaN;
  }
  function originSeekSec(event) {
    const value = event && event.anchor_origin_seek_sec != null ? Number(event.anchor_origin_seek_sec) : Number(event && event.seek_sec);
    return Number.isFinite(value) ? value : NaN;
  }
  function sourceTimeTarget(localOrGlobalSec, event) {
    const sec = Number(localOrGlobalSec);
    if (!Number.isFinite(sec)) return null;
    const rootStart = originStartSec(event);
    const rootSeek = originSeekSec(event);
    const hasSourceLocal = event && event.vod_label && Number.isFinite(rootStart) && Number.isFinite(rootSeek);
    const startSec = hasSourceLocal ? rootStart + (sec - rootSeek) : sec;
    const row = {
      ...(event || {}),
      start_sec: startSec,
      sec: startSec,
      timecode: hasSourceLocal ? (event && event.timecode) : fmt(startSec),
      anchor_origin_start_sec: Number.isFinite(rootStart) ? rootStart : startSec,
      anchor_origin_seek_sec: Number.isFinite(rootSeek) ? rootSeek : (event && event.seek_sec),
    };
    if (hasSourceLocal) row.seek_sec = sec;
    return row;
  }
  function explicitEvidenceTarget(item, event) {
    const explicit = item && item.start_sec != null ? Number(item.start_sec) : item && item.sec != null ? Number(item.sec) : NaN;
    if (!Number.isFinite(explicit)) return null;
    const row = {
      ...(event || {}),
      ...(item || {}),
      start_sec: explicit,
      sec: explicit,
      timecode: item && item.timecode ? item.timecode : fmt(explicit),
      anchor_origin_start_sec: originStartSec(event),
      anchor_origin_seek_sec: originSeekSec(event),
    };
    return row;
  }
  function pushEvidenceTarget(targets, row, label) {
    if (!row) return;
    const sec = Number(row.start_sec != null ? row.start_sec : row.sec);
    if (!Number.isFinite(sec)) return;
    const videoNo = String(row.video_no || row.source_video_no || '').trim();
    const key = `${videoNo}|${Math.round(sec * 10) / 10}`;
    if (targets.some((target) => target.key === key)) return;
    targets.push({ key, label: label || '근거 시각', row });
  }
  function evidenceTargetsForEvent(event, selectedSec) {
    const targets = [];
    const cardRow = explicitEvidenceTarget({ start_sec: Number(selectedSec) }, event) || sourceTimeTarget(selectedSec, event);
    pushEvidenceTarget(targets, cardRow, '카드 시각');
    const rows = []
      .concat(Array.isArray(event && event.evidence) ? event.evidence : [])
      .concat(Array.isArray(event && event.guidance) ? event.guidance : []);
    rows.forEach((item) => {
      const label = friendlyEvidenceLabel(item && (item.label || item.title || item.type) || '근거');
      pushEvidenceTarget(targets, explicitEvidenceTarget(item, event), label);
      const text = `${item && item.timecode || ''} ${item && item.text || ''}`;
      const re = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
      for (const match of text.matchAll(re)) {
        const sec = timecodeToSec(match[1]);
        pushEvidenceTarget(targets, sourceTimeTarget(sec, event), `${label} ${match[1]}`);
      }
    });
    return targets.slice(0, 8);
  }
  function renderEvidenceTargetPicker(targets, activeSec) {
    if (!Array.isArray(targets) || targets.length <= 1) return '';
    const buttons = targets.map((target, index) => {
      const sec = Number(target.row && target.row.start_sec);
      const active = Number.isFinite(sec) && Math.abs(sec - Number(activeSec || 0)) < 0.5;
      return `<button type="button" class="viewer-editor-chip ${active ? 'selected' : ''}" data-evidence-target-index="${index}">${esc(target.label)} · ${esc(displayTime(target.row, sec))}</button>`;
    }).join('');
    return `<div class="viewer-editor-target-picker" aria-label="근거 시각 선택"><strong>근거 시각 선택</strong><div class="viewer-editor-target-buttons">${buttons}</div></div>`;
  }
  function linkTimecodesText(text, row) {
    const raw = String(text || '');
    const re = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
    let out = '';
    let last = 0;
    for (const match of raw.matchAll(re)) {
      out += esc(raw.slice(last, match.index));
      const sec = timecodeToSec(match[1]);
      out += timeLink(sec, row || {});
      last = match.index + match[1].length;
    }
    out += esc(raw.slice(last));
    return out;
  }
  function renderEvidenceRow(row) {
    if (row.clipUrl) {
      const label = '시청자 클립';
      const rawText = String(row.text || '').trim();
      const looksLikeUid = /^[A-Za-z0-9_-]{6,80}$/.test(rawText);
      const text = rawText && !looksLikeUid ? `${esc(rawText)} · 치지직 클립 열기` : '치지직 클립 열기';
      return `<div class="viewer-editor-row"><strong>${label}</strong><br><a class="viewer-editor-evidence-link" href="${esc(row.clipUrl)}" target="_blank" rel="noopener">${text}</a></div>`;
    }
    const rawLabel = row.label || '근거';
    const labelText = friendlyEvidenceLabel(rawLabel);
    const bodyText = friendlyEvidenceText(rawLabel, row.text || '');
    const labelSec = row.sec != null ? row.sec : row.start_sec;
    const label = labelSec != null ? `${esc(labelText)} · ${timeLink(labelSec, row)}` : linkTimecodesText(labelText, row);
    return `<div class="viewer-editor-row"><strong>${label}</strong><br>${linkTimecodesText(bodyText, row)}</div>`;
  }
  function normalizeEvidenceIdentityText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
  function clusterMemberIdentityKey(row) {
    const sec = Number(row && row.start_sec);
    const roundedSec = Number.isFinite(sec) ? Math.round(sec) : 0;
    const title = normalizeEvidenceIdentityText(friendlyEventTitle(row) || optionLabel(row && row.kind) || '편집 후보');
    return `${roundedSec}|${title}|${seekUrl(Number.isFinite(sec) ? sec : 0, row)}`;
  }
  function groupedClusterMemberRows(rows) {
    const groups = [];
    const byKey = new Map();
    (rows || []).forEach((row) => {
      if (!row) return;
      const key = clusterMemberIdentityKey(row);
      let group = byKey.get(key);
      if (!group) {
        group = { key, primary: row, rows: [], kinds: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.rows.push(row);
      const kind = String(row.kind || '').trim();
      if (kind && !group.kinds.includes(kind)) group.kinds.push(kind);
    });
    return groups;
  }
  function renderClusterMemberSourceBadges(group) {
    const kinds = Array.isArray(group && group.kinds) ? group.kinds : [];
    if (!kinds.length) return '';
    const sourceBadges = kinds.map((kind) => `<span class="viewer-editor-chip" data-cluster-source-kind="${esc(kind)}">${esc(optionLabel(kind))}</span>`).join('');
    const countBadge = group.rows && group.rows.length > 1
      ? `<span class="viewer-editor-chip" data-evidence-group-size="${group.rows.length}">근거 출처 ${group.rows.length}개</span>`
      : '';
    return `<div class="viewer-editor-source-badges" aria-label="묶인 근거 출처">${countBadge}${sourceBadges}</div>`;
  }
  function renderClusterMemberRow(group, index, isRest) {
    const row = group && group.primary ? group.primary : group;
    const identity = group && group.key ? group.key : clusterMemberIdentityKey(row);
    const sec = Number(row && row.start_sec);
    const rank = isRest ? `나머지 ${Math.max(1, index - 2)}` : `대표 ${index + 1}`;
    const label = row && row.vod_label ? `${row.vod_label} · ${optionLabel(row.kind)}` : optionLabel(row && row.kind);
    const title = friendlyEventTitle(row) || label || '편집 후보';
    const link = row && row.kind === 'viewer_clip' ? viewerClipLinkInfo([row], row) : { url: '', title: '' };
    const body = link.url
      ? `<a class="viewer-editor-evidence-link" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.title || title)} · 치지직 클립 열기</a>`
      : linkTimecodesText(title, row);
    const kinds = Array.isArray(group && group.kinds) ? group.kinds : [row && row.kind].filter(Boolean);
    return `<div class="viewer-editor-row cluster-member ${isRest ? 'rest' : 'top'}" data-cluster-member-rank="${isRest ? 'rest' : 'top'}" data-cluster-member-kind="${esc(row && row.kind || '')}" data-cluster-source-kinds="${esc(kinds.join(' '))}" data-evidence-group-size="${group && group.rows ? group.rows.length : 1}" data-evidence-identity="${esc(identity)}">
      <span class="viewer-editor-member-rank">${esc(rank)}</span>
      <strong>${esc(label)} · ${timeLink(Number.isFinite(sec) ? sec : 0, row)}</strong>
      ${renderClusterMemberSourceBadges(group)}
      <br>${body}
    </div>`;
  }
  function renderEditPointClusterEvidence(event, sec) {
    const cluster = event && event.cluster ? event.cluster : {};
    const rows = Array.isArray(event && event.cluster_events) ? event.cluster_events : [];
    const clusterId = editPointClusterId(cluster);
    selectedEventId = String(event && event.id || `edit_point_cluster_${clusterId}`);
    axisEl.querySelectorAll('[data-event-id]').forEach((marker) => marker.classList.remove('selected'));
    axisEl.querySelectorAll('[data-edit-point-cluster-id]').forEach((marker) => {
      marker.classList.toggle('selected', selectedEventId === `edit_point_cluster_${marker.dataset.editPointClusterId || ''}`);
    });
    const introEl = document.getElementById('viewerEditorEvidenceIntro');
    if (introEl) introEl.hidden = true;
    const selectedColor = markerColor('edit_point_cluster');
    const signalCount = Math.max(0, Number(cluster.signal_count || rows.length || 0));
    const zoneFamilyKeys = Array.isArray(event && event.heatmap_zone_families) ? event.heatmap_zone_families : [];
    const familyKeys = Array.from(new Set(clusterFamilyKeys(cluster).concat(zoneFamilyKeys))).filter(Boolean);
    const familyChipHtml = familyKeys.slice(0, 7)
      .map((kind) => `<span class="viewer-editor-chip" data-selected-signal-family="${esc(kind)}">${esc(optionLabel(kind))}</span>`)
      .join('');
    const viewerClipCount = Math.max(0, Number(cluster.viewer_clip_count || rows.filter((row) => row.kind === 'viewer_clip').length));
    const overflowCount = Math.max(0, Number(cluster.overflow_event_count || Math.max(0, rows.length - 3)));
    const zoneRelatedCount = Math.max(0, Number(event && event.heatmap_zone_related_count || 0));
    const groupedRows = groupedClusterMemberRows(rows);
    const topRows = groupedRows.slice(0, 3);
    const restRows = groupedRows.slice(3);
    const memberRows = topRows.map((row, index) => renderClusterMemberRow(row, index, false))
      .concat(restRows.map((row, index) => renderClusterMemberRow(row, index + 3, true)));
    const subtitleContext = subtitles.filter((row) => near(row, sec, 45)).slice(0, 6);
    const bucketContext = buckets.filter((row) => near(row, sec, 45)).slice(0, 5);
    evidenceEl.innerHTML = `<div class="viewer-editor-selected-card" style="--viewer-marker-color:${esc(selectedColor)}" data-selected-edit-point-cluster="${esc(clusterId)}" data-selected-signal-families="${esc(familyKeys.join(' '))}">
      <span class="viewer-editor-selected-kicker">먼저 볼 편집 후보 묶음</span>
      <div class="viewer-editor-selected-title">${esc(fmt(sec))} 주변 신호 ${signalCount}개</div>
      <div class="viewer-editor-selected-meta">
        ${timeChip(sec, event)}
        <span class="viewer-editor-chip">자료 ${Math.max(0, Number(cluster.family_count || 0))}종</span>
        <span class="viewer-editor-chip">시청자 클립 ${viewerClipCount}개</span>
        <span class="viewer-editor-chip">신뢰 ${esc(clusterConfidenceLabel(cluster.confidence))}</span>
        ${zoneRelatedCount ? `<span class="viewer-editor-chip">주변 묶음 ${zoneRelatedCount}개</span>` : ''}
        ${familyChipHtml}
        ${overflowCount ? `<span class="viewer-editor-chip warning">나머지 ${overflowCount}개도 펼침</span>` : ''}
      </div>
    </div>
    <div class="viewer-editor-row reason"><strong>왜 먼저 보나요</strong><br>${esc(clusterFamilyText(cluster))}가 같은 시간대에 겹친 편집 후보입니다. 요약 사실이 아니라 사람이 먼저 확인할 탐색 묶음입니다.</div>
    ${renderContextSummary(subtitleContext, bucketContext)}
    <div class="viewer-editor-list" data-edit-point-cluster-members="${groupedRows.length}" data-edit-point-cluster-source-events="${rows.length}">${memberRows.join('') || '<div class="viewer-editor-empty">묶음 안에 표시할 근거가 없습니다.</div>'}</div>`;
  }
  function viewerClipLinkInfo(eventList, selectedEvent) {
    const selectedStart = Number(selectedEvent && selectedEvent.start_sec);
    const selectedTitle = friendlyEventTitle(selectedEvent);
    for (const candidate of eventList || []) {
      if (!candidate || candidate.kind !== 'viewer_clip') continue;
      const sameStart = Number.isFinite(selectedStart) && Math.abs(Number(candidate.start_sec || 0) - selectedStart) <= 1;
      const sameTitle = !selectedTitle || friendlyEventTitle(candidate) === selectedTitle;
      if (!sameStart || !sameTitle) continue;
      for (const item of candidate.evidence || []) {
        const uid = String(item.label || '').trim();
        const url = clipUrl(uid);
        if (url) return { uid, url, title: String(item.text || candidate.title || selectedTitle || '시청자 클립').trim() };
      }
    }
    return { uid: '', url: '', title: '' };
  }
  function optionLabel(kind) {
    if (kind === 'chat') return '전체 채팅량';
    return viewerLabelsMap[kind] || labelsMap[kind] || kind || '기타';
  }
  function lanePurpose(kind) {
    return purposesMap[kind] || '편집 후보';
  }
  function markerColor(kind) {
    if (kind === 'edit_point_cluster') return 'rgba(158,206,106,0.86)';
    return colorsMap[kind] || 'rgba(122,162,247,0.86)';
  }
  function friendlyAudioSignalText(text) {
    const lowered = String(text || '').toLowerCase();
    if (!lowered.includes('audio_energy_peak') && !lowered.includes('voice_reaction_candidate') && !lowered.includes('chat_audio_overlap') && !lowered.includes('clipping_or_limiter_diagnostic')) return '';
    const parts = [];
    if (lowered.includes('audio_energy_peak')) parts.push('소리가 크게 튄 구간');
    if (lowered.includes('voice_reaction_candidate')) parts.push('목소리 리액션이 커진 후보');
    if (lowered.includes('chat_audio_overlap')) parts.push('채팅 반응도 같이 몰린 시각');
    if (lowered.includes('clipping_or_limiter_diagnostic')) parts.push('음량이 거칠게 잡힌 신호');
    return `${parts.join(' · ')}입니다. 편집 컷 후보로만 보고, 실제 장면 의미는 자막과 화면 흐름으로 확인하세요.`;
  }
  function friendlyEventTitle(event) {
    const raw = String(event && event.title || '').trim();
    if (!friendlyAudioSignalText(raw)) return raw;
    const lowered = raw.toLowerCase();
    if (lowered.includes('chat_audio_overlap')) return '소리와 채팅이 함께 튄 구간';
    if (lowered.includes('voice_reaction_candidate')) return '목소리 리액션이 커진 구간';
    if (lowered.includes('clipping_or_limiter_diagnostic')) return '음량이 갑자기 거칠어진 구간';
    return '소리가 크게 튄 구간';
  }
  function friendlyEvidenceLabel(label) {
    const raw = String(label || '').trim();
    const lowered = raw.toLowerCase();
    if (!raw) return '근거';
    if (lowered.includes('chat_or_text_evidence')) return '채팅/자막 근거';
    if (lowered.includes('asr segment') || lowered.includes('subtitle') || raw.includes('자막')) return '자막 근거';
    if (lowered.includes('chat_bucket') || raw.includes('채팅')) return raw.includes('대표') ? '대표 채팅 반응' : '채팅 반응';
    if (lowered.includes('viewer_clip') || raw.includes('클립')) return '시청자 클립';
    if (lowered.includes('audio') || raw.includes('오디오')) return '오디오 반응';
    if (lowered.includes('highlight_candidate')) return '자동 반응 후보';
    if (lowered.includes('summary_markdown')) return '요약에 적힌 장면';
    if (lowered.includes('subtitle_chunk') || lowered.includes('timed_evidence')) return '자막 근거';
    if (lowered.includes('semantic_vector') || lowered.includes('timestamp_overlap')) return '가까운 방송 근거';
    if (lowered.includes('chat_density_peak')) return '채팅 반응';
    if (lowered.includes('supporting_signal')) return '보조 신호';
    if (lowered.includes('proximity_signal')) return '가까운 관련 신호';
    if (lowered.includes('chzzk_comment_timeline') || lowered === 'chapter') return '댓글 시간표 후보';
    if (lowered.includes('segment_ledger') || raw.includes('요약') || raw.includes('timeline')) return '요약에 적힌 장면';
    if (lowered.includes('comment')) return '댓글 시간표 후보';
    if (lowered === 'source' || lowered === 'supporting' || lowered === 'candidate') return '참고 자료';
    return raw;
  }
  function friendlyEvidenceText(label, text) {
    const raw = String(text || '').trim();
    const joined = `${String(label || '')} ${raw}`;
    if (!raw) return '';
    const audioText = friendlyAudioSignalText(joined);
    if (audioText) return audioText;
    if (joined.includes('viewer_clip_anchor')) return '시청자 클립에서 잡힌 위치입니다.';
    if (joined.includes('audio_reaction_peak')) return '오디오 반응이 겹친 참고 신호입니다.';
    if (joined.includes('chat_density_peak')) return '채팅이 몰린 시각입니다.';
    if (joined.includes('supporting_signal_only')) return '보조 신호입니다. 장면 판단은 자막이나 기존 요약과 함께 보세요.';
    if (joined.includes('deterministic_injection')) return '시청자 클립 기준으로 보강된 후보입니다.';
    if (
      /^[{].*[}]$/.test(raw)
      || raw.includes("'source_type'")
      || raw.includes('"source_type"')
      || /summary_markdown|semantic_vector|subtitle_chunk|timed_evidence|timestamp_overlap|match_reason|evidence_id/i.test(joined)
    ) return '장면 내용은 주변 자막과 요약으로 확인하세요.';
    return raw;
  }
  function fallbackGuidance(kind) {
    const messages = [];
    const add = (title, text) => {
      const key = `${title}|${text}`;
      if (!messages.some((item) => `${item.title}|${item.text}` === key)) messages.push({ title, text });
    };
    if (kind === 'chat_laughter') {
      add('웃음/놀람 채팅', '웃기거나 놀란 반응이 채팅에 많이 잡힌 구간입니다. 리액션 컷 후보로 보고, 정확한 장면 내용은 자막과 요약으로 확인하세요.');
    } else if (kind === 'chat_surprise') {
      add('채팅 급증 구간', '채팅량이 갑자기 늘어난 구간입니다. 무슨 일이 났는지 찾는 출발점으로 보고, 웃긴 장면인지 이슈 장면인지는 자막과 화면 흐름으로 확인하세요.');
    } else if (kind === 'chat') {
      add('채팅 반응 신호', '채팅이 몰린 위치입니다. 장면 내용은 자막이나 기존 요약과 함께 확인하세요.');
    }
    return messages;
  }
  function friendlyPreviewStatus(status) {
    const raw = String(status || '').toLowerCase();
    if (!raw || raw === 'unverified' || raw === 'draft') return '검토용';
    if (raw === 'pass' || raw === 'ok' || raw === 'ready') return '복사 가능';
    if (raw === 'fail' || raw === 'error') return '확인 필요';
    return String(status || '검토용');
  }
  function friendlyPreviewSource(source) {
    const raw = String(source || '');
    if (!raw || raw === 'segment_ledger') return '요약·하이라이트·댓글 시각 기준';
    return raw;
  }
  function clipTitle(clip, index) {
    const title = String(clip && clip.title || '').trim();
    if (title) return title;
    return `컷 후보 ${index}`;
  }
  function clipMemoText(clips) {
    return clips.map((clip, index) => {
      const title = clipTitle(clip, index + 1);
      const start = displayTime(clip, clip.start_sec);
      const end = clip && clip.end_seek_sec != null
        ? displayTime({ ...clip, seek_sec: clip.end_seek_sec }, clip.end_sec)
        : displayTime(clip, clip.end_sec);
      return `${index + 1}. ${start}-${end} | ${title}`;
    }).join('\n');
  }
  function publicEdlText() {
    return String(preview.edl || '')
      .split('\n')
      .filter((line) => !line.startsWith('* SEGMENT_ID:'))
      .join('\n');
  }
  function currentCutMemoText() {
    return clipMemoText(Array.isArray(preview.clips) ? preview.clips : []) || publicEdlText();
  }
  function currentCutJsonText() {
    return JSON.stringify(preview.otio || preview || {}, null, 2);
  }
  function updateCutCopyButtons() {
    const memoText = currentCutMemoText();
    const jsonText = currentCutJsonText();
    if (copyBtn) copyBtn.disabled = !cutlistConfirmed || !memoText;
    if (copyJsonBtn) copyJsonBtn.disabled = !cutlistConfirmed || !jsonText || jsonText === '{}';
    if (copyStatus) {
      copyStatus.textContent = cutlistConfirmed
        ? '확인 완료. 복사 버튼을 사용할 수 있습니다.'
        : (memoText || jsonText !== '{}' ? '컷 후보를 확인하면 복사 버튼이 켜집니다.' : '');
    }
  }
  function isTimeOnlyTitle(title, sec) {
    const raw = String(title || '').trim();
    if (!raw) return true;
    return raw === fmt(sec) || /^\d{1,2}:\d{2}(:\d{2})?$/.test(raw);
  }
  function selectedTitle(event, sec) {
    const raw = friendlyEventTitle(event);
    if (!isTimeOnlyTitle(raw, sec)) return raw;
    if (event && (event.kind === 'timeline' || event.kind === 'existing_segments')) return '요약에 포함된 장면';
    if (event && event.kind === 'highlight') return '하이라이트 추천 장면';
    const label = optionLabel(event && event.kind);
    return label.endsWith('후보') ? label : `${label} 후보`;
  }
  function selectedSummaryStatus(event, nearbyEvents) {
    const kind = String(event && event.kind || '');
    if (kind === 'timeline' || kind === 'existing_segments') {
      return { label: '요약에 포함됨', inSummary: true, warning: false };
    }
    if (kind === 'highlight') {
      return { label: '하이라이트 추천', inSummary: true, warning: false };
    }
    const nearSummary = nearbyEvents.some((row) => row.kind === 'timeline' || row.kind === 'existing_segments');
    if (nearSummary) return { label: '요약 근처 장면', inSummary: true, warning: false };
    const nearHighlight = nearbyEvents.some((row) => row.kind === 'highlight');
    if (nearHighlight) return { label: '하이라이트 근처', inSummary: true, warning: false };
    return { label: '요약 밖 참고 장면', inSummary: false, warning: true };
  }
  function contextLine(row) {
    const scoped = contextSourceRow(row);
    return `<div class="viewer-editor-context-line"><span class="viewer-editor-context-time">${timeLink(scoped.start_sec, scoped)}</span><span class="viewer-editor-context-text">${linkTimecodesText(scoped.text || '', scoped)}</span></div>`;
  }
  function renderContextSummary(nearbySubtitles, nearbyBuckets) {
    const subtitleRows = nearbySubtitles
      .filter((row) => row && row.text)
      .slice(0, 3);
    const hiddenSubtitleRows = nearbySubtitles
      .filter((row) => row && row.text)
      .slice(3);
    const subtitleHtml = subtitleRows.length
      ? subtitleRows.map(contextLine).join('') + (hiddenSubtitleRows.length ? `<details class="viewer-editor-context-more"><summary>자막 ${hiddenSubtitleRows.length}줄 더 보기</summary>${hiddenSubtitleRows.map(contextLine).join('')}</details>` : '')
      : '<div class="viewer-editor-empty">근처 자막 없음</div>';
    const chatRows = nearbyBuckets
      .filter((row) => Number(row.count || 0) > 0 || (row.samples || []).length)
      .slice(0, 2);
    const chatHtml = chatRows.length
      ? chatRows.map((row) => {
          const scoped = contextSourceRow(row);
          const sample = (scoped.samples || []).map((item) => item.text).filter(Boolean).slice(0, 3).join(' / ');
          return `<div class="viewer-editor-context-line"><span class="viewer-editor-context-time">${timeLink(scoped.start_sec, scoped)}</span><span class="viewer-editor-context-text">채팅 ${Number(scoped.count || 0)}개${sample ? ` · ${linkTimecodesText(sample, scoped)}` : ''}</span></div>`;
        }).join('')
      : '<div class="viewer-editor-empty">근처 채팅 샘플 없음</div>';
    return `<div class="viewer-editor-context" aria-label="선택 시각 주변 방송 맥락">
      <div class="viewer-editor-context-card"><strong>자막 흐름</strong>${subtitleHtml}</div>
      <div class="viewer-editor-context-card"><strong>채팅 반응</strong>${chatHtml}</div>
    </div>`;
  }
  function clampZoom(value) {
    return Math.max(0.1, Math.min(2.6, Number(value) || 1));
  }
  function applyTimelineZoom(nextZoom, anchorClientX) {
    if (!axisEl) return;
    const canvas = axisEl.querySelector('.viewer-editor-axis-canvas');
    if (!canvas) return;
    const rect = axisEl.getBoundingClientRect();
    const oldWidth = Math.max(96, Math.round(baseTimelineWidth * timelineZoom));
    const anchorX = Number.isFinite(anchorClientX) ? anchorClientX : rect.left + rect.width / 2;
    const cursorX = Math.max(0, axisEl.scrollLeft + anchorX - rect.left - timelineLabelColumnWidth);
    const timeRatio = oldWidth ? Math.max(0, Math.min(1, cursorX / oldWidth)) : 0;
    timelineZoom = clampZoom(nextZoom);
    const nextWidth = Math.max(96, Math.round(baseTimelineWidth * timelineZoom));
    canvas.style.setProperty('--viewer-editor-w', `${nextWidth}px`);
    axisEl.scrollLeft = Math.max(0, timeRatio * nextWidth + timelineLabelColumnWidth - (anchorX - rect.left));
    if (zoomRange) zoomRange.value = String(Math.round(timelineZoom * 100));
    if (zoomValue) zoomValue.textContent = `${timelineZoom.toFixed(2)}x`;
    renderAxis({ preserveScroll: true });
  }
  function renderFilter() {
    if (!filterEl) return;
    filterEl.innerHTML = '<option value="">전체</option>' + lanes.map((lane) => `<option value="${esc(lane.key)}">${esc(optionLabel(lane.key))}</option>`).join('');
    filterEl.addEventListener('change', renderAxis);
  }
  function renderScale() {
    const tickCount = 6;
    const ticks = [];
    for (let i = 0; i <= tickCount; i += 1) {
      const ratio = i / tickCount;
      ticks.push(`<span style="left:${ratio * 100}%">${fmt(duration * ratio)}</span>`);
    }
    return ticks.join('');
  }
  function renderWaveformRow() {
    if (!waveformSamples.length) {
      return `<div class="viewer-editor-waveform-row" data-waveform-row="true"><div class="viewer-editor-waveform-label"><strong>소리 파형</strong><span>파형 데이터 없음</span></div><div class="viewer-editor-waveform"><div class="viewer-editor-empty">소리 파형 데이터 없음</div></div></div>`;
    }
    const bars = waveformSamples.map((row) => {
      const start = Math.max(0, Number(row.start_sec || 0));
      const end = Math.max(start, Number(row.end_sec || start));
      const value = Math.max(0, Math.min(1, Number(row.value || 0)));
      const center = start + ((end - start) / 2);
      const x = Math.max(0, Math.min(100, (center / duration) * 100));
      const amplitude = 2.2 + value * 17.2;
      const hot = value >= 0.78;
      return `<line class="viewer-editor-waveform-bar ${hot ? 'hot' : ''}" x1="${x.toFixed(3)}" y1="${(20 - amplitude).toFixed(3)}" x2="${x.toFixed(3)}" y2="${(20 + amplitude).toFixed(3)}"><title>${fmt(start)} 소리 파형 ${(value * 100).toFixed(0)}%</title></line>`;
    }).join('');
    return `<div class="viewer-editor-waveform-row" data-waveform-row="true"><div class="viewer-editor-waveform-label"><strong>소리 파형</strong><span>진폭 샘플 · ${waveformSamples.length}개</span></div><div class="viewer-editor-waveform" aria-label="실제 오디오 샘플 기반 소리 파형"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><line class="viewer-editor-waveform-midline" x1="0" y1="20" x2="100" y2="20"></line>${bars}</svg></div></div>`;
  }
  function chatBucketCount(row) {
    if (!row || row.count == null || row.count === '') return { count: 0, missing: true };
    const value = Number(row.count);
    if (!Number.isFinite(value)) return { count: 0, missing: true };
    return { count: Math.max(0, value), missing: false };
  }
  function bucketOverlapsRange(row, range) {
    const start = Math.max(0, Number(row.start_sec || 0));
    const end = Math.max(start, Number(row.end_sec || start + 30));
    return end >= range.startSec && start <= range.endSec;
  }
  function currentVisibleTimeRange(timelineWidth) {
    const viewportWidth = axisEl ? axisEl.clientWidth : timelineWidth;
    const startPx = Math.max(0, (axisEl ? axisEl.scrollLeft : 0) - timelineLabelColumnWidth);
    const endPx = Math.min(timelineWidth, startPx + Math.max(1, viewportWidth - timelineLabelColumnWidth));
    if (endPx <= startPx || viewportWidth >= timelineWidth + timelineLabelColumnWidth) {
      return { startSec: 0, endSec: duration };
    }
    return {
      startSec: Math.max(0, Math.min(duration, (startPx / timelineWidth) * duration)),
      endSec: Math.max(0, Math.min(duration, (endPx / timelineWidth) * duration)),
    };
  }
  function maxChatCount(rows) {
    return Math.max(1, ...rows.map((row) => chatBucketCount(row).count));
  }
  function densityBucketClass(chatCount, missing, visibleMaxChat, hot) {
    if (missing) return 'missing';
    if (chatCount <= 0) return 'zero';
    const low = chatCount < Math.max(2, visibleMaxChat * 0.12);
    return `${hot ? 'hot' : ''}${low ? ' low' : ''}`.trim();
  }
  function scheduleDensityScaleRefresh() {
    if (densityScrollFrame) return;
    densityScrollFrame = window.requestAnimationFrame(() => {
      densityScrollFrame = 0;
      renderAxis({ preserveScroll: true });
    });
  }
  function markerDensityLabel() {
    return ['전체', '거의 전체', '많음', '넓게', '균형+', '균형', '핵심', '핵심+', '정예', '최정예', '최소'][markerDensityLevel] || '핵심';
  }
  function markerDensityRatio() {
    return [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1][markerDensityLevel] || 0.4;
  }
  function protectedDensityKind(kind) {
    return ['timeline', 'existing_segments', 'highlight', 'chapter', 'viewer_clip'].includes(String(kind || ''));
  }
  function markerPriorityKindFamily(kind) {
    const raw = String(kind || '').toLowerCase();
    if (raw === 'timeline' || raw === 'existing_segments' || raw === 'highlight' || raw === 'chapter') return 'summary';
    if (raw === 'viewer_clip') return 'viewer_clip';
    if (raw.includes('chat') || raw.includes('comment')) return 'chat';
    if (raw.includes('audio') || raw.includes('voice')) return 'audio';
    if (raw.includes('subtitle') || raw.includes('asr')) return 'subtitle';
    if (raw.includes('visual') || raw.includes('scene')) return 'visual';
    if (raw.includes('live')) return 'live';
    return raw || 'other';
  }
  function markerPriorityTextFamily(text) {
    const raw = String(text || '').toLowerCase();
    if (!raw) return '';
    if (raw.includes('summary') || raw.includes('timeline') || raw.includes('highlight') || raw.includes('chapter') || raw.includes('요약')) return 'summary';
    if (raw.includes('viewer_clip') || raw.includes('clip') || raw.includes('클립')) return 'viewer_clip';
    if (raw.includes('chat') || raw.includes('comment') || raw.includes('채팅') || raw.includes('댓글')) return 'chat';
    if (raw.includes('audio') || raw.includes('voice') || raw.includes('오디오') || raw.includes('소리')) return 'audio';
    if (raw.includes('subtitle') || raw.includes('asr') || raw.includes('자막')) return 'subtitle';
    if (raw.includes('visual') || raw.includes('scene') || raw.includes('화면')) return 'visual';
    if (raw.includes('live')) return 'live';
    return '';
  }
  function markerPriorityFamilies(event) {
    const families = new Set([markerPriorityKindFamily(event && event.kind)]);
    const addText = (value) => {
      const family = markerPriorityTextFamily(value);
      if (family) families.add(family);
    };
    (event && Array.isArray(event.source_signals) ? event.source_signals : []).forEach(addText);
    (event && Array.isArray(event.signals) ? event.signals : []).forEach(addText);
    (event && Array.isArray(event.evidence) ? event.evidence : [])
      .concat(event && Array.isArray(event.guidance) ? event.guidance : [])
      .forEach((row) => {
        addText(row && (row.kind || row.type || row.source_type || row.label || row.title || row.text));
      });
    return Array.from(families).filter(Boolean);
  }
  function markerPrioritySec(event, fallbackIndex) {
    const value = event && event.start_sec != null ? Number(event.start_sec) : Number(fallbackIndex || 0);
    return Number.isFinite(value) ? value : Number(fallbackIndex || 0);
  }
  function markerPriorityNearbyFamilies(event, contextEvents, radiusSec = 12) {
    const sec = markerPrioritySec(event, 0);
    const families = new Set(markerPriorityFamilies(event));
    (Array.isArray(contextEvents) ? contextEvents : []).forEach((candidate) => {
      const otherSec = markerPrioritySec(candidate, NaN);
      if (!Number.isFinite(otherSec) || Math.abs(otherSec - sec) > radiusSec) return;
      markerPriorityFamilies(candidate).forEach((family) => families.add(family));
    });
    return families;
  }
  function markerPriorityNearbyKind(contextEvents, event, kinds, radiusSec = 12) {
    const sec = markerPrioritySec(event, 0);
    return (Array.isArray(contextEvents) ? contextEvents : []).some((candidate) => {
      const kind = String(candidate && candidate.kind || '');
      if (!kinds.includes(kind)) return false;
      const otherSec = markerPrioritySec(candidate, NaN);
      return Number.isFinite(otherSec) && Math.abs(otherSec - sec) <= radiusSec;
    });
  }
  function markerPriorityEngagement(event) {
    const fields = ['play_count', 'like_count', 'read_count', 'reaction_count', 'chat_count', 'message_count', 'count'];
    const total = fields.reduce((sum, key) => sum + Math.max(0, Number(event && event[key] || 0)), 0);
    return total > 0 ? Math.min(14, Math.log10(total + 1) * 4) : 0;
  }
  function markerDisplayPriority(kind, event, index, laneEvents, contextEvents) {
    let score = 0;
    const familyCount = markerPriorityNearbyFamilies(event, contextEvents).size;
    const rowFamilies = markerPriorityFamilies(event).length;
    if (protectedDensityKind(kind)) score += kind === 'viewer_clip' ? 70 : 82;
    if (markerPriorityNearbyKind(contextEvents, event, ['timeline', 'existing_segments', 'highlight', 'chapter'], 15)) score += 48;
    if (markerPriorityNearbyKind(contextEvents, event, ['viewer_clip'], 15)) score += 34;
    if (familyCount >= 4) score += 54;
    else if (familyCount === 3) score += 40;
    else if (familyCount === 2) score += 18;
    if (rowFamilies >= 3) score += 18;
    else if (rowFamilies === 2) score += 8;
    const evidenceCount = (Array.isArray(event && event.evidence) ? event.evidence.length : 0)
      + (Array.isArray(event && event.guidance) ? event.guidance.length : 0);
    score += Math.min(12, evidenceCount * 3);
    score += markerPriorityEngagement(event);
    if (event && (event.video_no || event.source_video_no || event.seek_sec != null || event.vod_label)) score += 4;
    return {
      score,
      startSec: markerPrioritySec(event, index),
      index,
      id: String(event && (event.id || event.event_id) || `${kind}_${index}`),
    };
  }
  function laneEventsForDensity(kind, laneEvents, contextEvents) {
    const rows = Array.isArray(laneEvents) ? laneEvents : [];
    if (markerDensityLevel <= 0 || protectedDensityKind(kind) || rows.length <= 2) return rows;
    const target = Math.max(1, Math.ceil(rows.length * markerDensityRatio()));
    if (target >= rows.length) return rows;
    const ranked = rows
      .map((row, index) => ({ row, priority: markerDisplayPriority(kind, row, index, rows, contextEvents || rows) }))
      .sort((a, b) => {
        if (b.priority.score !== a.priority.score) return b.priority.score - a.priority.score;
        if (a.priority.startSec !== b.priority.startSec) return a.priority.startSec - b.priority.startSec;
        if (a.priority.index !== b.priority.index) return a.priority.index - b.priority.index;
        return a.priority.id.localeCompare(b.priority.id);
      })
      .slice(0, target);
    const selected = new Set(ranked.map((item) => item.priority.index));
    return rows.filter((_row, index) => selected.has(index));
  }
  function eventsForDensity(eventList) {
    const byKind = new Map();
    (eventList || []).forEach((event) => {
      const kind = String(event && event.kind || '');
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind).push(event);
    });
    return Array.from(byKind.entries()).flatMap(([kind, rows]) => laneEventsForDensity(kind, rows, eventList));
  }
  function viewerClipClusterKey(event) {
    const sec = Math.round(Number(event && event.start_sec || 0));
    return `viewer_clip_${sec}`;
  }
  function clipClusterEvents(event) {
    if (event && Array.isArray(event.clip_cluster_events)) return event.clip_cluster_events;
    return event ? [event] : [];
  }
  function clusterLaneEvents(kind, laneEvents) {
    const rows = Array.isArray(laneEvents) ? laneEvents : [];
    if (kind !== 'viewer_clip' || rows.length <= 1) return rows;
    const byStart = new Map();
    rows.forEach((event) => {
      const key = viewerClipClusterKey(event);
      if (!byStart.has(key)) byStart.set(key, []);
      byStart.get(key).push(event);
    });
    return Array.from(byStart.entries()).flatMap(([key, cluster]) => {
      if (cluster.length <= 1) return cluster;
      const first = cluster[0];
      return [Object.assign({}, first, {
        id: `cluster_${key}`,
        title: `시청자 클립 ${cluster.length}개`,
        evidence: [],
        clip_cluster_count: cluster.length,
        clip_cluster_events: cluster
      })];
    });
  }
  function clipRowsForCluster(clusterEvents) {
    const rows = [];
    (clusterEvents || []).forEach((clip, index) => {
      const link = viewerClipLinkInfo([clip], clip);
      const fallbackTitle = friendlyEventTitle(clip) || `시청자 클립 ${index + 1}`;
      rows.push({
        label: `시청자 클립 ${index + 1}`,
        time: fmt(Number(clip.start_sec || 0)),
        sec: clip.start_sec,
        start_sec: clip.start_sec,
        seek_sec: clip.seek_sec,
        video_no: clip.video_no,
        source_video_no: clip.source_video_no,
        vod_label: clip.vod_label,
        timecode: clip.timecode,
        text: link.title || fallbackTitle,
        clipUrl: link.url
      });
    });
    return rows;
  }
  function clusterEventIdSet(clusterEvents) {
    return new Set((clusterEvents || []).map((clip) => String(clip && clip.id || '')).filter(Boolean));
  }
  function editPointClusterId(cluster) {
    return String(cluster && cluster.cluster_id || '');
  }
  function editPointClusterEvents(cluster) {
    const ids = Array.isArray(cluster && cluster.event_ids) ? cluster.event_ids : [];
    const representativeRows = (Array.isArray(cluster && cluster.representative_events) ? cluster.representative_events : [])
      .map((row) => eventsById.get(String(row && (row.event_id || row.id) || '')) || row)
      .filter((row) => row && typeof row === 'object');
    const rows = [];
    const seen = new Set();
    ids.forEach((id, index) => {
      const key = String(id || '');
      const resolved = key ? eventsById.get(key) : null;
      const fallback = representativeRows[index] || null;
      const row = resolved || fallback;
      if (!row) return;
      const rowKey = String(row.id || row.event_id || key || `${row.kind || 'event'}_${row.start_sec || index}_${index}`);
      if (seen.has(rowKey)) return;
      seen.add(rowKey);
      rows.push(row);
    });
    representativeRows.forEach((row, index) => {
      const rowKey = String(row.id || row.event_id || `${row.kind || 'event'}_${row.start_sec || index}_${index}`);
      if (seen.has(rowKey)) return;
      seen.add(rowKey);
      rows.push(row);
    });
    return rows;
  }
  function renderableEditPointClusters() {
    const clusters = editPointClusters
      .filter((cluster) => editPointClusterId(cluster) && editPointClusterEvents(cluster).length)
      .sort((a, b) => Number(a.start_sec || 0) - Number(b.start_sec || 0));
    return clusters;
  }
  function clusterConfidenceLabel(value) {
    const raw = String(value || '').toLowerCase();
    if (raw === 'high') return '높음';
    if (raw === 'medium') return '중간';
    if (raw === 'low') return '낮음';
    return '검토용';
  }
  function clusterFamilyText(cluster) {
    return clusterFamilyKeys(cluster).map((kind) => optionLabel(kind)).filter(Boolean).slice(0, 4).join(' · ') || '편집 후보';
  }
  function clusterFamilyKeys(cluster) {
    return (Array.isArray(cluster && cluster.signal_families) ? cluster.signal_families : [])
      .map((kind) => String(kind || '').trim())
      .filter(Boolean);
  }
  function editPointClusterEvent(clusterId) {
    const cluster = renderableEditPointClusters().find((row) => editPointClusterId(row) === clusterId);
    if (!cluster) return null;
    const rows = editPointClusterEvents(cluster);
    const sourceRow = rows.find((row) => row && (row.video_no || row.source_video_no || row.seek_sec != null || row.vod_label)) || rows[0] || {};
    const start = Math.max(0, Number(cluster.start_sec || (rows[0] && rows[0].start_sec) || 0));
    const event = {
      id: `edit_point_cluster_${clusterId}`,
      kind: 'edit_point_cluster',
      kind_label: '먼저 볼 구간',
      start_sec: start,
      end_sec: Math.max(start, Number(cluster.end_sec || start)),
      title: `${fmt(start)} 편집 후보 묶음`,
      cluster,
      cluster_events: rows,
    };
    ['video_no', 'source_video_no', 'vod_label', 'seek_sec', 'end_seek_sec', 'timecode'].forEach((key) => {
      if (sourceRow && sourceRow[key] != null) event[key] = sourceRow[key];
    });
    return event;
  }
  function clusterHeatScore(cluster) {
    const signalCount = Math.max(0, Number(cluster && cluster.signal_count || 0));
    const familyCount = Math.max(0, Number(cluster && cluster.family_count || 0));
    const viewerClipCount = Math.max(0, Number(cluster && cluster.viewer_clip_count || 0));
    const confidence = String(cluster && cluster.confidence || 'low').toLowerCase();
    const confidenceWeight = confidence === 'high' ? 2.2 : confidence === 'medium' ? 1.1 : 0.25;
    return signalCount + (familyCount * 1.35) + (viewerClipCount * 1.15) + confidenceWeight;
  }
  const HEATMAP_PROFILE_SAMPLE_COUNT = 120;
  const MAX_PROMINENT_HEAT_ZONES = 12;
  const MIN_PROMINENT_HEAT_ZONES = 5;
  function clusterHeatClass(cluster, score, maxScore) {
    const signalCount = Math.max(0, Number(cluster && cluster.signal_count || 0));
    const familyCount = Math.max(0, Number(cluster && cluster.family_count || 0));
    if (signalCount <= 1 && familyCount <= 1) return 'low';
    if (score >= Math.max(3, maxScore * 0.66)) return 'hot';
    if (score >= Math.max(2, maxScore * 0.34)) return 'medium';
    return 'low';
  }
  function clusterTimeBounds(cluster) {
    const start = Math.max(0, Number(cluster && cluster.start_sec || 0));
    const rawEnd = Math.max(start + 18, Number(cluster && cluster.end_sec || start + 45));
    return { start, end: Math.min(duration, rawEnd), center: Math.min(duration, Math.max(0, (start + rawEnd) / 2)) };
  }
  function heatmapProfileSamples(scored) {
    const sampleCount = HEATMAP_PROFILE_SAMPLE_COUNT;
    const smoothingSec = Math.max(120, Math.min(420, duration * 0.018));
    const samples = Array.from({ length: sampleCount }, (_, index) => {
      const sec = duration * (index / Math.max(1, sampleCount - 1));
      let value = 0;
      scored.forEach((row) => {
        const bounds = row.bounds || clusterTimeBounds(row.cluster);
        const halfWidth = Math.max(45, (bounds.end - bounds.start) / 2);
        const radius = smoothingSec + halfWidth;
        const distance = Math.abs(sec - bounds.center);
        if (distance > radius) return;
        const influence = 1 - (distance / radius);
        value += row.score * influence * influence;
      });
      return { sec, value };
    });
    const maxValue = Math.max(1, ...samples.map((sample) => sample.value));
    return samples.map((sample) => ({ sec: sample.sec, value: sample.value, normalized: sample.value / maxValue }));
  }
  function heatmapAreaPath(samples) {
    if (!samples.length) return '';
    const points = samples.map((sample, index) => {
      const x = (index / Math.max(1, samples.length - 1)) * 1000;
      const y = 42 - (Math.max(0, Math.min(1, sample.normalized)) * 34);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M0,44 L${points.join(' L')} L1000,44 Z`;
  }
  function heatmapLinePath(samples) {
    if (!samples.length) return '';
    return samples.map((sample, index) => {
      const x = (index / Math.max(1, samples.length - 1)) * 1000;
      const y = 42 - (Math.max(0, Math.min(1, sample.normalized)) * 34);
      return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
  function heatmapVisualZones(scored, maxScore) {
    const baseZoneRadiusSec = Math.max(140, Math.min(420, duration * 0.014));
    const minDistanceSec = Math.max(180, Math.min(540, duration * 0.018));
    const selected = [];
    const candidates = scored
      .map((row) => ({ ...row, bounds: row.bounds || clusterTimeBounds(row.cluster) }))
      .sort((a, b) => b.score - a.score);
    candidates.forEach((candidate) => {
      if (selected.length >= MAX_PROMINENT_HEAT_ZONES) return;
      const tooClose = selected.some((zone) => Math.abs(zone.center - candidate.bounds.center) < minDistanceSec);
      const heatClass = clusterHeatClass(candidate.cluster, candidate.score, maxScore);
      if (tooClose || (heatClass === 'low' && selected.length >= MIN_PROMINENT_HEAT_ZONES)) return;
      const strengthRatio = Math.max(0.24, Math.min(1, candidate.score / Math.max(1, maxScore)));
      const zoneRadiusSec = baseZoneRadiusSec * (0.68 + (strengthRatio * 0.72));
      const zoneStart = Math.max(0, candidate.bounds.center - zoneRadiusSec);
      const zoneEnd = Math.min(duration, candidate.bounds.center + zoneRadiusSec);
      const related = candidates.filter((row) => {
        const centerDistance = Math.abs(row.bounds.center - candidate.bounds.center);
        return centerDistance <= zoneRadiusSec || (row.bounds.start <= zoneEnd && row.bounds.end >= zoneStart);
      });
      const familyKeys = Array.from(new Set(related.flatMap((row) => clusterFamilyKeys(row.cluster)))).filter(Boolean);
      const relatedSignalCount = related.reduce((sum, row) => sum + Math.max(0, Number(row.cluster && row.cluster.signal_count || 0)), 0);
      selected.push({
        cluster: candidate.cluster,
        index: candidate.index,
        score: candidate.score,
        heatClass,
        center: candidate.bounds.center,
        start: zoneStart,
        end: zoneEnd,
        familyKeys,
        relatedCount: related.length,
        relatedSignalCount,
      });
    });
    return selected.sort((a, b) => a.start - b.start);
  }
  function renderHeatmapOverviewRow() {
    const clusters = renderableEditPointClusters();
    if (!clusters.length) {
      return `<div class="viewer-editor-density-row" data-real-heatmap-row="true"><div class="viewer-editor-density-label"><strong>먼저 볼 구간</strong><span>겹친 신호 없음</span></div><div class="viewer-editor-density"><div class="viewer-editor-empty">표시할 열 구간이 없습니다.</div></div></div>`;
    }
    const scored = clusters.map((cluster, index) => ({ cluster, index, score: clusterHeatScore(cluster), bounds: clusterTimeBounds(cluster) }));
    const maxScore = Math.max(1, ...scored.map((row) => row.score));
    const profileSamples = heatmapProfileSamples(scored);
    const zones = heatmapVisualZones(scored, maxScore);
    const areaPath = heatmapAreaPath(profileSamples);
    const linePath = heatmapLinePath(profileSamples);
    const zoneButtons = zones.map((zone, index) => {
      const { cluster, score } = zone;
      const clusterId = editPointClusterId(cluster);
      const start = Math.max(0, zone.start);
      const end = Math.min(duration, zone.end);
      const left = Math.max(0, Math.min(100, (start / duration) * 100));
      const width = Math.max(2.2, Math.min(100 - left, ((end - start) / duration) * 100));
      const signalCount = Math.max(0, Number(cluster.signal_count || 0));
      const familyCount = Math.max(0, Number(cluster.family_count || 0));
      const viewerClipCount = Math.max(0, Number(cluster.viewer_clip_count || 0));
      const familyKeys = zone.familyKeys.length ? zone.familyKeys : clusterFamilyKeys(cluster);
      const heatClass = zone.heatClass;
      const title = `${fmt(zone.center)} ${clusterFamilyText(cluster)} 열 구간 · 묶음 ${zone.relatedCount}개 · 신호 ${zone.relatedSignalCount || signalCount}개 · 자료 ${familyKeys.length || familyCount}종 · 클립 ${viewerClipCount}개`;
      const selected = selectedEventId === `edit_point_cluster_${clusterId}`;
      return `<button type="button" class="viewer-editor-heatmap-zone ${heatClass}${selected ? ' selected' : ''}" data-real-heatmap-zone="true" data-heatmap-prominent-zone="true" data-heatmap-zone-visual="hit-target" data-edit-point-cluster-id="${esc(clusterId)}" data-overview-rank="${index + 1}" data-overview-strength="${esc(heatClass)}" data-cluster-signal-count="${signalCount}" data-cluster-family-count="${familyCount}" data-cluster-viewer-clip-count="${viewerClipCount}" data-cluster-signal-families="${esc(familyKeys.join(' '))}" data-heatmap-zone-related-count="${zone.relatedCount}" data-sec="${Math.round(zone.center)}" aria-label="${esc(`${fmt(zone.center)} 먼저 볼 열 구간. ${title}. 클릭하면 근거 펼침`)}" title="${esc(`${title} · 클릭하면 근거 펼침`)}" style="left:${left}%;width:${width}%"></button>`;
    }).join('');
    const surface = `<svg class="viewer-editor-heatmap-surface" viewBox="0 0 1000 44" preserveAspectRatio="none" aria-hidden="true" data-real-heatmap-surface="true" data-heatmap-area="true" data-heatmap-profile-samples="${profileSamples.length}"><defs><linearGradient id="viewerEditorHeatmapGradient" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="rgba(122,162,247,0.10)"/><stop offset="58%" stop-color="rgba(224,175,104,0.36)"/><stop offset="100%" stop-color="rgba(247,118,142,0.70)"/></linearGradient></defs><path class="heatmap-fill" d="${areaPath}"></path><path class="heatmap-line" d="${linePath}"></path></svg>`;
    const legend = '<span class="low">약함</span><span class="medium">중간</span><span class="hot">강함</span>';
    return `<div class="viewer-editor-density-row" data-real-heatmap-row="true" data-heatmap-zone-count="${zones.length}" data-heatmap-background-density="true"><div class="viewer-editor-density-label"><strong>먼저 볼 구간</strong><span>겹친 신호는 봉우리로, 약한 신호는 배경 밀도로 표시</span><div class="viewer-editor-heatmap-legend" aria-label="열지도 강도 범례">${legend}</div></div><div class="viewer-editor-density viewer-editor-heatmap-track" aria-label="전체 방송 편집 후보 열지도">${surface}${zoneButtons}</div></div>`;
  }
  function renderAxis(options = {}) {
    const filter = filterEl ? filterEl.value : '';
    const visibleEvents = filter ? events.filter((event) => event.kind === filter) : events;
    const visibleSceneEvents = eventsForDensity(visibleEvents);
    renderedAxisEvents = new Map();
    const preservedScrollLeft = options.preserveScroll ? axisEl.scrollLeft : null;
    const timelineWidth = Math.max(96, Math.round(baseTimelineWidth * timelineZoom));
    const visibleRange = currentVisibleTimeRange(timelineWidth);
    const visibleBuckets = buckets.filter((row) => bucketOverlapsRange(row, visibleRange));
    const globalMaxChat = maxChatCount(buckets);
    const visibleMaxChat = maxChatCount(visibleBuckets.length ? visibleBuckets : buckets);
    const densityScaleLabel = buckets.length
      ? `현재 화면 최대 ${visibleMaxChat}개 / 전체 방송 최대 ${globalMaxChat}개 · ${buckets.length}개`
      : '채팅 데이터 없음';
    const densityBars = buckets.map((row) => {
      const start = Number(row.start_sec || 0);
      const end = Number(row.end_sec || start + 30);
      const left = Math.max(0, Math.min(100, (start / duration) * 100));
      const width = Math.max(0.25, Math.min(100 - left, ((end - start) / duration) * 100));
      const countInfo = chatBucketCount(row);
      const chatCount = countInfo.count;
      const h = chatCount > 0 ? Math.max(5, Math.round((chatCount / visibleMaxChat) * 30)) : 0;
      const globalH = chatCount > 0 ? Math.max(1, Math.round((chatCount / globalMaxChat) * 30)) : 0;
      const hot = Number(row.reaction_count || 0) > 0;
      const stateClass = densityBucketClass(chatCount, countInfo.missing, visibleMaxChat, hot);
      const stateText = countInfo.missing ? '채팅 수 미확인' : chatCount > 0 ? `채팅 ${chatCount}개` : '채팅 0개';
      const scaleText = `현재 화면 기준 최대 ${visibleMaxChat}개, 전체 방송 기준 최대 ${globalMaxChat}개`;
      return `<button type="button" class="viewer-editor-density-bar ${stateClass}" data-sec="${start}" aria-label="${esc(`${fmt(start)} ${stateText}. ${scaleText}`)}" title="${esc(`${fmt(start)} ${stateText} · ${scaleText}`)}" style="left:${left}%;width:${width}%"><span style="--bar-h:${h}px;--global-h:${globalH}px"></span></button>`;
    }).join('');
    const laneRows = lanes.map((lane) => {
      const kind = lane.key;
      if (filter && filter !== kind) return '';
      const laneAllEvents = visibleEvents.filter((event) => event.kind === kind);
      const densityEvents = laneEventsForDensity(kind, laneAllEvents, visibleEvents);
      const laneEvents = clusterLaneEvents(kind, densityEvents);
      const emptyText = lane.empty_reason || lane.reason || lane.message || '표시할 장면 없음';
      const markers = laneEvents.map((event) => {
        const start = Math.max(0, Number(event.start_sec || 0));
        const end = event.end_sec != null ? Number(event.end_sec) : NaN;
        const left = Math.max(0, Math.min(100, (start / duration) * 100));
        const hasRange = Number.isFinite(end) && end > start + 1;
        const width = hasRange ? Math.max(0.75, Math.min(100 - left, ((end - start) / duration) * 100)) : 0;
        const colorStyle = `--viewer-marker-color:${markerColor(kind)}`;
        const style = hasRange ? `left:${left}%;width:${width}%;${colorStyle}` : `left:${left}%;${colorStyle}`;
        const clusterCount = Number(event.clip_cluster_count || 0);
        const clusterAttrs = clusterCount > 1 ? ` data-cluster-count="${clusterCount}" aria-label="${esc(`${fmt(start)} 시청자 클립 ${clusterCount}개 묶음`)}"` : '';
        const clusterClass = clusterCount > 1 ? ' clip-cluster' : '';
        renderedAxisEvents.set(String(event.id || ''), event);
        return `<button type="button" class="viewer-editor-marker ${hasRange ? 'range' : ''}${clusterClass}" data-kind="${esc(kind)}" data-event-id="${esc(event.id)}"${clusterAttrs} title="${esc(`${fmt(start)} ${friendlyEventTitle(event) || ''}`)}" style="${style}"></button>`;
      }).join('');
      const hiddenCount = Math.max(0, laneAllEvents.length - densityEvents.length);
      const clusterCount = kind === 'viewer_clip' ? laneEvents.length : 0;
      const laneCountText = hiddenCount ? `${densityEvents.length}/${laneAllEvents.length}개 표시` : kind === 'viewer_clip' && clusterCount !== laneAllEvents.length ? `${clusterCount}묶음 · ${laneAllEvents.length}개` : `${laneEvents.length}개`;
      return `<div class="viewer-editor-lane-row" data-kind-row="${esc(kind)}" data-lane-status="${esc(lane.status || '')}"><div class="viewer-editor-lane-label"><strong>${esc(optionLabel(kind))}</strong><span>${esc(lanePurpose(kind))} · ${laneCountText}</span></div><div class="viewer-editor-track">${markers || `<div class="viewer-editor-empty">${esc(emptyText)}</div>`}</div></div>`;
    }).join('');
    axisEl.innerHTML = `<div class="viewer-editor-axis-canvas">
      <div class="viewer-editor-scale-row"><div class="viewer-editor-scale-label"><strong>전체 흐름</strong><span>${fmt(duration)}</span></div><div class="viewer-editor-scale">${renderScale()}</div></div>
      ${renderHeatmapOverviewRow()}
      ${renderWaveformRow()}
      <div class="viewer-editor-density-row"><div class="viewer-editor-density-label"><strong>전체 채팅량</strong><span>${densityScaleLabel}</span></div><div class="viewer-editor-density">${densityBars || '<div class="viewer-editor-empty">채팅 데이터 없음</div>'}</div></div>
      ${laneRows || '<div class="viewer-editor-empty">표시할 장면 데이터가 없습니다.</div>'}
    </div>`;
    if (densityValue) densityValue.textContent = markerDensityLabel();
    if (countEl) countEl.textContent = `표시 중인 장면 후보 ${visibleSceneEvents.length}/${visibleEvents.length}개 · 메모용 컷 후보 ${Number(preview.clip_count || 0)}개`;
    const canvas = axisEl.querySelector('.viewer-editor-axis-canvas');
    if (canvas) canvas.style.setProperty('--viewer-editor-w', `${timelineWidth}px`);
    if (preservedScrollLeft != null) axisEl.scrollLeft = preservedScrollLeft;
    axisEl.removeEventListener('scroll', scheduleDensityScaleRefresh);
    axisEl.addEventListener('scroll', scheduleDensityScaleRefresh, { passive: true });
    axisEl.querySelectorAll('[data-event-id]').forEach((marker) => {
      marker.classList.toggle('selected', marker.dataset.eventId === selectedEventId);
      marker.addEventListener('click', () => {
        const event = renderedAxisEvents.get(String(marker.dataset.eventId || '')) || events.find((item) => item.id === marker.dataset.eventId);
        syncSplitEditorSeek(event && event.start_sec, event);
        renderEvidence(event || null);
      });
    });
    axisEl.querySelectorAll('[data-edit-point-cluster-id]').forEach((marker) => {
      marker.classList.toggle('selected', selectedEventId === `edit_point_cluster_${marker.dataset.editPointClusterId || ''}`);
      marker.addEventListener('click', () => {
        const event = editPointClusterEvent(String(marker.dataset.editPointClusterId || ''));
        if (event) {
          event.heatmap_zone_families = String(marker.dataset.clusterSignalFamilies || '').split(/\s+/).filter(Boolean);
          event.heatmap_zone_related_count = Number(marker.dataset.heatmapZoneRelatedCount || 0);
        }
        syncSplitEditorSeek(event && event.start_sec, event);
        renderEvidence(event || null);
      });
    });
    axisEl.querySelectorAll('[data-sec]').forEach((bar) => {
      if (bar.dataset.editPointClusterId) return;
      bar.addEventListener('click', () => {
        const sec = Number(bar.dataset.sec || 0);
        syncSplitEditorSeek(sec);
        renderEvidence({ start_sec: sec, kind: 'chat', kind_label: '전체 채팅량', title: '전체 채팅량', evidence: [] });
      });
    });
  }
  function renderEvidence(event) {
    if (!event || typeof event !== 'object') {
      const introEl = document.getElementById('viewerEditorEvidenceIntro');
      if (introEl) introEl.hidden = false;
      evidenceEl.innerHTML = '<div class="viewer-editor-empty">장면 찾기에서 시각을 선택하면 근거가 여기에 표시됩니다.</div>';
      return;
    }
    const sec = Number(event && event.start_sec);
    if (!Number.isFinite(sec)) {
      const introEl = document.getElementById('viewerEditorEvidenceIntro');
      if (introEl) introEl.hidden = false;
      evidenceEl.innerHTML = '<div class="viewer-editor-empty">장면 찾기에서 시각을 선택하면 근거가 여기에 표시됩니다.</div>';
      return;
    }
    if (event.kind === 'edit_point_cluster') {
      renderEditPointClusterEvidence(event, sec);
      return;
    }
    const introEl = document.getElementById('viewerEditorEvidenceIntro');
    if (introEl) introEl.hidden = true;
    syncSplitEditorSeek(sec, event);
    selectedEventId = String(event.id || '');
    axisEl.querySelectorAll('[data-event-id]').forEach((marker) => marker.classList.toggle('selected', marker.dataset.eventId === selectedEventId));
    axisEl.querySelectorAll('[data-edit-point-cluster-id]').forEach((marker) => marker.classList.remove('selected'));
    const clusterEvents = event.kind === 'viewer_clip' ? clipClusterEvents(event) : [];
    const clusterEventIds = clusterEventIdSet(clusterEvents);
    const nearbyEvents = events
      .filter((row) => near(row, sec, 45) && !clusterEventIds.has(String(row && row.id || '')))
      .slice(0, 8);
    const nearbyBuckets = buckets.filter((row) => near(row, sec, 45)).slice(0, 5);
    const nearbySubtitles = subtitles.filter((row) => near(row, sec, 45)).slice(0, 6);
    const selectedTitleText = selectedTitle(event, sec);
    const selectedClipLink = event.kind === 'viewer_clip' ? viewerClipLinkInfo(clusterEvents.concat(nearbyEvents), clusterEvents[0] || event) : { uid: '', url: '', title: '' };
    const evidenceTargets = evidenceTargetsForEvent(event, sec);
    const clusterEvidenceRows = clusterEvents.length > 1 ? clipRowsForCluster(clusterEvents) : [];
    const extraEvidenceRows = []
      .concat((event.evidence || []).map((item) => {
        const rawLabel = String(item.label || '').trim();
        const label = event.kind === 'audio_peak' ? '소리 변화 근거' : friendlyEvidenceLabel(rawLabel || '근거');
        let text = friendlyEvidenceText(label, item.text || '');
        if (event.kind === 'audio_peak' && (!text || text === '보조 신호입니다. 장면 판단은 자막이나 기존 요약과 함께 보세요.')) {
          text = '소리 변화가 감지된 참고 구간입니다. 자막과 화면 흐름으로 쓸 장면인지 확인하세요.';
        }
        const ownUrl = event.kind === 'viewer_clip' ? clipUrl(rawLabel) : '';
        const url = ownUrl || selectedClipLink.url;
        if (url && (!text || text.includes('시청자 클립에서 잡힌 위치') || text.includes('구조화된 참고 신호'))) {
          text = selectedClipLink.title || selectedTitleText || '시청자 클립 열기';
        }
        const row = { label, text, clipUid: rawLabel || selectedClipLink.uid, clipUrl: url };
        ['start_sec', 'sec', 'seek_sec', 'end_sec', 'end_seek_sec', 'video_no', 'source_video_no', 'vod_label', 'timecode'].forEach((key) => {
          if (item && item[key] != null && item[key] !== '') row[key] = item[key];
        });
        return row;
      }))
      .concat(nearbyEvents.filter((row) => row.id !== event.id).map((row) => ({
        label: row.vod_label ? `${row.vod_label} · ${optionLabel(row.kind)}` : optionLabel(row.kind),
        sec: row.start_sec,
        seek_sec: row.seek_sec,
        video_no: row.video_no,
        vod_label: row.vod_label,
        timecode: row.timecode,
        text: isTimeOnlyTitle(row.title, row.start_sec) || friendlyEventTitle(row) === selectedTitleText ? '' : friendlyEventTitle(row)
      })))
      .filter((row) => row.text)
      .slice(0, 10);
    const evidenceRows = clusterEvidenceRows.concat(extraEvidenceRows);
    const summaryStatus = selectedSummaryStatus(event, nearbyEvents);
    const guidanceRows = Array.isArray(event.guidance) && event.guidance.length
      ? event.guidance
      : fallbackGuidance(event.kind);
    const guidanceHtml = guidanceRows.map((row) => `<div class="viewer-editor-row reason"><strong>${esc(row.title)}</strong><br>${esc(row.text)}</div>`).join('');
    const selectedColor = markerColor(event.kind);
    const kindLabel = optionLabel(event.kind);
    const titleMatchesKind = selectedTitleText === kindLabel;
    const chipRows = [timeChip(sec, event)];
    if (summaryStatus.label === kindLabel) {
      chipRows.push(`<span class="viewer-editor-chip ${summaryStatus.warning ? 'warning' : ''}">${esc(summaryStatus.label)}</span>`);
    } else if (summaryStatus.label === '요약에 포함됨' && (event.kind === 'timeline' || event.kind === 'existing_segments')) {
      chipRows.push(`<span class="viewer-editor-chip">${esc(summaryStatus.label)}</span>`);
    } else if (titleMatchesKind) {
      chipRows.push(`<span class="viewer-editor-chip ${summaryStatus.warning ? 'warning' : ''}">${esc(summaryStatus.label)}</span>`);
    } else {
      chipRows.push(`<span class="viewer-editor-chip">${esc(kindLabel)}</span>`);
      chipRows.push(`<span class="viewer-editor-chip ${summaryStatus.warning ? 'warning' : ''}">${esc(summaryStatus.label)}</span>`);
    }
    evidenceEl.innerHTML = `<div class="viewer-editor-selected-card" style="--viewer-marker-color:${esc(selectedColor)}">
      <span class="viewer-editor-selected-kicker">장면 찾기에서 선택한 항목</span>
      <div class="viewer-editor-selected-title">${esc(selectedTitleText)}</div>
      <div class="viewer-editor-selected-meta">
        ${chipRows.join('')}
      </div>
    </div>
    ${renderEvidenceTargetPicker(evidenceTargets, sec)}
    ${renderContextSummary(nearbySubtitles, nearbyBuckets)}
    ${guidanceHtml}
    ${seekUrl(sec, event) ? `<div class="viewer-editor-row"><strong>원본 확인</strong><br><a href="${esc(seekUrl(sec, event))}" target="_blank" rel="noopener" style="color:var(--tc)">치지직에서 이 시각 열기</a></div>` : ''}
    <div class="viewer-editor-list">${evidenceRows.map(renderEvidenceRow).join('') || '<div class="viewer-editor-empty">근처 근거가 없습니다.</div>'}</div>`;
    evidenceEl.querySelectorAll('[data-evidence-target-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-evidence-target-index'));
        const target = evidenceTargets[index];
        if (!target || !target.row) return;
        renderEvidence(target.row);
      });
    });
  }
  function renderCuts() {
    const clips = Array.isArray(preview.clips) ? preview.clips : [];
    const failures = preview.validation && Array.isArray(preview.validation.failures) ? preview.validation.failures : [];
    const memoText = clipMemoText(clips);
    const edlText = publicEdlText();
    const copyText = memoText || edlText;
    const rows = clips.slice(0, 12).map((clip, index) => {
      const duration = Math.max(0, Math.floor(Number(clip.end_sec || 0) - Number(clip.start_sec || 0)));
      const start = displayTime(clip, clip.start_sec);
      const end = clip && clip.end_seek_sec != null
        ? displayTime({ ...clip, seek_sec: clip.end_seek_sec }, clip.end_sec)
        : displayTime(clip, clip.end_sec);
      return `<div class="viewer-editor-row"><strong>${esc(clipTitle(clip, index + 1))}</strong><br>${esc(start)}-${esc(end)} · ${duration}초</div>`;
    }).join('');
    const status = failures.length ? '일부 후보는 시각이나 길이를 다시 확인해야 합니다.' : '자동 편집이나 업로드는 하지 않습니다. 사람이 확인할 시간표만 제공합니다.';
    const jsonText = JSON.stringify(preview.otio || preview || {}, null, 2);
    cutsEl.innerHTML = `<div class="viewer-editor-summary">
      <div class="viewer-editor-stat"><span>상태</span><strong>${esc(friendlyPreviewStatus(preview.status))}</strong></div>
      <div class="viewer-editor-stat"><span>컷 수</span><strong>${Number(preview.clip_count || clips.length || 0)}</strong></div>
      <div class="viewer-editor-stat"><span>기준</span><strong>${esc(friendlyPreviewSource(preview.source))}</strong></div>
    </div>
    <div class="viewer-editor-row">${esc(status)}</div>
    <div class="viewer-editor-confirm">
      <label for="viewerEditorCutConfirm"><input id="viewerEditorCutConfirm" type="checkbox" ${cutlistConfirmed ? 'checked' : ''} ${!copyText && (!jsonText || jsonText === '{}') ? 'disabled' : ''}>컷 후보 시간을 눈으로 확인했습니다</label>
      <span>이 확인은 복사 버튼만 켭니다. 영상 생성, 업로드, 저장, 공개 배포는 실행하지 않습니다.</span>
    </div>
    <div class="viewer-editor-list">${rows || '<div class="viewer-editor-empty">표시할 컷이 없습니다.</div>'}</div>
    ${clips.length > 12 ? `<div class="viewer-editor-empty">외 ${clips.length - 12}개 후보도 복사한 메모에 포함됩니다.</div>` : ''}`;
    const confirmEl = document.getElementById('viewerEditorCutConfirm');
    if (confirmEl) {
      confirmEl.addEventListener('change', () => {
        cutlistConfirmed = Boolean(confirmEl.checked);
        updateCutCopyButtons();
      });
    }
    updateCutCopyButtons();
  }
  function renderViewerEditorToolsNow() {
    if (axisRendered) return;
    axisRendered = true;
    renderFilter();
    renderAxis();
    renderCuts();
    if (events.length) {
      const initialCluster = events[0].kind === 'viewer_clip'
        ? renderedAxisEvents.get(`cluster_${viewerClipClusterKey(events[0])}`)
        : null;
      renderEvidence(initialCluster || events[0]);
    } else {
      renderEvidence(null);
    }
  }
  async function copyFromPre(preId, text, copiedMessage, emptyMessage, manualMessage) {
    if (!text) {
      if (copyStatus) copyStatus.textContent = emptyMessage;
      return;
    }
    const fallbackCopy = () => {
      const pre = document.getElementById(preId);
      if (pre) {
        const details = pre.closest('details');
        if (details) details.open = true;
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const ok = document.execCommand('copy');
        selection.removeAllRanges();
        return ok;
      }
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      temp.style.top = '0';
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(temp);
      return ok;
    };
    const selectManualCopyText = () => {
      const pre = document.getElementById(preId);
      if (!pre) return false;
      const details = pre.closest('details');
      if (details) details.open = true;
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        if (!fallbackCopy()) throw new Error('execCommand copy failed');
      }
      if (copyStatus) copyStatus.textContent = copiedMessage;
    } catch (_err) {
      if (fallbackCopy()) {
        if (copyStatus) copyStatus.textContent = copiedMessage;
      } else if (copyStatus) {
        const selected = selectManualCopyText();
        copyStatus.textContent = selected
          ? manualMessage
          : '브라우저가 복사를 막았습니다. 페이지 권한을 확인한 뒤 다시 시도해 주세요.';
      }
    }
  }
  function copyCuts() {
    if (!cutlistConfirmed) {
      if (copyStatus) copyStatus.textContent = '컷 후보 시간을 먼저 확인해 주세요.';
      return Promise.resolve();
    }
    return copyFromPre(
      'viewerEditorEdlText',
      currentCutMemoText(),
      '컷 후보 메모를 복사했습니다.',
      '복사할 컷 후보가 없습니다.',
      '브라우저가 복사를 막았습니다. 선택된 컷 후보 메모를 Ctrl+C로 복사해 주세요.'
    );
  }
  function copyJson() {
    if (!cutlistConfirmed) {
      if (copyStatus) copyStatus.textContent = '컷 후보 시간을 먼저 확인해 주세요.';
      return Promise.resolve();
    }
    return copyFromPre(
      'viewerEditorJsonText',
      currentCutJsonText(),
      '원본 데이터를 복사했습니다.',
      '복사할 원본 데이터가 없습니다.',
      '브라우저가 복사를 막았습니다. 선택된 원본 데이터를 Ctrl+C로 복사해 주세요.'
    );
  }
  cutsEl.innerHTML = '<div class="viewer-editor-empty">편집자 도구가 화면에 가까워지면 컷 목록을 불러옵니다.</div>';
  evidenceEl.innerHTML = '<div class="viewer-editor-empty">장면 찾기에서 시각을 선택하면 근거가 여기에 표시됩니다.</div>';
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        renderViewerEditorToolsNow();
        observer.disconnect();
      }
    }, { rootMargin: '600px 0px' });
    observer.observe(document.getElementById('youtube-editor-tools'));
  } else {
    window.setTimeout(renderViewerEditorToolsNow, 400);
  }
  document.querySelectorAll('a[href="#youtube-editor-tools"]').forEach((link) => {
    link.addEventListener('click', () => window.setTimeout(renderViewerEditorToolsNow, 0));
  });
  if (axisEl) {
    const handleZoomWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      applyTimelineZoom(timelineZoom * (event.deltaY < 0 ? 1.14 : 1 / 1.14), event.clientX);
    };
    axisEl.addEventListener('wheel', handleZoomWheel, { passive: false });
    const sectionEl = document.getElementById('youtube-editor-tools');
    if (sectionEl) sectionEl.addEventListener('wheel', handleZoomWheel, { passive: false });
  }
  if (zoomRange) zoomRange.addEventListener('input', () => applyTimelineZoom(Number(zoomRange.value || 100) / 100));
  if (densityRange) densityRange.addEventListener('input', () => {
    markerDensityLevel = Math.max(0, Math.min(10, Number(densityRange.value || 0)));
    renderAxis({ preserveScroll: true });
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => applyTimelineZoom(timelineZoom / 1.25));
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => applyTimelineZoom(timelineZoom * 1.25));
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => applyTimelineZoom(1));
  if (copyBtn) copyBtn.addEventListener('click', copyCuts);
  if (copyJsonBtn) copyJsonBtn.addEventListener('click', copyJson);
  }

  if (!dataSrc) {
    startViewerEditorTools(parseInlineData());
    return;
  }

  let started = false;
  const startOnce = async () => {
    if (started) return;
    started = true;
    loadMessage('장면 도구 데이터를 불러오는 중입니다. 요약 본문은 그대로 볼 수 있습니다.');
    try {
      const payload = await loadEditorToolsData();
      startViewerEditorTools(payload && typeof payload === 'object' ? payload : {});
    } catch (_err) {
      loadMessage('장면 도구 데이터를 불러오지 못했습니다. 요약 본문은 그대로 볼 수 있고, 페이지를 새로고침해 다시 시도할 수 있습니다.');
    }
  };
  loadMessage('장면 도구는 이 영역에 가까워지거나 클릭하면 불러옵니다.');
  const container = document.getElementById('youtube-editor-tools');
  if (container) container.addEventListener('click', startOnce, { once: true });
  if ('IntersectionObserver' in window && container) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        startOnce();
      }
    }, { rootMargin: '480px 0px' });
    observer.observe(container);
  } else {
    startOnce();
  }
}
document.addEventListener('DOMContentLoaded', initEditorSplitMode);
document.addEventListener('DOMContentLoaded', initEditorEntryState);
document.addEventListener('DOMContentLoaded', initViewerEditorTools);
