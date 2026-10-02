# Decisions

Append-only. Meaningful current decisions only.

Format: DATE / DECISION / WHY / ALTERNATIVES REJECTED / REVISIT TRIGGER.

Do not create a new file per decision. If the fact can be derived from code or tests: generate it. If it can be enforced by a test: test it. If it is historical: leave it in PING.

---

## 2026-10-02 / Harvest PING into piging2, keep PING as archaeology

WHY: years of PING work contain proven executable value buried in architectural weight; FYD needs a small core it can actually run.
ALTERNATIVES REJECTED: cp -R (imports the weight); greenfield rewrite (loses proven tests and hard-won invariants).
REVISIT TRIGGER: if harvest stalls and FYD frontier is blocked by missing core pieces, widen one P0 slice at a time.

## 2026-10-02 / One implementation per primitive; test duplicates, keep the proven owner

WHY: PING contains competing implementations of the same primitives; copying both re-creates the confusion.
ALTERNATIVES REJECTED: copying both "just in case".
REVISIT TRIGGER: a kept implementation fails its tests in piging2 context.
