#!/bin/bash

set -uo pipefail

dist_dir="mongodb-datasource"
rm -rf "$dist_dir"

if [[ " $* " == *" --pre-release "* ]]; then
    # Download the latest release (can be pre-release) build
    data=$(curl -s "https://api.github.com/repos/haohanyang/mongodb-datasource/releases" | jq '.[0]')
else
    data=$(curl -s "https://api.github.com/repos/haohanyang/mongodb-datasource/releases/latest")
fi

name=$(echo "$data" | jq -r '.assets[] | select(.content_type == "application/zip") | .name' | head -n 1)
url=$(echo "$data" | jq -r '.assets[] | select(.content_type == "application/zip") | .browser_download_url' | head -n 1)

echo "Downloading $name from $url"

temp_file=$(mktemp)

curl -L -o "$temp_file" "$url"

if [ $? -eq 0 ]; then
    echo "Extracting..."
    unzip -q "$temp_file" -d .
    echo "Extraction complete."
    mv "haohanyang-mongodb-datasource" "$dist_dir"

    if docker ps >/dev/null 2>&1; then
        docker compose -f docker-compose.prod.yaml up -d
    else
        sudo docker compose -f docker-compose.prod.yaml up -d
    fi

    echo "Grafana is running on http://localhost:3000"
    echo ""
    echo "To sign the plugin, set environment variable GRAFANA_ACCESS_POLICY_TOKEN then run the following command:

    export GRAFANA_ACCESS_POLICY_TOKEN=<your-token-here>

    npx --yes @grafana/sign-plugin --distDir mongodb-datasource --rootUrls <grafana-root-urls>

Then restart the Grafana server
    "
else
    echo "Download failed."
fi

