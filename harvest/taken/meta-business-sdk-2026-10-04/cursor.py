"""Lazy cursor over Graph API paged edges.

PATTERN ADAPTED FROM: facebook/facebook-python-business-sdk @ 26.0.2,
`facebook_business/api.py` class `Cursor`.

Deliberately NOT importing the SDK (135K LOC, 1112 generated files,
Meta-platform-restricted license). This is a clean-room reimplementation
of the pagination pattern in stdlib-only Python, in PING terms.

Usage:
    cur = GraphCursor(fetch, node_id="me", edge="adaccounts",
                      params={"fields": "id,name"})
    for obj in cur:          # lazy: next page fetched only when exhausted
        ...
    print(cur.total_count)   # if the edge returned a summary

`fetch(path, params)` is any callable returning the decoded JSON dict
for a GET to graph.facebook.com. Auth lives in `fetch`, never here.
"""

try:
    from collections.abc import Iterator
except ImportError:  # pragma: no cover
    from collections import Iterator


class GraphCursor(Iterator):
    def __init__(self, fetch, node_id, edge, params=None,
                 include_summary=True):
        self._fetch = fetch
        self._path = "%s/%s" % (node_id, edge)
        self._params = dict(params or {})
        self._include_summary = include_summary
        self._queue = []
        self._finished = False
        self._total_count = None
        self._summary = None

    def __iter__(self):
        return self

    def __next__(self):
        if not self._queue and not self._load_next_page():
            raise StopIteration()
        return self._queue.pop(0)

    # Python 2 compat not needed; kept minimal.

    @property
    def total_count(self):
        return self._total_count

    @property
    def summary(self):
        return self._summary

    def _load_next_page(self):
        """Fetch one page. Returns True if objects were queued."""
        if self._finished:
            return False
        params = dict(self._params)
        if self._include_summary and "summary" not in params:
            params["summary"] = True
        resp = self._fetch(self._path, params) or {}
        paging = resp.get("paging") or {}
        cursors = paging.get("cursors") or {}
        # 'next' present + 'after' cursor => more pages. ('after' alone
        # is not sufficient; the SDK checks both.)
        if "next" in paging and "after" in cursors:
            self._params["after"] = cursors["after"]
        else:
            self._finished = True
        if self._include_summary:
            summary = resp.get("summary") or {}
            if "total_count" in summary:
                self._total_count = summary["total_count"]
            if summary:
                self._summary = summary
        data = resp.get("data") or []
        self._queue = list(data)
        return len(self._queue) > 0

    def first(self):
        for obj in self:
            return obj
        return None
