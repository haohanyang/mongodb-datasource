package models

import (
	"encoding/json"

	"go.mongodb.org/mongo-driver/bson"
)

func rawArrayToJson(value bson.RawValue) (string, error) {
	var bsonArray bson.A
	err := bson.UnmarshalExtJSON([]byte(value.String()), true, &bsonArray)
	if err != nil {
		return "", err
	}

	rawBytes, err := json.Marshal(bsonArray)
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
