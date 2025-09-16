package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {

	caFile := "certs/ca.pem"
	certFile := "certs/mongodb.crt" // public client certificate
	keyFile := "certs/mongodb.pem"  // private client key
	passPhrase := "123"             // private client key passphrase

	// Loads CA certificate file
	caCert, err := os.ReadFile(caFile)
	if err != nil {
		panic(err)
	}
	caCertPool := x509.NewCertPool()
	if ok := caCertPool.AppendCertsFromPEM(caCert); !ok {
		panic("Error: CA file must be in PEM format")
	}
	// Loads client certificate files
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)

	if err != nil {
		panic(err)
	}
	// Instantiates a Config instance
	tlsConfig := &tls.Config{
		RootCAs:      caCertPool,
		Certificates: []tls.Certificate{cert},
	}
	uri := "mongodb://localhost:27017/?tls=true&tlsAllowInvalidCertificates=true&sslClientCertificateKeyPassword=" + passPhrase
	// Sets TLS options in options instance
	opts := options.Client().ApplyURI(uri).SetTLSConfig(tlsConfig)

	ctx := context.TODO()
	client, err := mongo.Connect(ctx, opts)

	if err != nil {
		panic(err)
	}
	defer client.Disconnect(ctx)

	err = client.Ping(ctx, nil)
	if err != nil {
		panic(err)
	}

	fmt.Println("Connected to MongoDB!")
}
