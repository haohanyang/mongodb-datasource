package plugin

import (
	"testing"

	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

func TestSetUri(t *testing.T) {

	t.Run("should build connection string with db", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:     "localhost:27017",
			Database: "test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/test"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should build connection string without db", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host: "localhost:27017",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should build connection string with srv scheme", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:                   "test1.test.build.10gen.cc",
			ConnectionStringScheme: connstring.SchemeMongoDBSRV,
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb+srv://test1.test.build.10gen.cc/"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should return error for missing host", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{}

		err := setUri(config, opts)
		if err == nil {
			t.Fatalf("expected error for missing host, got nil")
		}
	})

	t.Run("should build connection string with multiple hosts", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host: "localhost1:27017,localhost2:27017,localhost3:27017",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost1:27017,localhost2:27017,localhost3:27017/"

		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should build connection string with options", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:              "localhost:27017",
			ConnectionOptions: "replicaSet=rs0&name=test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected1 := "mongodb://localhost:27017/?replicaSet=rs0&name=test"
		expected2 := "mongodb://localhost:27017/?name=test&replicaSet=rs0"
		if opts.GetURI() != expected1 && opts.GetURI() != expected2 {
			t.Errorf("expected connection string %s, got %s", expected1, opts.GetURI())
		}
	})

	t.Run("should remove tls options from connection string", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:              "localhost:27017",
			ConnectionOptions: "tls=true&name=test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/?name=test"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should add tls=true options from connection string", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:      "localhost:27017",
			TlsOption: tlsEnabled,
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/?tls=true"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should add ssl=false options from connection string", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:      "localhost:27017",
			TlsOption: tlsDisabled,
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/?ssl=false"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})
}

func TestSetAuth(t *testing.T) {
	t.Run("should handle no auth", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host: "localhost:27017",
		}
		err := setAuth(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		auth := opts.Auth
		if auth != nil {
			t.Errorf("expected no auth to be set, got %v", auth)
		}
	})

	t.Run("should set username and password", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:       "localhost:27017",
			AuthMethod: MongoAuthUsernamePassword,
			Username:   "testuser",
			Secrets: &models.SecretPluginSettings{
				Password: "testpass",
			},
			AuthDatabase: "admin",
		}

		err := setAuth(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		auth := opts.Auth

		if auth == nil {
			t.Fatalf("expected auth to be set, got nil")
		}
		if auth.Username != "testuser" {
			t.Errorf("expected username %s, got %s", "testuser", auth.Username)
		}
		if auth.Password != "testpass" {
			t.Errorf("expected password %s, got %s", "testpass", auth.Password)
		}
		if auth.AuthSource != "admin" {
			t.Errorf("expected auth source %s, got %s", "admin", auth.AuthSource)
		}
	})

	t.Run("should set x509 auth", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:       "localhost:27017",
			AuthMethod: MongoAuthX509,
		}

		err := setAuth(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		auth := opts.Auth

		if auth == nil {
			t.Fatalf("expected auth to be set, got nil")
		}
		if auth.AuthMechanism != "MONGODB-X509" {
			t.Errorf("expected auth mechanism %s, got %s", "MONGODB-X509", auth.AuthMechanism)
		}

		if auth.AuthSource != "$external" {
			t.Errorf("expected auth source %s, got %s", "$external", auth.AuthSource)
		}
	})
}
