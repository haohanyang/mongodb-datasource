package plugin

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
)

type frame struct {
	timestamps []time.Time
	values     []int32
}

type tableColumn struct {
	columnName string
	columnType bsontype.Type
	rawValues  []bson.RawValue
}

type timeSeriesRow struct {
	timestamp time.Time
	name      string
	valueType bsontype.Type
	rawValue  bson.RawValue
}
