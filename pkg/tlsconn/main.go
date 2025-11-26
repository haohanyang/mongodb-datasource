package main

import (
	"context"
	"flag"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Username/Password with TLS (CA cert + Client cert)
// go run pkg/tlsconn/main.go -caFile=certs/ca-cert.pem -certKeyFile=certs/client.pem -username=user -password=pass -clientKeyPassword=myclientpass

func main() {

	caFile := flag.String("caFile", "", "Path to CA certificate file")
	certKeyFile := flag.String("certKeyFile", "", "Path to client certificate and key file")
	clientKeyPassword := flag.String("clientKeyPassword", "", "Client certificate password")

	username := flag.String("username", "", "MongoDB username")
	password := flag.String("password", "", "MongoDB password")

	flag.Parse()

	uri := "mongodb://localhost:27017/"
	opts := options.Client().ApplyURI(uri).SetTimeout(time.Duration(5) * time.Second)

	tlsOpts := map[string]any{}

	if *caFile != "" {
		tlsOpts["tlsCAFile"] = *caFile
	}

	if *certKeyFile != "" {
		tlsOpts["tlsCertificateKeyFile"] = *certKeyFile
	}

	if *clientKeyPassword != "" {
		tlsOpts["tlsCertificateKeyFilePassword"] = *clientKeyPassword
	}

	if len(tlsOpts) > 0 {
		tlsConfig, err := options.BuildTLSConfig(tlsOpts)
		if err != nil {
			panic(err)
		}
		opts = opts.SetTLSConfig(tlsConfig)
	}

	if *username != "" && *password != "" {
		opts = opts.SetAuth(options.Credential{
			Username: *username,
			Password: *password,
		})
	}

	ctx := context.TODO()
	client, err := mongo.Connect(ctx, opts)

	if err != nil {
		panic(err)
	}
	defer client.Disconnect(ctx)

	res, err := client.ListDatabases(ctx, bson.D{})
	if err != nil {
		panic(err)
	}

	fmt.Printf("Connected to MongoDB! %d databases found.\n", len(res.Databases))
}
