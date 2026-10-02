# lane1-harvest.ps1 -- READ-ONLY evidence harvest for tunnel-wedge incident
# Windows: 2026-09-27 wedge1 11:11-12:47 MDT, wedge2 ~13:50-14:03 MDT
$ErrorActionPreference='Continue'
$out='C:/Users/nolan/lane1-harvest'
New-Item -ItemType Directory -Force -Path $out | Out-Null
function W($name,$obj){ $obj | Out-File -FilePath "$out/$name" -Encoding utf8 }

# windows padded (UTC ISO; MDT = UTC-6)
$w1s='2026-09-27T16:41:00.000Z'; $w1e='2026-09-27T19:20:00.000Z'   # 10:41-13:20 MDT
$w2s='2026-09-27T19:20:00.000Z'; $w2e='2026-09-27T20:35:00.000Z'   # 13:20-14:35 MDT

function Dump($log,$start,$end,$file,$cap=4000){
  $q="*[System[TimeCreated[@SystemTime>='$start' and @SystemTime<'$end']]]"
  wevtutil qe $log "/q:$q" /f:text "/c:$cap" > "$out/$file" 2> "$out/$file.err"
  $n=(Get-Content "$out/$file" 2>$null | Select-String -Pattern '^Event ID:').Count
  "log=$log window events=$n" | Out-File "$out/counts.txt" -Append -Encoding utf8
}
'' | Out-File "$out/counts.txt" -Encoding utf8

$logs=@('System','Microsoft-Windows-NetworkProfile/Operational','Microsoft-Windows-WLAN-AutoConfig/Operational','Microsoft-Windows-DHCP-Client/Admin','Microsoft-Windows-DNS-Client/Operational','Microsoft-Windows-TaskScheduler/Operational','Microsoft-Windows-NetworkConnectivityStatusIndicator/Operational')
$i=0
foreach($L in $logs){
  $safe=$L -replace '[^A-Za-z0-9]','_'
  Dump $L $w1s $w1e ("w1_"+$safe+".txt")
  Dump $L $w2s $w2e ("w2_"+$safe+".txt")
  $i++
}
# WSL/Hyper-V-ish logs: enumerate and dump matching names
wevtutil el | Select-String -Pattern 'Lxss|WSL|Hyper-V-Worker|Hyper-V-VMMS' | ForEach-Object {
  $L=$_.ToString().Trim(); $safe=$L -replace '[^A-Za-z0-9]','_'
  Dump $L $w1s $w1e ("w1_"+$safe+".txt") 1000
  Dump $L $w2s $w2e ("w2_"+$safe+".txt") 1000
}

# --- Scheduled task definition + history ---
W 'task-query.txt' (schtasks /query /tn PING-TunnelWatch /xml /v 2>&1)
W 'task-info.txt' (Get-ScheduledTask -TaskName 'PING-TunnelWatch' 2>&1 | Format-List * | Out-String)
W 'task-info2.txt' (Get-ScheduledTaskInfo -TaskName 'PING-TunnelWatch' 2>&1 | Format-List * | Out-String)
W 'all-tasks-brief.txt' (Get-ScheduledTask 2>&1 | Where-Object {$_.State -ne 'Disabled'} | Select-Object TaskName,State | Format-Table -AutoSize | Out-String)

# --- find watchdog script + its own logs ---
W 'watchdog-script-search.txt' (Get-ChildItem -Path 'C:/Users/nolan' -Recurse -Include '*TunnelWatch*','*tunnelwatch*','*tunnel-watch*' -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize | Out-String)
W 'watchdog-script-search-progdata.txt' (Get-ChildItem -Path 'C:/ProgramData' -Recurse -Include '*TunnelWatch*','*tunnelwatch*','*tunnel-watch*' -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize | Out-String)

# --- Tailscale evidence ---
W 'tailscale-dir.txt' (Get-ChildItem -Path 'C:/ProgramData/Tailscale' -Recurse -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize | Out-String)
$ts='C:/Program Files/Tailscale/tailscale.exe'
if(Test-Path $ts){ W 'tailscale-status.txt' (& $ts status 2>&1); W 'tailscale-ip.txt' (& $ts ip -4 2>&1); W 'tailscale-netcheck.txt' (& $ts netcheck 2>&1) } else { 'tailscale.exe not at C:/Program Files/Tailscale' | Out-File "$out/tailscale-status.txt" -Encoding utf8 }

# --- current network state snapshot ---
W 'now.txt' ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss K') + '  TZ=' + (Get-TimeZone).Id)
W 'adapters.txt' (Get-NetAdapter 2>&1 | Select-Object Name,InterfaceDescription,Status,LinkSpeed,MacAddress | Format-Table -AutoSize | Out-String)
W 'routes.txt' (Get-NetRoute -AddressFamily IPv4 2>&1 | Select-Object DestinationPrefix,NextHop,InterfaceAlias,RouteMetric,ifIndex | Format-Table -AutoSize | Out-String)
W 'sshd-listener.txt' (Get-NetTCPConnection -LocalPort 22 -State Listen 2>&1 | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize | Out-String)
W 'tailscaled-svc.txt' (Get-Service '*tailscale*' 2>&1 | Select-Object Name,Status,StartType | Format-Table -AutoSize | Out-String)
"harvest complete" | Out-File "$out/DONE" -Encoding utf8
