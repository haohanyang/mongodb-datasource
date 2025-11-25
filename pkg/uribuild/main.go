package main

import (
	"fmt"
	"net/url"

	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

func main() {
	u := url.URL{
		Scheme: connstring.SchemeMongoDB,
		Host:   "localhost:27017",
		User:   url.UserPassword("username", "password"),
		Path:   "mydatabase",
	}

	options := "tls=true&tlsAllowInvalidCertificates=true&sslClientCertificateKeyPassword=123&replicaSet=rs0"

	// Parse connection string options
	connOptions, err := url.ParseQuery(options)
	if err != nil {
		panic(err)
	}

	query := u.Query()

	for key, values := range connOptions {
		for _, value := range values {
			query.Add(key, value)
		}
	}

	u.RawQuery = query.Encode()
	fmt.Println("Parsed ConnString:", u.String())
}
