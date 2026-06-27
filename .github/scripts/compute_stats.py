#!/usr/bin/env python3
"""bestsellers 를 집계해 분석용 요약 테이블을 채운다.

현재 대상:
    - author_stats : 저자별 종합 차트 집계 (명예의 전당용)

매번 5만 행을 클라이언트에서 훑지 않도록, 무거운 집계는 여기서 미리 계산해
작은 요약 테이블에 넣어둔다(book_meta 와 동일한 패턴). 월간 워크플로에서 갱신.

사용법:
    python scripts/compute_stats.py

준비:
    - .env.local 에 SUPABASE_SERVICE_ROLE_KEY
    - 요약 테이블 생성 (scripts/create_author_stats.sql)
    - pip install supabase
"""

from __future__ import annotations  # str | None 등 신문법을 구버전 파이썬에서도 허용

import datetime
import os
import sys
from collections import defaultdict
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("supabase 라이브러리가 없습니다: pip install supabase")

SUPABASE_URL = "https://xvizopylegaghrcecjgl.supabase.co"


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


def fetch_all(supabase: Client, columns: str, *, category: str | None = None):
    """bestsellers 전체를 페이지네이션으로 받는다."""
    PAGE = 1000
    rows, start = [], 0
    while True:
        q = supabase.table("bestsellers").select(columns)
        if category is not None:
            q = q.eq("category", category)
        # 안정적(고유) 정렬 없이 offset 페이징하면 행이 중복/누락된다 → id(PK)로 정렬
        resp = q.order("id").range(start, start + PAGE - 1).execute()
        batch = resp.data or []
        rows += batch
        if len(batch) < PAGE:
            break
        start += PAGE
    return rows


def compute_author_stats(supabase: Client) -> int:
    """종합 차트 기준 저자별 집계 → author_stats upsert."""
    rows = fetch_all(supabase, "title, author, year, rank", category="종합")
    print(f"종합 행수: {len(rows)}")

    agg = defaultdict(lambda: {
        "chartin": 0, "one": 0, "titles": defaultdict(int), "years": set(),
    })
    for r in rows:
        a = r.get("author")
        if not a:
            continue
        s = agg[a]
        s["chartin"] += 1
        s["years"].add(r["year"])
        if r.get("rank") == 1:
            s["one"] += 1
        s["titles"][r["title"]] += 1

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    out = []
    for author, s in agg.items():
        top_title = max(s["titles"].items(), key=lambda x: x[1])[0]
        out.append({
            "author": author,
            "chartin_weeks": s["chartin"],
            "one_weeks": s["one"],
            "book_count": len(s["titles"]),
            "first_year": min(s["years"]),
            "last_year": max(s["years"]),
            "top_title": top_title,
            "updated_at": now_iso,
        })

    # 클린 리빌드: 기존 행 전체 삭제 후 재적재 (저자 병합·삭제를 반영, 잔존행 방지)
    supabase.table("author_stats").delete().neq("author", "__rebuild__").execute()
    for i in range(0, len(out), 500):
        supabase.table("author_stats").upsert(out[i:i + 500], on_conflict="author").execute()
    print(f"author_stats 적재: {len(out)}명")
    return len(out)


def main() -> None:
    load_env_local()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        sys.exit("SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.")
    supabase = create_client(SUPABASE_URL, key)
    compute_author_stats(supabase)
    print("완료.")


if __name__ == "__main__":
    main()
