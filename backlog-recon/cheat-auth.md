## IDENTITY-01
DECISION P1 [?] Identity-era cutover: re-mints every event ID; cross-era dedup plan required (G2)
WHY: 
EV: 
ACC: 

## IDENTITY-02
DONE_VERIFIED P1 [?] V2 identity boundary: legacy frozen, new events on IdentityAuthority (F7)
WHY: 
EV: 
ACC: 

## IDENTITY-03
HARVEST P2 [?] Never casually change ID format / no historical reminting (standing law)
WHY: 
EV: 
ACC: 

## IDENTITY-04
OPEN P1 [?] Canonical event-identity bytes, cross-runtime (RTC-001)
WHY: 
EV: 
ACC: 

## IDENTITY-05
DONE_VERIFIED P1 [?] CE-001: deterministic MISSION_COMPLETED identity
WHY: 
EV: 
ACC: 

## IDENTITY-06
DONE_VERIFIED P1 [?] CE-002: attempt/lease fencing for mission completion
WHY: 
EV: 
ACC: 

## IDENTITY-07
PROVE P2 [?] Signature verification on the governed ingest path (INVALID_SIGNATURE)
WHY: 
EV: 
ACC: 

## IDENTITY-08
DEFERRED P2 [REPLAY] Cross-era dedup key definition (post-G2)
WHY: 
EV: 
ACC: 

## REPLAY-01
DONE_VERIFIED P1 [?] Persisted-journal replay convergence (canonical bytes in, verdict out)
WHY: 
EV: 
ACC: 

## REPLAY-02
DONE_VERIFIED P2 [?] 'Unknown'-era rows replay with explicit labeling, not fail-closed
WHY: 
EV: 
ACC: 

## REPLAY-03
DECISION P2 [?] What "replay verified" may claim (G3 vocabulary rule)
WHY: 
EV: 
ACC: 

## REPLAY-04
IN_PROGRESS P2 [?] Witness as derived replay attestation (W-1A live; W-2 harvested)
WHY: 
EV: 
ACC: 

## REPLAY-05
OPEN P3 [?] Sequence_replay T1 failure (FL-20260919-014, OPEN)
WHY: 
EV: 
ACC: 

## REPLAY-06
PROVE P3 [ERA CONVERGENCE] Projection digest determinism across governed rebuilds
WHY: 
EV: 
ACC: 

## ERA-01
IN_PROGRESS P1 [?] Runtime tree vs. certified tree vs. deployed tree discipline
WHY: 
EV: 
ACC: 

## ERA-02
OPEN P1 [?] Pre-cutover era census on the canonical DB
WHY: 
EV: 
ACC: 

## ERA-03
BLOCKED P1 [?] Cutover plan (identity-era migration, not a path swap)
WHY: 
EV: 
ACC: 

## ERA-04
IN_PROGRESS P2 [?] Era-qualify the standing laws
WHY: 
EV: 
ACC: 

## ERA-05
DONE_VERIFIED P1 [?] Legacy NULL-ordering semantics (design B)
WHY: 
EV: 
ACC: 

## ERA-06
OPEN P2 [PRIVATE CONTEXT] Cutover hazard list (redelivery flip, bridge remint, timestamp precedence)
WHY: 
EV: 
ACC: 

## PRIV-01
DECISION P1 [?] Agent↔tenant authority model (G4): namespace is a comment, not a boundary
WHY: 
EV: 
ACC: 

## PRIV-02
BLOCKED P2 [?] Dual tenant registries, disconnected (TEN-002)
WHY: 
EV: 
ACC: 

## PRIV-03
OPEN P2 [?] Principal loss across hops (TEN-003)
WHY: 
EV: 
ACC: 

## PRIV-04
OPEN P2 [?] Replay/projection/evidence carry no tenant scoping or caller authorization
WHY: 
EV: 
ACC: 

## PRIV-05
DECISION P2 [?] Agent memory / private owner context store: canonical journal vs. operational store
WHY: 
EV: 
ACC: 

## PRIV-06
OPEN P2 [?] Credential lifecycle: rotation/revocation path for `exterior_agent_credentials`
WHY: 
EV: 
ACC: 

## PRIV-07
PROVE P3 [?] Probe tenant row cleanup (audit integrity incident)
WHY: 
EV: 
ACC: 

## PRIV-08
DONE_VERIFIED P1 [?] CG-001: tenant owner is the default human decision authority
WHY: 
EV: 
ACC: 

## PRIV-09
PROVE P3 [?] Secret-denial protections exist only in the unwired capability model
WHY: 
EV: 
ACC: 