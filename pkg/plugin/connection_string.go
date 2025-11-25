package plugin

import (
	"errors"
	"net/url"

	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

func BuildMongoConnectionString(config *models.PluginSettings) (*url.URL, error) {

	if config.Host == "" {
		return nil, errors.New("missing MongoDB host")
	}

	u := &url.URL{
		Host: config.Host,
		Path: config.Database,
	}

	if config.Database == "" {
		u.Path = "/"
	}

	if config.ConnectionStringScheme == connstring.SchemeMongoDBSRV {
		u.Scheme = connstring.SchemeMongoDBSRV
	} else {
		u.Scheme = connstring.SchemeMongoDB
	}

	if config.AuthMethod == MongoAuthUsernamePassword {
		if config.Username == "" || config.Secrets.Password == "" {
			return nil, errors.New("missing MongoDB username or password")
		}
		u.User = url.UserPassword(config.Username, config.Secrets.Password)
	}

	// Remove starting ? in connection options
	if len(config.ConnectionOptions) > 0 && config.ConnectionOptions[0] == '?' {
		config.ConnectionOptions = config.ConnectionOptions[1:]
	}

	// Parse connection string options
	connOptions, err := url.ParseQuery(config.ConnectionOptions)
	if err != nil {
		return nil, err
	}

	query := u.Query()

	for key, values := range connOptions {
		for _, value := range values {
			query.Add(key, value)
		}
	}

	// TLS passphrase
	if config.AuthMethod == MongoAuthTLSSSL && config.Secrets.ClientKeyPassword != "" {
		query.Add("sslClientCertificateKeyPassword", config.Secrets.ClientKeyPassword)
	}

	if config.TlsInsecure {
		query.Add("tlsInsecure", "true")
	}

	if config.TlsAllowInvalidHostnames {
		query.Add("tlsAllowInvalidHostnames", "true")
	}

	if config.TlsAllowInvalidCertificates {
		query.Add("tlsAllowInvalidCertificates", "true")
	}

	u.RawQuery = query.Encode()
	return u, nil
}
