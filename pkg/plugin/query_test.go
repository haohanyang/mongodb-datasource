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
		_, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
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
		_, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if !(err != nil && err.Error() == "failed to decode the data") {
			t.Error("should return decode error")
		}
	})
}

func TestCreateTimeSeriesFramesFromQuery2(t *testing.T) {

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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)

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

		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)

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

	t.Run("return error on non-numeric value", func(t *testing.T) {
		now := time.Now()
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": false,
			},
		}

		cursor := initCursorWithData(docs, t)
		_, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if !(err != nil && err.Error() == "value should be numeric") {
			t.Error("should return value should be numeric error")
		}
	})

	t.Run("return decode error on invalid ts value", func(t *testing.T) {
		ctx := context.Background()
		docs := []interface{}{
			bson.M{
				"ts":    "",
				"value": 2,
			},
		}

		cursor := initCursorWithData(docs, t)
		_, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if !(err != nil && err.Error() == "ts should be timestamp") {
			t.Error("should return ts should be timestamp error")
		}
	})

	t.Run("should tolerate missing values", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullInt *int32
		assertEq(t, frame.Fields[1].At(0), nullInt)
		assertEq(t, frame.Fields[1].At(1), pointer[int32](2))
	})

	t.Run("should tolerate null values", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullInt *int32
		assertEq(t, frame.Fields[1].At(0), nullInt)
		assertEq(t, frame.Fields[1].At(1), pointer[int32](2))
	})

	t.Run("should tolerate missing timestamps", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullTs *time.Time
		assertEq(t, frame.Fields[0].At(0), nullTs)
		assertEq(t, frame.Fields[0].At(1), pointer(now))
	})

	t.Run("should tolerate null timestamps", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var nullTs *time.Time
		assertEq(t, frame.Fields[0].At(0), nullTs)
		assertEq(t, frame.Fields[0].At(1), pointer(now))
	})

	t.Run("should tolerate int and double values - 1", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]

		assertEq(t, frame.Fields[1].At(0), pointer(1.1))
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
	})

	t.Run("should tolerate int and double values - 2", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]

		assertEq(t, frame.Fields[1].At(0), pointer(2.0))
		assertEq(t, frame.Fields[1].At(1), pointer(1.1))
	})

	t.Run("should tolerate int, double and null values - 1", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		PrintDataFrame(frame)
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), pointer(2.0))
		assertEq(t, frame.Fields[1].At(1), nullDouble)
		assertEq(t, frame.Fields[1].At(2), pointer(1.1))
	})

	t.Run("should tolerate int, double and null values - 2", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		PrintDataFrame(frame)
		var nullDouble *float64
		assertEq(t, frame.Fields[1].At(0), nullDouble)
		assertEq(t, frame.Fields[1].At(1), pointer(2.0))
		assertEq(t, frame.Fields[1].At(2), pointer(1.1))
	})

	t.Run("should tolerate int, double and null values - 3", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		PrintDataFrame(frame)
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
			bson.M{},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.2,
			},
		}

		cursor := initCursorWithData(docs, t)
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		PrintDataFrame(frame)
		assertEq(t, len(frame.Fields), 2)
		assertEq(t, frame.Fields[1].At(0), pointer(1.1))
		assertEq(t, frame.Fields[1].At(1), pointer(1.2))
	})

	t.Run("should return nil data frame if all values are empty or null", func(t *testing.T) {
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
		frames, err := CreateTimeSeriesFramesFromQuery2(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		var emptyFrame *data.Frame
		assertEq(t, frame, emptyFrame)
	})

}

func TestCreateTableFramesFromQuery(t *testing.T) {
	t.Run("should create dataframe on valid data", func(t *testing.T) {
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

	t.Run("should pad missing values with nil", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": 1,
				"b": 2,
			},
			bson.M{
				"c": 3,
				"d": 4,
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
			data.NewField("a", nil, toPointerArray([]Optional[int32]{newValue[int32](1), newNull[int32]()})),
			data.NewField("b", nil, toPointerArray([]Optional[int32]{newValue[int32](2), newNull[int32]()})),
			data.NewField("c", nil, toPointerArray([]Optional[int32]{newNull[int32](), newValue[int32](3)})),
			data.NewField("d", nil, toPointerArray([]Optional[int32]{newNull[int32](), newValue[int32](4)})),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("should pad missing values with nil - 1", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": 1,
				"b": 2,
			},
			bson.M{
				"c": 3,
				"d": 4,
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
			data.NewField("a", nil, toPointerArray([]Optional[int32]{newValue[int32](1), newNull[int32]()})),
			data.NewField("b", nil, toPointerArray([]Optional[int32]{newValue[int32](2), newNull[int32]()})),
			data.NewField("c", nil, toPointerArray([]Optional[int32]{newNull[int32](), newValue[int32](3)})),
			data.NewField("d", nil, toPointerArray([]Optional[int32]{newNull[int32](), newValue[int32](4)})),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("should pad missing values with nil - 2", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": "foo",
				"b": "bar",
			},
			bson.M{
				"b": "baz",
				"c": "qux",
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
			data.NewField("a", nil, toPointerArray([]Optional[string]{
				newValue[string]("foo"),
				newNull[string](),
			})),
			data.NewField("b", nil, toPointerArray([]Optional[string]{
				newValue[string]("bar"),
				newValue[string]("baz"),
			})),
			data.NewField("c", nil, toPointerArray([]Optional[string]{
				newNull[string](),
				newValue[string]("qux"),
			})),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("should handle null values", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"a": "foo",
				"b": nil,
			},
			bson.M{
				"a": nil,
				"b": "qux",
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
			data.NewField("a", nil, toPointerArray([]Optional[string]{
				newValue[string]("foo"),
				newNull[string](),
			})),
			data.NewField("b", nil, toPointerArray([]Optional[string]{
				newNull[string](),
				newValue[string]("qux"),
			})),
		)

		if !cmp.Equal(frame, expectedFrame, dataFrameComparer) {
			t.Error("Unexpected data frame")
		}
	})

	t.Run("should handle embedded document field", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"emb": bson.M{
					"a": 1,
				},
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

	t.Run("should handle array field", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"arr": bson.A{1, "ok", bson.M{
					"a": 1,
				}},
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

	t.Run("array and embed can exist in the same field", func(t *testing.T) {
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
