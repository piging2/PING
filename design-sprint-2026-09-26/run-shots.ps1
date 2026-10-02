param([string]$base, [string]$outdir, [string]$tag)
$node = "C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe"
& $node "C:\Users\nolan\design-sprint\sprint-shots.cjs" $base $outdir $tag
