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

		v, notNull := frame.Fields[0].ConcreteAt(0)
		if !notNull {
			t.Fatal("null value")
		}

		var doc bson.A
		err = bson.UnmarshalExtJSON(v.(json.RawMessage), true, &doc)
		if err != nil {
			t.Fatal(err)
		}

		assertEq(t, doc[0], int32(1))
		assertEq(t, doc[1], "bar")

		docIn := doc[2].(bson.D)
		assertEq(t, docIn.Map()["baz"], int32(1))
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

	t.Run("_id is the first field if exists", func(t *testing.T) {
		ctx := context.Background()
		toInsert := []interface{}{
			bson.M{
				"_id": primitive.NewObjectID(),
				"_g":  1,
			},
			bson.M{
				"_id": primitive.NewObjectID(),
				"_h":  2,
			},
			bson.M{
				"_id": primitive.NewObjectID(),
				"_j":  3,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frames, err := CreateTableFramesFromQuery(ctx, "test", cursor)
		if err != nil {
			t.Fatal(err)
		}

		assertEq(t, frames.Fields[0].Name, "_id")
	})

}
