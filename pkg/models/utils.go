package models

import (
	"encoding/json"

	"go.mongodb.org/mongo-driver/bson"
)

func pointer[K any](val K) *K {
	return &val
}

// rawArrayToJson serializes a BSON array RawValue to a JSON string.
//
// We deliberately do NOT call value.String() to obtain the extended-JSON
// form. value.String() goes through x/bsonx/bsoncore.formatDouble, which
// has a bug: it appends ".0" to a scientific-notation float like "2E-05",
// producing "2E-05.0" and breaking strconv.ParseFloat in the subsequent
// UnmarshalExtJSON step. The canonical formatDouble in
// bson/bsonrw/extjson_writer.go (used by bson.MarshalExtJSON) does not
// have this bug, so we route the BSON-to-extJSON conversion through there.
func rawArrayToJson(value bson.RawValue) (string, error) {
	wrap := bson.D{{Key: "data", Value: value}}
	extJSON, err := bson.MarshalExtJSON(wrap, true, false)
	if err != nil {
		return "", err
	}

	var bsonDoc bson.M
	if err := bson.UnmarshalExtJSON(extJSON, true, &bsonDoc); err != nil {
		return "", err
	}

	rawBytes, err := json.Marshal(bsonDoc["data"])
	if err != nil {
		return "", err
	}
	return string(rawBytes), nil
}

// rawDocToJson serializes a BSON embedded-document RawValue to a JSON
// string. See rawArrayToJson for why we avoid value.String().
func rawDocToJson(value bson.RawValue) (string, error) {
	extJSON, err := bson.MarshalExtJSON(bson.Raw(value.Value), true, false)
	if err != nil {
		return "", err
	}

	var bsonMap bson.M
	if err := bson.UnmarshalExtJSON(extJSON, true, &bsonMap); err != nil {
		return "", err
	}

	rawBytes, err := json.Marshal(bsonMap)
	if err != nil {
		return "", err
	}
	return string(rawBytes), nil
}
