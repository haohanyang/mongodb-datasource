package models

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type PluginSettings struct {
	Host                   string                `json:"host"`
	Port                   int                   `json:"port"`
	Database               string                `json:"database"`
	AuthMethod             string                `json:"authType"`
	Username               string                `json:"username"`
	ConnectionStringScheme string                `json:"connectionStringScheme"`
	ConnectionParameters   string                `json:"connectionParameters"`
	CaCertPath             string                `json:"caCertPath"`
	ClientCertPath         string                `json:"clientCertPath"` // public client certificate
	ClientKeyPath          string                `json:"clientKeyPath"`  // private client key
	Secrets                *SecretPluginSettings `json:"-"`
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
