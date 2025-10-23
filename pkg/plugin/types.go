package plugin

import (
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"go.mongodb.org/mongo-driver/mongo"
)

// Datasource is a mongo datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	database string
	client   *mongo.Client
	resourceHandler backend.CallResourceHandler
}

type queryModel struct {
	QueryText     string `json:"queryText"`
	Collection    string `json:"collection"`
	QueryType     string `json:"queryType"`
	QueryLanguage string `json:"queryLanguage"`

	// Aggregate options
	AggregateComment                  string `json:"aggregateComment"`
	AggregateMaxTimeMS                int    `json:"aggregateMaxTimeMS"`
	AggregateBatchSize                int32  `json:"aggregateBatchSize"`
	AggregateAllowDiskUse             bool   `json:"aggregateAllowDiskUse"`
	AggregateMaxAwaitTime             int    `json:"aggregateMaxAwaitTime"`
	AggregateBypassDocumentValidation bool   `json:"aggregateBypassDocumentValidation"`
}
type TimeSeriesRow[T any] struct {
	Timestamp time.Time `bson:"ts"`
	Name      string    `bson:"name"`
	Value     T         `bson:"value"`
}
