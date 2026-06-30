#!/usr/bin/env python3
"""bestsellers 의 고유 제목마다 네이버 책 정보를 찾아 book_meta 테이블에 적재한다.

기존 book/[id] 페이지의 실시간 네이버 매칭 로직을 그대로 포팅한 것으로,
정적 프론트엔드가 네이버를 직접 호출하지 않고 book_meta 만 읽도록 만들기 위함이다.
(NAVER 시크릿은 이 스크립트에서만 사용되고 클라이언트에는 노출되지 않는다.)

사용법:
    python scripts/enrich_book_meta.py            # 미처리 제목만 (신규 채우기)
    python scripts/enrich_book_meta.py --force    # 전체 재적재 (미매칭은 matched=false 로 덮어씀)
    python scripts/enrich_book_meta.py --refresh  # 전체 재조회, 단 매칭 성공 시에만 갱신
                                                  # (개정판·리커버 반영용. 일시적 실패 시 기존 정보 보존)

준비:
    - .env.local 에 SUPABASE_SERVICE_ROLE_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
    - Supabase 에 book_meta 테이블 생성 (scripts/create_book_meta.sql)
    - pip install supabase
"""

import datetime
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("supabase 라이브러리가 없습니다: pip install supabase")

SUPABASE_URL = "https://xvizopylegaghrcecjgl.supabase.co"
NAVER_API = "https://openapi.naver.com/v1/search/book.json"
THROTTLE = 0.12  # 초당 ~8건 (네이버 한도 보호)

# 자동 매칭 불가 제목의 수동 매핑 (book/[id]/page.tsx 와 동일)
NAVER_TITLE_OVERRIDES = {
    "지적 대화를 위한 넓고 얕은 지식: 현실너머 편": "지적 대화를 위한 넓고 얕은 지식 2",
}

# 특정 제목은 매칭 로직과 무관하게 지정한 네이버 카탈로그로 강제 고정한다.
# (예: 절판된 원판 대신 현재 판매 중인 판본으로 연결하고 싶을 때. 값=카탈로그 ID)
NAVER_FORCE_CATALOG = {
    "녹나무의 파수꾼": "49023649618",  # 2020 원판 대신 2024 무선제본특별판으로 연결
    "위험한 비너스": "49366169643",    # 제목·출판사 바뀐 개정판('아름답고 위험한 이름, 비너스', 하빌리스)
    "서랍에 저녁을 넣어 두었다": "32463129802",  # 일반몰 1곳뿐인 신판 대신 전문서점판(2013 원판, 문학과지성사)
    "소년이 온다": "32491401626",  # 일반몰 1곳뿐인 신판 대신 전문서점판(2014 원판, 창비)
    "베르나르 베르베르의 상상력 사전": "32484721809",  # 만화/아동 각색판(별천지) 대신 텍스트 원서(열린책들)
    "구해줘": "32436136952",  # 절판된 2010판 대신 현재 판매중 2022판(밝은세상)
    "1Q84 1": "32485940318",  # 일반몰 신판 대신 전문서점 판매판(2009 원판, 문학동네)
    "나의 한국현대사": "32487158133",  # 절판된 2014 원판 대신 현재 판매 개정증보판(1959-2020, 돌베개)
    "마시멜로 이야기(어린이를 위한)": "32493599085",  # 성인판 오매칭 방지, 어린이판(깊은책속옹달샘)으로 지정
}

# 제목은 같지만 저자가 다른 책으로 오매칭되는 제목들 — 네이버 조회를 건너뛰고 강제로 비운다.
# (예: 법정 스님 책이 동명의 다른 저자 책으로 잡히는 경우. 잘못된 표지/설명 노출 방지)
NAVER_SKIP_TITLES = {
    "무소유",
    "산에는 꽃이 피네",
    "숫타니파타",
    "아름다운 마무리",
    "인연 이야기",
}


def load_env_local() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# ---------- 매칭 로직 (book/[id]/page.tsx 포팅) ----------
_KEEP = re.compile(r"[^0-9a-z가-힣]")
_TAGS = re.compile(r"<[^>]+>")
_PARENS = re.compile(r"\([^)]*\)")
_VOL = re.compile(r"[가-힣]\s+(\d{1,2})\s*(?:$|[:\-–—])")  # 끝 또는 부제 구분자(:,-) 앞의 권번호
_EDITION = re.compile(r"큰글자|큰글씨|세트|합본|박스|특별판|한정판|영문판")


def strip_tags(s: str) -> str:
    return _TAGS.sub("", s or "")


def normalize_for_match(s) -> str:
    return _KEEP.sub("", _TAGS.sub("", (s or "")).lower())


def parse_title(s):
    cleaned = _PARENS.sub("", _TAGS.sub("", s or "")).strip()
    # 네이버 제목에 권번호가 중복되는 경우('흔한남매 5 5', '… 6 6') 하나로 보정해 권 매칭이 깨지지 않게 한다.
    cleaned = re.sub(r"(\d+)\s+\1(?=\s|$)", r"\1", cleaned)
    vol = 1
    text = cleaned
    m = _VOL.search(cleaned)
    if m:
        vol = int(m.group(1))
        text = cleaned[: m.start() + 1]  # 한글 글자까지 포함
    return {"core": _KEEP.sub("", text.lower()), "vol": vol}


def pick_best_match(items, title, author, publisher):
    if not items:
        return None
    db_title = parse_title(title)
    db_author = normalize_for_match(author)
    db_publisher = normalize_for_match(publisher)

    def title_score(it):
        t = parse_title(it.get("title", ""))
        if t["core"] == "" or db_title["core"] == "":
            return 0
        overlaps = (
            t["core"] == db_title["core"]
            or db_title["core"] in t["core"]
            or t["core"] in db_title["core"]
        )
        if not overlaps:
            return 0
        if t["vol"] != db_title["vol"]:
            return 0
        return 3 if t["core"] == db_title["core"] else 1

    def author_score(it):
        if db_author == "":
            return 0
        authors = [normalize_for_match(a) for a in it.get("author", "").split("^")]
        authors = [a for a in authors if a]
        if not authors:
            return 0
        def matches(a):
            return db_author in a or a in db_author
        if matches(authors[0]):
            return 3
        if any(matches(a) for a in authors):
            return 1
        return 0

    def publisher_matches(it):
        p = normalize_for_match(it.get("publisher", ""))
        return db_publisher != "" and p != "" and (db_publisher in p or p in db_publisher)

    def edition_penalty(it):
        return 1 if _EDITION.search(normalize_for_match(it.get("title", ""))) else 0

    best, best_score, best_title, best_author = None, -1, 0, 0
    for it in items:
        t = title_score(it)
        a = author_score(it)
        score = t + a + (1 if publisher_matches(it) else 0) - edition_penalty(it)
        if score > best_score:
            best_score, best_title, best_author, best = score, t, a, it

    confident = best_title >= 3 or (best_title >= 1 and best_author >= 1)
    return best if confident else None


def fetch_naver_items(query, client_id, client_secret):
    url = f"{NAVER_API}?query={urllib.parse.quote(query)}&display=100"
    req = urllib.request.Request(url, headers={
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("items", []) or []
    except Exception as e:  # noqa: BLE001
        print(f"    [네이버 호출 실패] {query!r}: {e}")
        return []


# 본책이 아닌 형태(묶음·큰글자판·부가상품)는 '현재 읽을 판본' 선택에서 제외한다.
_EXCLUDE_FORM = re.compile(r"세트|합본|박스|전집|큰글자|큰글씨|필사집|필사노트|워크북|문제집|가이드북|컬러링")
# 외국어판(번역 역수입 등)은 한국어 원서 선택에서 제외한다. 한자/가나 스크립트는
# 한국어 책 제목(예: 마법천자문)에도 흔히 섞여 오판하므로, 네이버가 붙이는 명시적
# 언어·지역 '○○판' 표기로만 판별한다.
_FOREIGN_EDITION = re.compile(
    r"대만판|중문판|중국어판|영문판|영어판|영국판|미국판|일본어판|일어판"
    r"|불어판|프랑스어판|독일어판|독어판|이탈리아어판|스페인어판|러시아어판"
    r"|베트남어판|태국어판|아랍어판|포르투갈어판|네덜란드어판"
)


def _author_matches(item, author):
    """후보의 저자가 DB 저자와 일치하는지(동명이서 다른 책 오선택 방지). 저자 정보 없으면 통과."""
    db = normalize_for_match(author)
    if not db:
        return True
    authors = [normalize_for_match(a) for a in (item.get("author") or "").split("^")]
    return any(a and (db in a or a in db) for a in authors)


def get_naver_book(title, author, publisher, client_id, client_secret, force_catalog=None):
    no_parens = re.sub(r"\s+", " ", _PARENS.sub("", title)).strip()
    compact = re.sub(r"\s+", "", title)
    candidates = [
        no_parens,
        title,
        compact,
        f"{title} {author}" if author else None,
        author,
    ]
    seen, queries = set(), []
    for q in candidates:
        if not q or not q.strip():
            continue
        k = q.strip()
        if k in seen:
            continue
        seen.add(k)
        queries.append(k)

    # 1) 후보 수집. 유효 매칭이면서 저자까지 맞는 후보가 나오는 질의에서 멈춘다
    #    (호출 절약 + 동명이서 책에서의 조기 종료 방지).
    pool = {}
    for query in queries:
        items = fetch_naver_items(query, client_id, client_secret)
        time.sleep(THROTTLE)
        for it in items:
            if force_catalog and force_catalog in (it.get("link") or ""):
                return it  # 수동 지정 카탈로그는 항상 최우선(드문 예외 처리용)
            key = it.get("isbn") or it.get("link")
            if key and key not in pool:
                pool[key] = it
        if any(pick_best_match([it], title, author, publisher) and _author_matches(it, author)
               for it in pool.values()):
            break
    items_all = list(pool.values())
    if not items_all:
        return None

    # 2) 이 책이 맞는 후보만(제목·권차·저자 신뢰) 추리고, 묶음/큰글자판/부가상품 제외
    valid = [it for it in items_all if pick_best_match([it], title, author, publisher)]
    preferred = [it for it in valid
                 if not _EXCLUDE_FORM.search(normalize_for_match(it.get("title", "")))
                 and not _FOREIGN_EDITION.search(it.get("title", ""))]

    # 3) 현재 판본 우선(스크래핑 없이 API 정보만):
    #    제목 정확일치 → 저자 일치 → 판매중(가격 있음) → 최신 출간일
    pool_pref = preferred or valid
    if pool_pref:
        db_core = parse_title(title)["core"]
        exact = [it for it in pool_pref if parse_title(it.get("title", ""))["core"] == db_core]
        pool_pref = exact or pool_pref
        author_ok = [it for it in pool_pref if _author_matches(it, author)]
        pool_pref = author_ok or pool_pref
        in_print = [it for it in pool_pref if (it.get("discount") or "0") not in ("", "0")]
        pool_pref = in_print or pool_pref
        return sorted(pool_pref, key=lambda it: (it.get("pubdate") or ""), reverse=True)[0]

    # 4) 폴백: 기존 best-match 로직(묶음/판본 포함)
    return pick_best_match(items_all, title, author, publisher)


# ---------- 데이터 수집 ----------
def fetch_representatives(supabase: Client):
    """제목별 대표 author/publisher (최초 등재행 기준) 를 모은다.

    book/[id] 의 getBookData 처럼 (year asc, week asc) 첫 행을 대표로 쓴다.
    """
    PAGE = 1000
    reps = {}
    start = 0
    while True:
        resp = (
            supabase.table("bestsellers")
            .select("title, author, publisher, year, week")
            # year,week 는 고유하지 않아 페이징 시 중복/누락 → id 로 총정렬을 보장
            .order("year", desc=False)
            .order("week", desc=False)
            .order("id", desc=False)
            .range(start, start + PAGE - 1)
            .execute()
        )
        batch = resp.data or []
        for r in batch:
            t = r["title"]
            if t not in reps:  # 정렬상 먼저 온 행 = 최초 등재행
                reps[t] = {"author": r.get("author"), "publisher": r.get("publisher")}
        if len(batch) < PAGE:
            break
        start += PAGE
    return reps


def existing_titles(supabase: Client):
    PAGE = 1000
    titles, start = set(), 0
    while True:
        resp = supabase.table("book_meta").select("title").range(start, start + PAGE - 1).execute()
        batch = resp.data or []
        titles.update(r["title"] for r in batch)
        if len(batch) < PAGE:
            break
        start += PAGE
    return titles


def main():
    force = "--force" in sys.argv
    refresh = "--refresh" in sys.argv  # 전체 재조회 + 매칭 성공 시에만 갱신(다운그레이드 안 함)
    process_all = force or refresh
    load_env_local()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    cid = os.environ.get("NAVER_CLIENT_ID")
    csec = os.environ.get("NAVER_CLIENT_SECRET")
    if not key:
        sys.exit("SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.")
    if not cid or not csec:
        sys.exit("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가 필요합니다.")

    supabase = create_client(SUPABASE_URL, key)

    print("고유 제목·대표정보 수집 중…")
    reps = fetch_representatives(supabase)
    titles = sorted(reps.keys())
    print(f"고유 제목: {len(titles)}개")

    done = set() if process_all else existing_titles(supabase)
    if done:
        print(f"이미 적재됨(건너뜀): {len(done)}개")
    todo = [t for t in titles if t not in done]
    mode = "refresh(매칭 성공 시에만 갱신)" if refresh else ("force(전체 덮어쓰기)" if force else "신규만")
    print(f"모드: {mode} / 이번에 처리할 제목: {len(todo)}개\n")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    matched_cnt, batch, BATCH = 0, [], 100
    for i, title in enumerate(todo, 1):
        # 오매칭 방지 스킵 목록: 네이버 조회 없이 강제로 비운다(기존 잘못된 값도 덮어씀).
        if title in NAVER_SKIP_TITLES:
            batch.append({
                "title": title, "matched": False, "updated_at": now_iso,
                "naver_title": None, "naver_author": None, "naver_publisher": None,
                "pubdate": None, "image": None, "link": None, "description": None,
            })
            continue
        rep = reps[title]
        search_title = NAVER_TITLE_OVERRIDES.get(title, title)
        nv = get_naver_book(search_title, rep["author"], rep["publisher"], cid, csec,
                            force_catalog=NAVER_FORCE_CATALOG.get(title))
        # refresh 모드: 매칭 실패 시 기존 정보를 덮어쓰지 않고 보존(다운그레이드 방지)
        if not nv and refresh:
            if i % 50 == 0 or i == len(todo):
                print(f"  {i}/{len(todo)} 처리 (매칭 {matched_cnt})")
            continue
        row = {"title": title, "matched": bool(nv), "updated_at": now_iso}
        if nv:
            matched_cnt += 1
            row.update({
                "naver_title": nv.get("title"),
                "naver_author": nv.get("author"),
                "naver_publisher": nv.get("publisher"),
                "pubdate": nv.get("pubdate"),
                "image": nv.get("image"),
                "link": nv.get("link"),
                "description": nv.get("description"),
            })
        batch.append(row)
        if i % 50 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)} 처리 (매칭 {matched_cnt})")
        if len(batch) >= BATCH:
            supabase.table("book_meta").upsert(batch, on_conflict="title").execute()
            batch = []
    if batch:
        supabase.table("book_meta").upsert(batch, on_conflict="title").execute()

    print(f"\n완료: {len(todo)}개 처리, {matched_cnt}개 네이버 매칭 성공")


if __name__ == "__main__":
    main()
