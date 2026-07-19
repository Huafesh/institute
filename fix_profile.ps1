$path = "c:\Users\Huafesh\OneDrive\Documentos\Proyectos\institute\profile.html"
$c = Get-Content -Path $path -Encoding UTF8
$newContent = $c[0..2354] + $c[2535..($c.Count-1)]
$newContent | Set-Content -Path $path -Encoding UTF8
Write-Host "Done"
