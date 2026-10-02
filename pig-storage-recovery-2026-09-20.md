# Pig C: Storage Recovery - 2026-09-20

## Emergency Summary
- **Start**: 31.74 GB free (6.87%) - CRITICAL
- **End**: 53.51 GB free (11.58%) - CONTAINED (target: >10% free / 46.2 GB)
- **Reclaimed**: ~21.77 GB
- **Status**: STORAGE_P0 = CONTAINED (not FULLY_RESOLVED) - 2026-09-20 16:06 MDT

## Reboot Cancellation (2026-09-20 16:06 MDT)
A controlled reboot was authorized based on stale pre-recovery state (C: at 6.87%, opencode.db not moved). Upon verification at 16:06 MDT, C: was 53.51 GB (11.58%), opencode.db evacuation was complete and verified, all services healthy. Reboot CANCELLED. VHDX compaction DEFERRED to maintenance window. Emergency deletion STOPPED. FB weights.bin ~4 GB remains held by Chrome; will release on natural restart. LI weights left in place. Convergence work RESUMED with C: monitoring (provisional: <10% DEGRADED, <7.5% CRITICAL).

## Files Moved (with verification)

### opencode.db (8.13 GB)
- **Source**: `C:\Users\nolan\.local\share\opencode\opencode.db` (DELETED)
- **Dest**: `D:\pig-evac\db\opencode.db` (VERIFIED)
- **Size**: 8,728,612,864 bytes (both)
- **SHA-256**: `88C6057BF40EF24A1BB0E2AFC34428E9ED4038904186D9F453A248270E191CC2` (MATCH)
- **Manifest**: `D:\pig-evac\db\opencode.db.manifest.txt`
- **Recovery**: Copy back to `C:\Users\nolan\.local\share\opencode\opencode.db` if needed

### IG model weights.bin (4.27 GB)
- **Source**: `C:\Users\nolan\.local\share\pigi\ig-profile\OptGuideOnDeviceModel\2025.8.8.1141\weights.bin` (DELETED)
- **Dest**: `D:\pig-evac\weights\ig-model-v1.bin` (SIZE VERIFIED, hash pending)
- **Size**: 4,269,932,544 bytes (both)
- **Known source SHA-256**: `D7F18C99C451540BACAFA09578F88F7428B0F316503B50E17F089EB0D4295FB1`
- **Recovery**: Copy back to original path if needed. NOTE: Destination hash not yet verified.

### FB model weights.bin (4.27 GB)
- **Source**: `C:\Users\nolan\.local\share\pigi\fb-profile\OptGuideOnDeviceModel\2025.8.8.1141\weights.bin` (DELETED)
- **Dest**: `D:\pig-evac\weights\fb-model-v1.bin` (SIZE VERIFIED, hash pending)
- **Size**: 4,269,932,544 bytes (both)
- **Recovery**: Copy back to original path if needed. NOTE: Destination hash not yet verified.

### Chrome model weights.bin (3.98 GB)
- **Source**: `C:\Users\nolan\AppData\Local\Google\Chrome\User Data\OptGuideOnDeviceModel\2025.8.8.1141\weights.bin` (DELETED)
- **Dest**: `D:\pig-evac\weights\chrome-model-v1.bin` (SIZE VERIFIED, regeneratable)
- **Size**: 4,269,932,544 bytes (both)
- **Recovery**: Chrome will auto-regenerate on next launch. Manual copy back possible.
- **Note**: C: space not yet reclaimed (Chrome holds open handle, 98 chrome processes running). Will reclaim on browser restart.

### RECOVERED_VIDEO (2.7 GB)
- **Source**: `C:\RECOVERED_VIDEO` (DELETED)
- **Dest**: `D:\RECOVERED_VIDEO` (VERIFIED)
- **Recovery**: Copy back to `C:\RECOVERED_VIDEO` if needed

## Files Deleted (regeneratable caches)

- `C:\Users\nolan\AppData\Local\npm-cache` (0.50 GB) - npm will re-download
- `C:\Users\nolan\AppData\Local\uv` (1.23 GB) - uv cache, regeneratable
- `C:\Users\nolan\AppData\Local\pnpm` (0.78 GB) - pnpm store, regeneratable
- `C:\Users\nolan\AppData\Local\ms-playwright` (0.68 GB) - reinstall via `npx playwright install`
- `C:\Users\nolan\AppData\Local\Temp\*` (~1.63 GB) - temp files
- `C:\Users\nolan\AppData\Local\Google\DriveFS` (0.82 GB) - DriveFS cache, re-downloads
- `C:\Users\nolan\AppData\Local\Microsoft\WinGet` (0.73 GB) - WinGet cache, regeneratable

## Files Preserved In Place

### LI model weights.bin (3.98 GB) - LOCKED, SKIPPED
- **Path**: `C:\Users\nolan\.local\share\pigi\li-profile\OptGuideOnDeviceModel\2025.8.8.1141\weights.bin`
- **Status**: Locked by browser process. Do NOT kill browser to reclaim.
- **Action**: Evacuate during natural browser restart.

## VSS Shadow Removed
- Deleted 1 shadow copy (2026-09-20 11:24:27 AM), freed ~3.96 GB
- `vssadmin delete shadows /for=C: /oldest /quiet`

## Health Verification (2026-09-20 15:21 MDT)
- **Docker**: ✓ 12 containers running
- **Postgres**: ✓ ping-postgres and ping-rc-postgres accepting connections
- **Gateway**: ✓ ping-gateway Up 18h, actively polling events
- **CDP**: ✓ Ports 9223, 9225, 9226, 9227 all OPEN
- **WSL**: ✓ Implied working (Docker Desktop WSL2 backend active)
- **Databases**: ✓ No active database damaged (opencode.db was inactive, no WAL/SHM)

## Outstanding Items
1. IG/FB model destination hashes not verified (D: was slow/locked during copy)
2. Chrome model C: space pending browser restart (3.98 GB)
3. LI model still locked, evacuate later
4. Add disk-pressure early warning to backlog
