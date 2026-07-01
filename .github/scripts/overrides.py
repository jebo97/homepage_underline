"""book_overrides 테이블(교정 규칙)을 읽어 종류별 자료구조로 돌려준다.

enrich_book_meta.py / upload_data.py 가 실행 시 이 값을 읽어 하드코딩 기본값 위에 덮어쓴다.
DB 읽기 실패·빈 테이블이면 None 을 반환해, 호출부가 하드코딩 폴백을 쓰도록 한다(CI 안전).
"""

import re

KINDS = ("force_catalog", "naver_query", "skip", "author", "title", "title_regex", "author_prefix")


def load_overrides(sb):
    """(dict) 종류별 규칙. 실패/빈 경우 None."""
    try:
        rows, start = [], 0
        while True:
            r = (sb.table("book_overrides")
                 .select("kind,pattern,value").order("id").range(start, start + 999).execute().data)
            rows += r
            if len(r) < 1000:
                break
            start += 1000
    except Exception:
        return None
    if not rows:
        return None
    out = {"force_catalog": {}, "naver_query": {}, "skip": set(),
           "author": {}, "title": {}, "title_regex": [], "author_prefix": {}}
    for r in rows:
        k, p, v = r.get("kind"), r.get("pattern"), r.get("value")
        if not k or p is None:
            continue
        if k == "skip":
            out["skip"].add(p)
        elif k == "title_regex":
            try:
                out["title_regex"].append((re.compile(p), v or ""))
            except re.error:
                pass
        elif k in ("force_catalog", "naver_query", "author", "title", "author_prefix"):
            out[k][p] = v
    return out
