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

	// Apply defaults
	if config.ConnectionStringScheme == "" {
		config.ConnectionStringScheme = connstring.SchemeMongoDB
	}

	if config.TlsOption == "" {
		config.TlsOption = tlsDefault
	}

	if config.AuthMethod == "" {
		config.AuthMethod = MongoAuthNone
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

	// Ref: https://github.com/mongodb-js/compass/blob/ffbe6d0b9c4401342de5222e066efff6d77ee455/packages/connection-form/src/utils/tls-handler.ts#L42
	if config.TlsOption == tlsEnabled {
		query.Del("ssl")
		query.Add("tls", "true")
	} else if config.TlsOption == tlsDisabled {
		query.Del("tls")
		query.Add("ssl", "false")
	} else if config.TlsOption == tlsDefault {
		query.Del("tls")
		query.Del("ssl")
	}

	if config.AuthMethod == MongoAuthX509 {
		query.Add("authMechanism", "MONGODB-X509")
	}

	if config.AuthDatabase != "" {
		query.Add("authSource", config.AuthDatabase)
	}

	if config.TlsOption != tlsDisabled && config.TlsInsecure {
		query.Add("tlsInsecure", "true")
	}

	if config.TlsOption != tlsDisabled && config.TlsAllowInvalidHostnames {
		query.Add("tlsAllowInvalidHostnames", "true")
	}

	if config.TlsOption != tlsDisabled && config.TlsAllowInvalidCertificates {
		query.Add("tlsAllowInvalidCertificates", "true")
	}

	u.RawQuery = query.Encode()
	return u, nil
}
