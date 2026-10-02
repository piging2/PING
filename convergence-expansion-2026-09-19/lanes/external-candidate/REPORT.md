# External Capability Candidate Evaluation

- Date: 2026-09-19 (MDT)
- Lane: external-candidate (discovery quota, NOT integration quota)
- Investigator: Pigi subagent
- Grounding: the worktree path from the task (`/home/nolan/worktrees/constitutional-convergence-authority-law`, HEAD 1995f0a59) is not present on this VM, so no worktree file was read, edited, cloned into, or otherwise touched. No submodules added, no Compose files touched. All authority-law citations below come from the standing record (AGENTS.md, MEMORY.md, alignment synthesis), which is the durable source. Authority-risk judgments are therefore grounded in Nolan's stated constitutional law, not in unverified worktree code.

---

## Candidate 1: MarkItDown

- **NAME:** MarkItDown
- **REPOSITORY:** https://github.com/microsoft/markitdown
- **LICENSE:** MIT (Microsoft Corporation). Confirmed in the cloned repo's LICENSE file and via GitHub API (`spdx_id: MIT`).
- **ACTIVE/STALE:** ACTIVE. GitHub API: pushed 2026-09-16T17:23:11Z (3 days before this evaluation), 185,629 stars, not archived, default branch `main`.
- **CAPABILITY:** Stateless file-to-Markdown converter built for LLM pipelines. Converters observed in the cloned tree (`packages/markitdown/src/markitdown/converters/`): pdf, docx, pptx, xlsx, epub, html, csv/json/xml, images (EXIF metadata, OCR), audio (transcription), zip, Outlook msg, ipynb, rss, YouTube, Wikipedia, Bing SERP, Azure Doc Intel. Format-specific dependencies are opt-in extras (core install excludes pdf/docx deps; the CLI prints a typed error naming the missing extra). Ships an MCP server subpackage (`markitdown-mcp`) and a sample plugin. The README carries an explicit security note: it performs I/O with the privileges of the current process and callers must sanitize inputs in untrusted environments.
- **WHY PING NEEDS IT:** PING's intelligence pipeline (outreach engine, Meta AI intel pass, new-business radar) ingests raw artifacts: Colorado SOS filings, city clerk license lists, chamber announcements, business PDFs, rate sheets. Observation extraction starts from LLM-consumable text; the machinery today works on page text. Binary documents are a genuine gap in artifact coverage. MarkItDown closes exactly that gap: binary artifact to Markdown to observation extraction with full evidence lineage. (This need statement is INFERENCE from the standing record, not a worktree-verified fact.)
- **OVERLAP WITH PING:** Minimal. It produces a DERIVED representation of an artifact, the same layer as embeddings and projections. It does not touch event acceptance, identity, ordering, journaling, missions, or knowledge claims. It competes with no PING authority and duplicates no PING implementation.
- **AUTHORITY RISK:** Near zero, with evidence. It is stateless: no journal, no identity minting, no ordering claims, no persistence, no self-certification. The only network-touching pieces are opt-in converters (YouTube, Wikipedia, Bing SERP, RSS), which the adapter disables by construction. It cannot become a competing authority because it claims none of the decisions the constitution assigns.
- **SECURITY RISK:** Moderate, manageable. Classic document-parser attack surface across pdfminer.six, mammoth, openpyxl and friends; the README itself warns it runs with process privileges. Mitigations in the proposed boundary: run in an isolated worker, no outbound network, file-type allowlist, size caps, timeouts, pinned versions with CVE scanning of transitive deps, install only the needed extras, SSRF-class converters excluded.
- **INTEGRATION COST:** Low. Python package or CLI behind a thin adapter. Dependency weight is controlled via extras.
- **PROPOSED BOUNDARY:** PING mission (artifact ingest) to adapter to MarkItDown to Markdown artifact to observation-extraction mission to OBSERVATION_CREATED events to PING. Adapter contract: pinned version with SHA recorded in provenance; `convert_local`/`convert_stream` only; network converters disabled; output labeled DERIVED with the source file's hash; the original bytes remain the source truth; conversion failure yields a typed UNPARSEABLE artifact state, never a silent empty result; Markdown artifacts are rebuildable cache and safe to delete. MarkItDown never writes events, never mints identities, never orders anything. Removal path: delete the adapter and the dependency; all canonical truth stays in `ping_events`.
- **ISOLATED PROOF** (executed 2026-09-19, venv `/tmp/mid-proof`, markitdown 0.1.7, offline):
  - HTML page with heading and table to Markdown, structure preserved: PASS
  - CSV to Markdown table: PASS
  - Text-layer PDF (hand-crafted, 467 bytes) to text: PASS (required the `markitdown[pdf]` extra)
  - DOCX without the `[docx]` extra: clean typed error naming the missing extra: PASS (correct failure semantics; confirms the opt-in dependency model)
  - Limits, stated honestly: scanned/image PDFs need external OCR (`markitdown-ocr` package or Azure Doc Intel, not tested here); complex-PDF fidelity is a known weakness (third-party benchmark cited roughly 25% success on complex PDFs; treat as weak indication, not PING-verified).
- **VERDICT:** HARVEST MECHANISM. Cloned to `~/workspace/convergence-expansion-2026-09-19/harvest/markitdown/` (SHA 945314a45ddbe02935f2fd287b797dc0ba4a01e4) with `PROVENANCE.txt`. The clone grants the repo zero authority. Adapter shape designed above. Production wiring is NOT proposed.

### Production wiring checklist (Nolan's 7 gates) for MarkItDown

1. Clear capability gain: PLAUSIBLE, NOT PROVEN (needs an isolated proof on real SOS/chamber artifacts).
2. License compatibility: EVIDENCED (MIT).
3. Security review: PARTIAL (attack surface mapped, mitigations designed; full review and CVE scan not done).
4. Authority boundary: DESIGNED (above), NOT TESTED.
5. Tests: NONE.
6. Failure semantics: DESIGNED (typed UNPARSEABLE), NOT PROVEN at adapter level.
7. Removal path: DESIGNED (delete adapter plus dependency; truth stays in `ping_events`).

Conclusion: wiring NOT proposed. Next step, only on Nolan's word: isolated proof on real artifacts, then the checklist, then his authorization.

---

## Candidate 2: Temporal (documented reject case)

- **NAME:** Temporal
- **REPOSITORY:** https://github.com/temporalio/temporal
- **LICENSE:** MIT (GitHub API `spdx_id: MIT`).
- **ACTIVE/STALE:** ACTIVE. GitHub API: pushed 2026-09-19T12:01:03Z (today), 23,175 stars, not archived. Serious and well maintained.
- **CAPABILITY:** Durable workflow execution. Workflow history persisted as an event-sourced source of truth; replay-based recovery; activities, signals, queries, timers, schedules. Publicly documented model: "the history is the source of truth, and it survives the crash."
- **WHY IT LOOKS ATTRACTIVE:** PING wants durable agent execution and replay; Temporal is the industry gold standard for that pattern, and its workflow/activity determinism discipline is genuinely good design.
- **OVERLAP WITH PING:** Total on the execution/journal plane. Temporal's workflow history is an independent canonical event journal with its own ordering, its own identity scheme (workflow and activity IDs), and its own replay semantics. PING's standing law assigns: UnifiedEventRuntime as canonical event acceptance authority, `ping_events` as the authoritative constitutional journal, PostgreSQL sequence / UER acceptance as authoritative event ordering, and MissionScheduler/WorkerRuntime as execution-routing authority.
- **AUTHORITY RISK:** FATAL. Multi-runtime rule (Nolan, 2026-09-19): "MANY EXECUTORS, ONE CONSTITUTIONAL AUTHORITY. No executor gets an independent canonical event journal, mission authority, or self-certification." Temporal's durability REQUIRES its history to be the source of truth; subordinating that history to `ping_events` breaks its replay guarantees, and keeping both creates two ordering authorities plus identity reminting (one logical mission becoming both a Temporal workflow identity and a PING event identity). That is exactly the defect the convergence program exists to eliminate: one logical event, one canonical identity. Rent rule: PING already solved durable mission execution locally (MissionRuntime plus journal); Temporal closes no reproduced invariant.
- **SECURITY RISK:** Not the deciding factor; a self-hosted cluster is operable, but irrelevant given the authority collision.
- **INTEGRATION COST:** Very high: dedicated Go cluster, SDKs, operational burden, and a second journal to reconcile forever.
- **PROPOSED BOUNDARY:** None viable. A "Temporal as dumb executor" wrapper cannot hold: its journal is load-bearing for its own guarantees. Any boundary preserving Temporal's value violates one-authority-per-decision; any boundary preserving PING's constitution strips Temporal's value.
- **VERDICT:** REJECT WITH EVIDENCE. Not cloned (no harvest value beyond documented design study). The only harvestable input is a design note: Temporal's determinism discipline (no raw clock or randomness in orchestration code; non-determinism isolated in activities whose results are recorded) is worth keeping in mind as PING hardens its own replay semantics, but that is already PING's domain and needs no dependency.

---

## Files produced

- Harvest clone: [harvest/markitdown](sandbox://workspace/convergence-expansion-2026-09-19/harvest/markitdown) (includes `PROVENANCE.txt`; read-only study copy, zero authority)
- This report: `~/workspace/convergence-expansion-2026-09-19/lanes/external-candidate/REPORT.md`

## Notes

- Discovery quota satisfied for 2026-09-19: two candidates evaluated, one harvested, one rejected with evidence.
- No production wiring is proposed for either candidate. Any future wiring needs all seven gates evidenced plus Nolan's explicit word.
- Suggested follow-up (needs Nolan's call, not done here): isolated proof converting real SOS filing PDFs and chamber-list spreadsheets through the proposed adapter shape, to move gate 1 from PLAUSIBLE to PROVEN or FALSIFIED.
