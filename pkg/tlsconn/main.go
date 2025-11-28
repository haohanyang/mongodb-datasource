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
// go run pkg/tlsconn/main.go -caFile=certs/ca-ec.pem -certKeyFile=certs/client-ec.pem -username=user -password=pass

// Username/Password with TLS (CA cert + Client cert + client key password)
// go run pkg/tlsconn/main.go -caFile=certs/ca-ec.pem -certKeyFile=certs/client-ec-encrypted.pem -username=user -password=pass --clientKeyPassword=clientkeypass

// x.509 Authentication with TLS (CA cert + Client cert)
// go run pkg/tlsconn/main.go -caFile=certs/ca-ec.pem -certKeyFile=certs/client-x509.pem -x509Auth

func main() {

	caFile := flag.String("caFile", "", "Path to CA certificate file")
	certKeyFile := flag.String("certKeyFile", "", "Path to client certificate and key file")
	clientKeyPassword := flag.String("clientKeyPassword", "", "Client certificate password")
	// createX509User := flag.Bool("createX509User", false, "Create an x.509 user in the database")
	x509Auth := flag.Bool("x509Auth", false, "Use x.509 authentication")

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
		opts.SetTLSConfig(tlsConfig)
	}

	if *username != "" && *password != "" {
		opts.SetAuth(options.Credential{
			Username: *username,
			Password: *password,
		})
	}

	if *x509Auth {
		opts.SetAuth(options.Credential{
			AuthMechanism: "MONGODB-X509",
			AuthSource:    "$external",
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

	// if *createX509User {
	// 	userName := "CN=x509user,OU=DB,O=MongoDB,L=New York City,ST=New York,C=US"
	// 	externalDb := client.Database("$external")

	// 	// Delete all existing x.509 users
	// 	usersRes := externalDb.RunCommand(ctx, bson.D{
	// 		{Key: "usersInfo", Value: 1},
	// 	})

	// 	if usersRes.Err() != nil {
	// 		panic(usersRes.Err())
	// 	}

	// 	var usersDoc bson.M
	// 	if err := usersRes.Decode(&usersDoc); err != nil {
	// 		panic(err)
	// 	}

	// 	// for _, user := range usersDoc["users"].(bson.A) {
	// 	// 	userMap := user.(bson.M)
	// 	// 	fmt.Printf("User: %s, DB: %s, Mechanisms: %v\n",
	// 	// 		userMap["user"],
	// 	// 		userMap["db"],
	// 	// 		userMap["mechanisms"],
	// 	// 	)
	// 	// }

	// 	// Delete all users
	// 	for _, user := range usersDoc["users"].(bson.A) {
	// 		userMap := user.(bson.M)
	// 		delRes := externalDb.RunCommand(ctx, bson.D{
	// 			{Key: "dropUser", Value: userMap["user"]},
	// 		})

	// 		if delRes.Err() != nil {
	// 			panic(delRes.Err())
	// 		} else {
	// 			fmt.Printf("Deleted user: %s\n", userMap["user"])
	// 		}
	// 	}

	// 	createRes := externalDb.RunCommand(ctx, bson.D{
	// 		{Key: "createUser", Value: userName},
	// 		{Key: "roles", Value: bson.A{
	// 			bson.D{{Key: "role", Value: "readWrite"}, {Key: "db", Value: "test"}},
	// 		}},
	// 	})

	// 	if createRes.Err() != nil {
	// 		panic(createRes.Err())
	// 	} else {
	// 		fmt.Printf("Created x.509 user %s successfully.\n", userName)
	// 	}
	// }
}
