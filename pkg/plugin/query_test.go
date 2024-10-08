package plugin

import (
	"context"
	"encoding/json"
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

	t.Run("fields with valid int values and timestamps", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)

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
			t.Error("Unexpected data frame")
		}
	})

	t.Run("fields with valid float values and timestamps", func(t *testing.T) {
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

		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)

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
			t.Error("Unexpected data frame")
		}
	})

	t.Run("return error on invalid values", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": false,
			},
		}

		cursor := initCursorWithData(docs, t)
		_, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if !(err != nil && err.Error() == "value should be numeric") {
			t.Error("should return value should be numeric error")
		}
	})

	t.Run("return error on invalid ts", func(t *testing.T) {
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    "",
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		_, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if !(err != nil && err.Error() == "ts should be timestamp") {
			t.Error("should return ts should be timestamp error")
		}
	})

	t.Run("should allow missing values", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts": primitive.NewDateTimeFromTime(now),
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullInt *int32
		assertEq(t, frame.Fields[1].At(0), nullInt)
		assertEq(t, frame.Fields[1].At(1), pointer[int32](2))
	})

	t.Run("should allow null values", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": nil,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullInt *int32
		assertEq(t, frame.Fields[1].At(0), nullInt)
		assertEq(t, frame.Fields[1].At(1), pointer[int32](2))
	})

	t.Run("should allow missing timestamps", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"value": 1,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullTs *time.Time
		assertEq(t, frame.Fields[0].At(0), nullTs)
		assertEq(t, frame.Fields[0].At(1), pointer(now))
	})

	t.Run("should allow null timestamps", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    nil,
				"value": 1,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullTs *time.Time
		assertEq(t, frame.Fields[0].At(0), nullTs)
		assertEq(t, frame.Fields[0].At(1), pointer(now))
	})

	t.Run("should allow both int and double types - 1", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]

		assertEq(t, frame.Fields[1].At(0), pointer(1.1))
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
	})

	t.Run("should allow both int and double types - 2", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]

		assertEq(t, frame.Fields[1].At(0), pointer(2.0))
		assertEq(t, frame.Fields[1].At(1), pointer(1.1))
	})

	t.Run("should allow int, double and missing values - 1", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts": primitive.NewDateTimeFromTime(now),
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), pointer(2.0))
		assertEq(t, frame.Fields[1].At(1), nullDouble)
		assertEq(t, frame.Fields[1].At(2), pointer(1.1))
	})

	t.Run("should allow int, double and null values - 1", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": nil,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), pointer(2.0))
		assertEq(t, frame.Fields[1].At(1), nullDouble)
		assertEq(t, frame.Fields[1].At(2), pointer(1.1))
	})

	t.Run("should allow int, double and missing values - 2", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts": primitive.NewDateTimeFromTime(now),
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), nullDouble)
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
		assertEq(t, frame.Fields[1].At(2), pointer(1.1))
	})

	t.Run("should allow int, double and null values - 2", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": nil,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), nullDouble)
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
		assertEq(t, frame.Fields[1].At(2), pointer(1.1))
	})

	t.Run("should allow int, double and missing values - 3", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts": primitive.NewDateTimeFromTime(now),
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]

		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), pointer(1.1))
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
		assertEq(t, frame.Fields[1].At(2), nullDouble)
	})

	t.Run("should allow int, double and nil values - 3", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 2,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": nil,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), pointer(1.1))
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
		assertEq(t, frame.Fields[1].At(2), nullDouble)
	})

	t.Run("should skip empty rows", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.1,
			},
			bson.M{
				"other": false,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		assertEq(t, len(frame.Fields), 2)
		assertEq(t, frame.Fields[1].At(0), pointer(1.1))
		assertEq(t, frame.Fields[1].At(1), pointer(1.2))
	})

	t.Run("return nil data frame if all values are empty or null", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts": primitive.NewDateTimeFromTime(now),
			},
			bson.M{},
			bson.M{
				"ts": primitive.NewDateTimeFromTime(now),
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var emptyFrame *data.Frame
		assertEq(t, frame, emptyFrame)
	})

}

func TestCreateTableFramesFromQuery(t *testing.T) {
	t.Run("valid basic data types", func(t *testing.T) {
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

		frame, err := CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}

		expectedFrame := data.NewFrame("test",
			data.NewField("_id", nil, []string{oid.String(), oid.String()}),
			data.NewField("string", nil, []string{"name1", "name2"}),
			data.NewField("int", nil, []int32{32, 33}),
			data.NewField("float", nil, []float64{0.1, 0.2}),
			data.NewField("datetime", nil, []time.Time{now, now}),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("nil or missing values", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": 1,
				"b": false,
			},
			bson.M{
				"c": "foo",
				"d": 2.0,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frame, err := CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}

		expectedFrame := data.NewFrame("test",
			data.NewField("a", nil, []*int32{pointer[int32](1), null[int32]()}),
			data.NewField("b", nil, []*bool{pointer(false), null[bool]()}),
			data.NewField("c", nil, []*string{null[string](), pointer("foo")}),
			data.NewField("d", nil, []*float64{null[float64](), pointer(2.0)}),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("skip null columns", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": "foo",
				"b": nil,
			},
			bson.M{
				"a": nil,
				"c": nil,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frame, err := CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}

		expectedFrame := data.NewFrame("test",
			data.NewField("a", nil, []*string{pointer("foo"), null[string]()}))

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("should handle embedded document field", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"foo": bson.M{
					"data": 1,
				},
			},
			bson.M{
				"bar": bson.M{
					"data": true,
				},
			},
		}

		var null *json.RawMessage

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frame, err := CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}

		foo, ok := frame.FieldByName("foo")
		if ok == -1 {
			t.Fatal("foo field doesn't exist")
		}
		assertEq(t, foo.At(1), null)
		v, _ := foo.ConcreteAt(0)

		var doc bson.M
		bson.UnmarshalExtJSON(v.(json.RawMessage), true, &doc)

		assertEq(t, doc["data"], int32(1))

		bar, ok := frame.FieldByName("bar")
		if ok == -1 {
			t.Fatal("bar field doesn't exist")
		}
		assertEq(t, bar.At(0), null)
		v, _ = bar.ConcreteAt(1)

		bson.UnmarshalExtJSON(v.(json.RawMessage), true, &doc)
		assertEq(t, doc["data"], true)
	})

	t.Run("should handle array field", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"foo": bson.A{1, "bar", bson.M{
					"baz": 1,
				}},
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frame, err := CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}

		v, _ := frame.Fields[0].ConcreteAt(0)
		var doc bson.M
		bson.UnmarshalExtJSON(v.(json.RawMessage), true, &doc)
		assertEq(t, doc["0"], int32(1))
		assertEq(t, doc["1"], "bar")

		docIn := doc["2"].(bson.M)
		assertEq(t, docIn["baz"], int32(1))
	})

	t.Run("array and embedded docs can exist in the same field", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": bson.A{1, 2, 3},
			},
			bson.M{
				"a": bson.M{
					"a": 1,
				},
			},
			bson.M{
				"b": 2,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		_, err = CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}
	})
}
