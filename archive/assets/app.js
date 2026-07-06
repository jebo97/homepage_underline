// 베스트셀러 아카이브 — 정적 프론트엔드 (Supabase 직접 호출)
// 기존 Next.js 서버 컴포넌트 로직을 브라우저용으로 포팅.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 공개(anon) 키 — 클라이언트 노출용. 데이터 보호는 Supabase RLS(읽기 전용)가 담당.
const SUPABASE_URL = "https://xvizopylegaghrcecjgl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2aXpvcHlsZWdhZ2hyY2VjamdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTk2NTIsImV4cCI6MjA5Nzk5NTY1Mn0.sm4s_hGNKHWBTZZZEd2MCTtrbO0R2a7wPtIvQ_1P6Zg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const START_YEAR = 2006;
const END_YEAR = 2026;
const APP_STORE_URL = "https://apps.apple.com/kr/app/id6760542925";
const HOME_URL = "/"; // 메인 홈페이지 (mjgg.airpage.org)

// 홈 통계 카드용 라인 아이콘(인라인 SVG, 선 색은 CSS color=--accent). 이미지 대신 사용.
const _ICON = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const STAT_ICONS = {
  // 굽이진 책길 + 이정표 점 + 작은 잎
  path: _ICON(`<path d="M6.5 20c3.5 0 2-4.5 5-5.5s2-4 4.5-5.5"/><circle cx="6.5" cy="20" r="1.5" fill="currentColor" stroke="none"/><path d="M15.6 9.9c-.1-2.1 1.5-3.8 3.7-3.8.1 2.1-1.5 3.8-3.7 3.8z" fill="currentColor" stroke="none"/>`),
  // 동글동글 체크리스트(기록)
  records: _ICON(`<circle cx="6" cy="7" r="1.3" fill="currentColor" stroke="none"/><path d="M10 7h9"/><circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><path d="M10 12h9"/><circle cx="6" cy="17" r="1.3" fill="currentColor" stroke="none"/><path d="M10 17h6"/>`),
  // 통통한 펼친 책
  book: _ICON(`<path d="M12 7.5C10 6 7 6 5 7.1v9.6c2-1.1 5-1.1 7 .3 2-1.4 5-1.4 7-.3V7.1C17 6 14 6 12 7.5Zm0 0v9.4"/>`),
  // 귀여운 잎사귀(숲)
  leaf: _ICON(`<path d="M6 18.5C6 11.3 10.6 6.2 18 6c.2 7.2-4.8 12.3-12 12.5Z"/><path d="M7 17.5C10.3 14.3 13.6 10.8 16.5 8.2"/>`),
};

// 섹션 제목용 라인 아이콘(제목 앞 작은 마크)
const HEAD_ICONS = {
  bookmark: _ICON(`<path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.8L6 20V5.5a1 1 0 0 1 1-1z"/>`),
  chart: _ICON(`<path d="M5 5v14h14"/><path d="M9 15.5v-3M13 15.5v-6.5M17 15.5v-4"/>`),
  leaf: _ICON(`<path d="M6 18.5C6 11.3 10.6 6.2 18 6c.2 7.2-4.8 12.3-12 12.5Z"/><path d="M7 17.5C10.3 14.3 13.6 10.8 16.5 8.2"/>`),
  book: _ICON(`<path d="M12 7.5C10 6 7 6 5 7.1v9.6c2-1.1 5-1.1 7 .3 2-1.4 5-1.4 7-.3V7.1C17 6 14 6 12 7.5Zm0 0v9.4"/>`),
  together: _ICON(`<path d="M12 3.5l7.5 3.8-7.5 3.8-7.5-3.8z"/><path d="M4.5 12l7.5 3.8 7.5-3.8"/><path d="M4.5 16.4l7.5 3.8 7.5-3.8"/>`),
  star: _ICON(`<path d="M12 4.4l2.2 4.6 5 .5-3.7 3.4 1 4.9L12 19.9 7.5 22.4l1-4.9-3.7-3.4 5-.5z"/>`),
  pen: _ICON(`<path d="M4 20l1-3.6L15.6 5.8a2 2 0 0 1 2.8 2.8L7.6 19z"/><path d="M13.6 7.8l2.8 2.8"/>`),
  quote: _ICON(`<path d="M9 7C6.6 7 5 9 5 11.4s1.6 3.6 3.6 3.3C8.6 17 7.4 18.3 5.6 18.8M19 7c-2.4 0-4 2-4 4.4s1.6 3.6 3.6 3.3C18.6 17 17.4 18.3 15.6 18.8"/>`),
};
// 섹션 제목 HTML (아이콘 + 텍스트)
function sh(key, text) {
  const ic = HEAD_ICONS[key] ? `<span class="sh-ic" aria-hidden="true">${HEAD_ICONS[key]}</span>` : "";
  return `<h2 class="section-heading">${ic}${text}</h2>`;
}

// 숫자 카운트업(0→목표). reduced-motion/미지원이면 호출되지 않고 최종값이 그대로 보임.
function countUp(el) {
  const to = Number(el.dataset.to);
  if (!isFinite(to)) return;
  const dur = 1500, t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = to.toLocaleString();
  };
  requestAnimationFrame(step);
}
// 스크롤 등장(fade-up) + 진입 시 카운트업/막대 성장 트리거
function initReveal() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;  // 그대로 표시
  document.documentElement.classList.add("js-reveal");
  const targets = [...document.querySelectorAll(
    "main .section-pad, main .stats-grid, main .section-years, main .section-longstay, main .book-road-cta")];
  if (!targets.length) return;
  const revealNow = (el) => {
    if (el.classList.contains("reveal-in")) return;
    el.classList.add("reveal-in");
    el.querySelectorAll(".stat-num[data-to]").forEach(countUp);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      revealNow(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
  targets.forEach((t) => t.classList.add("reveal"));
  // 이미 화면에 보이는 섹션은 즉시 등장, 나머지는 스크롤 시 등장(관찰).
  requestAnimationFrame(() => {
    const vh = window.innerHeight || 800;
    targets.forEach((t) => {
      if (t.getBoundingClientRect().top < vh * 0.92) revealNow(t);
      else io.observe(t);
    });
  });
  // 안전장치: 어떤 이유로든 안 걸린 섹션도 일정 시간 뒤 반드시 표시.
  setTimeout(() => targets.forEach(revealNow), 1600);
}

// ---------- 카테고리 정규화 (categories.ts 포팅) ----------
const FIELD_CATEGORIES = [
  "소설", "에세이", "인문", "역사문화",
  "경제경영", "자기계발", "정치사회", "교양과학",
];
const CATEGORY_ALIASES = { 비소설: "에세이", 인문과학: "인문" };
function normalizeCategory(category) {
  const dehyphenated = (category || "").replace(/-/g, "");
  return CATEGORY_ALIASES[dehyphenated] ?? dehyphenated;
}

// ---------- 공용 유틸 ----------
// 상세 페이지(책·연도·저자·출판사)의 canonical / og:url / og:title / description 를
// 실제 콘텐츠에 맞춰 갱신(구글은 JS 렌더 후 이 값을 색인에 사용).
function setPageMeta({ title, description } = {}) {
  const url = location.href.split("#")[0];
  const set = (sel, attr, val) => {
    let el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement(sel.startsWith("link") ? "link" : "meta");
      if (sel.startsWith("link")) el.setAttribute("rel", "canonical");
      else if (sel.includes("property")) el.setAttribute("property", sel.match(/"([^"]+)"/)[1]);
      else el.setAttribute("name", sel.match(/"([^"]+)"/)[1]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };
  set('link[rel="canonical"]', "href", url);
  set('meta[property="og:url"]', "content", url);
  if (title) {
    document.title = title;
    set('meta[property="og:title"]', "content", title);
  }
  if (description) {
    set('meta[name="description"]', "content", description);
    set('meta[property="og:description"]', "content", description);
  }
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
function bookHref(title) {
  return `book.html?title=${encodeURIComponent(title)}`;
}
function yearHref(year) {
  return `year.html?y=${year}`;
}
function authorHref(name) {
  return `author.html?name=${encodeURIComponent(name)}`;
}
// 저자명을 저자 페이지 링크로. 빈 값이면 "저자 미상" 텍스트.
function authorLink(name, cls = "") {
  if (!name) return `<span${cls ? ` class="${cls}"` : ""}>저자 미상</span>`;
  return `<a${cls ? ` class="${cls}"` : ""} href="${esc(authorHref(name))}">${esc(name)}</a>`;
}
function stripTags(s) {
  return String(s ?? "").replace(/<[^>]+>/g, "");
}
function publisherHref(name) {
  return `publisher.html?name=${encodeURIComponent(name)}`;
}
// 출판사명을 출판사 페이지 링크로. 빈 값이면 링크 없이 텍스트만.
function publisherLink(name, cls = "") {
  if (!name) return "";
  return `<a${cls ? ` class="${cls}"` : ""} href="${esc(publisherHref(name))}">${esc(name)}</a>`;
}

// PostgREST 1000행 제한 대응 페이지네이션
async function fetchAll(buildQuery) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) { console.error(error.message); break; }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

// ---------- 공통 레이아웃 (nav / source footer) ----------
function searchFormHTML(variant, value = "") {
  const searchButtonContent = `<span class="search-label">검색</span><svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="7"></circle><line x1="15.8" y1="15.8" x2="21" y2="21"></line></svg>`;
  if (variant === "small") {
    return `<form class="search-form small" action="search.html" method="get">
      <input class="search-input" type="search" name="q" value="${esc(value)}" placeholder="검색" aria-label="책 제목, 저자 검색" />
      <button class="search-btn" type="submit" aria-label="검색">${searchButtonContent}</button>
    </form>`;
  }
  return `<form class="search-form large" action="search.html" method="get">
    <input class="search-input" type="search" name="q" value="${esc(value)}" placeholder="제목·작가·출판사로 찾아보세요" aria-label="책 제목, 저자, 출판사 검색" />
    <button class="search-btn" type="submit">${searchButtonContent}</button>
  </form>`;
}

function renderNav() {
  const el = document.getElementById("site-nav");
  if (!el) return;
  el.className = "nav";
  const page = document.body.dataset.page;
  const homeActive = page === "home";
  const authorsActive = page === "authors" || page === "author";
  const publishersActive = page === "publishers" || page === "publisher";
  el.innerHTML = `<div class="nav-inner">
    <div class="nav-links">
      <a class="nav-link${homeActive ? " is-active" : ""}" href="index.html"${homeActive ? ' aria-current="page"' : ""}>문장숲 책길</a>
      <a class="nav-link${authorsActive ? " is-active" : ""}" href="authors.html"${authorsActive ? ' aria-current="page"' : ""}>작가의 숲</a>
      <a class="nav-link${publishersActive ? " is-active" : ""}" href="publishers.html"${publishersActive ? ' aria-current="page"' : ""}>출판사의 정원</a>
    </div>
    ${searchFormHTML("small")}
  </div>`;

  const searchForm = el.querySelector(".search-form.small");
  const searchInput = searchForm?.querySelector(".search-input");
  const searchButton = searchForm?.querySelector(".search-btn");
  searchButton?.addEventListener("click", (event) => {
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    if (searchForm.classList.contains("is-open")) return;
    event.preventDefault();
    searchForm.classList.add("is-open");
    window.requestAnimationFrame(() => searchInput?.focus());
  });
  searchForm?.addEventListener("submit", () => {
    searchForm.classList.remove("is-open");
  });
  document.addEventListener("click", (event) => {
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    if (!searchForm?.classList.contains("is-open")) return;
    if (searchForm.contains(event.target)) return;
    searchForm.classList.remove("is-open");
  });

  // 실제 네비 높이를 측정해 hero 높이 계산(--nav-h)에 사용 (기기·폰트별 편차 보정)
  const setNavHeight = () => {
    const h = el.getBoundingClientRect().height;
    if (h) document.documentElement.style.setProperty("--nav-h", `${Math.round(h)}px`);
  };
  setNavHeight();
  window.addEventListener("resize", setNavHeight);
  if (document.fonts?.ready) document.fonts.ready.then(setNavHeight);
}

function renderSourceFooter() {
  const el = document.getElementById("site-source-footer");
  if (!el) return;
  el.className = "source-footer";
  el.innerHTML = `베스트셀러 데이터 출처: <a href="https://www.kyobobook.co.kr/" target="_blank" rel="noopener noreferrer">교보문고</a> (https://www.kyobobook.co.kr/)`;
}

function ctaFooterHTML({ narrow = false, text, label, href }) {
  return `<footer class="cta-footer">
    <div class="cta-inner${narrow ? " narrow" : ""}">
      <p class="cta-text">${esc(text)}</p>
      <a class="cta-btn" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>
    </div>
  </footer>`;
}

// 문장숲 책길 공용 CTA (home/year 와 동일 디자인). 페이지 하단 공통 사용.
function bookRoadCtaHTML({
  title = "마음이 멈춘 책을 발견했다면,<br />이제 밑줄로 남겨보세요.",
  sub = "밑줄이 모여, 나만의 문장숲이 됩니다.",
} = {}) {
  return `<section class="book-road-cta">
    <div class="wrap wrap-5xl">
      <div class="book-road-cta-card">
        <div>
          <p class="cta-kicker">Underline Your Sentence</p>
          <p class="cta-title">${title}</p>
          <p class="cta-sub">${esc(sub)}</p>
          <a class="cta-btn" href="${esc(HOME_URL)}">밑줄긋기에서 기록하기</a>
        </div>
        <div class="cta-still-life">
          <img src="/archive/images/note-card-cta.jpg" alt="문장 카드와 노트 이미지" loading="lazy" onerror="this.hidden=true" />
        </div>
      </div>
    </div>
  </section>`;
}

// 첫 화면 외 페이지용 — 은근한 한 줄 CTA
function slimCtaHTML() {
  return `<div class="wrap wrap-3xl">
    <p class="slim-cta">
      <a class="slim-cta-link" href="${esc(HOME_URL)}">마음이 멈춘 책이라면, <strong>밑줄긋기</strong>에서 남겨보세요</a>
    </p>
  </div>`;
}

// ====================================================================
// 홈
// ====================================================================
async function getYearRanking(year) {
  const { data, error } = await supabase
    .from("bestsellers")
    .select("title, author")
    .eq("year", year)
    .eq("category", "종합")
    .limit(1000);
  if (error) { console.error(`${year} 종합 조회 실패:`, error.message); return []; }
  const counts = new Map();
  for (const r of data ?? []) {
    const key = `${r.title}|${r.author ?? ""}`;
    const entry = counts.get(key);
    if (entry) entry.weeks += 1;
    else counts.set(key, { book: r, weeks: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.weeks - a.weeks || a.book.title.localeCompare(b.book.title))
    .map((e) => ({ ...e.book, weeks: e.weeks }));
}

async function getLongStayBooks() {
  const rows = await fetchAll(() => supabase
    .from("bestsellers")
    .select("title, author, publisher")
    .eq("category", "종합"));
  return aggregate(rows).slice(0, 5);
}

// 홈 통계·연도범위를 DB에서 자동 계산 (데이터 추가 시 코드 수정 없이 갱신)
let _maxYearCache = null;
async function getMaxYear() {
  if (_maxYearCache) return _maxYearCache;
  const { data } = await supabase.from("bestsellers").select("year").order("year", { ascending: false }).limit(1);
  _maxYearCache = (data && data[0] && data[0].year) || END_YEAR;
  return _maxYearCache;
}
async function getTotalRows() {
  const { count } = await supabase.from("bestsellers").select("*", { count: "exact", head: true });
  return count || 0;
}

async function renderHome() {
  const root = document.getElementById("page-root");
  document.title = "문장숲 책길";
  const maxYear = await getMaxYear();
  const years = Array.from({ length: maxYear - START_YEAR + 1 }, (_, i) => START_YEAR + i);
  const [rankings, longStayBooks, totalRows] = await Promise.all([
    Promise.all(years.map((y) => getYearRanking(y))),
    getLongStayBooks(),
    getTotalRows(),
  ]);

  // 대표작 선정 (page.tsx 알고리즘 포팅)
  let prevTopTitle = null;
  let prevShownTitle = null;
  let shownInRun = new Set();
  const topBooks = rankings.map((ranking) => {
    const trueTop = ranking[0]?.title ?? null;
    const continuesRun = trueTop !== null && trueTop === prevTopTitle;
    if (!continuesRun) shownInRun = new Set();
    const chosen =
      ranking.find((b) => !shownInRun.has(b.title) && b.title !== prevShownTitle) ??
      ranking[0] ?? null;
    if (chosen) shownInRun.add(chosen.title);
    prevTopTitle = trueTop;
    prevShownTitle = chosen?.title ?? null;
    return chosen;
  });

  const spanYears = maxYear - START_YEAR + 1;
  const rowsLabel = (totalRows || 0).toLocaleString();
  const longestWeeks = longStayBooks[0]?.weeks ?? 0;
  const STATS = [
    { num: spanYears, unit: "년", name: `${spanYears}년의 책길`, desc: "2006년부터 이어진 독서의 흐름", icon: "path" },
    { num: (totalRows || 0), unit: "", name: `${rowsLabel}개의 책길 기록`, desc: "주간 베스트셀러 데이터", icon: "records" },
    { num: longestWeeks, unit: "주", name: "가장 오래 머문 책", desc: "최장 차트인 기록", icon: "book" },
    { num: 8, unit: "개", name: "8갈래의 숲길", desc: "분야별 독서 흐름", icon: "leaf" },
  ];

  const statsHTML = STATS.map((s) => `
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">${STAT_ICONS[s.icon] ?? ""}</span>
      <div class="stat-value"><span class="stat-num" data-to="${s.num}">${s.num.toLocaleString()}</span><span class="stat-unit">${esc(s.unit)}</span></div>
      <div class="stat-name">${esc(s.name)}</div>
      <div class="stat-label">${esc(s.desc)}</div>
    </div>`).join("");

  const yearsHTML = years.map((year, i) => {
    const book = topBooks[i];
    const titleHTML = book
      ? `<a class="book-title line-clamp-2" href="${esc(bookHref(book.title))}">${esc(book.title)}</a>`
      : `<span class="book-title line-clamp-2">아직 기록이 없어요</span>`;
    return `
      <div class="year-card">
        <span class="dot"></span>
        <a class="year-num" href="${esc(yearHref(year))}">${year}</a>
        ${eraFor(year, maxYear) ? `<span class="year-era">${esc(eraFor(year, maxYear))}</span>` : ""}
        ${titleHTML}
        <span class="book-author line-clamp-1">${esc(book?.author ?? "—")}</span>
        ${book ? `<span class="year-weeks">${book.weeks}주 차트인</span>` : ""}
      </div>`;
  }).join("");

  const longStayHTML = longStayBooks.map((book, index) => `
    <a class="longstay-card${index === 0 ? " longstay-card-featured" : ""}" href="${esc(bookHref(book.title))}">
      <span class="longstay-head">
        <span class="longstay-rank">${index + 1}</span>
        ${index === 0 ? `<span class="longstay-badge">가장 오래 머문 책</span>` : ""}
      </span>
      <span class="longstay-title line-clamp-2">${esc(book.title)}</span>
      <span class="longstay-author line-clamp-1">${esc(book.author ?? "저자 미상")}</span>
      <span class="longstay-weeks">${book.weeks}주 차트인</span>
    </a>`).join("");

  root.innerHTML = `
    <main class="book-road-home">
      <div class="wrap wrap-5xl">
        <header class="home-header">
          <div class="home-copy">
            <p class="hero-eyebrow">ARCHIVE</p>
            <h1 class="page-title">문장숲 책길</h1>
            <p class="hero-lead">많은 독자들이 지나간 책의 길을 따라,<br />오늘 내 마음에 남을 문장을 찾아보세요.</p>
            <p class="subtitle">2006년부터 쌓인 주간 베스트셀러 기록으로<br />시간이 지나도 오래 남은 책의 흐름을 들여다봅니다.</p>
            <p class="hero-source">교보문고 베스트셀러 데이터를 참고해 개인이 정리한 아카이브입니다.</p>
            <div class="search-block">${searchFormHTML("large")}</div>
          </div>
          <a class="hero-scroll" href="#stats" aria-label="아래로 더 보기">
            <svg class="hero-scroll-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          </a>
        </header>
        <section class="stats-grid" id="stats">${statsHTML}</section>
        <section class="section-years">
          ${sh("chart", "해마다 열린 책길")}
          <p class="section-note">그해 독자들이 가장 오래 머문 책을 따라가 보세요.<br />새롭게 떠오른 책과 오래 사랑받은 책을 함께 만날 수 있습니다.</p>
          <p class="section-source">대표 책길이 직전 연도와 같을 때는, 그다음으로 오래 머문 책을 표시합니다.</p>
          <div class="year-grid">${yearsHTML}</div>
        </section>
        <section class="section-longstay">
          ${sh("bookmark", "오래 머문 책")}
          <p class="section-note">잠깐의 순위보다 오래 남은 기록을 봅니다.<br />여러 계절 동안 독자 곁에 머문 책들을 모았습니다.</p>
          <div class="longstay-grid">${longStayHTML}</div>
        </section>
      </div>
      <section class="book-road-cta">
        <div class="wrap wrap-5xl">
          <div class="book-road-cta-card">
            <div>
              <p class="cta-kicker">Underline Your Sentence</p>
              <p class="cta-title">마음이 멈춘 책을 발견했다면,<br />이제 밑줄로 남겨보세요.</p>
              <p class="cta-sub">밑줄이 모여, 나만의 문장숲이 됩니다.</p>
              <a class="cta-btn" href="${esc(HOME_URL)}">밑줄긋기에서 기록하기</a>
            </div>
            <div class="cta-still-life">
              <img src="/archive/images/note-card-cta.jpg" alt="문장 카드와 노트 이미지" loading="lazy" />
            </div>
          </div>
          <p class="archive-update-note">주간 베스트셀러 기록은 계속 업데이트됩니다.<br />새로운 책길은 매주 조용히 더해집니다.</p>
        </div>
      </section>
    </main>`;
}

// ====================================================================
// 연도 페이지
// ====================================================================
const HIDDEN_FIELDS_BY_YEAR = { 2008: ["역사문화", "자기계발"] };
const ERA = {
  2006: "성공·재테크 붐의 해", 2007: "자기계발 열풍의 해", 2008: "마음을 다독인 해",
  2009: "사랑받는 작가들의 해", 2010: "인문학 열풍의 시작", 2011: "청춘 담론이 폭발한 해",
  2012: "삶의 지혜에 귀 기울인 해", 2013: "행복을 찾아 나선 해", 2014: "해외 소설이 사랑받은 해",
  2015: "단단한 나를 찾던 해", 2016: "교양과 인문에 빠진 해", 2017: "나를 돌보는 말의 해",
  2018: "나를 지키며 살아간 해", 2019: "일상에 깊이를 더한 해", 2020: "흔들리는 일상에서 답을 찾던 해",
  2021: "마음을 쉬게 한 이야기의 해", 2022: "따뜻한 이야기가 머문 해", 2023: "더 나은 나를 향한 해",
  2024: "한강, 노벨문학상의 해", 2025: "한국 소설이 빛난 해",
};
// 아직 진행 중인 최신 연도는 회고 키워드 대신 진행형 표현(연도 무관 자동 적용)
const IN_PROGRESS_ERA = "올해의 책길을 걷는 중";
function eraFor(year, maxYear) {
  return ERA[year] || (year === maxYear ? IN_PROGRESS_ERA : "");
}
const FIELD_DISPLAY_NAMES = {
  "소설": "이야기 숲길",
  "에세이": "마음 숲길",
  "인문": "생각 숲길",
  "역사문화": "시간의 숲길",
  "경제경영": "일과 돈의 숲길",
  "자기계발": "성장 숲길",
  "정치사회": "세상의 숲길",
  "교양과학": "호기심 숲길",
};

// 숲길 갈래별 기록에서 제외할 분야(정의된 숲길이 아닌 분류)
const EXCLUDED_FIELDS = new Set(["종교", "유아"]);

function aggregate(rows, includePublisher = true) {
  const map = new Map();
  for (const r of rows) {
    const key = includePublisher
      ? `${r.title}|${r.author ?? ""}|${r.publisher ?? ""}`
      : `${r.title}|${r.author ?? ""}`;
    const entry = map.get(key);
    if (entry) entry.weeks += 1;
    else map.set(key, { title: r.title, author: r.author, publisher: r.publisher, weeks: 1 });
  }
  return [...map.values()].sort((a, b) => b.weeks - a.weeks || a.title.localeCompare(b.title));
}

async function getYearData(year) {
  const [generalRes, fieldRes] = await Promise.all([
    supabase.from("bestsellers").select("title, author, publisher, rank")
      .eq("year", year).eq("category", "종합").limit(1000),
    supabase.from("bestsellers").select("category, title, author, publisher")
      .eq("year", year).eq("rank", 1).neq("category", "종합").limit(1000),
  ]);
  if (generalRes.error || fieldRes.error) {
    return { highlight: null, top10: [], byField: [] };
  }
  const general = generalRes.data ?? [];
  const top10 = aggregate(general).slice(0, 10);
  const highlight = aggregate(general.filter((r) => r.rank === 1))[0] ?? null;
  const fieldRows = (fieldRes.data ?? []).map((r) => ({ ...r, category: normalizeCategory(r.category) }));
  const hiddenFields = HIDDEN_FIELDS_BY_YEAR[year] ?? [];
  const byField = FIELD_CATEGORIES.map((category) => {
    if (hiddenFields.includes(category)) return { category, book: null };
    const ranked = aggregate(fieldRows.filter((r) => r.category === category), false);
    return { category, book: ranked[0] ?? null };
  });
  return { highlight, top10, byField };
}

async function renderYear() {
  const root = document.getElementById("page-root");
  const year = Number(new URLSearchParams(location.search).get("y"));
  const maxYear = await getMaxYear();
  if (!Number.isInteger(year) || year < START_YEAR || year > maxYear) {
    root.innerHTML = `<main><div class="wrap wrap-5xl nav-pad-top"><p class="empty">존재하지 않는 연도입니다. <a class="back-link" href="index.html">← 문장숲 책길로</a></p></div></main>`;
    return;
  }
  setPageMeta({
    title: `${year}년에 열린 책길 · 문장숲 책길`,
    description: `${year}년 교보문고 베스트셀러 책길. 그해 독자들이 오래 머문 책과 분야별 흐름을 기록했습니다.`,
  });
  const { highlight, top10, byField } = await getYearData(year);
  const hasPrev = year > START_YEAR;
  const hasNext = year < maxYear;

  const prevPill = hasPrev
    ? `<a class="pill" href="${esc(yearHref(year - 1))}">← ${year - 1}년 책길</a>`
    : `<span class="pill disabled">← ${year - 1}년 책길</span>`;
  const nextPill = hasNext
    ? `<a class="pill" href="${esc(yearHref(year + 1))}">${year + 1}년 책길 →</a>`
    : `<span class="pill disabled">${year + 1}년 책길 →</span>`;

  const highlightHTML = highlight ? `
    <a class="highlight-card" href="${esc(bookHref(highlight.title))}">
      <div class="eyebrow"><span class="dot"></span><span class="eyebrow-text">그해 가장 오래 1위에 선 책</span></div>
      <h2 class="highlight-title">${esc(highlight.title)}</h2>
      <p class="highlight-meta">${esc(highlight.author ?? "저자 미상")}${highlight.publisher ? ` · ${esc(highlight.publisher)}` : ""}</p>
      <p class="highlight-copy">${highlight.weeks}주 동안 책길의 가장 앞에 서 있었어요.</p>
      <div class="badge-accent">${highlight.weeks}주 1위</div>
    </a>` : "";

  const top10HTML = top10.length > 0
    ? `<ol class="top10">${top10.map((book, i) => `
        <li>
          <span class="rank-num">${String(i + 1).padStart(2, "0")}</span>
          <div class="info">
            <a href="${esc(bookHref(book.title))}">${esc(book.title)}</a>
            <p>${esc(book.author ?? "저자 미상")}</p>
          </div>
          <span class="weeks">${book.weeks}주 차트인</span>
        </li>`).join("")}</ol>`
    : `<p class="muted">아직 남은 책길 기록이 없어요</p>`;

  const byFieldHTML = byField.map(({ category, book }) => `
    <div class="field-card${book ? "" : " field-card-empty"}">
      <span class="field-name">${esc(FIELD_DISPLAY_NAMES[category] ?? category)}</span>
      ${book ? `
        <a class="ft line-clamp-2" href="${esc(bookHref(book.title))}">${esc(book.title)}</a>
        <p class="fa">${esc(book.author ?? "저자 미상")}</p>
        <p class="fw">${book.weeks}주 1위</p>`
      : `<p class="field-empty-msg">이 숲길에는 아직 기록이 없어요</p>`}
    </div>`).join("");

  const footPrev = hasPrev
    ? `<a class="back-link" style="font-size:1rem" href="${esc(yearHref(year - 1))}">← ${year - 1}년 책길</a>`
    : `<span style="font-size:1rem;color:var(--slate-700)">← ${year - 1}년 책길</span>`;
  const footNext = hasNext
    ? `<a class="back-link" style="font-size:1rem" href="${esc(yearHref(year + 1))}">${year + 1}년 책길 →</a>`
    : `<span style="font-size:1rem;color:var(--slate-700)">${year + 1}년 책길 →</span>`;

  root.innerHTML = `
    <main class="year-road-page">
      <div class="wrap wrap-5xl">
        <header class="year-page-header">
          <div class="year-topbar">
            <a class="back-link" href="index.html">← 문장숲 책길로</a>
            <nav class="year-nav">${prevPill}${nextPill}</nav>
          </div>
          <h1 class="page-title year-page-title">${year}년에 열린 책길</h1>
          <p class="year-subtitle">그해 독자들이 남긴 책길의 흐름을 모았습니다.</p>
          <p class="era">${esc(eraFor(year, maxYear))}</p>
        </header>
        ${highlightHTML}
        <section class="section-pad">
          ${sh("bookmark", "그해 책길에 오래 머문 책")}
          <p class="section-note year-section-note">그해 베스트셀러 목록에 오래 남아 있던 책들을 차트인 주수 기준으로 정리했습니다.</p>
          ${top10HTML}
        </section>
        <section class="section-pad year-field-section">
          ${sh("leaf", "숲길 갈래별 오래 1위에 선 책")}
          <p class="section-note year-section-note">각 분야에서 1위 자리에 가장 오래 선 책들을 모았습니다.</p>
          <div class="field-grid">${byFieldHTML}</div>
        </section>
      </div>
      ${slimCtaHTML()}
      <div class="wrap wrap-5xl">
        <nav class="year-foot-nav">
          ${footPrev}${footNext}
        </nav>
      </div>
    </main>`;
}

// ====================================================================
// 책 상세
// ====================================================================
async function getBookData(title) {
  const { data, error } = await supabase
    .from("bestsellers")
    .select("year, week, category, rank, author, publisher")
    .eq("title", title)
    .order("year", { ascending: true })
    .order("week", { ascending: true })
    .limit(1000);
  if (error) console.error(`"${title}" 이력 조회 실패:`, error.message);

  const history = data ?? [];
  const author = history[0]?.author ?? null;
  const publisher = history[0]?.publisher ?? null;
  // 차트에 오른 모든 출판사(첫 등장 순). 판권 이동·재출간으로 여러 곳일 수 있음.
  const publishers = [...new Set(history.map((r) => r.publisher).filter(Boolean))];
  const general = history.filter((r) => r.category === "종합");
  const generalWeeks = general.length;
  const bestRank = general.length ? Math.min(...general.map((r) => r.rank)) : null;
  const oneWeeks = general.filter((r) => r.rank === 1).length;
  const firstYear = general.length
    ? Math.min(...general.map((r) => r.year))
    : history.length ? Math.min(...history.map((r) => r.year)) : null;

  const yearMap = new Map();
  for (const r of general) yearMap.set(r.year, (yearMap.get(r.year) ?? 0) + 1);
  const yearlyGeneral = [...yearMap.entries()]
    .map(([year, weeks]) => ({ year, weeks }))
    .sort((a, b) => a.year - b.year);

  const catMap = new Map();
  for (const r of history) {
    if (r.category === "종합") continue;
    const cat = normalizeCategory(r.category);
    if (EXCLUDED_FIELDS.has(cat)) continue;
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }
  const byCategory = [...catMap.entries()]
    .map(([category, weeks]) => ({ category, weeks }))
    .sort((a, b) => b.weeks - a.weeks || a.category.localeCompare(b.category));

  // 같은 숲길(분야): 이 책의 대표 숲길 차트에 함께 오른 책들
  const mainField = byCategory[0]?.category ?? null;
  let fieldMates = [];
  if (mainField) {
    const fieldYears = [...new Set(
      history.filter((r) => r.category !== "종합" && normalizeCategory(r.category) === mainField).map((r) => r.year),
    )];
    const rows = await fetchAll(() =>
      supabase.from("bestsellers")
        .select("title, author, category, year")
        .in("year", fieldYears)
        .neq("category", "종합")
        .neq("title", title)
        .order("id", { ascending: true }));
    const map = new Map();
    for (const r of rows) {
      if (normalizeCategory(r.category) !== mainField) continue;
      const key = `${r.title}|${r.author ?? ""}`;
      const entry = map.get(key);
      if (entry) entry.weeks += 1;
      else map.set(key, { title: r.title, author: r.author, weeks: 1 });
    }
    fieldMates = [...map.values()]
      .sort((a, b) => b.weeks - a.weeks || a.title.localeCompare(b.title))
      .slice(0, 5);
  }
  return { author, publisher, publishers, generalWeeks, oneWeeks, bestRank, firstYear, yearlyGeneral, byCategory, mainField, fieldMates };
}

// 사전 적재된 네이버 메타데이터 (book_meta). 없거나 미매칭이면 null.
async function getNaverMeta(title) {
  try {
    const { data, error } = await supabase
      .from("book_meta").select("*").eq("title", title).maybeSingle();
    if (error || !data || !data.matched) return null;
    return data;
  } catch {
    return null;
  }
}

function formatPubdate(pubdate) {
  if (!/^\d{8}$/.test(pubdate || "")) return pubdate || "";
  return `${pubdate.slice(0, 4)}.${pubdate.slice(4, 6)}.${pubdate.slice(6, 8)}`;
}

async function renderBook() {
  const root = document.getElementById("page-root");
  const title = new URLSearchParams(location.search).get("title") || "";
  if (!title) {
    root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">책을 찾을 수 없습니다. <a class="back-link" href="index.html">← 문장숲 책길로</a></p></div></main>`;
    return;
  }
  setPageMeta({ title: `${title} · 문장숲 책길` });
  const [data, naver] = await Promise.all([getBookData(title), getNaverMeta(title)]);
  const { author, publisher, publishers, generalWeeks, oneWeeks, bestRank, firstYear, yearlyGeneral, byCategory, mainField, fieldMates } = data;
  setPageMeta({
    description: `${title}${author ? " · " + author : ""}${publisher ? " (" + publisher + ")" : ""} — 교보문고 베스트셀러 차트인 기록과 함께 오른 흐름을 살펴봅니다.`,
  });
  const publisherHTML = (publishers && publishers.length ? publishers : (publisher ? [publisher] : []))
    .map((p) => publisherLink(p, "alink")).join(" · ");
  const maxYearlyWeeks = Math.max(1, ...yearlyGeneral.map((y) => y.weeks));
  const fullDescription = naver?.description ? stripTags(naver.description) : "";
  const description = fullDescription.slice(0, 200);

  // 2. 현재 책 정보 (네이버) — 보조 정보, 위계 낮춤
  const naverHTML = naver ? `
    <section class="section-pad book-now">
      ${sh("book", "현재 책 정보")}
      <p class="section-note">네이버 책 기준 현재 정보예요. 당시 기록과 다를 수 있어요.</p>
      <div class="naver-card">
        <div class="naver-body">
          ${naver.image ? `<img class="naver-cover" src="${esc(naver.image)}" alt="${esc(stripTags(naver.naver_title || title))}" loading="lazy" />` : ""}
          <div class="naver-info">
            <h3>${esc(stripTags(naver.naver_title || title))}</h3>
            <p class="na">${esc((naver.naver_author || "").split("^").filter(Boolean).join(", "))}${naver.naver_publisher ? ` · ${esc(naver.naver_publisher)}` : ""}</p>
            ${naver.pubdate ? `<p class="nd">${esc(formatPubdate(naver.pubdate))} 출간</p>` : ""}
            ${description ? `<p class="desc">${esc(description)}${fullDescription.length > 200 ? "…" : ""}</p>` : ""}
            ${naver.link ? `<a class="naver-link" href="${esc(naver.link)}" target="_blank" rel="noopener noreferrer">네이버 책 정보 보기 →</a>` : ""}
          </div>
        </div>
      </div>
    </section>` : "";

  // 3. 이 책이 머문 책길 기록 — 1위 유지 주수가 있으면 4카드, 없으면 3카드
  const statBoxes = oneWeeks > 0
    ? [[generalWeeks, "주", "총 차트인 주수"], [oneWeeks, "주", "1위 유지"], [bestRank, "위", "최고 순위"], [firstYear, "년", "처음 오른 해"]]
    : [[generalWeeks, "주", "책길에 머문 시간"], [bestRank, "위", "최고 순위"], [firstYear, "년", "처음 오른 해"]];
  const recordHTML = generalWeeks > 0 ? `
    <div class="book-stats">${statBoxes.map(([v, u, c]) =>
      `<div class="box"><div class="big">${v ?? "—"}<span class="u">${u}</span></div><div class="cap">${c}</div></div>`).join("")}</div>`
    : byCategory.length > 0
      ? `<p class="muted">종합 차트엔 오르지 않았지만, 아래 <b>숲길 갈래별 기록</b>에 이 책의 발자취가 있어요.</p>`
      : `<p class="muted">아직 책길에 머문 기록이 없어요</p>`;

  // 4. 연도별 책길 흐름
  const yearlyHTML = (generalWeeks > 0 && yearlyGeneral.length) ? `
    <section class="section-pad">
      ${sh("chart", "연도별 책길 흐름")}
      <div class="bars">${yearlyGeneral.map(({ year, weeks }) => `
        <a class="bar-row" href="${esc(yearHref(year))}">
          <span class="bar-year">${year}</span>
          <span class="bar-track"><span class="bar-fill" style="--w:${Math.max(6, (weeks / maxYearlyWeeks) * 100)}%"></span></span>
          <span class="bar-weeks">${weeks}주</span>
        </a>`).join("")}</div>
    </section>` : "";

  // 5. 숲길 갈래별 기록 (분야별 차트 기준 — 종합과 별개)
  const catHTML = byCategory.length > 0 ? `
    <section class="section-pad">
      ${sh("leaf", "숲길 갈래별 기록")}
      <p class="section-note">분야별 차트 기준으로, 종합 기록과 주수가 다를 수 있어요.</p>
      <div class="cat-list">${byCategory.map(({ category, weeks }) => `
        <div class="cat-row"><span class="cn">${esc(FIELD_DISPLAY_NAMES[category] ?? category)}</span><span class="cw">누적 ${weeks}주</span></div>`).join("")}</div>
    </section>` : "";

  // 6. 같은 숲길에서 함께 오른 책들 (분야별 차트)
  const fieldName = FIELD_DISPLAY_NAMES[mainField] ?? mainField;
  const compHTML = fieldMates.length > 0 ? `
    <section class="section-pad">
      ${sh("together", `${esc(fieldName)}에서 함께 오른 책들`)}
      <p class="section-note">이 책과 같은 해, 같은 숲길에 오래 머문 책들이에요.</p>
      <div class="companions">${fieldMates.map((book) => `
        <a class="companion" href="${esc(bookHref(book.title))}">
          <span class="info"><span class="ct">${esc(book.title)}</span><span class="ca">${esc(book.author ?? "저자 미상")}</span></span>
          <span class="weeks">${book.weeks}주</span>
        </a>`).join("")}</div>
    </section>` : "";

  root.innerHTML = `
    <main class="book-road-page">
      <div class="wrap wrap-3xl">
        <header class="book-page-header">
          <a class="back-link" href="index.html">← 문장숲 책길로</a>
          <h1 class="book-title-lg">${esc(title)}</h1>
          <p class="book-meta">${authorLink(author, "alink")}${publisherHTML ? ` · ${publisherHTML}` : ""}</p>
          <span class="book-badge">책길 기록</span>
          <p class="book-hero-desc">이 책이 문장숲 책길에 남긴 흐름을 모았습니다.</p>
        </header>
        ${naverHTML}
        <section class="section-pad">
          ${sh("bookmark", "이 책이 머문 책길 기록")}
          ${recordHTML}
        </section>
        ${yearlyHTML}
        ${catHTML}
        ${compHTML}
        <p class="disclaimer">베스트셀러 기록의 출판사·저자 표기는 차트 등재 당시 기준이며, 판권 이동·개정판 출간 등으로 현재 정보와 다를 수 있습니다.</p>
      </div>
      ${slimCtaHTML()}
    </main>`;
}

// ====================================================================
// 검색
// ====================================================================
async function searchBooks(query) {
  const pattern = `%${query}%`;
  // 종합뿐 아니라 전체 분야에서 찾는다(예: '작별'은 소설 분야에만 올라 종합엔 없음).
  // 분야가 겹쳐도 주수가 부풀지 않게 (연도,주차) 단위로 센다.
  const rows = await fetchAll(() =>
    supabase.from("bestsellers")
      .select("title, author, publisher, year, week")
      .or(`title.ilike.${pattern},author.ilike.${pattern},publisher.ilike.${pattern}`)
      .order("id", { ascending: true })  // 안정적 페이징(중복/누락 방지); 결과는 아래서 재정렬
  );
  const map = new Map();
  for (const r of rows) {
    const key = `${r.title}|${r.author ?? ""}|${r.publisher ?? ""}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { title: r.title, author: r.author, publisher: r.publisher, weekSet: new Set(), firstYear: r.year, lastYear: r.year };
      map.set(key, entry);
    }
    entry.weekSet.add(`${r.year}|${r.week}`);
    entry.firstYear = Math.min(entry.firstYear, r.year);
    entry.lastYear = Math.max(entry.lastYear, r.year);
  }
  return [...map.values()]
    .map((e) => ({ title: e.title, author: e.author, publisher: e.publisher, totalWeeks: e.weekSet.size, firstYear: e.firstYear, lastYear: e.lastYear }))
    .sort((a, b) => b.totalWeeks - a.totalWeeks || a.title.localeCompare(b.title));
}

async function renderSearch() {
  const root = document.getElementById("page-root");
  const query = (new URLSearchParams(location.search).get("q") || "").trim();
  if (query) document.title = `'${query}' 검색 · 문장숲 책길`;

  // 헤더 먼저 그리고, 결과는 비동기로 채운다.
  root.innerHTML = `
    <main class="book-road-page">
      <div class="wrap wrap-3xl">
        <header class="book-page-header">
          <a class="back-link" href="index.html">← 문장숲 책길로</a>
          <h1 class="book-title-lg">책길 찾기</h1>
          <p class="book-hero-desc">책 제목이나 작가 이름으로 문장숲 책길을 찾아보세요.</p>
          <div class="search-block">${searchFormHTML("large", query)}</div>
        </header>
        <section id="search-results" class="section-pad book-now">
          ${query ? `<p class="loading">검색 중…</p>` : ""}
        </section>
      </div>
      ${slimCtaHTML()}
    </main>`;

  if (!query) return;
  const results = await searchBooks(query);
  const box = document.getElementById("search-results");
  if (results.length === 0) {
    box.innerHTML = `<p class="empty">‘${esc(query)}’의 책길은 아직 찾지 못했어요.</p>`;
    return;
  }
  box.innerHTML = `
    <p class="results-count">‘${esc(query)}’ 검색 결과 ${results.length}건</p>
    <div class="companions">${results.map((book) => {
      const period = book.firstYear === book.lastYear
        ? `${book.firstYear}` : `${book.firstYear}–${book.lastYear}`;
      const meta = `${esc(book.author ?? "저자 미상")}${book.publisher ? ` · ${esc(book.publisher)}` : ""} · ${period}`;
      return `<a class="companion" href="${esc(bookHref(book.title))}">
        <span class="info">
          <span class="ct">${esc(book.title)}</span>
          <span class="ca">${meta}</span>
        </span>
        <span class="weeks">${book.totalWeeks}주 머문 책</span>
      </a>`;
    }).join("")}</div>`;
}

// ====================================================================
// 작가의 숲
// ====================================================================
const AUTHOR_SORTS = {
  chartin: { col: "chartin_weeks", label: "오래 머문 순" },
  one: { col: "one_weeks", label: "가장 앞에 선 순" },
  books: { col: "book_count", label: "남긴 책 순" },
};

// 최근 N년 종합 기록으로 작가 순위를 즉석 집계(신진·상승세 작가용). author_stats(전체기간)와 별개.
async function getRecentAuthorStats(minYear) {
  const rows = await fetchAll(() => supabase
    .from("bestsellers")
    .select("title, author, rank, year")
    .eq("category", "종합").gte("year", minYear)
    .order("id", { ascending: true }));
  const m = new Map();
  for (const r of rows) {
    if (!r.author) continue;
    let e = m.get(r.author);
    if (!e) { e = { author: r.author, chartin_weeks: 0, one_weeks: 0, titles: new Map(), first_year: r.year, last_year: r.year }; m.set(r.author, e); }
    e.chartin_weeks += 1;
    if (r.rank === 1) e.one_weeks += 1;
    e.titles.set(r.title, (e.titles.get(r.title) ?? 0) + 1);
    e.first_year = Math.min(e.first_year, r.year);
    e.last_year = Math.max(e.last_year, r.year);
  }
  return [...m.values()].map((e) => {
    const top = [...e.titles.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { author: e.author, chartin_weeks: e.chartin_weeks, one_weeks: e.one_weeks,
             book_count: e.titles.size, first_year: e.first_year, last_year: e.last_year,
             top_title: top ? top[0] : "" };
  });
}

async function renderAuthors() {
  const root = document.getElementById("page-root");
  const by = new URLSearchParams(location.search).get("by") || "chartin";
  const isRecent = by === "recent";
  const sort = AUTHOR_SORTS[by] ?? AUTHOR_SORTS.chartin;  // recent 는 오래 머문(chartin) 기준

  const maxYear = await getMaxYear();
  const minYear = maxYear - 4;  // 최근 5년
  let rows, error = null;
  if (isRecent) {
    try {
      const stats = await getRecentAuthorStats(minYear);
      stats.sort((a, b) => (b.chartin_weeks - a.chartin_weeks) || (b.one_weeks - a.one_weeks) || a.author.localeCompare(b.author));
      rows = stats.slice(0, 50);
    } catch (e) { rows = []; error = e; }
  } else {
    const res = await supabase.from("author_stats").select("*")
      .order(sort.col, { ascending: false }).order("one_weeks", { ascending: false }).limit(50);
    rows = res.data ?? []; error = res.error;
  }

  const tabs = [["chartin", "오래 머문 순"], ["one", "가장 앞에 선 순"], ["books", "남긴 책 순"], ["recent", "지금 걷는 작가"]];
  const toggles = tabs.map(([k, label]) => {
    const cls = "pill" + (k === "recent" ? " pill-recent" : "") + (k === by ? " pill-on" : "");
    return k === by
      ? `<span class="${cls}">${label}</span>`
      : `<a class="${cls}" href="authors.html?by=${k}">${label}</a>`;
  }).join("");
  const metricFor = (a) =>
    (!isRecent && by === "books") ? `${a.book_count}권`
    : (!isRecent && by === "one") ? `${a.one_weeks}주 1위`
    : `${a.chartin_weeks}주 차트인`;
  const listHTML = rows.length > 0
    ? `<div class="companions">${rows.map((a, i) => {
        const yr = a.first_year === a.last_year ? `${a.first_year}` : `${a.first_year}–${a.last_year}`;
        return `<a class="companion" href="${esc(authorHref(a.author))}">
          <span class="comp-rank">${String(i + 1).padStart(2, "0")}</span>
          <span class="info">
            <span class="ct">${esc(a.author)}</span>
            <span class="ca">대표작 《${esc(a.top_title)}》 · ${a.book_count}권 · ${yr}</span>
          </span>
          <span class="weeks">${metricFor(a)}</span>
        </a>`;
      }).join("")}</div>`
    : `<p class="muted">${error ? "데이터를 불러오지 못했습니다." : "아직 작가의 숲에 모인 기록이 없어요."}</p>`;

  root.innerHTML = `
    <main class="book-road-page">
      <div class="wrap wrap-3xl">
        <header class="book-page-header">
          <a class="back-link" href="index.html">← 문장숲 책길로</a>
          <h1 class="book-title-lg">작가의 숲</h1>
          <p class="book-hero-desc">${isRecent
            ? `최근 5년(${minYear}–${maxYear}) 기준, 지금 이 숲을 활발히 걷고 있는 작가들이에요.`
            : "2006년부터 이어진 책길에 가장 오래 머물고, 가장 앞에 오래 선 작가들을 모았습니다."}</p>
          <div class="year-nav author-sorts">${toggles}</div>
        </header>
        <section class="section-pad book-now">
          <p class="section-note" style="padding-left:0">${isRecent ? `최근 5년 · 오래 머문 순` : `‘${esc(sort.label)}’`} 상위 ${rows.length}명 · 이름을 누르면 작가가 걸어온 책길을 볼 수 있어요.</p>
          ${listHTML}
        </section>
        <section id="author-field-strength" class="section-pad">
          ${sh(by === "one" ? "star" : by === "books" ? "pen" : "bookmark", (AUTHOR_FIELD[by] ?? AUTHOR_FIELD.chartin).title)}
          <p class="section-note">${(AUTHOR_FIELD[by] ?? AUTHOR_FIELD.chartin).note}</p>
          <p class="loading">숲길별 기록을 살펴보는 중…</p>
        </section>
      </div>
      ${slimCtaHTML()}
    </main>`;

  // 분야(비종합) 데이터는 4만여 행이라, 목록을 먼저 그린 뒤 백그라운드로 채운다(await 안 함).
  renderAuthorFieldStrength(by, minYear);
}

// 숲길별 상위 집계(공통). entityKey='author'|'publisher', metric='chartin'|'one'|'books',
// minYear 지정 시 그 이후만(최근 N년). 각 갈래의 대표 + 2·3위를 돌려준다.
function computeFieldTops(rows, entityKey, metric, minYear) {
  const fields = new Map();  // 분야 → Map(대상 → {chartin, one, titles})
  for (const r of rows) {
    const name = r[entityKey];
    if (!name) continue;
    if (minYear != null && (r.year ?? 0) < minYear) continue;
    const f = normalizeCategory(r.category);
    if (EXCLUDED_FIELDS.has(f) || !FIELD_DISPLAY_NAMES[f]) continue;
    let em = fields.get(f);
    if (!em) { em = new Map(); fields.set(f, em); }
    let e = em.get(name);
    if (!e) { e = { chartin: 0, one: 0, titles: new Set() }; em.set(name, e); }
    e.chartin += 1;
    if (r.rank === 1) e.one += 1;
    e.titles.add(r.title);
  }
  const unit = metric === "one" ? "주 1위" : metric === "books" ? "권" : "주";
  const val = (e) => metric === "one" ? e.one : metric === "books" ? e.titles.size : e.chartin;
  return FIELD_CATEGORIES.filter((f) => fields.has(f)).map((f) => {
    const ranked = [...fields.get(f).entries()]
      .map(([name, e]) => ({ name, v: val(e), c: e.chartin }))
      .filter((x) => x.v > 0)
      .sort((a, b) => (b.v - a.v) || (b.c - a.c) || a.name.localeCompare(b.name));
    return { name: FIELD_DISPLAY_NAMES[f], unit, top: ranked[0], runners: ranked.slice(1, 3) };
  }).filter((card) => card.top);
}
// 탭 → (제목, 지표) 매핑
const AUTHOR_FIELD = {
  chartin: { metric: "chartin", title: "숲길별 오래 머문 작가", note: "여덟 갈래 숲길에서 가장 오래 책길에 머문 작가예요." },
  one:     { metric: "one",     title: "숲길별 가장 앞에 선 작가", note: "여덟 갈래 숲길에서 1위에 가장 오래 선 작가예요." },
  books:   { metric: "books",   title: "숲길별 많은 책을 남긴 작가", note: "여덟 갈래 숲길에 가장 많은 책을 올린 작가예요." },
  recent:  { metric: "chartin", title: "숲길별 지금 걷는 작가", note: "최근 5년 기준, 숲길마다 가장 오래 머문 작가예요." },
};
const PUBLISHER_FIELD = {
  chartin: { metric: "chartin", title: "숲길별 오래 피운 출판사", note: "여덟 갈래 숲길에서 가장 오래 책을 피워낸 출판사예요." },
  one:     { metric: "one",     title: "숲길별 앞자리를 지킨 출판사", note: "여덟 갈래 숲길에서 1위에 가장 오래 선 책을 낸 출판사예요." },
  books:   { metric: "books",   title: "숲길별 많이 심은 출판사", note: "여덟 갈래 숲길에 가장 많은 책을 올린 출판사예요." },
};
function fieldTopsHTML(cards, hrefFn, iconKey, title, note) {
  return `
    ${sh(iconKey, title)}
    <p class="section-note">${note} (분야별 차트 기준)</p>
    <div class="field-pub-grid">${cards.map((c) => `
      <a class="field-pub" href="${esc(hrefFn(c.top.name))}">
        <span class="fp-field">${esc(c.name)}</span>
        <span class="fp-lead"><span class="fp-pub">${esc(c.top.name)}</span><span class="fp-weeks">${c.top.v}${c.unit}</span></span>
        ${c.runners.length ? `<span class="fp-runners">${c.runners.map((r) => `${esc(r.name)} ${r.v}${c.unit}`).join(" · ")}</span>` : ""}
      </a>`).join("")}</div>`;
}

// 숲길별 대표 작가(탭 지표에 맞춰). 별도 테이블 없이 즉석 계산.
async function renderAuthorFieldStrength(by, minYear) {
  const box = document.getElementById("author-field-strength");
  if (!box) return;
  const cfg = AUTHOR_FIELD[by] ?? AUTHOR_FIELD.chartin;
  const iconKey = by === "one" ? "star" : by === "books" ? "pen" : "bookmark";
  try {
    const rows = await fetchAll(() => supabase.from("bestsellers")
      .select("category, author, rank, title, year").neq("category", "종합").order("id", { ascending: true }));
    const cards = computeFieldTops(rows, "author", cfg.metric, by === "recent" ? minYear : null);
    if (!cards.length) { box.style.display = "none"; return; }
    box.innerHTML = fieldTopsHTML(cards, authorHref, iconKey, cfg.title, cfg.note);
  } catch (e) {
    box.innerHTML = `${sh(iconKey, cfg.title)}<p class="muted">숲길별 기록을 불러오지 못했습니다.</p>`;
  }
}

// 분야별(종합 제외) 차트 기록을 갈래별로 집계. 갈래마다 책 목록(제목→주수)을 담는다.
// 저자·출판사 페이지가 공유한다.
function buildByCategory(all) {
  const catMap = new Map();
  for (const r of all) {
    if (r.category === "종합") continue;
    const c = normalizeCategory(r.category);
    if (EXCLUDED_FIELDS.has(c)) continue;
    let e = catMap.get(c);
    if (!e) { e = { weeks: 0, titles: new Map() }; catMap.set(c, e); }
    e.weeks += 1;
    e.titles.set(r.title, (e.titles.get(r.title) ?? 0) + 1);
  }
  return [...catMap.entries()].map(([category, e]) => ({
    category, weeks: e.weeks, books: e.titles.size,
    titleList: [...e.titles.entries()].map(([title, weeks]) => ({ title, weeks }))
      .sort((a, b) => b.weeks - a.weeks || a.title.localeCompare(b.title)),
  })).sort((a, b) => b.weeks - a.weeks || a.category.localeCompare(b.category));
}

// 숲길 갈래별 기록 섹션 HTML. 갈래를 누르면 그 숲길에 오른 책 목록이 펼쳐진다.
function catSectionHTML(byCategory) {
  if (!byCategory.length) return "";
  const catRow = ({ category, weeks, books, titleList }) => {
    const cn = esc(FIELD_DISPLAY_NAMES[category] ?? category);
    const cw = `${books}권 누적 ${weeks}주`;
    return `<details class="cat-item">
      <summary class="cat-row cat-toggle"><span class="cn">${cn}</span><span class="cw">${cw}</span></summary>
      <div class="cat-books">${titleList.map((b) => `
        <a class="cat-book" href="${esc(bookHref(b.title))}"><span class="cbt">${esc(b.title)}</span><span class="cbw">${b.weeks}주</span></a>`).join("")}</div>
    </details>`;
  };
  return `
    <section class="section-pad">
      ${sh("leaf", "숲길 갈래별 기록")}
      <p class="section-note">분야별 차트 기준이라 전체 기록과 주수가 다를 수 있어요. 갈래를 누르면 그 숲길에 오른 책들을 볼 수 있어요.</p>
      <div class="cat-list">${byCategory.map(catRow).join("")}</div>
    </section>`;
}

// ====================================================================
// 저자 페이지
// ====================================================================
async function renderAuthor() {
  const root = document.getElementById("page-root");
  const name = new URLSearchParams(location.search).get("name") || "";
  if (!name) {
    root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">저자를 찾을 수 없습니다. <a class="back-link" href="authors.html">← 작가의 숲</a></p></div></main>`;
    return;
  }
  setPageMeta({
    title: `${name} · 문장숲 책길`,
    description: `${name} 작가의 교보문고 베스트셀러 차트인 기록 — 오른 책과 연도별 흐름을 정리했습니다.`,
  });

  const all = await fetchAll(() =>
    supabase.from("bestsellers")
      .select("title, year, category, rank, week")
      .eq("author", name)
      .order("id", { ascending: true })  // 안정적 페이징(중복/누락 방지)
  );
  if (all.length === 0) {
    root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">‘${esc(name)}’의 기록이 없습니다. <a class="back-link" href="authors.html">← 작가의 숲</a></p></div></main>`;
    return;
  }

  const general = all.filter((r) => r.category === "종합");
  const chartinWeeks = general.length;
  const oneWeeks = general.filter((r) => r.rank === 1).length;
  const years = (general.length ? general : all).map((r) => r.year);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);

  // 작품별 종합 차트인 주수
  const byTitle = new Map();
  for (const r of general) byTitle.set(r.title, (byTitle.get(r.title) ?? 0) + 1);
  const books = [...byTitle.entries()]
    .map(([title, weeks]) => ({ title, weeks }))
    .sort((a, b) => b.weeks - a.weeks || a.title.localeCompare(b.title));
  const bookCount = books.length;

  // 연도별 종합 차트인 주수
  const yearMap = new Map();
  for (const r of general) yearMap.set(r.year, (yearMap.get(r.year) ?? 0) + 1);
  const yearly = [...yearMap.entries()].map(([year, weeks]) => ({ year, weeks })).sort((a, b) => a.year - b.year);
  const maxY = Math.max(1, ...yearly.map((y) => y.weeks));

  // 분야별 차트인 주수 + 책 권수 (종합 제외)
  const byCategory = buildByCategory(all);

  const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;
  // 통계 카드는 폭이 좁아 한 줄에 들어가도록 끝 연도를 2자리로 줄인다(예: 2010–24). 앞 연도가 4자리라 날짜로 오인되지 않음.
  const yearRangeShort = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${String(lastYear).slice(-2)}`;

  // 작가 책길 요약 카드 (1위 유지 있으면 4개)
  const statBoxes = oneWeeks > 0
    ? [[chartinWeeks, "주", "총 차트인 주수"], [oneWeeks, "주", "1위 유지"], [bookCount, "권", "책길에 오른 책"], [yearRangeShort, "", "기록된 해"]]
    : [[chartinWeeks, "주", "총 차트인 주수"], [bookCount, "권", "책길에 오른 책"], [yearRangeShort, "", "기록된 해"]];
  const statHTML = statBoxes.map(([v, u, c]) =>
    `<div class="box"><div class="big">${v}<span class="u">${u}</span></div><div class="cap">${c}</div></div>`).join("");

  const booksHTML = books.length > 0 ? `
    <section class="section-pad">
      ${sh("pen", "이 작가가 남긴 책길")}
      <p class="section-note">문장숲 책길에 오른 책들을 오래 머문 순서로 정리했습니다.</p>
      <div class="companions">${books.map((b, i) => `
        <a class="companion" href="${esc(bookHref(b.title))}">
          <span class="comp-rank">${String(i + 1).padStart(2, "0")}</span>
          <span class="info"><span class="ct">${esc(b.title)}</span></span>
          <span class="weeks">${b.weeks}주 차트인</span>
        </a>`).join("")}</div>
    </section>` : "";

  const yearlyHTML = yearly.length > 0 ? `
    <section class="section-pad">
      ${sh("chart", "해마다 머문 책길")}
      <p class="section-note">이 작가의 책들이 해마다 책길에 머문 주수를 보여줍니다.</p>
      <div class="bars">${yearly.map(({ year, weeks }) => `
        <a class="bar-row" href="${esc(yearHref(year))}">
          <span class="bar-year">${year}</span>
          <span class="bar-track"><span class="bar-fill" style="--w:${Math.max(6, (weeks / maxY) * 100)}%"></span></span>
          <span class="bar-weeks">${weeks}주</span>
        </a>`).join("")}</div>
    </section>` : "";

  const catHTML = catSectionHTML(byCategory);

  root.innerHTML = `
    <main class="book-road-page">
      <div class="wrap wrap-3xl">
        <header class="book-page-header">
          <a class="back-link" href="authors.html">← 작가의 숲</a>
          <h1 class="book-title-lg">${esc(name)}</h1>
          <p class="book-meta">${bookCount}권 · ${yearRange} 책길 기록</p>
          <p class="book-hero-desc">이 작가가 문장숲 책길에 남긴 흐름을 모았습니다.</p>
        </header>
        <section class="section-pad book-now">
          <div class="book-stats">${statHTML}</div>
        </section>
        ${booksHTML}
        ${yearlyHTML}
        ${catHTML}
        <p class="disclaimer">저자 표기는 차트 등재 당시 데이터 기준이며, 동명이인·공저 표기 차이로 일부 다르게 묶일 수 있습니다.</p>
      </div>
      ${slimCtaHTML()}
    </main>`;
}

// ====================================================================
// 숲을 가꾼 손 (출판사)
// ====================================================================
// 종합 차트 기준 출판사별 집계(클라이언트 즉석). 별도 요약 테이블 없이 매번 계산 →
// 주간 데이터가 늘면 자동 반영. minYear 를 주면 그 이후만(최근 N년) 집계한다.
async function getPublisherStats(minYear = null) {
  const rows = await fetchAll(() => {
    let q = supabase.from("bestsellers").select("title, publisher, rank, year")
      .eq("category", "종합").order("id", { ascending: true });
    if (minYear != null) q = q.gte("year", minYear);
    return q;
  });
  const m = new Map();
  for (const r of rows) {
    const p = r.publisher;
    if (!p) continue;
    let e = m.get(p);
    if (!e) { e = { publisher: p, chartin_weeks: 0, one_weeks: 0, titles: new Map(), first_year: r.year, last_year: r.year }; m.set(p, e); }
    e.chartin_weeks += 1;
    if (r.rank === 1) e.one_weeks += 1;
    e.titles.set(r.title, (e.titles.get(r.title) ?? 0) + 1);
    e.first_year = Math.min(e.first_year, r.year);
    e.last_year = Math.max(e.last_year, r.year);
  }
  return [...m.values()].map((e) => {
    const top = [...e.titles.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { publisher: e.publisher, chartin_weeks: e.chartin_weeks, one_weeks: e.one_weeks,
             book_count: e.titles.size, first_year: e.first_year, last_year: e.last_year,
             top_title: top ? top[0] : "" };
  });
}

const PUBLISHER_SORT_LABELS = { chartin: "오래 피운 책 순", one: "앞자리를 지킨 책 순", books: "많이 심은 책 순" };

async function renderPublishers() {
  const root = document.getElementById("page-root");
  const by = new URLSearchParams(location.search).get("by") || "chartin";

  let rows = [], error = null;
  try {
    const stats = await getPublisherStats();
    const cmp = {
      one: (a, b) => (b.one_weeks - a.one_weeks) || (b.chartin_weeks - a.chartin_weeks),
      books: (a, b) => (b.book_count - a.book_count) || (b.chartin_weeks - a.chartin_weeks),
    }[by] || ((a, b) => (b.chartin_weeks - a.chartin_weeks) || (b.one_weeks - a.one_weeks));
    stats.sort((a, b) => cmp(a, b) || a.publisher.localeCompare(b.publisher));
    rows = stats.slice(0, 50);
  } catch (e) { error = e; }

  const tabs = [["chartin", "오래 피운 책 순"], ["one", "앞자리를 지킨 책 순"], ["books", "많이 심은 책 순"]];
  const toggles = tabs.map(([k, label]) => {
    const cls = "pill" + (k === by ? " pill-on" : "");
    return k === by
      ? `<span class="${cls}">${label}</span>`
      : `<a class="${cls}" href="publishers.html?by=${k}">${label}</a>`;
  }).join("");
  const metricFor = (p) =>
    (by === "books") ? `${p.book_count}권`
    : (by === "one") ? `${p.one_weeks}주 1위`
    : `${p.chartin_weeks}주 차트인`;
  const listHTML = rows.length > 0
    ? `<div class="companions">${rows.map((p, i) => {
        const yr = p.first_year === p.last_year ? `${p.first_year}` : `${p.first_year}–${p.last_year}`;
        return `<a class="companion" href="${esc(publisherHref(p.publisher))}">
          <span class="comp-rank">${String(i + 1).padStart(2, "0")}</span>
          <span class="info">
            <span class="ct">${esc(p.publisher)}</span>
            <span class="ca">대표작 《${esc(p.top_title)}》 · ${p.book_count}권 · ${yr}</span>
          </span>
          <span class="weeks">${metricFor(p)}</span>
        </a>`;
      }).join("")}</div>`
    : `<p class="muted">${error ? "데이터를 불러오지 못했습니다." : "아직 이 정원에 모인 기록이 없어요."}</p>`;

  root.innerHTML = `
    <main class="book-road-page">
      <div class="wrap wrap-3xl">
        <header class="book-page-header">
          <a class="back-link" href="index.html">← 문장숲 책길로</a>
          <h1 class="book-title-lg">출판사의 정원</h1>
          <p class="book-hero-desc">책길에 오래 머문 책들을 세상에 내보낸 출판사들의 기록을 모았습니다.</p>
          <div class="year-nav author-sorts">${toggles}</div>
        </header>
        <section class="section-pad book-now">
          <p class="section-note" style="padding-left:0">‘${PUBLISHER_SORT_LABELS[by] ?? PUBLISHER_SORT_LABELS.chartin}’ 상위 ${rows.length}곳 · 이름을 누르면 그 출판사가 피워낸 책길을 볼 수 있어요.</p>
          ${listHTML}
        </section>
        <section id="field-strength" class="section-pad">
          ${sh(by === "one" ? "star" : by === "books" ? "pen" : "bookmark", (PUBLISHER_FIELD[by] ?? PUBLISHER_FIELD.chartin).title)}
          <p class="section-note">${(PUBLISHER_FIELD[by] ?? PUBLISHER_FIELD.chartin).note}</p>
          <p class="loading">숲길별 기록을 살펴보는 중…</p>
        </section>
      </div>
      ${slimCtaHTML()}
    </main>`;

  // 분야(비종합) 데이터는 4만여 행이라, 랭킹을 먼저 그린 뒤 백그라운드로 채운다(await 안 함).
  renderFieldStrength(by);
}

// 숲길별 대표 출판사(탭 지표에 맞춰). 별도 테이블 없이 즉석 계산.
async function renderFieldStrength(by) {
  const box = document.getElementById("field-strength");
  if (!box) return;
  const cfg = PUBLISHER_FIELD[by] ?? PUBLISHER_FIELD.chartin;
  const iconKey = by === "one" ? "star" : by === "books" ? "pen" : "bookmark";
  try {
    const rows = await fetchAll(() => supabase.from("bestsellers")
      .select("category, publisher, rank, title, year").neq("category", "종합").order("id", { ascending: true }));
    const cards = computeFieldTops(rows, "publisher", cfg.metric, null);
    if (!cards.length) { box.style.display = "none"; return; }
    box.innerHTML = fieldTopsHTML(cards, publisherHref, iconKey, cfg.title, cfg.note);
  } catch (e) {
    box.innerHTML = `${sh(iconKey, cfg.title)}<p class="muted">숲길별 기록을 불러오지 못했습니다.</p>`;
  }
}

// ====================================================================
// 출판사 페이지
// ====================================================================
async function renderPublisher() {
  const root = document.getElementById("page-root");
  const name = new URLSearchParams(location.search).get("name") || "";
  if (!name) {
    root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">출판사를 찾을 수 없습니다. <a class="back-link" href="publishers.html">← 출판사의 정원</a></p></div></main>`;
    return;
  }
  setPageMeta({
    title: `${name} · 문장숲 책길`,
    description: `${name} 출판사가 베스트셀러에 올린 책들의 기록 — 오래 사랑받은 책과 연도별 흐름을 정리했습니다.`,
  });

  // 출판사 소개(편집 문구). 테이블/행이 없으면 조용히 생략.
  let intro = null;
  try {
    const { data } = await supabase.from("publisher_intros").select("body, keywords").eq("publisher", name).maybeSingle();
    intro = data;
  } catch (e) { /* 테이블 미생성 등은 무시 */ }

  const all = await fetchAll(() =>
    supabase.from("bestsellers")
      .select("title, year, category, rank, week, author")
      .eq("publisher", name)
      .order("id", { ascending: true }));
  if (all.length === 0) {
    root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">‘${esc(name)}’의 기록이 없습니다. <a class="back-link" href="publishers.html">← 출판사의 정원</a></p></div></main>`;
    return;
  }

  const general = all.filter((r) => r.category === "종합");
  const chartinWeeks = general.length;
  const oneWeeks = general.filter((r) => r.rank === 1).length;
  const years = (general.length ? general : all).map((r) => r.year);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);

  // 펴낸 책별 종합 차트인 주수(+저자)
  const byTitle = new Map();
  for (const r of general) {
    let e = byTitle.get(r.title);
    if (!e) { e = { weeks: 0, author: r.author }; byTitle.set(r.title, e); }
    e.weeks += 1;
  }
  const books = [...byTitle.entries()]
    .map(([title, e]) => ({ title, weeks: e.weeks, author: e.author }))
    .sort((a, b) => b.weeks - a.weeks || a.title.localeCompare(b.title));
  const bookCount = books.length;

  // 연도별 종합 차트인 주수
  const yearMap = new Map();
  for (const r of general) yearMap.set(r.year, (yearMap.get(r.year) ?? 0) + 1);
  const yearly = [...yearMap.entries()].map(([year, weeks]) => ({ year, weeks })).sort((a, b) => a.year - b.year);
  const maxY = Math.max(1, ...yearly.map((y) => y.weeks));

  const byCategory = buildByCategory(all);

  const yearRange = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;
  const yearRangeShort = firstYear === lastYear ? `${firstYear}` : `${firstYear}–${String(lastYear).slice(-2)}`;

  const statBoxes = oneWeeks > 0
    ? [[chartinWeeks, "주", "총 차트인 주수"], [oneWeeks, "주", "1위 유지 주수"], [bookCount, "권", "책길에 오른 책"], [yearRangeShort, "", "기록된 해"]]
    : [[chartinWeeks, "주", "총 차트인 주수"], [bookCount, "권", "책길에 오른 책"], [yearRangeShort, "", "기록된 해"]];
  const statHTML = statBoxes.map(([v, u, c]) =>
    `<div class="box"><div class="big">${v}<span class="u">${u}</span></div><div class="cap">${c}</div></div>`).join("");

  const booksHTML = books.length > 0 ? `
    <section class="section-pad">
      ${sh("pen", "이 출판사가 피워낸 책길")}
      <p class="section-note">이 출판사가 책길에 올린 책들을 오래 머문 순서로 정리했어요.</p>
      <div class="companions">${books.map((b, i) => `
        <a class="companion" href="${esc(bookHref(b.title))}">
          <span class="comp-rank">${String(i + 1).padStart(2, "0")}</span>
          <span class="info"><span class="ct">${esc(b.title)}</span>${b.author ? `<span class="ca">${esc(b.author)}</span>` : ""}</span>
          <span class="weeks">${b.weeks}주 차트인</span>
        </a>`).join("")}</div>
    </section>` : "";

  const yearlyHTML = yearly.length > 0 ? `
    <section class="section-pad">
      ${sh("chart", "해마다 피어난 정원")}
      <p class="section-note">이 출판사의 책들이 해마다 책길에 머문 주수를 보여줍니다.</p>
      <div class="bars">${yearly.map(({ year, weeks }) => `
        <a class="bar-row" href="${esc(yearHref(year))}">
          <span class="bar-year">${year}</span>
          <span class="bar-track"><span class="bar-fill" style="--w:${Math.max(6, (weeks / maxY) * 100)}%"></span></span>
          <span class="bar-weeks">${weeks}주</span>
        </a>`).join("")}</div>
    </section>` : "";

  const catHTML = catSectionHTML(byCategory);

  const introHTML = intro && intro.body ? `
    <section class="section-pad publisher-intro">
      <span class="intro-label">출판사 소개</span>
      ${sh("quote", "이 정원이 키워온 책의 결")}
      <div class="intro-body">${intro.body.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      ${intro.keywords ? `<div class="intro-keywords">${intro.keywords.split(",").map((k) => k.trim()).filter(Boolean).map((k) => `<span class="intro-chip">${esc(k)}</span>`).join("")}</div>` : ""}
      <p class="intro-source">출판사 공식 홈페이지 소개를 바탕으로 문장숲 톤에 맞게 정리했습니다.</p>
    </section>` : "";

  root.innerHTML = `
    <main class="book-road-page">
      <div class="wrap wrap-3xl">
        <header class="book-page-header">
          <a class="back-link" href="publishers.html">← 출판사의 정원</a>
          <h1 class="book-title-lg">${esc(name)}</h1>
          <p class="book-meta">${bookCount}권 · ${yearRange} 정원 기록</p>
          <p class="book-hero-desc">이 출판사가 문장숲 책길에 피워낸 흐름을 모았습니다.</p>
        </header>
        <section class="section-pad book-now">
          <div class="book-stats">${statHTML}</div>
        </section>
        ${introHTML}
        ${booksHTML}
        ${yearlyHTML}
        ${catHTML}
        <p class="disclaimer">출판사 표기는 차트 등재 당시 데이터 기준이며, 판권 이동·상호 변경·표기 차이로 일부 다르게 묶일 수 있습니다.</p>
      </div>
      ${slimCtaHTML()}
    </main>`;
}

// ====================================================================
// 라우터
// ====================================================================
async function main() {
  renderNav();
  renderSourceFooter();
  const page = document.body.dataset.page;
  try {
    if (page === "home") await renderHome();
    else if (page === "year") await renderYear();
    else if (page === "book") await renderBook();
    else if (page === "search") await renderSearch();
    else if (page === "authors") await renderAuthors();
    else if (page === "author") await renderAuthor();
    else if (page === "publishers") await renderPublishers();
    else if (page === "publisher") await renderPublisher();
    initReveal();
  } catch (e) {
    console.error(e);
    const root = document.getElementById("page-root");
    if (root) root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">불러오는 중 오류가 발생했습니다.</p></div></main>`;
  }
}

main();
