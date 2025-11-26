package models

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type PluginSettings struct {
	Host                        string                `json:"host"`
	Port                        int                   `json:"port"`
	Database                    string                `json:"database"`
	AuthMethod                  string                `json:"authType"`
	Username                    string                `json:"username"`
	AuthDatabase                string                `json:"authDb"`
	ConnectionStringScheme      string                `json:"connectionStringScheme"`
	ConnectionOptions           string                `json:"connectionOptions"`
	TlsOption                   string                `json:"tlsOption"`
	CaCertPath                  string                `json:"caCertPath"`
	ClientCertAndKeyPath        string                `json:"clientCertAndKeyPath"`
	TlsInsecure                 bool                  `json:"tlsInsecure"`
	TlsAllowInvalidHostnames    bool                  `json:"tlsAllowInvalidHostnames"`
	TlsAllowInvalidCertificates bool                  `json:"tlsAllowInvalidCertificates"`
	Secrets                     *SecretPluginSettings `json:"-"`
}

type SecretPluginSettings struct {
	Password          string `json:"password"`
	ClientKeyPassword string `json:"clientKeyPassword"`
}

func LoadPluginSettings(source backend.DataSourceInstanceSettings) (*PluginSettings, error) {
	settings := PluginSettings{}
	err := json.Unmarshal(source.JSONData, &settings)
	if err != nil {
		return nil, fmt.Errorf("could not unmarshal PluginSettings json: %w", err)
	}

	settings.Secrets = loadSecretPluginSettings(source.DecryptedSecureJSONData)

	return &settings, nil
}

func loadSecretPluginSettings(source map[string]string) *SecretPluginSettings {
	return &SecretPluginSettings{
		Password:          source["password"],
		ClientKeyPassword: source["clientKeyPassword"],
	}
}
