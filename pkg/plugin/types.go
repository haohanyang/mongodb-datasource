package plugin

import (
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
	"go.mongodb.org/mongo-driver/mongo"
)

// Datasource is a mongo datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	host     string
	port     int
	database string
	client   *mongo.Client
}

type queryModel struct {
	QueryText  string `json:"queryText"`
	Collection string `json:"collection"`
	QueryType  string `json:"queryType"`
}

type timeSeriesRow[T any] struct {
	Timestamp time.Time `bson:"ts"`
	Name      string    `bson:"name"`
	Value     T         `bson:"value"`
}

type columnDefinition struct {
	name      string
	valueType bsontype.Type
	appendValue  func(*data.Frame, bson.RawValue) error
}
