package plugin

import (
	"errors"
	"net/url"

	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

func buildMongoOpts(config *models.PluginSettings) (*options.ClientOptions, error) {

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

	return opts, nil
}

func setAuth(config *models.PluginSettings, opts *options.ClientOptions) error {
	if config.AuthMethod == MongoAuthUsernamePassword {
		if config.Username == "" || config.Secrets == nil || config.Secrets.Password == "" {
			return errors.New("missing MongoDB username or password")
		}

		cred := options.Credential{
			Username: config.Username,
			Password: config.Secrets.Password,
		}

		if config.AuthDatabase != "" {
			cred.AuthSource = config.AuthDatabase
		}

		opts.SetAuth(cred)
	} else if config.AuthMethod == MongoAuthX509 {
		cred := options.Credential{
			AuthMechanism: "MONGODB-X509",
			AuthSource:    "$external",
		}

		opts.SetAuth(cred)
	}

	return nil
}

// Set connection string from plugin settings
// Only set connection schema, host, database and connection options here
func setUri(config *models.PluginSettings, opts *options.ClientOptions) error {
	if config.Host == "" {
		return errors.New("missing MongoDB host")
	}

	u := &url.URL{
		Host:   config.Host,
		Path:   config.Database,
		Scheme: connstring.SchemeMongoDB,
	}

	if config.Database == "" {
		u.Path = "/"
	}

	if config.ConnectionStringScheme == connstring.SchemeMongoDBSRV {
		u.Scheme = connstring.SchemeMongoDBSRV
	}

	// Remove starting ? in connection options
	if len(config.ConnectionOptions) > 0 && config.ConnectionOptions[0] == '?' {
		config.ConnectionOptions = config.ConnectionOptions[1:]
	}

	// Parse connection string options
	connOptions, err := url.ParseQuery(config.ConnectionOptions)
	if err != nil {
		return err
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

	u.RawQuery = query.Encode()

	opts.ApplyURI(u.String())

	err = opts.Validate()
	return err
}

func setupTls(config *models.PluginSettings, opts *options.ClientOptions) error {
	if config.TlsOption == tlsDisabled || (config.CaCertPath == "" && config.ClientCertAndKeyPath == "") {
		return nil
	}

	tlsOpts := map[string]any{}

	if config.CaCertPath != "" {
		tlsOpts["tlsCAFile"] = config.CaCertPath
	}

	if config.ClientCertAndKeyPath != "" {
		tlsOpts["tlsCertificateKeyFile"] = config.ClientCertAndKeyPath
	}

	if config.Secrets != nil && config.Secrets.ClientKeyPassword != "" {
		tlsOpts["tlsCertificateKeyFilePassword"] = config.Secrets.ClientKeyPassword
	}

	tlsConfig, err := options.BuildTLSConfig(tlsOpts)
	if err != nil {
		return err
	}

	opts.SetTLSConfig(tlsConfig)
	return nil
}
