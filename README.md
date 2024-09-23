# Grafana MongoDB data source

This plugin provides a Grafana datasource for querying and visualizing data from MongoDB.

![screenshot](/static/screenshot.png)

## Install
* Download the artifact(package plugin `haohanyang-mongodb-datasource-<version>.zip` from GitHub Action page and extract files to folder `mongodb-datasource`

```bash
unzip haohanyang-mongodb-datasource-<version>.zip -d mongodb-datasource
```
* Grant `0755`(`-rwxr-xr-x`) permission to binaries in `mongodb-datasource` directory.
```bash
chmod 0755 mongodb-datasource/gpx_mongodb_datasource_*
```
* Create/start the docker container as descriped in `docker-compose.prod.yaml`