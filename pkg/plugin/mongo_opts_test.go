package plugin

import (
	"context"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mongodb"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

var sourceRoot = os.Getenv("SOURCE_ROOT")
var certPath = filepath.Join(sourceRoot, "certs")

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

	t.Run("should build connection string with srv scheme", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:                   "test1.test.build.10gen.cc",
			Database:               "test",
			ConnectionStringScheme: connstring.SchemeMongoDBSRV,
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb+srv://test1.test.build.10gen.cc/test"
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

	t.Run("should return error for missing database", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host: "localhost:27017",
		}

		err := setUri(config, opts)
		if err == nil {
			t.Fatalf("expected error for missing database, got nil")
		}
	})

	t.Run("should build connection string with multiple hosts", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:     "localhost1:27017,localhost2:27017,localhost3:27017",
			Database: "test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost1:27017,localhost2:27017,localhost3:27017/test"

		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should build connection string with options", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:              "localhost:27017",
			ConnectionOptions: "replicaSet=rs0&name=test",
			Database:          "test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected1 := "mongodb://localhost:27017/test?replicaSet=rs0&name=test"
		expected2 := "mongodb://localhost:27017/test?name=test&replicaSet=rs0"
		if opts.GetURI() != expected1 && opts.GetURI() != expected2 {
			t.Errorf("expected connection string %s, got %s", expected1, opts.GetURI())
		}
	})

	t.Run("should remove tls options from connection string", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:              "localhost:27017",
			ConnectionOptions: "tls=true&name=test",
			Database:          "test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/test?name=test"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should add tls=true options from connection string", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:      "localhost:27017",
			Database:  "test",
			TlsOption: tlsEnabled,
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/test?tls=true"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})

	t.Run("should add ssl=false options from connection string", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:      "localhost:27017",
			TlsOption: tlsDisabled,
			Database:  "test",
		}

		err := setUri(config, opts)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		expected := "mongodb://localhost:27017/test?ssl=false"
		if opts.GetURI() != expected {
			t.Errorf("expected connection string %s, got %s", expected, opts.GetURI())
		}
	})
}

func TestSetAuth(t *testing.T) {
	t.Run("should handle no auth", func(t *testing.T) {
		opts := options.Client()
		config := &models.PluginSettings{
			Host:     "localhost:27017",
			Database: "test",
		}
		err := setAuth(config, opts)
		if err != nil {
			t.Fatal(err)
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
			Database:   "test",
			Username:   "testuser",
			Secrets: &models.SecretPluginSettings{
				Password: "testpass",
			},
			AuthDatabase: "admin",
		}

		err := setAuth(config, opts)
		if err != nil {
			t.Fatal(err)
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
			Database:   "test",
			AuthMethod: MongoAuthX509,
		}

		err := setAuth(config, opts)
		if err != nil {
			t.Fatal(err)
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

func conn(ctx context.Context, config *models.PluginSettings) (*mongo.Client, error) {
	opts := options.Client()
	err := setUri(config, opts)
	if err != nil {
		return nil, err
	}

	err = setAuth(config, opts)
	if err != nil {
		return nil, err
	}

	err = setupTls(config, opts)
	if err != nil {
		return nil, err
	}

	opts.SetTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func getHost(ctx context.Context, container *mongodb.MongoDBContainer) (string, error) {
	endpoint, err := container.ConnectionString(ctx)
	if err != nil {
		return "", err
	}

	mongoUri, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}

	return mongoUri.Host, nil
}

func TestConn(t *testing.T) {
	t.Run("should connect to mongodb with no auth", func(t *testing.T) {
		ctx := context.Background()

		mongodbContainer, err := mongodb.Run(ctx, "mongo")
		testcontainers.CleanupContainer(t, mongodbContainer)

		if err != nil {
			t.Fatal(err)
		}

		host, err := getHost(ctx, mongodbContainer)
		if err != nil {
			t.Fatal(err)
		}

		config := &models.PluginSettings{
			Host:     host,
			Database: "test",
		}

		client, err := conn(ctx, config)
		if err != nil {
			t.Fatal(err)
		}

		defer client.Disconnect(ctx)

		err = client.Ping(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}

	})

	t.Run("should connect to mongodb with username and password", func(t *testing.T) {
		ctx := context.Background()

		mongodbContainer, err := mongodb.Run(ctx, "mongo", testcontainers.WithEnv(map[string]string{
			"MONGO_INITDB_ROOT_USERNAME": "user",
			"MONGO_INITDB_ROOT_PASSWORD": "pass",
		}))
		testcontainers.CleanupContainer(t, mongodbContainer)

		if err != nil {
			t.Fatal(err)
		}

		host, err := getHost(ctx, mongodbContainer)
		if err != nil {
			t.Fatal(err)
		}

		config := &models.PluginSettings{
			Host:       host,
			AuthMethod: MongoAuthUsernamePassword,
			Username:   "user",
			Secrets: &models.SecretPluginSettings{
				Password: "pass",
			},
			Database: "test",
		}

		client, err := conn(ctx, config)
		if err != nil {
			t.Fatal(err)
		}

		defer client.Disconnect(ctx)

		err = client.Ping(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}

	})

	t.Run("should connect to mongodb with tls", func(t *testing.T) {
		ctx := context.Background()

		mongodbContainer, err := mongodb.Run(ctx, "mongo", testcontainers.WithEnv(map[string]string{
			"MONGO_INITDB_ROOT_USERNAME": "user",
			"MONGO_INITDB_ROOT_PASSWORD": "pass",
		}), testcontainers.WithFiles(testcontainers.ContainerFile{
			HostFilePath:      certPath,
			ContainerFilePath: "/",
			FileMode:          0o777,
		}), testcontainers.WithCmd("mongod", "--tlsMode", "preferTLS", "--tlsCAFile", "/certs/ca-ec.pem", "--tlsCertificateKeyFile", "/certs/server-ec.pem"))
		testcontainers.CleanupContainer(t, mongodbContainer)

		if err != nil {
			t.Fatal(err)
		}

		host, err := getHost(ctx, mongodbContainer)
		if err != nil {
			t.Fatal(err)
		}

		config := &models.PluginSettings{
			Host:                 host,
			AuthMethod:           MongoAuthUsernamePassword,
			CaCertPath:           filepath.Join(certPath, "ca-ec.pem"),
			ClientCertAndKeyPath: filepath.Join(certPath, "client-ec.pem"),
			TlsOption:            tlsEnabled,
			Username:             "user",
			Secrets: &models.SecretPluginSettings{
				Password: "pass",
			},
			Database: "test",
		}

		client, err := conn(ctx, config)
		if err != nil {
			t.Fatal(err)
		}

		defer client.Disconnect(ctx)

		err = client.Ping(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("should connect to mongodb with tls and client passkey", func(t *testing.T) {
		ctx := context.Background()

		mongodbContainer, err := mongodb.Run(ctx, "mongo", testcontainers.WithEnv(map[string]string{
			"MONGO_INITDB_ROOT_USERNAME": "user",
			"MONGO_INITDB_ROOT_PASSWORD": "pass",
		}), testcontainers.WithFiles(testcontainers.ContainerFile{
			HostFilePath:      certPath,
			ContainerFilePath: "/",
			FileMode:          0o777,
		}), testcontainers.WithCmd("mongod", "--tlsMode", "preferTLS", "--tlsCAFile", "/certs/ca-ec.pem", "--tlsCertificateKeyFile", "/certs/server-ec.pem"))
		testcontainers.CleanupContainer(t, mongodbContainer)

		if err != nil {
			t.Fatal(err)
		}

		host, err := getHost(ctx, mongodbContainer)
		if err != nil {
			t.Fatal(err)
		}

		config := &models.PluginSettings{
			Host:                 host,
			AuthMethod:           MongoAuthUsernamePassword,
			CaCertPath:           filepath.Join(certPath, "ca-ec.pem"),
			ClientCertAndKeyPath: filepath.Join(certPath, "client-ec-encrypted.pem"),
			TlsOption:            tlsEnabled,
			Username:             "user",
			Secrets: &models.SecretPluginSettings{
				Password:          "pass",
				ClientKeyPassword: "clientkeypass",
			},
			Database: "test",
		}

		client, err := conn(ctx, config)
		if err != nil {
			t.Fatal(err)
		}

		defer client.Disconnect(ctx)

		err = client.Ping(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("should connect to mongodb with x509 auth", func(t *testing.T) {
		ctx := context.Background()

		mongodbContainer, err := mongodb.Run(ctx, "mongo", testcontainers.WithEnv(map[string]string{
			"MONGO_INITDB_ROOT_USERNAME": "user",
			"MONGO_INITDB_ROOT_PASSWORD": "pass",
		}), testcontainers.WithFiles(testcontainers.ContainerFile{
			HostFilePath:      certPath,
			ContainerFilePath: "/",
			FileMode:          0o777,
		}), testcontainers.WithCmd("mongod", "--tlsMode", "preferTLS", "--tlsCAFile", "/certs/ca-ec.pem", "--tlsCertificateKeyFile", "/certs/server-ec.pem"))
		testcontainers.CleanupContainer(t, mongodbContainer)

		if err != nil {
			t.Fatal(err)
		}

		host, err := getHost(ctx, mongodbContainer)
		if err != nil {
			t.Fatal(err)
		}

		// Create x509 user
		{
			// Get username
			output, err := exec.Command("openssl", "x509", "-in", filepath.Join(certPath, "client-x509.pem"), "-inform", "PEM", "-subject", "-nameopt", "RFC2253").Output()
			if err != nil {
				t.Fatal(err)
			}
			lines := strings.Split(string(output), "\n")
			subject := strings.TrimSpace(strings.Replace(lines[0], "subject=", "", 1))

			config := &models.PluginSettings{
				Host:                 host,
				AuthMethod:           MongoAuthUsernamePassword,
				CaCertPath:           filepath.Join(certPath, "ca-ec.pem"),
				ClientCertAndKeyPath: filepath.Join(certPath, "client-ec.pem"),
				TlsOption:            tlsEnabled,
				Username:             "user",
				Secrets: &models.SecretPluginSettings{
					Password: "pass",
				},
				Database: "test",
			}

			client, err := conn(ctx, config)
			if err != nil {
				t.Fatal(err)
			}

			defer client.Disconnect(ctx)

			res := client.Database("$external").RunCommand(ctx, bson.D{
				{Key: "createUser", Value: subject},
				{Key: "roles", Value: bson.A{
					bson.D{{Key: "role", Value: "readWrite"}, {Key: "db", Value: "test"}},
					bson.D{{Key: "role", Value: "userAdminAnyDatabase"}, {Key: "db", Value: "admin"}},
				}},
			})

			if res.Err() != nil {
				t.Fatal(res.Err())
			}

			t.Logf("X509 user %s created\n", subject)
		}

		config := &models.PluginSettings{
			Host:                 host,
			AuthMethod:           MongoAuthX509,
			CaCertPath:           filepath.Join(certPath, "ca-ec.pem"),
			ClientCertAndKeyPath: filepath.Join(certPath, "client-x509.pem"),
			TlsOption:            tlsEnabled,
			Database:             "test",
		}

		client, err := conn(ctx, config)
		if err != nil {
			t.Fatal(err)
		}

		defer client.Disconnect(ctx)

		err = client.Ping(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
	})

}
