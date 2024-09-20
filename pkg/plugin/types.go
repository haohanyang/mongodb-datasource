package plugin

import (
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
)

type queryModel struct {
	QueryText      string `json:"queryText"`
	Collection     string `json:"collection"`
	QueryType      string `json:"queryType"`
	ApplyTimeRange bool   `json:"applyTimeRange"`
}

type timeSeriesRow[T any] struct {
	Timestamp time.Time `bson:"ts"`
	Name      string    `bson:"name"`
	Value     T         `bson:"value"`
}

type columnDefinition struct {
	name      string
	valueType bsontype.Type
	addField  func(*data.Frame, bson.RawValue) error
}
