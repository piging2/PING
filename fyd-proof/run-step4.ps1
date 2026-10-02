# W-PROOF STEP 4 Windows runner. Run from WSL via:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Temp\fyd-proof\run-step4.ps1
$ErrorActionPreference = "Stop"
$work = "C:\Temp\fyd-proof"
New-Item -ItemType Directory -Force -Path "$work\shots" | Out-Null
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$prof = "$work\chrome-profile"
New-Item -ItemType Directory -Force -Path $prof | Out-Null
$proc = Start-Process -FilePath $chrome -ArgumentList @(
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu",
  "--remote-debugging-port=9222", "--user-data-dir=$prof", "about:blank"
) -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $v = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://127.0.0.1:9222/json/version
      if ($v.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 1000 }
  }
  if (-not $ready) { throw "Chrome CDP did not come up on :9222" }
  & "C:\Users\nolan\AppData\Local\hermes\node\node.exe" "$work\wproof-step4-win.cjs"
  $rc = $LASTEXITCODE
} finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
exit $rc
