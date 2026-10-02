$ErrorActionPreference = "Stop"
$Port = 19333

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$prof = "C:\Temp\fyd-eval-prof"
if (-not (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue)) {
  Start-Process $chrome -ArgumentList @("--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars","--mute-audio","--no-first-run","--user-data-dir=$prof","--remote-debugging-port=$Port","about:blank")
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt 30) {
    try { Invoke-RestMethod "http://127.0.0.1:$Port/json/version" | Out-Null; break }
    catch { Start-Sleep -Milliseconds 500 }
  }
}
Write-Output "debugger up"

function WsSend($ws, $id, $method, $params) {
  $msg = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
  $seg = [System.ArraySegment[byte]]::new($bytes)
  $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
}

function WsRecv($ws, $timeoutSec) {
  $buf = New-Object byte[] 8388608
  $seg = [System.ArraySegment[byte]]::new($buf)
  $sb = New-Object System.Text.StringBuilder
  $sw = [Diagnostics.Stopwatch]::StartNew()
  do {
    $task = $ws.ReceiveAsync($seg, [System.Threading.CancellationToken]::None)
    while (-not $task.AsyncWaitHandle.WaitOne(1000)) {
      if ($sw.Elapsed.TotalSeconds -gt $timeoutSec) { throw "WsRecv timeout" }
    }
    $r = $task.GetAwaiter().GetResult()
    $sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count)) | Out-Null
  } while (-not $r.EndOfMessage)
  return ($sb.ToString() | ConvertFrom-Json)
}

function CdpCall($ws, $id, $method, $params) {
  WsSend $ws $id $method $params
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt 30) {
    $m = WsRecv $ws 30
    if ($m.id -eq $id) {
      if ($m.error) { throw ("CDP error: " + ($m.error | ConvertTo-Json -Compress)) }
      return $m.result
    }
  }
  throw "timeout waiting for $method"
}

function WaitLoad($ws) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt 25) {
    $m = WsRecv $ws 25
    if ($m.method -eq "Page.loadEventFired") { return }
  }
  Write-Output "load wait timed out, continuing"
}

$targets = Invoke-RestMethod "http://127.0.0.1:$Port/json/list"
# Index-aligned access: works whether the response parsed as an array of
# objects or (PS 5.1 quirk observed here) one object with array properties.
$types = @($targets.type); $urls = @($targets.url); $socks = @($targets.webSocketDebuggerUrl)
$wsUrl = $null
for ($i = 0; $i -lt $types.Count; $i++) {
  if ($types[$i] -eq "page" -and $urls[$i] -like "file://*") { $wsUrl = $socks[$i]; break }
}
if (-not $wsUrl) { throw "no page target" }
Write-Output ("target: " + $urls[$i])
Write-Output "connecting ws"
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ws.ConnectAsync([Uri]$wsUrl, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$script:id = 0
CdpCall $ws (++$script:id) "Page.enable" @{} | Out-Null

# Navigate once; emulation per width reflows live.
WsSend $ws (++$script:id) "Page.navigate" @{ url = "file:///C:/Temp/fyd-eval-surface.html" }
WaitLoad $ws
Write-Output "page loaded"
Start-Sleep -Milliseconds 1500

$widths = @( @(320,568), @(375,812), @(390,844), @(393,873), @(430,932), @(768,1024), @(1440,900) )
foreach ($wh in $widths) {
  $w = $wh[0]; $h = $wh[1]
  CdpCall $ws (++$script:id) "Emulation.setDeviceMetricsOverride" @{ width = $w; height = $h; deviceScaleFactor = 1; mobile = $true } | Out-Null
  Start-Sleep -Milliseconds 900
  $shot = CdpCall $ws (++$script:id) "Page.captureScreenshot" @{ format = "png" }
  [IO.File]::WriteAllBytes("C:\Temp\fyd-eval\cdp2-w$w.png", [Convert]::FromBase64String($shot.data))
  Write-Output "captured ${w}x${h}"
}
CdpCall $ws (++$script:id) "Emulation.clearDeviceMetricsOverride" @{} | Out-Null
$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", [System.Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
Write-Output "done"
