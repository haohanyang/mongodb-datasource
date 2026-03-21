# Get Started

## Quick Start

#### 1. Clone the repository

```bash
git clone https://github.com/haohanyang/mongodb-datasource.git

cd mongodb-datasource
```

#### 2. Run the quick start script

At the repository root directory, run the script [quick_start.sh](https://github.com/haohanyang/mongodb-datasource/blob/master/scripts/quick_start.sh) or [quick_start.ps1](https://github.com/haohanyang/mongodb-datasource/blob/master/scripts/quick_start.ps1) from the repository root. The script downloads the latest plugin release to `mongodb-datasource` directory and starts a Grafana docker container with the plugin installed.

- Linux/macOS

```bash
bash scripts/quick_start.sh
```

- Windows

```pwsh
.\scripts\quick_start.ps1
```

#### 3. Add the MongoDB Datasource

Go to grafana dashboard on [http://localhost:3000](http://localhost:3000) and create a new MongoDB data source.

## Manual Setup

#### 1. Download and Extract the plugin files

Download the latest plugin build from the [Release page](https://github.com/haohanyang/mongodb-datasource/releases) or [workflow artifacts](https://github.com/haohanyang/mongodb-datasource/actions?query=branch%3Amaster)

Extract the downloaded zip file into your Grafana plugins directory (usually `/var/lib/grafana/plugins` if using Grafana Docker image). The plugin directory `mongodb-datasource` should have a structure similar to the following:

```
/lib/grafana/plugins/mongodb-datasource
├── LICENSE
├── module.js.map
├── gpx_mongodb_datasource_linux_amd64
├── plugin.json
└── README.md
```

#### 2. Grant necessary permissions

Ensure the plugin's binaries (starts with `gpx_mongodb_datasource_`) have execute permissions.

```sh
chmod +x mongodb-datasource/gpx_mongodb_datasource_*
```

#### 3. Configure the datasource

Go to grafana dashboard on [http://localhost:3000](http://localhost:3000) and create a new MongoDB data source.

Refer to the [example docker-compose.prod.yaml](https://github.com/haohanyang/mongodb-datasource/blob/master/docker-compose.prod.yaml) for a production-ready setup.

## Install using the Grafana CLI

#### 1. Download the plugin using cli

From within your Grafana instance, install the plugin via install cli, providing `pluginUrl` with link to the latest plugin archive file.

```sh
grafana cli \
    --pluginUrl https://github.com/haohanyang/mongodb-datasource/releases/download/v<version>/haohanyang-mongodb-datasource-<version>.zip \
    plugins install haohanyang-mongodb-datasource
```

Replace the placeholder `<version>` with the actual latest version, e.g. `0.5.0`.

#### 2. Restart Grafana

Restart the grafana to load the plugin. Configure the plugin as a data source on Grafana, providing your MongoDB connection information.
