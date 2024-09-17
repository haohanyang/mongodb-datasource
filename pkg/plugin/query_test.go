package plugin

import (
	"context"
	"math"
	"reflect"
	"testing"
	"time"

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

func checkTsField(t *testing.T, field *data.Field, expected []time.Time) {
	if field.Name != "time" {
		t.Error("field name should be \"time\"")
	}

	for i := 0; i < field.Len(); i++ {
		eTs := expected[i]
		if ts, ok := field.At(i).(time.Time); ok {
			if ts.Truncate(time.Millisecond).Compare(eTs.Truncate(time.Millisecond)) != 0 {
				t.Error("timestamp doesn't match")
			}
		} else {
			t.Error("field type should be datetime")
		}
	}
}

func checkValueField(t *testing.T, field *data.Field, expected []interface{}) {
	if field.Name != "Value" {
		t.Error("field name should be \"Value\"")
		return
	}

	for i := 0; i < field.Len(); i++ {

		var vint int = 0
		var eint int = 0

		var vfloat float64 = .0
		var efloat float64 = .0

		ev := expected[i]
		v := field.At(i)

		compareFloats := false

		vt := reflect.TypeOf(v)
		switch vt.Kind() {
		case reflect.Int:
			vint = int(v.(int))
		case reflect.Int32:
			vint = int(v.(int32))
		case reflect.Int16:
			vint = int(v.(int16))
		case reflect.Int64:
			vint = int(v.(int64))
		case reflect.Float32:
			vfloat = float64(v.(float32))
			compareFloats = true
		case reflect.Float64:
			vfloat = v.(float64)
			compareFloats = true
		default:
			t.Error("field type should be numeric")
			return
		}

		et := reflect.TypeOf(ev)
		switch et.Kind() {
		case reflect.Int:
			eint = int(ev.(int))
		case reflect.Int32:
			eint = int(ev.(int32))
		case reflect.Int16:
			eint = int(ev.(int16))
		case reflect.Int64:
			eint = int(ev.(int64))
		case reflect.Float32:
			if !compareFloats {
				t.Error("different types to compare")
				return
			}
			efloat = float64(ev.(float32))
		case reflect.Float64:
			if !compareFloats {
				t.Error("different types to compare")
				return
			}
			efloat = ev.(float64)
		}

		if compareFloats {
			if math.Abs(vfloat-efloat) > 1e-7 {
				t.Errorf("wrong value, expected: %f, got: %f", efloat, vfloat)
			}
		} else {
			if vint != eint {
				t.Errorf("wrong value, expected: %d, got: %d", vint, eint)
			}
		}

	}
}

func TestUpdateFrameData(t *testing.T) {
	t.Run("initialize with correct data", func(t *testing.T) {
		frames := make(map[string]*data.Frame)
		now := time.Now()
		toInsert := []interface{}{
			bson.M{
				"name":  "name1",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		cursor.Next(context.TODO())

		err = updateFrameData[int32](cursor, frames)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames["name1"]
		if frame == nil {
			t.Fatal("field \"name1\" doesn't exist")
		}

		if frame.Name != "name1" {
			t.Error("field name should be \"name1\"")
		}

		checkTsField(t, frame.Fields[0], []time.Time{now})
		checkValueField(t, frame.Fields[1], []interface{}{1})
	})

	t.Run("append correct data", func(t *testing.T) {
		frames := make(map[string]*data.Frame)
		now := time.Now()

		frames["name1"] = data.NewFrame("name1",
			data.NewField("time", nil, []time.Time{now}),
			data.NewField("Value", nil, []float64{1.1}),
		)
		toInsert := []interface{}{
			bson.M{
				"name":  "name1",
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 1.2,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		cursor.Next(context.TODO())

		err = updateFrameData[float64](cursor, frames)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames["name1"]
		if frame == nil {
			t.Fatal("field \"name1\" doesn't exist")
		}

		if frame.Name != "name1" {
			t.Error("field name should be \"name1\"")
		}

		checkTsField(t, frame.Fields[0], []time.Time{now, now})
		checkValueField(t, frame.Fields[1], []interface{}{1.1, 1.2})
	})
}

func TestGetTimeSeriesFramesFromQuery(t *testing.T) {

	t.Run("fields with correct int values and timestamps", func(t *testing.T) {
		ctx := context.TODO()
		now := time.Now()
		toInsert := []interface{}{
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

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frames, err := getTimeSeriesFramesFromQuery(ctx, cursor)

		if err != nil {
			t.Fatal(err)
		}

		if len(frames) != 2 {
			t.Fatal("number of frames should be 2")
		}

		f1 := frames["name1"]
		f2 := frames["name2"]

		if f1 == nil || f2 == nil {
			t.Fatal("should have frame \"name1\" and \"name1\"")
		}

		if len(f1.Fields) != 2 || len(f2.Fields) != 2 {
			t.Fatal("frame should have 2 entries")
		}

		checkTsField(t, f1.Fields[0], []time.Time{now, now})
		checkTsField(t, f2.Fields[0], []time.Time{now, now})

		checkValueField(t, f1.Fields[1], []interface{}{1, 2})
		checkValueField(t, f2.Fields[1], []interface{}{3, 4})
	})

	t.Run("fields with correct float values and timestamps", func(t *testing.T) {
		ctx := context.TODO()
		now := time.Now()
		toInsert := []interface{}{
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

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frames, err := getTimeSeriesFramesFromQuery(ctx, cursor)

		if err != nil {
			t.Fatal(err)
		}

		if len(frames) != 2 {
			t.Fatal("number of frames should be 2")
		}

		f1 := frames["name1"]
		f2 := frames["name2"]

		if f1 == nil || f2 == nil {
			t.Fatal("should have frame \"name1\" and \"name1\"")
		}

		if len(f1.Fields) != 2 || len(f2.Fields) != 2 {
			t.Fatal("frame should have 2 entries")
		}

		checkTsField(t, f1.Fields[0], []time.Time{now, now})
		checkTsField(t, f2.Fields[0], []time.Time{now, now})

		checkValueField(t, f1.Fields[1], []interface{}{1.1, 1.2})
		checkValueField(t, f2.Fields[1], []interface{}{1.3, 1.4})
	})

	t.Run("ignore invalid rows", func(t *testing.T) {
		now := time.Now()
		ctx := context.TODO()
		toInsert := []interface{}{
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": false,
			},
			bson.M{
				"ts":    "invalid",
				"value": 2,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 3,
			},
			bson.M{
				"ts":    primitive.NewDateTimeFromTime(now),
				"value": 4,
			},
		}

		cursor, err := mongo.NewCursorFromDocuments(toInsert, nil, nil)
		if err != nil {
			t.Fatal(err)
		}

		frames, err := getTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			t.Fatal(err)
		}

		frame := frames[""]
		if frame.Fields[0].Len() != 2 || frame.Fields[1].Len() != 2 {
			t.Error("field should have 2 entries")
		}

		checkValueField(t, frame.Fields[1], []interface{}{3, 4})
	})

}
