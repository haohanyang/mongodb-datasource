$ErrorActionPreference = "Stop"

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

Remove-Item -LiteralPath $dist_dir -Recurse -Force

Write-Output "Downloading $name from $url"
$tempZip = New-TemporaryFile

$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri $url -OutFile $tempZip
Rename-Item -Path $tempZip -NewName "$tempZip.zip"

Write-Output "Extracting..."
Expand-Archive -Path "$tempZip.zip" -DestinationPath . -Force
Write-Output "Extraction complete."

Rename-Item -Path "haohanyang-mongodb-datasource" -NewName $dist_dir
Remove-Item "$tempZip.zip"

docker compose -f docker-compose.prod.yaml up -d

Write-Output "Grafana is running on http://localhost:3000"
Write-Output ""
Write-Output @"
To sign the plugin, set environment variable GRAFANA_ACCESS_POLICY_TOKEN then run the following command:

    `$env:GRAFANA_ACCESS_POLICY_TOKEN = "your-token-here"

    npx --yes @grafana/sign-plugin --distDir mongodb-datasource --rootUrls <grafana-root-urls>

Then restart the Grafana server
"@