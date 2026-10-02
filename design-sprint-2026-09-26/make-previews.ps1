param([string]$dir)
Add-Type -AssemblyName System.Drawing
Get-ChildItem $dir -Filter *.png | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $w = 760
  $h = [int]($img.Height * $w / $img.Width)
  $thumb = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($thumb)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w, $h)
  $out = $_.FullName -replace '\.png$', '-preview.jpg'
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 60L)
  $thumb.Save($out, $enc, $params)
  $g.Dispose(); $thumb.Dispose(); $img.Dispose()
  Write-Output $out
}
