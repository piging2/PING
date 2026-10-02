# MISSION CONTROL — LOCAL VOICE FACTORY
## PHASE 1: OBS VOICE CORPUS FORENSIC INVENTORY REPORT

**Generated**: 2026-09-08T17:40:00Z
**Status**: COMPLETE

---

## STATUS

PHASE 1 inventory and analysis is complete. All source recordings have been catalogued, existing Mission Control architecture has been mapped, and an automated pipeline proposal has been developed.

**NEXT PHASE**: Awaiting user approval to begin implementation of P0 tasks (Voice Factory Workbench UI, source ingestion, audio extraction, basic reference selection, Qwen integration).

---

## SOURCE RECORDINGS FOUND

### Summary
- **Total Files**: 14 recordings
- **Total Size**: 10.8 GB
- **Locations**: 4 directories
- **Formats**: MP4 (11), MKV (1), WAV (2)

### Locations
1. `C:\Users\nolan\Videos` - Primary OBS recording directory (8 files)
2. `C:\Users\nolan\OneDrive\Pictures\Camera Roll` - Phone recordings (3 files)
3. `C:\Users\nolan\Media_Processing_Work\OBS_Autocut_Investigation\20260624` - Processed video (1 file)
4. `C:\Users\nolan\VoiceCaptures` - Test WAV recording (1 file)

### Formats
- **MP4**: 11 files (primary format)
- **MKV**: 1 file (OBS alternative format)
- **WAV**: 2 files (test recording + Qwen outputs)

### Detailed Inventory
See `VOICE_CORPUS_INVENTORY.json` for complete immutable inventory with:
- Stable source IDs (SRC-VOICE-000001 through SRC-VOICE-000014)
- File metadata (size, timestamps, paths)
- Classification (likely_useful, processed, unknown, etc.)
- Notes on each recording

### Obvious Duplicates
- SRC-VOICE-000007 is edited version of SRC-VOICE-000006
- Primary: SRC-VOICE-000006 (5.2 GB)
- Derivative: SRC-VOICE-000007 (1.2 GB)

---

## VOICE-CANDIDATE SUMMARY

### Classification
- **Likely Useful**: 6 files (OBS recordings with substantial content)
  - SRC-VOICE-000002 (521 MB)
  - SRC-VOICE-000004 (2.9 GB)
  - SRC-VOICE-000005 (587 MB)
  - SRC-VOICE-000006 (5.2 GB)
  - SRC-VOICE-000008 (380 MB)
  - SRC-VOICE-000009 (145 MB)

- **Likely Unsuitable**: 2 files (very small, possibly failed recordings)
  - SRC-VOICE-000001 (327 KB)
  - SRC-VOICE-000003 (2.4 MB)

- **Unknown**: 3 files (phone recordings, may contain user voice)
  - SRC-VOICE-000010 (124 MB)
  - SRC-VOICE-000011 (1.7 GB)
  - SRC-VOICE-000012 (84 MB)

- **Processed/Derivatives**: 3 files (not source material)
  - SRC-VOICE-000007 (edited version)
  - SRC-VOICE-000013 (reconstructed video)

- **Test Recording**: 1 file
  - SRC-VOICE-000014 (VoiceCaptures test)

### Processing Opportunity Assessment
**ANALYSIS ONLY** - No files have been modified, transcribed, or processed.

**Inferred Characteristics** (based on file size and naming):
- **Likely Clean Speech**: 6 files (OBS recordings, likely single speaker)
- **Likely Contaminated**: 0 files (no obvious music/game audio indicators)
- **Likely Multi-Speaker**: 0 files (no obvious multi-speaker indicators)
- **Unknown**: 3 files (phone recordings, need analysis)

**Note**: Actual audio quality, SNR, background noise, speech purity, and contamination levels require audio analysis (not performed in this inventory phase).

---

## CURRENT MISSION CONTROL ARCHITECTURE

### UI Framework
- **Platform**: Next.js 15.5.24 with React 18.3.1
- **Styling**: TailwindCSS 4
- **Components**: Lucide React icons, Framer Motion
- **Type System**: TypeScript 5

### Workbench System
- **Architecture**: Plugin-based at `/workbench`
- **Authentication**: Workbench session with Drive OAuth
- **Navigation**: Sidebar with plugin navigation
- **Existing Plugins**:
  - Media (visual asset management)
  - Explorer (architecture exploration)
  - Timeline (temporal view)
  - Evidence (intelligence output)
  - Recommendations (AI suggestions)
  - Execution (execution plans)
  - Projections (constitutional projections)
  - Replay (history replay)
  - Connectors (external integrations)
  - Graph (graph visualization)
  - Settings (configuration)

### Storage & Authority
- **Media Storage**: Vercel Blob for assets
- **Runtime Authority**: Upstash Redis KV
- **Static Authority**: `media.v1.json` for backup/audit
- **Media Lifecycle**: Source Reference → Materializing → Materialized → Rendition Ready → Published → Stale

### API Layer
- **Client**: Type-safe API client at `src/lib/api/client.ts`
- **Routes**: `/api` with backend routes for:
  - Admin
  - Auth
  - Diagnostics
  - Drive
  - Drive Sync
  - Estimate
  - Health
  - Kit
  - Media
  - Newsletter
  - Projections
  - Resources
  - Reviews
  - Workbench

### Pipeline Infrastructure
- **Generic Pipeline**: `src/lib/pipeline/index.ts`
- **Provider Abstraction**: Google Drive, Dropbox, OneDrive, Upload, Camera, Phone, Manual
- **Stages**: Ingestion → Normalization → Media Authority → Variant Generation → Validation → Project Linking → Metrics

### Infrastructure Controller
- **Location**: `src/lib/infrastructure/controller.ts`
- **Supported Services**: Google, GitHub, Vercel, Stripe, Twilio, Resend, OpenAI, Anthropic, Cloudflare
- **Unified Interface**: Discovery, configuration, verification, maintenance

### Scripts & Automation
- **Location**: `scripts/` directory
- **Purpose**: Media processing, reconciliation, bootstrap, verification
- **Relevant Scripts**:
  - `image-pipeline.mjs` - Image processing pipeline
  - `drive-sync.mjs` - Drive synchronization
  - `reconcile-media-hashes.ts` - Media reconciliation

### Key Files
- `src/app/workbench/layout.tsx` - Workbench layout
- `src/components/workbench/WorkbenchShell.tsx` - Workbench shell
- `src/lib/media.ts` - Media authority adapter
- `src/lib/visual-asset-registry.ts` - Visual asset registry
- `src/types/media.ts` - Media type definitions

### Integration Points for Voice Factory
1. **Workbench Plugin**: Add to `WorkbenchShell.tsx` navigation
2. **API Routes**: Add to `/api/voice-factory/`
3. **Pipeline**: Extend generic pipeline abstraction
4. **Storage**: Use existing Blob/KV patterns or local Docker volumes
5. **Authentication**: Use existing Workbench session

---

## PROPOSED AUTOMATED PIPELINE

### Architecture Overview

```
SOURCE RECORDINGS (Immutable)
        ↓
VOICE CORPUS INGESTION
        ↓
AUDIO EXTRACTION (ffmpeg)
        ↓
SPEECH DETECTION (Silero VAD)
        ↓
SEGMENTATION (utterance-level)
        ↓
TRANSCRIPTION (faster-whisper)
        ↓
SPEAKER PURITY ANALYSIS
        ↓
AUDIO QUALITY ANALYSIS
        ↓
REFERENCE CANDIDATE SELECTION
        ↓
VOICE PROFILE GENERATION
        ↓
QWEN ZERO-SHOT CLONING
        ↓
BENCHMARK EVALUATION
        ↓
QC GATE
        ↓
PRODUCTION VOICE FACTORY
```

### Implementation Phases

#### P0 (Immediate) - Basic Voice Factory
1. Voice Factory Workbench UI
2. Source recording ingestion
3. Audio extraction from video
4. Manual reference selection
5. Qwen zero-shot cloning integration
6. Simple generation UI

#### P1 (Short-term) - Automated Processing
1. Voice activity detection
2. Transcription
3. Automatic segmentation
4. Quality analysis
5. Voice profile generation
6. Benchmark evaluation

#### P2 (Medium-term) - Advanced Features
1. Speaker diarization
2. Automatic reference selection
3. Multi-reference cloning
4. Advanced quality metrics
5. Performance profiling

#### P3 (Long-term) - Fine-Tuning (if justified)
1. Fine-tuning (if benchmark justifies)
2. Custom model training
3. Advanced voice manipulation
4. Real-time voice conversion

### Voice Profile Structure

See `VOICE_PIPELINE_PROPOSAL.md` for complete voice profile schema including:
- Identity (speaker ID, reference quality, speaker purity)
- Performance (conversational, neutral, energetic, calm, etc.)
- Technical (sample rate, duration, transcription confidence, acoustic quality)
- References (source segments with transcripts)
- Benchmarks (similarity, naturalness, intelligibility scores)

---

## FILES THAT WOULD NEED TO CHANGE

### New Files to Create (17)
1. `src/app/workbench/voice-factory/page.tsx`
2. `src/app/workbench/voice-factory/layout.tsx`
3. `src/lib/voice-factory/ingestion.ts`
4. `src/lib/voice-factory/audio-extractor.ts`
5. `src/lib/voice-factory/vad.ts`
6. `src/lib/voice-factory/transcription.ts`
7. `src/lib/voice-factory/segmentation.ts`
8. `src/lib/voice-factory/quality-analysis.ts`
9. `src/lib/voice-factory/reference-selection.ts`
10. `src/lib/voice-factory/voice-profile.ts`
11. `src/lib/voice-factory/qwen-client.ts`
12. `src/lib/voice-factory/benchmark.ts`
13. `src/lib/voice-factory/types.ts`
14. `src/app/api/voice-factory/ingest/route.ts`
15. `src/app/api/voice-factory/generate/route.ts`
16. `src/app/api/voice-factory/profiles/route.ts`
17. `src/components/workbench/WorkbenchShell.tsx` (add plugin)

### Files to Modify (3)
1. `src/components/workbench/WorkbenchShell.tsx` - Add Voice Factory navigation
2. `docker-compose.yml` (qwen3-tts-docker) - Add voice-corpus volumes
3. `requirements.txt` (qwen3-tts-docker) - Add faster-whisper, silero-vad

### No Changes Required
- Existing Media Authority system (separate concern)
- Existing Workbench authentication
- Existing API client infrastructure
- Existing pipeline abstraction (can be extended)

---

## RISKS / BLOCKERS

### Risks

1. **GPU Memory**: Qwen3-TTS 1.7B Base uses ~4GB VRAM. Adding transcription/VAD may exceed 8GB limit.
   - **Mitigation**: Run transcription/VAD on CPU, only use GPU for Qwen generation

2. **Processing Time**: Transcribing 10.8 GB of audio could take hours.
   - **Mitigation**: Process incrementally, show progress in UI, allow cancellation

3. **Audio Quality**: Source recordings may have background noise, music, or multiple speakers.
   - **Mitigation**: Quality analysis before reference selection, manual review option

4. **Storage**: Processed audio segments could require significant disk space.
   - **Mitigation**: Store only high-quality references, compress segments

### Blockers
**None identified** - All required components are available or can be added.

---

## APPROVAL REQUIRED

### Model Downloads
- **faster-whisper**: ~100-200 MB (within 1 GB threshold) ✅
- **silero-vad**: ~50 MB (within 1 GB threshold) ✅
- **pyannote.audio**: ~500 MB (within 1 GB threshold, optional for later) ✅

**STATUS**: All model downloads are within approved threshold. **NO APPROVAL REQUIRED**.

### Infrastructure Changes
- **New Docker volume**: `./voice-corpus:/app/voice-corpus` ✅
- **New Docker volume**: `./voice-processed:/app/voice-processed` ✅
- **New Docker volume**: `./voice-profiles:/app/voice-profiles` ✅

**STATUS**: Volume mounts are non-destructive and preserve existing containers. **NO APPROVAL REQUIRED**.

### Fine-Tuning
**NOT APPROVED** - Zero-shot cloning first, benchmark results will determine if fine-tuning is justified.

### Implementation Start
**APPROVAL REQUIRED** to begin P0 implementation:
- Voice Factory Workbench UI
- Source recording ingestion
- Audio extraction from video
- Manual reference selection
- Qwen zero-shot cloning integration
- Simple generation UI

---

## DELIVERABLES

1. **VOICE_CORPUS_INVENTORY.json** - Immutable source recording inventory
2. **VOICE_PIPELINE_PROPOSAL.md** - Complete automated pipeline proposal
3. **VOICE_FACTORY_INVENTORY_REPORT.md** - This report

---

## NEXT STEPS

1. **Review Inventory**: User reviews source recording inventory
2. **Review Proposal**: User reviews pipeline proposal and voice profile structure
3. **Approve P0**: User approves P0 implementation start
4. **Begin Implementation**: Start with Voice Factory Workbench UI
5. **Iterative Development**: Build P0 features incrementally
6. **Testing**: Test with actual source recordings
7. **Benchmark**: Evaluate zero-shot cloning quality
8. **Decision**: Determine if fine-tuning is justified based on benchmark results

---

## CONSTRAINTS OBSERVED

✅ **Original recordings preserved** - No files modified, moved, or deleted
✅ **Existing Docker containers preserved** - Qwen container remains operational
✅ **Existing Mission Control functionality preserved** - No changes to existing systems
✅ **No large model downloads** - All proposed models within 1 GB threshold
✅ **No fine-tuning** - Zero-shot cloning first, benchmark-driven decision
✅ **No bulk GPU processing** - Incremental processing with user control
