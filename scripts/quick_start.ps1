$dist_dir = "mongodb-datasource"

if ($args -contains "--pre-release") {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/haohanyang/mongodb-datasource/releases"
    $data = $response[0]
} else {
    $data = Invoke-RestMethod -Uri "https://api.github.com/repos/haohanyang/mongodb-datasource/releases/latest"
}

foreach ($asset in $data.assets) {
    if ($asset.content_type -eq "application/zip") {
        $name = $asset.name
        $url = $asset.browser_download_url
        break
    }
}

Write-Output "Downloading $name from $url"
$tempZip = New-TemporaryFile
Invoke-WebRequest -Uri $url -OutFile $tempZip

Write-Output "Extracting..."
Expand-Archive -Path $tempZip -DestinationPath . -Force
Write-Output "Extraction complete."

Rename-Item -Path "haohanyang-mongodb-datasource" -NewName $dist_dir
Remove-Item $tempZip

docker compose -f docker-compose.prod.yaml up -d

Write-Output "Grafana is running on http://localhost:3000"