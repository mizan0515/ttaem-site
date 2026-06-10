(() => {
  const ACG = {};

  const qs = new URLSearchParams(location.search);

  function fetchJson(path) {
    return fetch(path, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`${path} → ${r.status}`);
        return r.json();
      });
  }

  function secToHms(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d)) return iso;
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function vodReportHref(videoNo) {
    return `vods/${encodeURIComponent(videoNo)}/report`;
  }

  function bundleReportHref(bundleId) {
    return `bundles/${encodeURIComponent(bundleId)}/report`;
  }

  function highlight(text, needle) {
    const safe = escapeHtml(text);
    if (!needle) return safe;
    const n = needle.trim();
    if (!n) return safe;
    try {
      const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      return safe.replace(re, (m) => `<mark>${m}</mark>`);
    } catch {
      return safe;
    }
  }

  function setKpi(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function fmtRelative(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      if (!Number.isFinite(diff) || diff < 0) return fmtDate(iso);
      const min = Math.floor(diff / 60000);
      if (min < 1) return "방금";
      if (min < 60) return min + "분 전";
      const hr = Math.floor(min / 60);
      if (hr < 24) return hr + "시간 전";
      const day = Math.floor(hr / 24);
      if (day < 30) return day + "일 전";
      return fmtDate(iso);
    } catch {
      return iso;
    }
  }

  // --- 헬퍼: 디바운스 / URL 파라미터 / 클립보드 / 토스트 ---
  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function setUrlParam(key, val) {
    const url = new URL(location.href);
    if (val == null || val === "") url.searchParams.delete(key);
    else url.searchParams.set(key, val);
    history.replaceState(null, "", url);
  }

  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(s);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = s;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  let _toastTimer = null;
  function showToast(msg) {
    let t = document.querySelector(".toast");
    if (t) t.remove();
    t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(t);
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      t.classList.add("is-leaving");
      setTimeout(() => t.remove(), 220);
    }, 1800);
  }

  // --- 인라인 SVG (재사용; lucide 호환 좌표계, 13px) ---
  const ICON = {
    cal:  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.4 12 18.1 5.8 21.4 7 14.5 2 9.6 8.9 8.6 12 2"/></svg>',
    share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  };

  // --- 홈: KPI + 최근 업데이트 피드 + 스트리머 그리드 ---
  ACG.renderStreamerIndex = function () {
    const listEl = document.getElementById("streamer-list");
    const emptyEl = document.getElementById("empty");
    const recentEl = document.getElementById("recent-strip");
    const recentSec = document.getElementById("recent-section");

    fetchJson("index.json")
      .then((idx) => {
        setKpi("kpi-streamers", Number(idx.total_streamers || 0).toLocaleString());
        setKpi("kpi-vods", Number(idx.total_vods || 0).toLocaleString());
        setKpi("kpi-updated", fmtRelative(idx.generated_at));

        if (!idx.streamers || idx.streamers.length === 0) {
          emptyEl.hidden = false;
          if (recentSec) recentSec.hidden = true;
          return;
        }

        // 스트리머 카드: 최근 방송 시각 + VOD 편수 + 플랫폼
        listEl.innerHTML = idx.streamers
          .map((s) => {
            const last = s.last_vod_at
              ? `<span class="meta-dot">·</span><span class="meta-recent">최근 방송 ${escapeHtml(fmtRelative(s.last_vod_at))}</span>`
              : "";
            return `
<li class="streamer-card">
  <a href="streamer.html?s=${encodeURIComponent(s.streamer_id)}">
    <div class="name">${escapeHtml(s.streamer_name || s.streamer_id)}</div>
    <div class="meta">${escapeHtml(s.platform)} · VOD ${s.vod_count}편${last}</div>
  </a>
</li>`;
          })
          .join("");

        // 최근 업데이트 피드 — index.json 의 recent_vods 우선,
        // 없으면 search-index 에서 published_at 정렬로 5개 샘플링.
        if (recentEl && recentSec) {
          const renderRecent = (rows) => {
            const top = rows
              .slice()
              .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
              .slice(0, 5);
            if (!top.length) { recentSec.hidden = true; return; }
            recentEl.innerHTML = top.map((r) => `
<li class="recent-card">
  <a href="${vodReportHref(r.video_no)}">
    <span class="recent-card-streamer">${escapeHtml(r.streamer_name || r.streamer_id || "")}</span>
    <div class="recent-card-title">${escapeHtml(r.title || "(제목 없음)")}</div>
    <div class="recent-card-meta">
      <span>${escapeHtml(fmtRelative(r.published_at))}</span>
      ${r.duration_sec ? `<span class="dot">·</span><span>${escapeHtml(secToHms(r.duration_sec))}</span>` : ""}
    </div>
  </a>
</li>`).join("");
            recentSec.hidden = false;
          };

          if (Array.isArray(idx.recent_vods) && idx.recent_vods.length) {
            renderRecent(idx.recent_vods);
          } else {
            // fallback: 검색 인덱스에서 가져옴 (구 빌드 호환)
            fetchJson("search-index.json")
              .then((rows) => Array.isArray(rows) ? renderRecent(rows) : null)
              .catch(() => { recentSec.hidden = true; });
          }
        }
      })
      .catch((e) => {
        emptyEl.hidden = false;
        emptyEl.textContent = "스트리머 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";
        if (recentSec) recentSec.hidden = true;
        console.warn("renderStreamerIndex failed:", e);
      });
  };

  // --- 스트리머 상세 — 정렬 segmented + 카테고리 필터 ---
  let _streamerVods = [];
  let _streamerSort = "newest";
  let _streamerCategory = "";

  function renderStreamerVodList(sid) {
    const listEl = document.getElementById("vod-list");
    const countEl = document.getElementById("list-count");

    let rows = _streamerVods.slice();
    if (_streamerCategory) {
      rows = rows.filter((v) => (v.platform_category || "") === _streamerCategory);
    }
    if (_streamerSort === "newest") {
      rows.sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
    } else if (_streamerSort === "oldest") {
      rows.sort((a, b) => String(a.published_at || "").localeCompare(String(b.published_at || "")));
    } else if (_streamerSort === "longest") {
      rows.sort((a, b) => Number(b.duration_sec || 0) - Number(a.duration_sec || 0));
    } else if (_streamerSort === "chats") {
      rows.sort((a, b) => Number(b.stats?.total_chats || 0) - Number(a.stats?.total_chats || 0));
    }

    if (countEl) {
      countEl.textContent = _streamerCategory
        ? `${rows.length}편 (전체 ${_streamerVods.length}편 중)`
        : `${rows.length}편`;
    }

    listEl.innerHTML = rows.map((v) => `
<li class="vod-row">
  <a href="${vodReportHref(v.video_no)}">
    <div class="title">${escapeHtml(v.title || "(제목 없음)")}</div>
    <div class="meta">
      <span class="meta-item">${ICON.cal}<span>${escapeHtml(fmtDate(v.published_at))}</span></span>
      <span class="meta-item">${ICON.clock}<span>${escapeHtml(secToHms(v.duration_sec))}</span></span>
      ${v.platform_category ? `<span class="meta-cat">${escapeHtml(v.platform_category)}</span>` : ""}
      <span class="meta-item is-emphasis">${ICON.chat}<span>${Number(v.stats?.total_chats || 0).toLocaleString()}</span></span>
      ${Number(v.stats?.highlight_count || 0) > 0
        ? `<span class="meta-item is-warm">${ICON.star}<span>${Number(v.stats.highlight_count)}</span></span>`
        : ""}
    </div>
  </a>
</li>`).join("");
  }

  function bindStreamerControls(sid) {
    const segGroup = document.getElementById("sort-segmented");
    if (segGroup) {
      segGroup.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          _streamerSort = btn.dataset.sort || "newest";
          segGroup.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
          setUrlParam("sort", _streamerSort === "newest" ? "" : _streamerSort);
          renderStreamerVodList(sid);
        });
      });
    }
  }

  function renderCategoryFilter(sid, vods) {
    const wrap = document.getElementById("category-filter");
    const chipsEl = document.getElementById("category-filter-chips");
    if (!wrap || !chipsEl) return;
    const counts = new Map();
    vods.forEach((v) => {
      const k = v.platform_category || "";
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    if (counts.size <= 1) { wrap.hidden = true; return; }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const html = [
      `<button type="button" class="filter-chip${_streamerCategory === "" ? " is-active" : ""}" data-cat="">전체 <span class="chip-count">${vods.length}</span></button>`,
      ...ranked.map(([cat, n]) => `<button type="button" class="filter-chip${_streamerCategory === cat ? " is-active" : ""}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)} <span class="chip-count">${n}</span></button>`),
    ].join("");
    chipsEl.innerHTML = html;
    wrap.hidden = false;
    chipsEl.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        _streamerCategory = btn.dataset.cat || "";
        chipsEl.querySelectorAll(".filter-chip").forEach((b) =>
          b.classList.toggle("is-active", b === btn));
        setUrlParam("cat", _streamerCategory);
        renderStreamerVodList(sid);
      });
    });
  }

  ACG.renderStreamerDetail = function () {
    const sid = qs.get("s");
    const nameEl = document.getElementById("streamer-name");
    const metaEl = document.getElementById("streamer-meta");
    const emptyEl = document.getElementById("empty");
    const controlsEl = document.getElementById("list-controls");

    // URL 에서 정렬 / 카테고리 복원
    _streamerSort = qs.get("sort") || "newest";
    _streamerCategory = qs.get("cat") || "";

    if (!sid) {
      nameEl.textContent = "스트리머가 선택되지 않았습니다";
      emptyEl.hidden = false;
      return;
    }

    fetchJson(`streamers/${encodeURIComponent(sid)}/index.json`)
      .then((doc) => {
        const s = doc.streamer;
        nameEl.textContent = s.streamer_name || s.streamer_id;
        metaEl.textContent = `${s.platform} · VOD ${s.vod_count}편`;
        if (!doc.vods || doc.vods.length === 0) {
          emptyEl.hidden = false;
          return;
        }
        _streamerVods = doc.vods;

        // KPI mini row
        const totalChats = _streamerVods.reduce(
          (sum, v) => sum + Number(v.stats?.total_chats || 0), 0);
        const latest = _streamerVods.map((v) => v.published_at).filter(Boolean).sort().pop();
        const kpiRow = document.getElementById("kpi-row");
        if (kpiRow) {
          setKpi("kpi-vod-count", Number(_streamerVods.length).toLocaleString());
          setKpi("kpi-chat-total", Number(totalChats).toLocaleString());
          setKpi("kpi-last-vod", fmtRelative(latest));
          kpiRow.hidden = false;
        }

        // 정렬 segmented 활성 표시 (URL 복원)
        const segGroup = document.getElementById("sort-segmented");
        if (segGroup) {
          segGroup.querySelectorAll("button").forEach((b) =>
            b.setAttribute("aria-pressed", String((b.dataset.sort || "newest") === _streamerSort)));
        }

        if (controlsEl) controlsEl.hidden = false;
        bindStreamerControls(sid);
        renderCategoryFilter(sid, _streamerVods);
        renderStreamerVodList(sid);
      })
      .catch((e) => {
        nameEl.textContent = "스트리머 정보를 불러오지 못했습니다";
        emptyEl.hidden = false;
        emptyEl.textContent = "잠시 후 다시 시도해 주세요.";
        console.warn("renderStreamerDetail failed:", e);
      });
  };

  // --- VOD 상세 — 공유 + 이전/다음 ---
  function renderVodNav(rec, sid, vno) {
    const navEl = document.getElementById("vod-nav");
    if (!navEl || !sid) return;
    fetchJson(`streamers/${encodeURIComponent(sid)}/index.json`)
      .then((doc) => {
        const list = (doc.vods || []).slice().sort(
          (a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
        const idx = list.findIndex((v) => String(v.video_no) === String(vno));
        if (idx < 0) return;
        const newer = idx > 0 ? list[idx - 1] : null;     // 더 최근
        const older = idx < list.length - 1 ? list[idx + 1] : null;
        const parts = [];
        if (newer) {
          parts.push(`<a class="icon-button" href="${vodReportHref(newer.video_no)}" title="${escapeHtml(newer.title || "")}">← 다음 방송</a>`);
        }
        if (older) {
          parts.push(`<a class="icon-button" href="${vodReportHref(older.video_no)}" title="${escapeHtml(older.title || "")}">이전 방송 →</a>`);
        }
        if (parts.length) {
          navEl.insertAdjacentHTML("beforeend", parts.join(""));
        }
      })
      .catch(() => { /* nav optional */ });
  }

  ACG.renderVodDetail = function () {
    const vno = qs.get("v");
    const sid = qs.get("s") || "";
    const titleEl = document.getElementById("vod-title");
    const metaEl = document.getElementById("vod-meta");
    const emptyEl = document.getElementById("empty");
    const backEl = document.getElementById("backlink");
    const navEl = document.getElementById("vod-nav");

    const fromParam = qs.get("from") || "";
    const qParam = qs.get("q") || "";
    if (fromParam === "search") {
      const qs2 = qParam ? `?q=${encodeURIComponent(qParam)}` : "";
      backEl.href = `search.html${qs2}`;
      backEl.textContent = qParam ? `← 검색 "${qParam}"` : "← 검색";
    } else if (sid) {
      backEl.href = `streamer.html?s=${encodeURIComponent(sid)}`;
      backEl.textContent = "← 스트리머 페이지";
    }

    if (!vno) {
      titleEl.textContent = "방송이 선택되지 않았습니다";
      emptyEl.hidden = false;
      return;
    }

    fetchJson(`vods/${encodeURIComponent(vno)}/index.json`)
      .then((rec) => {
        titleEl.textContent = rec.title || `VOD ${vno}`;
        metaEl.innerHTML = `
          <span class="streamer-chip">${escapeHtml(rec.streamer_name || rec.streamer_id)}</span>
          ${escapeHtml(fmtDate(rec.published_at))} ·
          ${escapeHtml(secToHms(rec.duration_sec))}
          ${rec.platform_category ? ` · ${escapeHtml(rec.platform_category)}` : ""}
        `;
        const reportHref = rec.summary_html_path
          ? String(rec.summary_html_path).replace(/report\.html$/, "report")
          : vodReportHref(vno);
        const target = reportHref + (location.hash || "");
        const statusEl = document.getElementById("redirect-status");
        if (statusEl) {
          statusEl.innerHTML = `리포트로 이동 중입니다. 자동으로 이동하지 않으면 <a href="${escapeHtml(target)}">여기를 눌러 열어 주세요</a>.`;
        }

        // 액션: 공유 / 직접 열기. 이동 직전에도 키보드 사용자에게 복구 경로를 제공한다.
        if (navEl) {
          navEl.innerHTML = `
            <a class="icon-button" href="${escapeHtml(target)}">리포트 열기</a>
            <button type="button" class="icon-button" id="share-btn" aria-label="이 페이지 링크 복사">
              ${ICON.share}<span>링크 복사</span>
            </button>`;
          navEl.hidden = false;
          const btn = document.getElementById("share-btn");
          btn.addEventListener("click", () => {
            copyText(location.href).then(() => {
              btn.classList.add("is-success");
              btn.innerHTML = `${ICON.check}<span>복사됨</span>`;
              showToast("링크를 복사했습니다");
              setTimeout(() => {
                btn.classList.remove("is-success");
                btn.innerHTML = `${ICON.share}<span>링크 복사</span>`;
              }, 1800);
            }).catch(() => showToast("복사에 실패했습니다"));
          });
        }
        setTimeout(() => {
          location.replace(target);
        }, 0);
      })
      .catch((e) => {
        titleEl.textContent = "방송 정보를 불러오지 못했습니다";
        emptyEl.hidden = false;
        emptyEl.textContent = "리포트 파일이 아직 준비되지 않았거나 삭제되었을 수 있습니다.";
        console.warn("renderVodDetail failed:", e);
      });
  };

  // --- 검색 ---
  let _searchCache = null;
  function loadSearchIndex() {
    if (_searchCache) return Promise.resolve(_searchCache);
    return fetchJson("search-index.json").then((rows) => {
      _searchCache = rows;
      return rows;
    });
  }

  let _activeStreamerFilter = "";

  function renderSearchResults(allHits, query) {
    const resEl = document.getElementById("search-results");
    const metaEl = document.getElementById("search-meta");
    const filterEl = document.getElementById("streamer-filter");
    const chipsEl = document.getElementById("streamer-filter-chips");
    const discoverEl = document.getElementById("search-discover");
    if (discoverEl) discoverEl.hidden = true;

    const counts = new Map();
    allHits.forEach((r) => {
      const key = r.streamer_id || "";
      const name = r.streamer_name || key;
      const cur = counts.get(key) || { name, count: 0 };
      cur.count += 1;
      counts.set(key, cur);
    });
    const ranked = [...counts.entries()]
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count);

    if (filterEl && chipsEl) {
      if (ranked.length > 1) {
        const chipHtml = [
          `<button type="button" class="filter-chip${_activeStreamerFilter === "" ? " is-active" : ""}" data-sid="">전체 <span class="chip-count">${allHits.length}</span></button>`,
          ...ranked.map((r) => `<button type="button" class="filter-chip${_activeStreamerFilter === r.id ? " is-active" : ""}" data-sid="${escapeHtml(r.id)}">${escapeHtml(r.name)} <span class="chip-count">${r.count}</span></button>`),
        ].join("");
        chipsEl.innerHTML = chipHtml;
        filterEl.hidden = false;
        chipsEl.querySelectorAll(".filter-chip").forEach((btn) => {
          btn.addEventListener("click", () => {
            _activeStreamerFilter = btn.dataset.sid || "";
            setUrlParam("sid", _activeStreamerFilter);
            renderSearchResults(allHits, query);
          });
        });
      } else {
        filterEl.hidden = true;
        chipsEl.innerHTML = "";
      }
    }

    const filtered = _activeStreamerFilter
      ? allHits.filter((r) => (r.streamer_id || "") === _activeStreamerFilter)
      : allHits;

    metaEl.textContent = _activeStreamerFilter
      ? `"${query}" 에 대해 ${filtered.length}건 (전체 ${allHits.length}건 중).`
      : `"${query}" 에 대해 ${allHits.length}건.`;

    resEl.innerHTML = filtered
      .map((r) => {
        const snippets = (r._snippets || [])
          .map((s) => `<div class="search-snippet">${highlight(s, query)}</div>`)
          .join("");
        const isBundle = r.kind === "bundle";
        const href = isBundle
          ? bundleReportHref(r.bundle_id)
          : vodReportHref(r.video_no);
        const kindBadge = isBundle ? '<span class="meta-cat">번들</span>' : "";
        return `
<li class="vod-row">
  <a href="${href}">
    <div class="title">${highlight(r.title || "(제목 없음)", query)}</div>
    <div class="meta">
      <span class="streamer-chip">${escapeHtml(r.streamer_name || r.streamer_id)}</span>
      <span class="meta-item">${ICON.cal}<span>${escapeHtml(fmtDate(r.published_at))}</span></span>
      ${kindBadge}
    </div>
    ${snippets}
  </a>
</li>`;
      })
      .join("");
  }

  function renderDiscoverChips(rows) {
    const discoverEl = document.getElementById("search-discover");
    if (!discoverEl) return;
    const counts = new Map();
    rows.forEach((r) => {
      const k = r.streamer_id || "";
      const n = r.streamer_name || k;
      const cur = counts.get(k) || { name: n, count: 0 };
      cur.count += 1;
      counts.set(k, cur);
    });
    if (counts.size === 0) { discoverEl.hidden = true; return; }
    const ranked = [...counts.entries()]
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    discoverEl.innerHTML = `
      <div class="search-discover-label">탐색 시작</div>
      <div class="streamer-filter-chips">
        ${ranked.map((r) =>
          `<button type="button" class="filter-chip" data-discover="${escapeHtml(r.name)}">${escapeHtml(r.name)} <span class="chip-count">${r.count}</span></button>`
        ).join("")}
      </div>`;
    discoverEl.hidden = false;
    discoverEl.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.discover || "";
        const input = document.getElementById("search-input");
        input.value = v;
        setUrlParam("q", v);
        runSearch(v);
      });
    });
  }

  function runSearch(query) {
    const q = (query || "").trim().toLowerCase();
    const resEl = document.getElementById("search-results");
    const metaEl = document.getElementById("search-meta");
    const filterEl = document.getElementById("streamer-filter");
    const discoverEl = document.getElementById("search-discover");
    resEl.innerHTML = "";
    if (filterEl) filterEl.hidden = true;

    if (!q) {
      metaEl.textContent = "검색어를 입력해 주세요. 자주 찾는 스트리머를 누르면 빠르게 시작할 수 있습니다.";
      _activeStreamerFilter = "";
      // 발견 칩
      loadSearchIndex().then(renderDiscoverChips).catch(() => {
        if (discoverEl) discoverEl.hidden = true;
      });
      return;
    }
    if (discoverEl) discoverEl.hidden = true;

    loadSearchIndex().then((rows) => {
      const hits = [];
      rows.forEach((r) => {
        const hayParts = [r.streamer_name || "", r.title || "", r.search_text || ""];
        const hay = hayParts.join(" | ").toLowerCase();
        if (hay.includes(q)) {
          const fragments = (r.search_text || "").split(" | ");
          const matched = fragments.filter((f) => f.toLowerCase().includes(q)).slice(0, 4);
          hits.push({ ...r, _snippets: matched });
        }
      });
      renderSearchResults(hits, query);
    }).catch((e) => {
      metaEl.textContent = `검색 인덱스를 불러오지 못했습니다: ${e.message}`;
    });
  }

  ACG.renderSearch = function () {
    const input = document.getElementById("search-input");
    const form = document.getElementById("search-form");
    const initial = qs.get("q") || "";
    _activeStreamerFilter = qs.get("sid") || "";
    if (initial) input.value = initial;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value;
      setUrlParam("q", v);
      runSearch(v);
    });

    // 디바운스 입력 — 200KB 인덱스 대비 250ms
    const debounced = debounce(() => {
      _activeStreamerFilter = "";
      setUrlParam("sid", "");
      setUrlParam("q", input.value);
      runSearch(input.value);
    }, 250);
    input.addEventListener("input", debounced);

    // 키보드 단축키: "/" 로 검색창 포커스 (다른 페이지에서도 동작)
    runSearch(initial);
  };

  // --- 전역 키보드 단축키 ---
  document.addEventListener("keydown", (e) => {
    const target = e.target;
    const isField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (e.key === "/" && !isField && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const onSearch = location.pathname.endsWith("/search.html") || location.pathname.endsWith("/search");
      if (onSearch) {
        const input = document.getElementById("search-input");
        if (input) { e.preventDefault(); input.focus(); input.select(); }
      } else {
        e.preventDefault();
        location.href = "search.html";
      }
    }
  });

  window.ACG = ACG;
})();
