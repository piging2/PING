$Port = 19333
$ErrorActionPreference = "Stop"

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
  throw "timeout"
}

$targets = Invoke-RestMethod "http://127.0.0.1:$Port/json/list"
$types = @($targets.type); $urls = @($targets.url); $socks = @($targets.webSocketDebuggerUrl)
$wsUrl = $null
for ($i = 0; $i -lt $types.Count; $i++) {
  if ($types[$i] -eq "page" -and $urls[$i] -like "file://*fyd-eval-surface*") { $wsUrl = $socks[$i]; break }
}
if (-not $wsUrl) { throw "no eval page target" }
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ws.ConnectAsync([Uri]$wsUrl, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$script:id = 0

CdpCall $ws (++$script:id) "Emulation.setDeviceMetricsOverride" @{ width = 375; height = 812; deviceScaleFactor = 1; mobile = $true } | Out-Null
Start-Sleep -Milliseconds 1200
$js = @'
(() => {
  const b = document.querySelector(".fyd-rail-auto-trigger button");
  const r = b.getBoundingClientRect();
  const chain = [];
  let el = b.parentElement, n = 0;
  while (el && n++ < 6) {
    const cs = getComputedStyle(el);
    chain.push(el.tagName + "." + String(el.className).slice(0,30) + "|t=" + cs.transform + "|o=" + cs.opacity + "|pos=" + cs.position);
    el = el.parentElement;
  }
  return JSON.stringify({bx: Math.round(r.x), by: Math.round(r.y), bw: Math.round(r.width), bh: Math.round(r.height), ih: innerHeight, iw: innerWidth, sy: Math.round(scrollY), chain});
})()
'@
$res = CdpCall $ws (++$script:id) "Runtime.evaluate" @{ expression = $js; returnByValue = $true }
Write-Output $res.result.value
$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", [System.Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
