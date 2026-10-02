$xml = [System.IO.File]::ReadAllText('C:/Users/nolan/.local/share/pigi/PigiXLogin.xml', [System.Text.Encoding]::UTF8)
Register-ScheduledTask -TaskName 'PigiXLogin' -Xml $xml -Force
Get-ScheduledTask -TaskName 'PigiXLogin' | Select-Object TaskName, State
