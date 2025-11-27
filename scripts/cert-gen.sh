#!/bin/bash

# Client key password
PASSWORD=myclientpass

# Create directory for certificates
rm -rf certs
mkdir certs
cd certs

# Generate CA (Certificate Authority)
echo "Generating CA certificate..."
openssl genrsa -out ca-key.pem 4096

openssl req -new -x509 -days 365 -key ca-key.pem -out ca-cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=CA/CN=mongo"

# Generate MongoDB Server Certificate
echo "Generating MongoDB server certificate..."
openssl genrsa -out mongodb-server-key.pem 4096

openssl req -new -key mongodb-server-key.pem -out mongodb-server.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Server/CN=localhost"

# Create OpenSSL config for server cert with SAN
cat > server-ext.cnf <<EOF
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
DNS.2 = mongo
IP.1 = 127.0.0.1
EOF

openssl x509 -req -in mongodb-server.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out mongodb-server-cert.pem -days 365 -extfile server-ext.cnf

# Combine server cert and key into single PEM file
cat mongodb-server-cert.pem mongodb-server-key.pem > mongodb-server.pem

# Generate encrypted client certificate
echo "Generating client certificate..."
openssl genrsa -aes256 -out client-key.pem -passout pass:$PASSWORD 4096

openssl req -new -key client-key.pem -passin pass:$PASSWORD -out client.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Client/CN=client"

openssl x509 -req -in client.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out client-cert.pem -days 365

# Combine client cert and key into single PEM file
cat client-cert.pem client-key.pem > client.pem

echo "Certificates generated successfully!"
echo "Client key password: $PASSWORD"
echo "Files created:"
echo "  ca-cert.pem           - CA certificate (share this with clients)"
echo "  mongodb-server.pem    - MongoDB server certificate + key"
echo "  client.pem            - Client certificate + key"
echo ""

# Clean up temporary files
rm -f *.csr *.srl server-ext.cnf