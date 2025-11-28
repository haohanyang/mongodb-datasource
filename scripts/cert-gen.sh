#!/usr/bin/env bash
# Modified from https://github.com/mongodb/mongo-go-driver/blob/4c1a39701aaf9d938942041c98c423ed0e161704/etc/gen-ec-certs/gen-ec-certs.sh#L39
# This script is used to generate Elliptic Curve (EC) certificates.
# The EC certificates are used for testing
# See: GODRIVER-2239.
set -euo pipefail
CA_SERIAL=$RANDOM
SERVER_SERIAL=$RANDOM
CLIENT_SERIAL=$RANDOM
CLIENT_KEY_PASSWORD=clientkeypass
DAYS=14600

rm -rf certs && mkdir certs
cd certs

# Generate CA certificate ... begin
# Generate an EC private key.
openssl ecparam -name prime256v1 -genkey -out ca-ec.key -noout
# Generate a certificate signing request.
openssl req -new -key ca-ec.key -out ca-ec.csr -subj "/C=US/ST=New York/L=New York City/O=MongoDB/OU=DBX/CN=ca/" -config ../scripts/empty.cnf -sha256
# Self-sign the request.
openssl x509 -in ca-ec.csr -out ca-ec.pem -req -signkey ca-ec.key -days $DAYS -sha256 -set_serial $CA_SERIAL -extfile ../scripts/ca.ext
# Generate CA certificate ... end

# Generate Server certificate ... begin
# Generate an EC private key.
openssl ecparam -name prime256v1 -genkey -out server-ec.key -noout
# Generate a certificate signing request.
openssl req -new -key server-ec.key -out server-ec.csr -subj "/C=US/ST=New York/L=New York City/O=MongoDB/OU=DBX/CN=server/" -config ../scripts/empty.cnf -sha256
# Sign the request with the CA. Add server extensions.
openssl x509 -in server-ec.csr -out server-ec.pem -req -CA ca-ec.pem -CAkey ca-ec.key -days $DAYS -sha256 -set_serial $SERVER_SERIAL -extfile ../scripts/server.ext
# Append private key to .pem file.
cat server-ec.key >> server-ec.pem
# Generate Server certificate ... end

# Generate Client certificate ... begin
# Generate an EC private key.
openssl ecparam -name prime256v1 -genkey -out client-ec.key -noout
# Generate a certificate signing request.
# Use the Common Name (CN) of "client". PyKMIP identifies the client by the CN. The test server expects the identity of "client".
openssl req -new -key client-ec.key -out client-ec.csr -subj "/C=US/ST=New York/L=New York City/O=MongoDB/OU=DBX/CN=client/" -config ../scripts/empty.cnf -sha256
# Sign the request with the CA. Add client extensions.
openssl x509 -in client-ec.csr -out client-ec.pem -req -CA ca-ec.pem -CAkey ca-ec.key -days $DAYS -sha256 -set_serial $CLIENT_SERIAL -extfile ../scripts/client.ext
# Append private key to .pem file.
cat client-ec.key >> client-ec.pem
# Generate Client certificate ... end

# Generate Encrypted Client certificate ... begin
# Generate an EC private key, encrypted with a password.
openssl ecparam -name prime256v1 -genkey | \
  openssl ec -aes256 -out client-ec-encrypted.key -passout pass:$CLIENT_KEY_PASSWORD
# Generate a certificate signing request.
openssl req -new -key client-ec-encrypted.key -out client-ec-encrypted.csr \
  -subj "/C=US/ST=New York/L=New York City/O=MongoDB/OU=DBX/CN=enc-client/" \
  -config ../scripts/empty.cnf -sha256 -passin pass:$CLIENT_KEY_PASSWORD
# Sign the request with the CA. Add client extensions.
openssl x509 -in client-ec-encrypted.csr -out client-ec-encrypted.pem -req -CA ca-ec.pem -CAkey ca-ec.key -days $DAYS -sha256 -set_serial $CLIENT_SERIAL -extfile ../scripts/client.ext
# Append encrypted private key to .pem file.
cat client-ec-encrypted.key >> client-ec-encrypted.pem
# Generate Client certificate ... end
# ...existing code...

# Generate X509 Auth certificate ... begin
# Generate an EC private key.
openssl ecparam -name prime256v1 -genkey -out client-x509.key -noout
# Generate a certificate signing request.
openssl req -new -key client-x509.key -out client-x509.csr -subj "/C=US/ST=New York/L=New York City/O=MongoDB/OU=Test/CN=user/" -config ../scripts/empty.cnf -sha256
# Sign the request with the CA. Add client extensions.
openssl x509 -in client-x509.csr -out client-x509.pem -req -CA ca-ec.pem -CAkey ca-ec.key -days $DAYS -sha256 -set_serial $CLIENT_SERIAL -extfile ../scripts/client.ext
# Append private key to .pem file.
cat client-x509.key >> client-x509.pem
# Generate Client certificate ... end


echo "Certificates generated successfully!"
echo "Client key password: ${CLIENT_KEY_PASSWORD}"
echo "Files created:"
echo "  ca-ec.pem"
echo "  server-ec.pem"
echo "  client-ec.pem"
echo "  client-ec-encrypted.pem"
echo "  client-x509.pem"
echo ""


# Clean-up.
rm *.csr
rm *.key