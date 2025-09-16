#/bin/bash
# Start MongoDB service with different configurations

# --tls
if [ "$1" == "--tls" ]; then
    echo "Starting MongoDB with TLS..."
    docker run --rm --name mongodb-ds-mongo-tls -v ./mongod.conf:/etc/mongo/mongod.conf \
        -v ./certs:/certs -p 27017:27017 -d mongo --config /etc/mongo/mongod.conf
# if no configuration is provided, start with default settings
else
    echo "Starting MongoDB with default settings..."
    docker run --rm --name mongodb-ds-mongo -d mongo
fi
