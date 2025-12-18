package models

import (
	"encoding/json"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
)

func pointer[K any](val K) *K {
	return &val
}

func rawArrayToJson(value bson.RawValue) (string, error) {
	var bsonDoc bson.M
	err := bson.UnmarshalExtJSON([]byte(fmt.Sprintf(`{"data":%s}`, value.String())), true, &bsonDoc)
	if err != nil {
		return "", err
	}

	rawBytes, err := json.Marshal(bsonDoc["data"])
	if err != nil {
		return "", err
	}
	return string(rawBytes), nil
}

func rawDocToJson(value bson.RawValue) (string, error) {
	var bsonMap bson.M

	err := bson.UnmarshalExtJSON([]byte(value.String()), true, &bsonMap)
	if err != nil {
		return "", err
	}

	rawBytes, err := json.Marshal(bsonMap)
	if err != nil {
		return "", err
	}
	return string(rawBytes), nil
}
