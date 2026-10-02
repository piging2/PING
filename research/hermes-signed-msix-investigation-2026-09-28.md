# Hermes upstream signed-MSIX investigation (research only, 2026-09-28)

## VERDICT
CONFIRMED: the old "no signed Windows release exists" conclusion is outdated. Current upstream
(NousResearch/hermes-agent, main HEAD) documents and ships a signed Windows Desktop distribution:
signed per-architecture MSIX packages combined into a universal .msixbundle, distributed via a
.appinstaller descriptor installed with Windows App Installer, signed through Azure signing
infrastructure. The win-unpacked\Hermes.exe Smart App Control block was a property of the
bootstrap/source-install path (Hermes-Setup.exe), which upstream docs now explicitly distinguish
from the self-contained MSIX package.

## 1. Official locations
- Project homepage: https://hermes-agent.nousresearch.com/
- Desktop product/download page: https://hermes-agent.nousresearch.com/desktop
- GitHub repo: https://github.com/NousResearch/hermes-agent
- Releases: https://github.com/NousResearch/hermes-agent/releases
- Build docs: apps/desktop/BUILDING.md (official repo, main)
- Windows install docs: website/docs/user-guide/windows-native.md, website/docs/getting-started/installation.md

## 2. Latest release/tag (verified live 2026-09-28)
- Hermes Agent v0.21.5 (v2026.9.24), released September 24, 2026 (commit f97608f178d1ffeca59860195ab7da295f7c8e5f).
  Still the newest entry on the releases page. v0.22.0 (full curated notes) announced as upcoming.
- Desktop artifacts ride a separate channel system (stable/canary/commit) published to an R2 public origin;
  stable publication "advances App Installer, macOS, APT, downloads-page, and protected R2 heads"
  (website/docs/developer-guide/stable-releases.md).

## 3. Windows artifacts (per BUILDING.md, current main)
- Windows x64/ARM64 sideload: signed per-architecture MSIX packages, combined into a universal .msixbundle;
  .appinstaller descriptor; update owner = Windows App Installer.
- Windows x64/ARM64 Store: Store-identity MSIX + separate Store bundle; update owner = Microsoft Store.
- "Windows desktop packaging uses MSIX, not NSIS or MSI."
- Channel descriptor path: releases/win32/CHANNEL/CHANNEL.appinstaller (Light: releases/win32/light/CHANNEL/).
- Sideload stable versions are X.Y.Z.0; Store versions use year.hour-of-year.second-of-year.0 UTC.
- Payload = complete runtime (release source snapshot, pinned CPython + uv + ready dependency tree,
  Node.js/npm, managed tools, prebuilt TUI/dashboard assets, generated CLI launchers).
  First launch does NOT build the runtime.
- MSIX execution aliases expose hermes, hermes-agent, and hermes-acp.
## 4. Signing
Azure-backed: signing jobs provide AZURE_SIGN_ENDPOINT, AZURE_SIGN_ACCOUNT, AZURE_SIGN_PROFILE,
AZURE_SIGN_PUBLISHER, AZURE_CLIENT_ID plus Azure authentication. Packaging hooks sanitize invalid
PE certificate tables, then sign and timestamp payload EXEs/DLLs; product EXE signed after resource
edits; scripts/sign-msix.mjs signs the sideload package envelope; Store envelopes left for Partner Center.
"Local unsigned builds are not release-acceptance artifacts." Expected publisher: "Nous Research Inc."
(Issuer "Microsoft ID Verified CS EOC CA 03", Azure Trusted Signing), per documented bootstrap-installer
certificate evidence in issue #50210.

## 5. Minimum Windows version
MSIX manifest floor: Windows 11 22H2 (10.0.22621.0). windows-native.md: "Its MSIX package requires
Windows 11 22H2 or later. Windows 10 source-script support does not mean the MSIX package supports Windows 10."

## 6. Install procedure (per upstream docs)
1. Download the .appinstaller from the Hermes Desktop product page (hermes-agent.nousresearch.com/desktop).
2. Open the .appinstaller with Windows App Installer. "It installs the signed MSIX bundle and records its update source."
3. Sideload updates use the app's Update control and Windows App Installer; a local descriptor is downloaded
   before teardown and automatic relaunch is registered.
4. Aliases hermes / hermes-agent / hermes-acp registered via MSIX execution aliases.
Explicit upstream warning: "Hermes-Setup.exe is a different, bootstrap installer. It provisions a source
checkout through the scripts. Do not confuse it with the self-contained MSIX package."
## 7. The Smart App Control issue
Issue #70544 (nousresearch/hermes-agent): "[Windows 11] Smart App Control blocks locally built Hermes Desktop
executable as unsigned". Signed bootstrap installer (publisher "Nous Research Inc.") installs fine, but the
locally generated AppData\Local\hermes\hermes-agent\apps\desktop\release\win-unpacked\Hermes.exe is unsigned
and SAC blocks it; reinstalling does not help. Related: #94438, #50210 (bootstrap cert chain),
#72310 (unsigned venv hermes.exe stub), #56554 (SAC blocks bootstrap venv python.exe), #63796 (SAC blocks
embedded Python _ssl). Open/closed status NOT confirmed: fetched issue page rendered body only (no
timeline/state marker); search index says last activity about 66 days ago (~July 24, 2026). Do not claim closed.
Upstream remediation direction is explicit regardless: current docs no longer route Windows Desktop users
through the bootstrap path; the sanctioned answer to the SAC problem is the signed MSIX artifact.

## 8. WSLg support (official website/docs/user-guide/desktop.md)
Command: hermes gui inside WSL2. "Under local WSLg, Hermes launches with --ozone-platform=wayland to avoid
the XWayland maximized-window offset and shifted mouse hit-testing (microsoft/wslg#1015). ... The app draws
its own minimize, maximize and close controls on WSLg." GPU: "When hermes gui runs inside WSL2 with /dev/dxg
present and Mesa's d3d12_dri.so installed, the launcher sets GALLIUM_DRIVER=d3d12 for Electron so rendering
uses the Windows GPU instead of the llvmpipe software rasterizer." v0.21.x release note: "WSLg renders on
the Windows GPU (#106528)".
## 9. Headless CLI (documented, separate from Desktop)
Command-line-only install (no Desktop) is documented in website/docs/getting-started/installation.md:
- Linux/macOS/WSL2: pipe the install.sh script from the Hermes site into bash.
- Windows native: run the documented PowerShell one-liner that downloads and executes install.ps1
  from the Hermes site (see installation.md for the exact command).
After install: hermes starts chatting; hermes model / hermes tools / hermes setup / hermes setup --portal /
hermes doctor for configuration. Headless/prompt-driven hermes usage is a supported first-class path
independent of the desktop app.

## 10. Availability TODAY - honest assessment
Docs + release pipeline: YES, genuinely available by upstream's account. Signed-MSIX/App Installer is the
documented primary Windows Desktop distribution; the stable publication controller "verifies and promotes"
the App Installer channel on every stable promotion; the desktop product page is the download entry point;
BUILDING.md requires release acceptance against the actual signed artifacts.
Gaps not closed (read-only lane, no downloads):
- Exact static .appinstaller URL not extractable: product page download button is JS-driven (not in fetched
  text); BUILDING.md gives channel-relative path releases/win32/CHANNEL/CHANNEL.appinstaller without naming
  the R2 public origin hostname. Documented flow: product page -> download .appinstaller -> open with Windows
  App Installer. A live browser session can confirm the button target.
- Package bytes/signature not independently verified (no downloads per lane rules). Signer expectation:
  "Nous Research Inc." via Azure Trusted Signing.
- GitHub v0.21.5 tag page does not advertise desktop MSIX assets in rendered text; distribution is via the
  R2/App Installer channel, not GitHub release attachments.
Conclusion for the retest: the old "only real fix is buying an EV certificate" conclusion is superseded.
Obtain the official signed .appinstaller/.msixbundle from the Hermes Desktop product page and install via
Windows App Installer, keeping SAC and Code Integrity enabled. No certificate purchase, no SAC disable,
no win-unpacked\Hermes.exe workarounds. hermes gui under WSLg and the headless hermes CLI are both
documented first-class paths to test.
