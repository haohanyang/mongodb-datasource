import urllib.request
import json
import tempfile
import zipfile
import os
import glob
import subprocess
import shutil

dist_dir = "mongodb-datasource"
if os.path.isdir(dist_dir):
    shutil.rmtree(dist_dir)

# Download the latest release build
with urllib.request.urlopen(
    "https://api.github.com/repos/haohanyang/mongodb-datasource/releases/latest"
) as response:
    data = json.loads(response.read())

    for asset in data["assets"]:
        if asset["content_type"] == "application/zip":
            with tempfile.NamedTemporaryFile() as temp_file:
                print("Downloading " + asset["name"] + "...")
                urllib.request.urlretrieve(
                    asset["browser_download_url"], temp_file.name
                )
                print("Extracting files to " + dist_dir)
                with zipfile.ZipFile(temp_file.name, "r") as zip_ref:
                    zip_ref.extractall(os.getcwd())
    os.rename("haohanyang-mongodb-datasource", "mongodb-datasource")

# Grant execute permission go binaries
for bin in glob.glob("mongodb-datasource/gpx_mongodb_datasource_*"):
    os.chmod(bin, 755)

subprocess.call(
    ["sudo", "docker", "compose", "-f", "docker-compose.prod.yaml", "up", "-d"]
)
