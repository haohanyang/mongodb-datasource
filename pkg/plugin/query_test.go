package plugin

import (
	"context"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Doc[T any] struct {
	Name  string    `bson:"name"`
	Ts    time.Time `bson:"ts"`
	Value T         `bson:"value"`
}

func TestCreateTimeSeriesFramesFromQuery(t *testing.T) {

	t.Run("fields with correct int values and timestamps", func(t *testing.T) {
		ctx := context.Background()
		now := time.Now()
		docs := []interface{}{
			bson.M{
				"name":  "name1",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1,
			},
			bson.M{
				"name":  "name1",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"name":  "name2",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 3,
			},
			bson.M{
				"name":  "name2",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 4,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := createTimeSeriesFramesFromQuery(ctx, cursor)

		if err != nil {
			t.Fatal(err)
		}

		f1 := frames["name1"]
		f2 := frames["name2"]

		if f1 == nil || f2 == nil {
			t.Fatal("should have frame \"name1\" and \"name1\"")
		}

		expectedF1 := data.NewFrame("name1",
			data.NewField("time", nil, []time.Time{now, now}),
			data.NewField("Value", nil, []int32{1, 2}),
		)

		expectedF2 := data.NewFrame("name2",
			data.NewField("time", nil, []time.Time{now, now}),
			data.NewField("Value", nil, []int32{3, 4}),
		)

		if !cmp.Equal(f1, expectedF1, dataFrameComparer) || !cmp.Equal(f2, expectedF2, dataFrameComparer) {
			t.Error("Data frame not correct")
		}
	})

	t.Run("fields with correct float values and timestamps", func(t *testing.T) {
		ctx := context.Background()
		now := time.Now()
		docs := []interface{}{
			bson.M{
				"name":  "name1",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
			bson.M{
				"name":  "name1",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.2,
			},
			bson.M{
				"name":  "name2",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.3,
			},
			bson.M{
				"name":  "name2",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.4,
			},
		}

		cursor := initCursorWithData(docs, t)

		frames, err := createTimeSeriesFramesFromQuery(ctx, cursor)

		if err != nil {
			t.Fatal(err)
		}

		f1 := frames["name1"]
		f2 := frames["name2"]

		if f1 == nil || f2 == nil {
			t.Fatal("should have frame \"name1\" and \"name1\"")
		}

		expectedF1 := data.NewFrame("name1",
			data.NewField("time", nil, []time.Time{now, now}),
			data.NewField("Value", nil, []float64{1.1, 1.2}),
		)

		expectedF2 := data.NewFrame("name2",
			data.NewField("time", nil, []time.Time{now, now}),
			data.NewField("Value", nil, []float64{1.3, 1.4}),
		)

		if !cmp.Equal(f1, expectedF1, dataFrameComparer) || !cmp.Equal(f2, expectedF2, dataFrameComparer) {
			t.Error("Data frame not correct")
		}
	})

	t.Run("return error on invalid value field", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": false,
			},
		}

		cursor := initCursorWithData(docs, t)
		_, err := createTimeSeriesFramesFromQuery(ctx, cursor)
		if !(err != nil && err.Error() == "invalid value type") {
			t.Error("should return invalid type error")
		}
	})

	t.Run("return decode error on invalid ts field", func(t *testing.T) {
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    "",
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		_, err := createTimeSeriesFramesFromQuery(ctx, cursor)
		if !(err != nil && err.Error() == "failed to decode the data") {
			t.Error("should return decode error")
		}
	})
}

func TestCreateTableFramesFromQuery(t *testing.T) {
	t.Run("should return dataframe on valid data", func(t *testing.T) {
		ctx := context.Background()
		now := time.Now()

		oid := primitive.NewObjectID()
		toInsert := []interface{}{
			bson.M{
				"_id":      oid,
				"string":   "name1",
				"int":      32,
				"float":    0.1,
				"datetime": primitive.NewDateTimeFromTime(now),
			},
			bson.M{
				"_id":      oid,
				"string":   "name2",
				"int":      33,
				"float":    0.2,
				"datetime": primitive.NewDateTimeFromTime(now),
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frame, err := createTableFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		expectedFrame := data.NewFrame("Table",
			data.NewField("_id", nil, []string{oid.String(), oid.String()}),
			data.NewField("string", nil, []string{"name1", "name2"}),
			data.NewField("int", nil, []int32{32, 33}),
			data.NewField("float", nil, []float64{0.1, 0.2}),
			data.NewField("datetime", nil, []time.Time{now, now}),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Data frame not correct")
		}
	})
}
