# lane1-harvest2.ps1 -- READ-ONLY follow-up: watchdog definition, current state
$ErrorActionPreference='Continue'
$out='C:/Users/nolan/lane1-harvest'
function W($name,$obj){ $obj | Out-File -FilePath "$out/$name" -Encoding utf8 }

W 'task-xml.txt' (schtasks /query /tn PING-TunnelWatch /xml 2>&1)
W 'task-actions.txt' ((Get-ScheduledTask -TaskName 'PING-TunnelWatch').Actions 2>&1 | Format-List * | Out-String)
W 'task-triggers.txt' ((Get-ScheduledTask -TaskName 'PING-TunnelWatch').Triggers 2>&1 | Format-List * | Out-String)
W 'task-settings.txt' ((Get-ScheduledTask -TaskName 'PING-TunnelWatch').Settings 2>&1 | Format-List * | Out-String)

# watchdog script content + logs: check likely locations (read-only)
$paths=@('C:/Users/nolan/.local/share/pigi','C:/Users/nolan/pig-fb','C:/ProgramData/PING')
foreach($p in $paths){
  if(Test-Path $p){
    Get-ChildItem -Path $p -File -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize | Out-File "$out/dirlist-$($p -replace '[^A-Za-z0-9]','_').txt" -Encoding utf8
  }
}
W 'tunnelwatch-files.txt' (Get-ChildItem -Path 'C:/Users/nolan' -File -Recurse -Depth 3 -Include '*unnel*atch*','*unnel*og*' -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize | Out-String)
W 'fyd-watchdog-log-tail.txt' (Get-Content 'C:/Users/nolan/.local/share/pigi/pigi-fyd-stack-watchdog.log' -Tail 120 -ErrorAction SilentlyContinue | Out-String)

# current state snapshot
W 'now.txt' ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss K') + ' TZ=' + (Get-TimeZone).Id)
W 'adapters.txt' (Get-NetAdapter 2>&1 | Select-Object Name,InterfaceDescription,Status,LinkSpeed,MacAddress | Format-Table -AutoSize | Out-String)
W 'routes.txt' (Get-NetRoute -AddressFamily IPv4 2>&1 | Where-Object {$_.DestinationPrefix -eq '0.0.0.0/0'} | Select-Object DestinationPrefix,NextHop,InterfaceAlias,RouteMetric | Format-Table -AutoSize | Out-String)
W 'sshd-listener.txt' (Get-NetTCPConnection -LocalPort 22 -State Listen 2>&1 | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize | Out-String)
W 'tailscaled-svc.txt' (Get-Service '*tailscale*' 2>&1 | Select-Object Name,Status,StartType | Format-Table -AutoSize | Out-String)
$ts='C:/Program Files/Tailscale/tailscale.exe'
if(Test-Path $ts){ W 'tailscale-status.txt' (& $ts status 2>&1 | Out-String) } else { 'not-found' | Out-File "$out/tailscale-status.txt" -Encoding utf8 }
"harvest2 complete" | Out-File "$out/DONE2" -Encoding utf8
