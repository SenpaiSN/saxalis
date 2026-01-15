$cwd = Get-Location
$allFiles = Get-ChildItem -File -Recurse

# API files
$apiFiles = Get-ChildItem -Path API -Filter *.php -File -Recurse
$apiResults = foreach ($f in $apiFiles) {
    $pattern = $f.Name
    $count = (Select-String -Pattern $pattern -Path ($allFiles | Select-Object -ExpandProperty FullName) -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count
    [PSCustomObject]@{ file = $f.FullName.Replace($cwd.Path + '\\',''); references = $count }
}
$apiResults | Export-Csv -Path api_references.csv -NoTypeInformation

# SRC files
$srcFiles = Get-ChildItem -Path src -File -Recurse
$srcResults = foreach ($f in $srcFiles) {
    $pattern = $f.Name
    $count = (Select-String -Pattern $pattern -Path ($allFiles | Select-Object -ExpandProperty FullName) -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count
    [PSCustomObject]@{ file = $f.FullName.Replace($cwd.Path + '\\',''); references = $count }
}
$srcResults | Export-Csv -Path src_references.csv -NoTypeInformation

Write-Output "Wrote api_references.csv and src_references.csv"