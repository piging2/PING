param([string]$dir)
Add-Type -AssemblyName System.Drawing
$maxH = 8000
Get-ChildItem $dir -Filter *-preview.jpg | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $n = [Math]::Ceiling($img.Height / $maxH)
  for ($i = 0; $i -lt $n; $i++) {
    $y = $i * $maxH
    $h = [Math]::Min($maxH, $img.Height - $y)
    $crop = New-Object System.Drawing.Bitmap($img.Width, $h)
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $img.Width, $h)), (New-Object System.Drawing.Rectangle(0, $y, $img.Width, $h)), [System.Drawing.GraphicsUnit]::Pixel)
    $out = $_.FullName -replace '-preview\.jpg$', ("-c{0}.jpg" -f ($i + 1))
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 62L)
    $crop.Save($out, $enc, $params)
    $g.Dispose(); $crop.Dispose()
  }
  $img.Dispose()
  Write-Output ("{0}: {1} chunks" -f $_.Name, $n)
}
