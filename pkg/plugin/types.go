package plugin

import (
	"time"
)

type queryModel struct {
	QueryText      string `json:"queryText"`
	Collection     string `json:"collection"`
	ApplyTimeRange bool   `json:"applyTimeRange"`
}

type timeSeriesRow[T any] struct {
	Timestamp time.Time `bson:"ts"`
	Name      string    `bson:"name"`
	Value     T         `bson:"value"`
}
