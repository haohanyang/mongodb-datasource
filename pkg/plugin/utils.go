package plugin

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
)

func PrintDataFrame(dataFrame *data.Frame) {
	// Print headers
	fmt.Print("|")
	for i, field := range dataFrame.Fields {
		fmt.Print(field.Name)
		if i < len(dataFrame.Fields)-1 {
			fmt.Print(",")
		}
	}
	fmt.Println("|")

	// Print data
	for i := 0; i < dataFrame.Rows(); i++ {
		fmt.Print("|")
		for j, field := range dataFrame.Fields {
			v, ok := field.ConcreteAt(i)

			if ok {
				if field.Type() == data.FieldTypeNullableJSON {
					rm := v.(json.RawMessage)
					rb, err := rm.MarshalJSON()
					if err != nil {
						panic(err)
					}
					fmt.Print(string(rb))
				} else if field.Type() == data.FieldTypeNullableString {
					s := v.(string)
					if len(s) > 10 {
						fmt.Print(s[:10] + "...")
					} else {
						fmt.Print(s)
					}
				} else {
					fmt.Print(v)
				}
			} else {
				fmt.Print("null")
			}

			if j < len(dataFrame.Fields)-1 {
				fmt.Print(",")
			}
		}
		fmt.Println("|")
	}
}

func pointer[K any](val K) *K {
	return &val
}
func null[K any]() *K {
	var nullValue *K
	return nullValue
}

// Validate mongo connection configuration and return connection string
func MongoUri(config *models.PluginSettings) (string, error) {
	var uri string
	var creds string
	var params string

	if config.Database == "" {
		return uri, errors.New("missing MongoDB database")
	}

	if config.AuthMethod == "auth-username-password" {
		if config.Username == "" || config.Secrets.Password == "" {
			return uri, errors.New("missing MongoDB username or password")
		}
		creds = fmt.Sprintf("%s:%s@", config.Username, config.Secrets.Password)
	} else if config.AuthMethod != "auth-none" {
		return uri, errors.New("unsupported auth method")
	}

	if config.ConnectionParameters != "" {
		params = "?" + config.ConnectionParameters
	}

	if config.ConnectionStringScheme == "dns_seed_list" {
		uri = fmt.Sprintf("mongodb+srv://%s%s/%s", creds, config.Host, params)
	} else {
		uri = fmt.Sprintf("mongodb://%s%s:%d/%s", creds, config.Host, config.Port, params)
	}

	return uri, nil
}
