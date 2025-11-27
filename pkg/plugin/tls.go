package plugin

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"os"

	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SetupTls_(config *models.PluginSettings, opts *options.ClientOptions) (*options.ClientOptions, error) {
	if config.TlsOption == tlsDisabled || (config.CaCertPath == "" && config.ClientCertAndKeyPath == "") {
		return opts, nil
	}

	tlsConfig := &tls.Config{}

	// Loads CA certificate file
	if config.CaCertPath != "" {
		caCert, err := os.ReadFile(config.CaCertPath)
		if err != nil {
			return nil, err
		}

		tlsConfig.RootCAs = x509.NewCertPool()
		if !tlsConfig.RootCAs.AppendCertsFromPEM(caCert) {
			return nil, errors.New("error appending CA certificate")
		}
	}

	if config.ClientCertAndKeyPath != "" {
		// Load client certificate and key (combined in one file)
		clientCert, err := tls.LoadX509KeyPair(config.ClientCertAndKeyPath, config.ClientCertAndKeyPath)
		if err != nil {
			return nil, err
		}
		tlsConfig.Certificates = []tls.Certificate{clientCert}
	}

	return opts.SetTLSConfig(tlsConfig), nil
}

// SetupTls configures TLS settings for the MongoDB client options based on the plugin settings.
func SetupTls(config *models.PluginSettings, opts *options.ClientOptions) error {
	if config.CaCertPath == "" && config.ClientCertAndKeyPath == "" {
		return nil
	}

	tlsOpts := map[string]any{}

	if config.CaCertPath != "" {
		tlsOpts["tlsCAFile"] = config.CaCertPath
	}

	if config.ClientCertAndKeyPath != "" {
		tlsOpts["tlsCertificateKeyFile"] = config.ClientCertAndKeyPath
	}

	if config.Secrets.ClientKeyPassword != "" {
		tlsOpts["tlsCertificateKeyFilePassword"] = config.Secrets.ClientKeyPassword
	}

	tlsConfig, err := options.BuildTLSConfig(tlsOpts)
	if err != nil {
		return err
	}

	opts.SetTLSConfig(tlsConfig)
	return nil
}
