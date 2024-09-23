# Download the latest GitHub Action artifact to mongodb-datasource folder
import tempfile
import zipfile
import requests
import sys
import os

pat = os.getenv("GITHUB_PAT")
if len(sys.argv) > 1:
    pat = sys.argv[1]

headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + pat,
    "X-GitHub-Api-Version": "2022-11-28"
}

if not pat:
    print("GitHub PAT not set")
    exit(1)

response = requests.get(
    "https://api.github.com/repos/haohanyang/mongodb-datasource/actions/artifacts", headers=headers)

response.raise_for_status()

artifacts = response.json()["artifacts"]

if len(artifacts) == 0:
    print("No artifacts found")
    exit(1)

artifact_download_url = artifacts[0]["archive_download_url"]

response = requests.get(artifact_download_url, headers=headers)
response.raise_for_status()

dist_dir = "mongodb-datasource"

if os.path.isdir(dist_dir):
    os.rmdir(dist_dir)

os.mkdir(dist_dir)

with tempfile.NamedTemporaryFile() as temp_file:
    temp_file.write(response.content)

    with zipfile.ZipFile(temp_file.name, 'r') as zip_ref:
        zip_ref.extractall(dist_dir)
