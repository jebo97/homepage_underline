// 베스트셀러 아카이브 — 정적 프론트엔드 (Supabase 직접 호출)
// 기존 Next.js 서버 컴포넌트 로직을 브라우저용으로 포팅.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 공개(anon) 키 — 클라이언트 노출용. 데이터 보호는 Supabase RLS(읽기 전용)가 담당.
const SUPABASE_URL = "https://xvizopylegaghrcecjgl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2aXpvcHlsZWdhZ2hyY2VjamdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTk2NTIsImV4cCI6MjA5Nzk5NTY1Mn0.sm4s_hGNKHWBTZZZEd2MCTtrbO0R2a7wPtIvQ_1P6Zg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const START_YEAR = 2006;
const END_YEAR = 2025;
const APP_STORE_URL = "https://apps.apple.com/kr/app/id6760542925";
const HOME_URL = "/"; // 메인 홈페이지 (mjgg.airpage.org)

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
function stripTags(s) {
  return String(s ?? "").replace(/<[^>]+>/g, "");
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
  if (variant === "small") {
    return `<form class="search-form small" action="search.html" method="get">
      <input class="search-input" type="search" name="q" value="${esc(value)}" placeholder="검색" aria-label="책 제목, 저자 검색" />
      <button class="search-btn" type="submit" aria-label="검색">검색</button>
    </form>`;
  }
  return `<form class="search-form large" action="search.html" method="get">
    <input class="search-input" type="search" name="q" value="${esc(value)}" placeholder="책 제목이나 저자를 검색해보세요" aria-label="책 제목, 저자 검색" />
    <button class="search-btn" type="submit">검색</button>
  </form>`;
}

function renderNav() {
  const el = document.getElementById("site-nav");
  if (!el) return;
  el.className = "nav";
  el.innerHTML = `<div class="nav-inner">
    <a class="nav-brand" href="index.html">베스트셀러 아카이브</a>
    ${searchFormHTML("small")}
  </div>`;
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
    .map((e) => e.book);
}

async function renderHome() {
  const root = document.getElementById("page-root");
  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
  const rankings = await Promise.all(years.map((y) => getYearRanking(y)));

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

  const STATS = [
    { value: "20", unit: "년", label: "기록 기간 (2006–2025)" },
    { value: "50,401", unit: "", label: "수록 레코드" },
    { value: "9", unit: "개", label: "분야" },
    { value: "164", unit: "주", label: "역대 최장 1위 · 나미야 잡화점의 기적" },
  ];

  const statsHTML = STATS.map((s) => `
    <div class="stat-card">
      <div class="stat-value">${esc(s.value)}<span class="stat-unit">${esc(s.unit)}</span></div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join("");

  const yearsHTML = years.map((year, i) => {
    const book = topBooks[i];
    const titleHTML = book
      ? `<a class="book-title line-clamp-2" href="${esc(bookHref(book.title))}">${esc(book.title)}</a>`
      : `<span class="book-title line-clamp-2">데이터 없음</span>`;
    return `
      <div class="year-card">
        <span class="dot"></span>
        <a class="year-num" href="${esc(yearHref(year))}">${year}</a>
        ${titleHTML}
        <span class="book-author line-clamp-1">${esc(book?.author ?? "—")}</span>
      </div>`;
  }).join("");

  root.innerHTML = `
    <main>
      <div class="wrap wrap-5xl">
        <header class="home-header">
          <h1 class="page-title">한국 베스트셀러 아카이브</h1>
          <div class="accent-divider"></div>
          <p class="subtitle">본 아카이브는 교보문고 주간 베스트셀러를 기반으로 개인이 수집·정리한 데이터입니다.</p>
        </header>
        <div class="search-block">${searchFormHTML("large")}</div>
        <section class="stats-grid">${statsHTML}</section>
        <section class="section-years">
          <h2 class="section-heading">연도별 탐색</h2>
          <p class="section-note">각 카드는 그 해 종합 차트에서 오래 사랑받은 대표작입니다. 직전 연도와 같은 책은 다음 작품으로 표시합니다.</p>
          <div class="year-grid">${yearsHTML}</div>
        </section>
      </div>
      ${ctaFooterHTML({ text: "밑줄긋기 앱과 함께 독서를 기록하세요", label: "App Store에서 다운로드", href: APP_STORE_URL })}
    </main>`;
}

// ====================================================================
// 연도 페이지
// ====================================================================
const HIDDEN_FIELDS_BY_YEAR = { 2008: ["역사문화", "자기계발"] };
const ERA = {
  2006: "성공·재테크 붐의 해", 2007: "자기계발 열풍의 해", 2008: "시크릿 신드롬의 해",
  2009: "가족·감성 문학의 해", 2010: "인문학 열풍의 시작", 2011: "청춘 담론이 폭발한 해",
  2012: "멈춤과 성찰의 해", 2013: "인문·철학 붐의 해", 2014: "감성 소설의 해",
  2015: "자존감·용기의 해", 2016: "사랑과 위로의 해", 2017: "언어와 감성의 해",
  2018: "솔직한 감정의 해", 2019: "여행과 일상의 해", 2020: "코로나와 위로의 해",
  2021: "투자 열풍의 해", 2022: "일상 회복의 해", 2023: "세이노 신드롬의 해",
  2024: "철학과 성찰의 해", 2025: "심리학·고전의 귀환",
};

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
  if (!Number.isInteger(year) || year < START_YEAR || year > END_YEAR) {
    root.innerHTML = `<main><div class="wrap wrap-5xl nav-pad-top"><p class="empty">존재하지 않는 연도입니다. <a class="back-link" href="index.html">← 메인으로</a></p></div></main>`;
    return;
  }
  document.title = `${year}년의 책들 · 베스트셀러 아카이브`;
  const { highlight, top10, byField } = await getYearData(year);
  const hasPrev = year > START_YEAR;
  const hasNext = year < END_YEAR;

  const prevPill = hasPrev
    ? `<a class="pill" href="${esc(yearHref(year - 1))}">← ${year - 1}</a>`
    : `<span class="pill disabled">← ${year - 1}</span>`;
  const nextPill = hasNext
    ? `<a class="pill" href="${esc(yearHref(year + 1))}">${year + 1} →</a>`
    : `<span class="pill disabled">${year + 1} →</span>`;

  const highlightHTML = highlight ? `
    <a class="highlight-card" href="${esc(bookHref(highlight.title))}">
      <div class="eyebrow"><span class="dot"></span><span class="eyebrow-text">올해의 종합 1위 · 1위 최장기간</span></div>
      <h2 class="highlight-title">${esc(highlight.title)}</h2>
      <p class="highlight-meta">${esc(highlight.author ?? "저자 미상")}${highlight.publisher ? ` · ${esc(highlight.publisher)}` : ""}</p>
      <div class="badge-accent">종합 1위 ${highlight.weeks}주</div>
    </a>` : "";

  const top10HTML = top10.length > 0
    ? `<ol class="top10">${top10.map((book, i) => `
        <li>
          <span class="rank-num">${String(i + 1).padStart(2, "0")}</span>
          <div class="info">
            <a href="${esc(bookHref(book.title))}">${esc(book.title)}</a>
            <p>${esc(book.author ?? "저자 미상")}</p>
          </div>
          <span class="weeks">${book.weeks}주</span>
        </li>`).join("")}</ol>`
    : `<p class="muted">데이터 없음</p>`;

  const byFieldHTML = byField.map(({ category, book }) => `
    <div class="field-card">
      <span class="field-name">${esc(category)}</span>
      ${book ? `
        <a class="ft line-clamp-2" href="${esc(bookHref(book.title))}">${esc(book.title)}</a>
        <p class="fa">${esc(book.author ?? "저자 미상")}</p>
        <p class="fw">${book.weeks}주 1위</p>`
      : `<p class="fa" style="margin-top:1rem;color:var(--slate-600)">데이터 없음</p>`}
    </div>`).join("");

  const footPrev = hasPrev
    ? `<a class="back-link" style="font-size:1rem" href="${esc(yearHref(year - 1))}">← ${year - 1}년</a>`
    : `<span style="font-size:1rem;color:var(--slate-700)">← ${year - 1}년</span>`;
  const footNext = hasNext
    ? `<a class="back-link" style="font-size:1rem" href="${esc(yearHref(year + 1))}">${year + 1}년 →</a>`
    : `<span style="font-size:1rem;color:var(--slate-700)">${year + 1}년 →</span>`;

  root.innerHTML = `
    <main>
      <div class="wrap wrap-5xl">
        <header class="year-page-header">
          <div class="year-topbar">
            <a class="back-link" href="index.html">← 메인으로</a>
            <nav class="year-nav">${prevPill}${nextPill}</nav>
          </div>
          <h1 class="page-title year-page-title">${year}년의 책들</h1>
          <p class="era">${esc(ERA[year] ?? "")}</p>
        </header>
        ${highlightHTML}
        <section class="section-pad">
          <h2 class="section-heading">종합 TOP 10</h2>
          <p class="section-note" style="margin-bottom:2.5rem">그 해 종합 차트에 오래 머문 순서 (차트인 주수 기준)</p>
          ${top10HTML}
        </section>
        <section class="section-pad" style="padding-bottom:7rem">
          <h2 class="section-heading" style="margin-bottom:2.5rem">분야별 최다 1위</h2>
          <div class="field-grid">${byFieldHTML}</div>
        </section>
      </div>
      <footer class="cta-footer">
        <div class="cta-inner" style="flex-direction:row;justify-content:space-between;padding:4rem 1.5rem">
          ${footPrev}${footNext}
        </div>
      </footer>
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
  const general = history.filter((r) => r.category === "종합");
  const generalWeeks = general.length;
  const bestRank = general.length ? Math.min(...general.map((r) => r.rank)) : null;
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
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }
  const byCategory = [...catMap.entries()]
    .map(([category, weeks]) => ({ category, weeks }))
    .sort((a, b) => b.weeks - a.weeks || a.category.localeCompare(b.category));

  let companions = [];
  if (firstYear !== null) {
    const { data: companionData } = await supabase
      .from("bestsellers").select("title, author")
      .eq("year", firstYear).eq("category", "종합").neq("title", title).limit(1000);
    const map = new Map();
    for (const r of companionData ?? []) {
      const key = `${r.title}|${r.author ?? ""}`;
      const entry = map.get(key);
      if (entry) entry.weeks += 1;
      else map.set(key, { title: r.title, author: r.author, weeks: 1 });
    }
    companions = [...map.values()]
      .sort((a, b) => b.weeks - a.weeks || a.title.localeCompare(b.title))
      .slice(0, 5);
  }
  return { author, publisher, generalWeeks, bestRank, firstYear, yearlyGeneral, byCategory, companions };
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
    root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">책을 찾을 수 없습니다. <a class="back-link" href="index.html">← 메인으로</a></p></div></main>`;
    return;
  }
  document.title = `${title} · 베스트셀러 아카이브`;
  const [data, naver] = await Promise.all([getBookData(title), getNaverMeta(title)]);
  const { author, publisher, generalWeeks, bestRank, firstYear, yearlyGeneral, byCategory, companions } = data;
  const maxYearlyWeeks = Math.max(1, ...yearlyGeneral.map((y) => y.weeks));
  const fullDescription = naver?.description ? stripTags(naver.description) : "";
  const description = fullDescription.slice(0, 200);

  const naverHTML = naver ? `
    <section class="naver-card">
      <p class="label">📖 현재 판매 정보 (네이버 책 기준)</p>
      <div class="naver-body">
        ${naver.image ? `<img class="naver-cover" src="${esc(naver.image)}" alt="${esc(stripTags(naver.naver_title || title))}" />` : ""}
        <div class="naver-info">
          <h2>${esc(stripTags(naver.naver_title || title))}</h2>
          <p class="na">${esc((naver.naver_author || "").split("^").filter(Boolean).join(", "))}${naver.naver_publisher ? ` · ${esc(naver.naver_publisher)}` : ""}</p>
          ${naver.pubdate ? `<p class="nd">${esc(formatPubdate(naver.pubdate))} 출간</p>` : ""}
          ${description ? `<p class="desc">${esc(description)}${fullDescription.length > 200 ? "…" : ""}</p>` : ""}
          ${naver.link ? `<a class="naver-link" href="${esc(naver.link)}" target="_blank" rel="noopener noreferrer">네이버 책 정보 보기 →</a>` : ""}
        </div>
      </div>
    </section>` : "";

  const historyHTML = generalWeeks > 0 ? `
    <div class="stat3">
      <div class="box"><div class="big">${generalWeeks}<span class="u">주</span></div><div class="cap">종합 차트인</div></div>
      <div class="box"><div class="big">${bestRank}<span class="u">위</span></div><div class="cap">최고 순위</div></div>
      <div class="box"><div class="big">${firstYear ?? "—"}</div><div class="cap">최초 진입</div></div>
    </div>
    <div class="bars">${yearlyGeneral.map(({ year, weeks }) => `
      <a class="bar-row" href="${esc(yearHref(year))}">
        <span class="bar-year">${year}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(6, (weeks / maxYearlyWeeks) * 100)}%"></span></span>
        <span class="bar-weeks">${weeks}주</span>
      </a>`).join("")}</div>`
    : `<p class="muted">종합 차트인 기록이 없습니다.</p>`;

  const catHTML = byCategory.length > 0 ? `
    <section class="section-pad" style="padding-top:6rem">
      <h2 class="section-heading" style="margin-bottom:2.5rem">분야별 기록</h2>
      <div class="cat-list">${byCategory.map(({ category, weeks }) => `
        <div class="cat-row"><span class="cn">${esc(category)}</span><span class="cw">${weeks}주 차트인</span></div>`).join("")}</div>
    </section>` : "";

  const compHTML = companions.length > 0 ? `
    <section class="section-pad" style="padding:6rem 0">
      <h2 class="section-heading" style="margin-bottom:2.5rem">${firstYear}년, 함께 팔린 책들</h2>
      <div class="companions">${companions.map((book) => `
        <a class="companion" href="${esc(bookHref(book.title))}">
          <span class="info"><span class="ct">${esc(book.title)}</span><span class="ca">${esc(book.author ?? "저자 미상")}</span></span>
          <span class="weeks">${book.weeks}주</span>
        </a>`).join("")}</div>
    </section>` : "";

  root.innerHTML = `
    <main>
      <div class="wrap wrap-3xl">
        <header style="padding:5rem 0 4rem">
          <a class="back-link" href="javascript:history.back()">← 뒤로가기</a>
          <h1 class="book-title-lg">${esc(title)}</h1>
          <p class="highlight-meta">${esc(author ?? "저자 미상")}${publisher ? ` · ${esc(publisher)}` : ""}</p>
          <span class="book-badge">당시 기록 기준</span>
        </header>
        ${naverHTML}
        <section class="section-pad" style="padding-top:6rem">
          <h2 class="section-heading" style="margin-bottom:2.5rem">이 책의 베스트셀러 기록</h2>
          ${historyHTML}
        </section>
        ${catHTML}
        ${compHTML}
        <p class="disclaimer">베스트셀러 기록의 출판사·저자 표기는 차트 등재 당시 데이터 기준이며, 판권 이동·개정판 출간 등으로 현재 정보와 다를 수 있습니다.</p>
      </div>
      ${ctaFooterHTML({ narrow: true, text: "이 책, 밑줄긋기 앱에서 기록해보세요", label: "밑줄긋기 앱에서 이 책 기록하기", href: HOME_URL })}
    </main>`;
}

// ====================================================================
// 검색
// ====================================================================
async function searchBooks(query) {
  const pattern = `%${query}%`;
  const rows = await fetchAll(() =>
    supabase.from("bestsellers")
      .select("title, author, publisher, year")
      .eq("category", "종합")
      .or(`title.ilike.${pattern},author.ilike.${pattern}`)
      .order("year", { ascending: true })
      .order("week", { ascending: true })
      .order("rank", { ascending: true })
  );
  const map = new Map();
  for (const r of rows) {
    const key = `${r.title}|${r.author ?? ""}|${r.publisher ?? ""}`;
    const entry = map.get(key);
    if (entry) {
      entry.totalWeeks += 1;
      entry.firstYear = Math.min(entry.firstYear, r.year);
      entry.lastYear = Math.max(entry.lastYear, r.year);
    } else {
      map.set(key, { title: r.title, author: r.author, publisher: r.publisher, totalWeeks: 1, firstYear: r.year, lastYear: r.year });
    }
  }
  return [...map.values()].sort((a, b) => b.totalWeeks - a.totalWeeks || a.title.localeCompare(b.title));
}

async function renderSearch() {
  const root = document.getElementById("page-root");
  const query = (new URLSearchParams(location.search).get("q") || "").trim();
  if (query) document.title = `'${query}' 검색 · 베스트셀러 아카이브`;

  // 헤더 먼저 그리고, 결과는 비동기로 채운다.
  root.innerHTML = `
    <main>
      <div class="wrap wrap-3xl">
        <header style="padding:5rem 0 3rem">
          <a class="back-link" href="index.html">← 메인으로</a>
          <h1 class="page-title" style="font-size:1.875rem;margin:3rem 0 2rem">검색</h1>
          ${searchFormHTML("large", query)}
        </header>
        <section id="search-results" style="padding-bottom:6rem">
          ${query ? `<p class="loading">검색 중…</p>` : ""}
        </section>
      </div>
    </main>`;

  if (!query) return;
  const results = await searchBooks(query);
  const box = document.getElementById("search-results");
  if (results.length === 0) {
    box.innerHTML = `<p class="empty">‘${esc(query)}’에 대한 검색 결과가 없습니다</p>`;
    return;
  }
  box.innerHTML = `
    <p class="results-count">‘${esc(query)}’ 검색 결과 ${results.length}건</p>
    <div class="results">${results.map((book) => {
      const period = book.firstYear === book.lastYear
        ? `${book.firstYear}년` : `${book.firstYear}–${book.lastYear}년`;
      return `<a class="result" href="${esc(bookHref(book.title))}">
        <span class="rt">${esc(book.title)}</span>
        <span class="rmeta">${esc(book.author ?? "저자 미상")}${book.publisher ? ` · ${esc(book.publisher)}` : ""}</span>
        <span class="rstats"><span>종합 <span class="accent">${book.totalWeeks}</span>주 차트인</span><span class="sep">·</span><span>${period}</span></span>
      </a>`;
    }).join("")}</div>`;
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
  } catch (e) {
    console.error(e);
    const root = document.getElementById("page-root");
    if (root) root.innerHTML = `<main><div class="wrap wrap-3xl nav-pad-top"><p class="empty">불러오는 중 오류가 발생했습니다.</p></div></main>`;
  }
}

main();
