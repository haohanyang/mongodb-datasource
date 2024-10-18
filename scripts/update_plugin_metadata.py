import json
import os
import subprocess
import pprint
from datetime import datetime

timestamp = int(
    subprocess.check_output(["git", "show", "-s", "--format=%ct"]).decode().strip()
)

update_time = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")


def get_required_env_var(key_name: str, default=None):
    val = os.getenv(key_name, default)
    if val is None:
        raise ValueError(f"Environment variable {key_name} is not set")
    return val


# ${{ github.repository }}
repo = get_required_env_var("GITHUB_REPOSITORY")
# ${{ github.sha }}
sha = get_required_env_var("GITHUB_SHA")
# ${{ github.run_id }}
run_id = get_required_env_var("GITHUB_RUN_ID")
# ${{ github.ref_name }}
branch = get_required_env_var("GITHUB_REF_NAME")

with open(os.path.join("src", "plugin.json")) as f:
    metadata = json.load(f)

with open("package.json") as f:
    version = json.load(f)["version"]


links = [
    {"name": "Source", "url": f"https://github.com/{repo}"},
    {
        "name": "Commit",
        "url": f"https://github.com/{repo}/commit/{sha}",
    },
    {
        "name": "Build",
        "url": f"https://github.com/{repo}/actions/runs/{run_id}",
    },
]

metadata["info"]["links"] = links
if branch == "master":
    metadata["info"]["version"] = version
else:
    metadata["info"]["version"] = version + "-" + sha[:7]

metadata["info"]["updated"] = update_time

pprint.pprint(metadata)
with open(os.path.join("src", "plugin.json"), "w") as f:
    json.dump(metadata, f)
