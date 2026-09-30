# BLOCK 40–60 — SCRIPT DRAFT (evidence-native)

**Headline: [NOLAN'S PICK — H1 / H2 / H3. Script is headline-agnostic; slot the pick in only on his word. Never invent a stronger headline than the evidence map supports.]**

Register: technical credibility for senior engineers. Spoken draft; every atomic claim is ledgered in `claim-ledger-40-60.json` (CL-01 … CL-23). Nothing below asserts anything outside the 11-entry evidence map; non-claims N1–N7 are respected throughout.

---

## Part 1 — The default is overridable. [CL-01, CL-02, CL-03, CL-04, CL-20]

We sealed our journal with ALTER ROLE ... SET default_transaction_read_only = on. Fresh session, try an INSERT, and you get the error: cannot execute INSERT in a read-only transaction. That part is real, and we verified it on a disposable database before we trusted it. [CL-01]

Then we tried lifting it. SET default_transaction_read_only = off in the same session: the INSERT succeeds. START TRANSACTION READ WRITE: the INSERT succeeds. [CL-02, CL-03]

The parameter's context is USERSET, which means any role can change it for its own session — that is the documented behavior, not just our trial. [CL-04] The documentation says the parameter "controls the default read-only status of each new transaction." The word "default" was doing the load-bearing work the whole time. What we had was a session default, not a privilege boundary. [CL-20]

## Part 2 — Our own doc over-claimed. [CL-05, CL-06, CL-07]

This is the uncomfortable part. Our own retirement doc said the setting "binds even superusers." [CL-06] We tested that too. A superuser in a fresh session is bound by the default — the INSERT fails. Then the superuser runs SET and lifts it at will. We ran both trials. So the doc's statement, as a claim about PostgreSQL, was wrong. [CL-05]

Fairness requires the other half. The doc framed the claim as scoped to our application's connection pattern — the doc's author's understanding was that the app never issues SET or START TRANSACTION. [CL-07] We have not verified that in the gateway code. That link is unverified, and we are saying so, because the difference between "the doc assumed the app behaves this way" and "we verified the app behaves this way" is exactly the kind of gap this piece is about.

If you run ALTER ROLE ... SET default_transaction_read_only = on and tell yourself you have sealed the database, check what you actually have.

## Part 3 — REVOKE is the boundary. For non-superuser roles. [CL-08, CL-09, CL-10, CL-11, CL-21, CL-23]

What actually stopped writes in our trials? REVOKE INSERT, UPDATE, DELETE, TRUNCATE on the table, from a non-superuser role. That blocked every write we attempted, including inside an explicitly requested READ WRITE transaction. [CL-08] Permission checks are enforced at the privilege layer; the read-only default is enforced at the transaction layer, and the session controls its own transaction layer. That is the demonstrated contrast — not a recommendation from the manual, a contrast we ran on one rig: the setting is a default the role can lift; the revocation is a boundary the role cannot cross. [CL-23]

Now the scope limit, stated plainly, because it is the most important sentence in this piece: this holds for non-superuser roles only. Superusers bypass permission checks. That is documented PostgreSQL behavior — we did not trial it, we are citing the docs. [CL-09] Which means REVOKE cannot bind a superuser. And our own journal role is a superuser. [CL-10]

So here is the honest description of our own seal, in the exact terms our evidence supports: the session default is verified present in the role settings and active in a fresh session. The application discipline it depends on is unverified — we have not read the gateway code. The append-only triggers on the journal are verified present; we have not tested whether they actually block UPDATE and DELETE. [CL-11]

That is not a privilege boundary. We are not claiming our journal is unsealed, and we are not claiming it is sealed. We are claiming exactly what we verified, and naming what we did not. [CL-21]

## Part 4 — Two precision beats. [CL-12, CL-13, CL-14, CL-15, CL-22]

First: the read-only boundary is narrower than it sounds, in both directions. CREATE TEMP TABLE inside a read-only transaction fails — we tried it. [CL-12] But INSERT and COPY FROM on a temp table that already exists succeed. The exemption is DML on existing temp tables, not DDL. [CL-13] A secondary source we read overstated this as a general temp-table exemption; the trials corrected it to the narrower truth. [CL-22]

Second: some things we expected to be blocked were not. Advisory locks and LISTEN/NOTIFY work fine inside read-only transactions. [CL-14] nextval() on a sequence is blocked. [CL-15] The rule is precise, and the precision is the point: do not generalize from the name "read-only." Test each operation class.

## Part 5 — The honest close. [CL-16, CL-17, CL-18, CL-19]

What we did not verify: whether our gateway code ever issues SET or START TRANSACTION. [N1] Whether the append-only triggers actually block writes — inspected read-only, never tested. [N2] Our trials ran on PostgreSQL 16; the journal runs 17. The docs indicate parity; we did not trial it. [CL-16] We did not inspect any pooler or proxy between the gateway and the database. [CL-17] We did not map the full extent of what can be written to disk under read-only beyond the operations we tested. [CL-18]

The next mission is already queued: test the triggers on a disposable database. No writes against the journal — that stays out of scope. [CL-19]

We thought we had sealed our journal with a setting. The evidence said we had a default, an unverified assumption, and untested triggers. Here is exactly how we found out — and here is the boundary that actually holds, for roles that are not superusers: REVOKE.

---

*Accuracy notes for the 60–80 compiler: every bracketed CL-id resolves in the ledger; no script sentence asserts anything in N1–N7 as verified fact. The headline slot is the only parameterized element.*
