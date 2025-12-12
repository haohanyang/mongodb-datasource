#/bin/bash
# The script builds, runs the development Docker container for the MongoDB Datasource Grafana plugin.
set -e

if [[ "$1" == "build" ]]; then
  echo "Building development image..."

  docker build \
    --build-arg grafana_image=grafana \
    --build-arg grafana_version=11.2.0 \
    --build-arg development=true \
    -t mongodb-datasource-grafana-dev \
    ./.config

  elif [[ "$1" == "start" ]]; then
    echo "Starting development container..."

    docker run -d \
      --name mongodb-datasource-grafana \
      --user root \
      -p 3000:3000/tcp \
      -p 2345:2345/tcp \
      -v "$(pwd)/dist:/var/lib/grafana/plugins/haohanyang-mongodb-datasource" \
      -v "$(pwd)/provisioning:/etc/grafana/provisioning" \
      -v "$(pwd):/root/haohanyang-mongodb-datasource" \
      -v "$(pwd)/certs:/certs:ro" \
      -e NODE_ENV=development \
      -e GF_LOG_FILTERS="plugin.haohanyang-mongodb-datasource:debug" \
      -e GF_LOG_LEVEL=debug \
      -e GF_DATAPROXY_LOGGING=1 \
      -e GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=haohanyang-mongodb-datasource \
      mongodb-datasource-grafana-dev


      PORT=3000

      # Wait for port to be available
      echo "Waiting for server on port ${PORT}..."
      MAX_ATTEMPTS=30
      ATTEMPT=0

      until curl -s http://localhost:${PORT}/api/health > /dev/null; do
        ATTEMPT=$((ATTEMPT + 1))
        if [ ${ATTEMPT} -ge ${MAX_ATTEMPTS} ]; then
          echo "Server failed to start after ${MAX_ATTEMPTS} attempts"
          exit 1
        fi
        echo "Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: Server not ready..."
        sleep 1
      done
  else
    echo "Usage: $0 {build|start}"
    exit 1
fi