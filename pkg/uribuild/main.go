package main

import (
	"fmt"
	"net/url"

	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

func main() {
	u := url.URL{}
	u.Scheme = connstring.SchemeMongoDB
	u.Host = "localhost:27017"
	u.User = url.UserPassword("username", "password")
	u.Path = "mydatabase"
	u.RawQuery = "tls=true&tlsAllowInvalidCertificates=true&sslClientCertificateKeyPassword=123"

	conn, err := connstring.ParseAndValidate(u.String())
	if err != nil {
		panic(err)
	}
	fmt.Println("Parsed ConnString:", conn.String())
}
