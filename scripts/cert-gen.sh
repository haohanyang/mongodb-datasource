#/bin/bash
# Generate keys and certs to test local MongoDB TLS connection

set -e

mkdir -p certs

# Generate a Certificate Authority (CA)
openssl genrsa -out certs/ca.key 4096
openssl req -x509 -new -nodes -key certs/ca.key -sha256 -days 365 -out certs/ca.pem -subj "/CN=localhost"


# Generate a Server Key and Certificate Signing Request (CSR)
# Passphrase is set to 123
openssl genrsa -out certs/mongodb.key -passout pass:123 4096
openssl req -new -key certs/mongodb.key -out certs/mongodb.csr -subj "/CN=localhost"

# Sign the Server Certificate with the CA
openssl x509 -req -extfile <(printf "subjectAltName=DNS:localhost") -in certs/mongodb.csr -CA certs/ca.pem -CAkey certs/ca.key -CAcreateserial -out certs/mongodb.crt -days 365 -sha256

# Combine Server Key and Certificate
cat certs/mongodb.key certs/mongodb.crt > certs/mongodb.pem