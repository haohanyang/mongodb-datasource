#/bin/bash
# Start MongoDB service with different configurations

echo "Starting MongoDB with TLS..."
docker run --rm --name mongodb-ds-mongo-tls \
    -e MONGO_INITDB_ROOT_USERNAME=user \
    -e MONGO_INITDB_ROOT_PASSWORD=pass \
    -v ./mongod.conf:/etc/mongo/mongod.conf \
    -v ./certs:/certs \
    -p 27017:27017 \
    mongo --config /etc/mongo/mongod.conf