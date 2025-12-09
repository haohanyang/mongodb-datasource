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
			Host:                   "example.com",
			ConnectionStringScheme: connstring.SchemeMongoDBSRV,
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb+srv://localhost:27017/"
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
}
