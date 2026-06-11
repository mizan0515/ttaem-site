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
    if (status) status.textContent = message;
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
    setEntryState('fallback', '닫힘');
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
        <iframe class="editor-split-frame" data-editor-chzzk-frame src="${chzzkUrl}" title="CHZZK 원본 방송 화면" allow="autoplay; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        <div class="editor-split-fallback">CHZZK가 iframe 재생을 제한하면 왼쪽의 새 탭 버튼으로 원본을 열고, 오른쪽 워크스페이스에서 컷 후보를 계속 확인합니다.</div>
      </div>
      <div class="editor-split-workspace" data-editor-split-workspace></div>
    `;
    shell.querySelector('[data-editor-split-workspace]').appendChild(workspace);
    shell.querySelector('[data-editor-split-close]').addEventListener('click', closeSplitEditorMode);
    document.body.appendChild(shell);
    document.body.classList.add('editor-split-active');
    setEntryState('fallback', '열림');
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
    if (statusEl) statusEl.textContent = message;
  };
  const target = document.getElementById('youtube-editor-tools');
  setState('loading', '준비 중');
  window.setTimeout(() => {
    if (entry.getAttribute('data-editor-entry-state') !== 'loading') return;
    if (target) {
      setState('fallback', '사용 가능');
    } else {
      setState('error', '워크스페이스 없음');
    }
  }, 0);
  if (primaryBtn) {
    primaryBtn.addEventListener('click', () => {
      setState('loading', '여는 중');
      window.setTimeout(() => {
        if (target) {
          setState('fallback', '열림');
        } else {
          setState('error', '열기 실패');
        }
      }, 180);
    });
  }
  window.addEventListener('chzzk-editor-extension-ready', () => {
    setState('installed', '확장 감지됨');
  });
  window.addEventListener('chzzk-editor-extension-missing', () => {
    setState('missing', '사용 가능');
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
  const lanes = Array.isArray(data.lanes) && data.lanes.length
    ? data.lanes.filter((lane) => lane && lane.key)
    : Array.from(new Set(events.map((event) => event.kind).filter(Boolean))).map((kind) => ({ key: kind, label: labelsMap[kind] || kind, event_count: events.filter((event) => event.kind === kind).length }));
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
  const baseTimelineWidth = Math.max(760, Math.min(1600, Math.round(duration / 22)));
  let timelineZoom = 1;
  let axisRendered = false;
  let selectedEventId = '';

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
  function timecodeToSec(value) {
    const parts = String(value || '').split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return NaN;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return NaN;
  }
  function linkTimecodesText(text) {
    const raw = String(text || '');
    const re = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
    let out = '';
    let last = 0;
    for (const match of raw.matchAll(re)) {
      out += esc(raw.slice(last, match.index));
      const sec = timecodeToSec(match[1]);
      const url = seekUrl(sec);
      out += url ? `<a class="viewer-editor-time-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(match[1])}</a>` : esc(match[1]);
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
    const label = row.sec != null ? `${esc(row.label || '근거')} · ${timeLink(row.sec, row)}` : linkTimecodesText(row.label || '근거');
    return `<div class="viewer-editor-row"><strong>${label}</strong><br>${linkTimecodesText(row.text || '')}</div>`;
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
    if (lowered.includes('asr segment') || lowered.includes('subtitle') || raw.includes('자막')) return '자막 근거';
    if (lowered.includes('chat_bucket') || raw.includes('채팅')) return raw.includes('대표') ? '대표 채팅 반응' : '채팅 반응';
    if (lowered.includes('viewer_clip') || raw.includes('클립')) return '시청자 클립';
    if (lowered.includes('audio') || raw.includes('오디오')) return '오디오 반응';
    if (lowered.includes('highlight_candidate')) return '자동 반응 후보';
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
    if (/^[{].*[}]$/.test(raw) || raw.includes("'source_type'") || raw.includes('"source_type"')) return '구조화된 참고 신호입니다. 장면 내용은 주변 자막과 요약으로 확인하세요.';
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
    return `<div class="viewer-editor-context-line"><span class="viewer-editor-context-time">${timeLink(row.start_sec, row)}</span><span class="viewer-editor-context-text">${linkTimecodesText(row.text || '')}</span></div>`;
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
          const sample = (row.samples || []).map((item) => item.text).filter(Boolean).slice(0, 3).join(' / ');
          return `<div class="viewer-editor-context-line"><span class="viewer-editor-context-time">${timeLink(row.start_sec, row)}</span><span class="viewer-editor-context-text">채팅 ${Number(row.count || 0)}개${sample ? ` · ${linkTimecodesText(sample)}` : ''}</span></div>`;
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
    const labelColumnWidth = 112;
    const oldWidth = Math.max(96, Math.round(baseTimelineWidth * timelineZoom));
    const anchorX = Number.isFinite(anchorClientX) ? anchorClientX : rect.left + rect.width / 2;
    const cursorX = Math.max(0, axisEl.scrollLeft + anchorX - rect.left - labelColumnWidth);
    const timeRatio = oldWidth ? Math.max(0, Math.min(1, cursorX / oldWidth)) : 0;
    timelineZoom = clampZoom(nextZoom);
    const nextWidth = Math.max(96, Math.round(baseTimelineWidth * timelineZoom));
    canvas.style.setProperty('--viewer-editor-w', `${nextWidth}px`);
    axisEl.scrollLeft = Math.max(0, timeRatio * nextWidth + labelColumnWidth - (anchorX - rect.left));
    if (zoomRange) zoomRange.value = String(Math.round(timelineZoom * 100));
    if (zoomValue) zoomValue.textContent = `${timelineZoom.toFixed(2)}x`;
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
    if (!waveformSamples.length) return '';
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
  function renderAxis() {
    const filter = filterEl ? filterEl.value : '';
    const visibleEvents = filter ? events.filter((event) => event.kind === filter) : events;
    const maxChat = Math.max(1, ...buckets.map((row) => Number(row.count || 0)));
    const densityBars = buckets.map((row) => {
      const start = Number(row.start_sec || 0);
      const end = Number(row.end_sec || start + 30);
      const left = Math.max(0, Math.min(100, (start / duration) * 100));
      const width = Math.max(0.25, Math.min(100 - left, ((end - start) / duration) * 100));
      const h = Math.max(3, Math.round((Number(row.count || 0) / maxChat) * 30));
      const hot = Number(row.reaction_count || 0) > 0;
      return `<button type="button" class="viewer-editor-density-bar ${hot ? 'hot' : ''}" data-sec="${start}" title="${fmt(start)} 채팅 ${Number(row.count || 0)}개" style="left:${left}%;width:${width}%"><span style="--bar-h:${h}px"></span></button>`;
    }).join('');
    const laneRows = lanes.map((lane) => {
      const kind = lane.key;
      if (filter && filter !== kind) return '';
      const laneEvents = visibleEvents.filter((event) => event.kind === kind);
      const markers = laneEvents.map((event) => {
        const start = Math.max(0, Number(event.start_sec || 0));
        const end = event.end_sec != null ? Number(event.end_sec) : NaN;
        const left = Math.max(0, Math.min(100, (start / duration) * 100));
        const hasRange = Number.isFinite(end) && end > start + 1;
        const width = hasRange ? Math.max(0.75, Math.min(100 - left, ((end - start) / duration) * 100)) : 0;
        const colorStyle = `--viewer-marker-color:${markerColor(kind)}`;
        const style = hasRange ? `left:${left}%;width:${width}%;${colorStyle}` : `left:${left}%;${colorStyle}`;
        return `<button type="button" class="viewer-editor-marker ${hasRange ? 'range' : ''}" data-kind="${esc(kind)}" data-event-id="${esc(event.id)}" title="${esc(`${fmt(start)} ${friendlyEventTitle(event) || ''}`)}" style="${style}"></button>`;
      }).join('');
      return `<div class="viewer-editor-lane-row" data-kind-row="${esc(kind)}"><div class="viewer-editor-lane-label"><strong>${esc(optionLabel(kind))}</strong><span>${esc(lanePurpose(kind))} · ${laneEvents.length}개</span></div><div class="viewer-editor-track">${markers || '<div class="viewer-editor-empty">표시할 장면 없음</div>'}</div></div>`;
    }).join('');
    axisEl.innerHTML = `<div class="viewer-editor-axis-canvas">
      <div class="viewer-editor-scale-row"><div class="viewer-editor-scale-label"><strong>전체 흐름</strong><span>${fmt(duration)}</span></div><div class="viewer-editor-scale">${renderScale()}</div></div>
      ${renderWaveformRow()}
      <div class="viewer-editor-density-row"><div class="viewer-editor-density-label"><strong>전체 채팅량</strong><span>채팅이 많이 몰린 구간 · ${buckets.length}개</span></div><div class="viewer-editor-density">${densityBars || '<div class="viewer-editor-empty">채팅 데이터 없음</div>'}</div></div>
      ${laneRows || '<div class="viewer-editor-empty">표시할 장면 데이터가 없습니다.</div>'}
    </div>`;
    if (countEl) countEl.textContent = `표시 중인 장면 후보 ${visibleEvents.length}개 · 메모용 컷 후보 ${Number(preview.clip_count || 0)}개`;
    const canvas = axisEl.querySelector('.viewer-editor-axis-canvas');
    if (canvas) canvas.style.setProperty('--viewer-editor-w', `${Math.max(96, Math.round(baseTimelineWidth * timelineZoom))}px`);
    axisEl.querySelectorAll('[data-event-id]').forEach((marker) => {
      marker.classList.toggle('selected', marker.dataset.eventId === selectedEventId);
      marker.addEventListener('click', () => {
        const event = events.find((item) => item.id === marker.dataset.eventId);
        syncSplitEditorSeek(event && event.start_sec, event);
        renderEvidence(event || null);
      });
    });
    axisEl.querySelectorAll('[data-sec]').forEach((bar) => {
      bar.addEventListener('click', () => {
        const sec = Number(bar.dataset.sec || 0);
        syncSplitEditorSeek(sec);
        renderEvidence({ start_sec: sec, kind: 'chat', kind_label: '전체 채팅량', title: '전체 채팅량', evidence: [] });
      });
    });
  }
  function renderEvidence(event) {
    const sec = Number(event && event.start_sec);
    if (!Number.isFinite(sec)) {
      const introEl = document.getElementById('viewerEditorEvidenceIntro');
      if (introEl) introEl.hidden = false;
      evidenceEl.innerHTML = '<div class="viewer-editor-empty">장면 찾기에서 시각을 선택하면 근거가 여기에 표시됩니다.</div>';
      return;
    }
    const introEl = document.getElementById('viewerEditorEvidenceIntro');
    if (introEl) introEl.hidden = true;
    syncSplitEditorSeek(sec, event);
    selectedEventId = String(event.id || '');
    axisEl.querySelectorAll('[data-event-id]').forEach((marker) => marker.classList.toggle('selected', marker.dataset.eventId === selectedEventId));
    const nearbyEvents = events.filter((row) => near(row, sec, 45)).slice(0, 8);
    const nearbyBuckets = buckets.filter((row) => near(row, sec, 45)).slice(0, 5);
    const nearbySubtitles = subtitles.filter((row) => near(row, sec, 45)).slice(0, 6);
    const selectedTitleText = selectedTitle(event, sec);
    const selectedClipLink = event.kind === 'viewer_clip' ? viewerClipLinkInfo([event].concat(nearbyEvents), event) : { uid: '', url: '', title: '' };
    const evidenceRows = []
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
        return { label, text, clipUid: rawLabel || selectedClipLink.uid, clipUrl: url };
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
    ${renderContextSummary(nearbySubtitles, nearbyBuckets)}
    ${guidanceHtml}
    ${seekUrl(sec, event) ? `<div class="viewer-editor-row"><strong>원본 확인</strong><br><a href="${esc(seekUrl(sec, event))}" target="_blank" rel="noopener" style="color:var(--tc)">치지직에서 이 시각 열기</a></div>` : ''}
    <div class="viewer-editor-list">${evidenceRows.map(renderEvidenceRow).join('') || '<div class="viewer-editor-empty">근처 근거가 없습니다.</div>'}</div>`;
  }
  function renderCuts() {
    const clips = Array.isArray(preview.clips) ? preview.clips : [];
    const failures = preview.validation && Array.isArray(preview.validation.failures) ? preview.validation.failures : [];
    const memoText = clipMemoText(clips);
    const edlText = publicEdlText();
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
    if (copyBtn) copyBtn.disabled = !memoText;
    if (copyJsonBtn) copyJsonBtn.disabled = !jsonText || jsonText === '{}';
    cutsEl.innerHTML = `<div class="viewer-editor-summary">
      <div class="viewer-editor-stat"><span>상태</span><strong>${esc(friendlyPreviewStatus(preview.status))}</strong></div>
      <div class="viewer-editor-stat"><span>컷 수</span><strong>${Number(preview.clip_count || clips.length || 0)}</strong></div>
      <div class="viewer-editor-stat"><span>기준</span><strong>${esc(friendlyPreviewSource(preview.source))}</strong></div>
    </div>
    <div class="viewer-editor-row">${esc(status)}</div>
    <div class="viewer-editor-list">${rows || '<div class="viewer-editor-empty">표시할 컷이 없습니다.</div>'}</div>
    ${clips.length > 12 ? `<div class="viewer-editor-empty">외 ${clips.length - 12}개 후보도 복사한 메모에 포함됩니다.</div>` : ''}`;
  }
  function renderViewerEditorToolsNow() {
    if (axisRendered) return;
    axisRendered = true;
    renderFilter();
    renderAxis();
    renderCuts();
    if (events.length) renderEvidence(events[0]); else renderEvidence(null);
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
    return copyFromPre(
      'viewerEditorEdlText',
      clipMemoText(Array.isArray(preview.clips) ? preview.clips : []) || publicEdlText(),
      '컷 후보 메모를 복사했습니다.',
      '복사할 컷 후보가 없습니다.',
      '브라우저가 복사를 막았습니다. 선택된 컷 후보 메모를 Ctrl+C로 복사해 주세요.'
    );
  }
  function copyJson() {
    return copyFromPre(
      'viewerEditorJsonText',
      JSON.stringify(preview.otio || preview || {}, null, 2),
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
