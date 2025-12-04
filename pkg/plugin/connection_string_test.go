package plugin

import (
	"strings"
	"testing"

	"github.com/haohanyang/mongodb-datasource/pkg/models"
)

func TestBuildMongoConnectionString(t *testing.T) {

	t.Run("should build valid connection string with no auth", func(t *testing.T) {
		config := &models.PluginSettings{
			Host:                   "localhost:27017",
			AuthMethod:             "auth-none",
			ConnectionStringScheme: "standard",
		}

		uri, err := BuildMongoConnectionString(config)
		connString := uri.String()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/"
		if connString != expected {
			t.Errorf("expected connection string %s, got %s", expected, connString)
		}
	})

	t.Run("should build valid connection string with username/password auth", func(t *testing.T) {
		config := &models.PluginSettings{
			Host:                   "mycluster.mongodb.net",
			Username:               "username",
			AuthMethod:             "auth-username-password",
			ConnectionStringScheme: "dns_seed_list",
			Database:               "mydb",
			ConnectionOptions:      "retryWrites=true&w=majority&replicaSet=Cluster0",
			Secrets: &models.SecretPluginSettings{
				Password: "password",
			},
		}

		uri, err := BuildMongoConnectionString(config)
		connString := uri.String()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if !strings.HasPrefix(connString, "mongodb+srv://username:password@mycluster.mongodb.net/mydb") {
			t.Errorf("connection string %s does not start with expected substring", connString)
		}

		params := uri.Query()

		if len(params) != 3 {
			t.Errorf("expected 3 connection parameters, got %d", len(params))
		}

		if params.Get("retryWrites") != "true" {
			t.Errorf("expected retryWrites=true, got retryWrites=%s", params.Get("retryWrites"))
		}

		if params.Get("w") != "majority" {
			t.Errorf("expected w=majority, got w=%s", params.Get("w"))
		}

		if params.Get("replicaSet") != "Cluster0" {
			t.Errorf("expected replicaSet=Cluster0, got replicaSet=%s", params.Get("replicaSet"))
		}
	})

	t.Run("should support multiple hosts in standard connection string", func(t *testing.T) {
		config := &models.PluginSettings{
			Host:                   "host1:27017,host2:27017,host3:27017",
			AuthMethod:             "auth-none",
			ConnectionStringScheme: "standard",
		}

		uri, err := BuildMongoConnectionString(config)
		connString := uri.String()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://host1:27017,host2:27017,host3:27017"
		if connString != expected {
			t.Errorf("expected connection string %s, got %s", expected, connString)
		}
	})

	t.Run("should build valid connection string without database name", func(t *testing.T) {
		config := &models.PluginSettings{
			Host:                   "mongodb:27017",
			AuthMethod:             "auth-none",
			ConnectionStringScheme: "standard",
			ConnectionOptions:      "replicaSet=myRepl&ssl=true",
		}

		uri, err := BuildMongoConnectionString(config)
		connString := uri.String()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://mongodb:27017/?replicaSet=myRepl&ssl=true"
		if connString != expected {
			t.Errorf("expected connection string %s, got %s", expected, connString)
		}
	})
}
