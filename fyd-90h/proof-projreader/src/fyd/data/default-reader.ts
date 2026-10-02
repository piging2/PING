/**
 * Default ProjectionReader registration (Decision 2: file-dump for this
 * proof, behind the seam).
 *
 * This module exists to keep the import graph cycle-free:
 *   ping-object-source -> default-reader -> file-dump-projection-reader
 *     -> projection-verify (pure) -> (no fyd/data imports)
 *   ping-object-source -> projection-reader (interfaces + registry)
 * Neither projection-reader nor file-dump-projection-reader imports
 * ping-object-source.
 *
 * Import this module once at the seam boundary (ping-object-source does).
 */
import { FileDumpProjectionReader } from "./file-dump-projection-reader";
import { setDefaultProjectionReaderFactory } from "./projection-reader";

let registered = false;

export function registerDefaultProjectionReader(): void {
  if (registered) return;
  registered = true;
  let instance: FileDumpProjectionReader | null = null;
  setDefaultProjectionReaderFactory(() => {
    if (!instance) instance = new FileDumpProjectionReader();
    return instance;
  });
}

// Register on import: the seam default is file-dump unless a test or a
// future physical reader overrides it via setProjectionReader().
registerDefaultProjectionReader();
