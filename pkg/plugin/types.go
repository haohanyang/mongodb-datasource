package plugin

import (
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"go.mongodb.org/mongo-driver/mongo"
)

// Datasource is a mongo datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	database        string
	client          *mongo.Client
	resourceHandler backend.CallResourceHandler
}

type queryModel struct {
	QueryText     string `json:"queryText"`
	Collection    string `json:"collection"`
	QueryLanguage string `json:"queryLanguage"`

	// Aggregate options
	AggregateComment                  string `json:"aggregateComment"`
	AggregateMaxTimeMS                int    `json:"aggregateMaxTimeMS"`
	AggregateBatchSize                int32  `json:"aggregateBatchSize"`
	AggregateAllowDiskUse             bool   `json:"aggregateAllowDiskUse"`
	AggregateMaxAwaitTime             int    `json:"aggregateMaxAwaitTime"`
	AggregateBypassDocumentValidation bool   `json:"aggregateBypassDocumentValidation"`
}
