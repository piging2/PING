/**
 * Tenant-bound Mission Control surface for the Coppersmith Plumbing site.
 *
 * Wiring lane 2026-09-27. Additive page only: no existing visitor/owner
 * rendering is touched. Tenant is the page's fixed SITE_ID and is never
 * user-editable downstream.
 */

import TenantMissionControl from "../../_shared/tenant-mission-control";

const SITE_ID = "coppersmith-plumbing";

export const metadata = {
  title: "Mission Control | Coppersmith Plumbing",
  description: "Tenant-bound witnessed dispatch for the Coppersmith Plumbing site.",
};

export default function CoppersmithMissionControlPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0c0c12", padding: "24px 16px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <TenantMissionControl tenant={SITE_ID} title="Mission Control — Coppersmith Plumbing" />
      </div>
    </main>
  );
}
