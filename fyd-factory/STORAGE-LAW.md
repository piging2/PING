# FYD FACTORY STORAGE LAW (verified 2026-09-23)

## Verified facts
- Both WSL distros on the Pig are backed by C::
  - Docker WSL: `C:\Users\nolan\AppData\Local\Docker\wsl\main`
  - Main WSL: `C:\Users\nolan\AppData\Local\wsl\{a112dee4-421d-4e51-81a9-46c985479613}`
- Therefore /home/nolan/projects/ping (the PING repo) is physically ON C:.
- The repo must live there (it is the product). Code and small fixtures in the repo are fine.

## Rules for all lanes
- NEVER write bulk artifacts into WSL paths: no screenshots, no large generated corpora,
  no caches, no dependency trees, no build artifacts under /home/nolan/projects/ping
  except the product's own small fixtures and code.
- Bulk artifacts go to ~/workspace/fyd-factory/ (cloud sandbox, ~91G free, verified).
- Never use /tmp (wiped without warning).
- Never use C: as build cache, temp dir, screenshot destination, browser download dir,
  or intermediate artifact store.
- D: exists on the Pig but is NOT authorized storage. Do not use it.
- PIGING90: no such volume exists on the Pig. Do not reference it.

## Budget guard
- Before any bulk generation, record free space of the target and keep a 10% / 10GB
  reserve, whichever is larger. Stop generation before crossing it.
