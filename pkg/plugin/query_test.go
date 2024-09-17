package plugin

import (
	"context"
	"reflect"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/mongo"
)

func checkTsField(t *testing.T, field *data.Field, expected []time.Time) {
	if field.Name != "time" {
		t.Error("wrong field name")
	}

	for i := 0; i < field.Len(); i++ {
		eTs := expected[i]
		if ts, ok := field.At(i).(time.Time); ok {
			if ts.Truncate(time.Millisecond).Compare(eTs.Truncate(time.Millisecond)) != 0 {
				t.Error("wrong timestamp")
			}
		} else {
			t.Error("wrong field type")
		}
	}
}

func checkValueField(t *testing.T, field *data.Field, expected []interface{}) {
	if field.Name != "Value" {
		t.Error("wrong field name")
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
			t.Error("wrong field type")
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
				t.Error("wrong expected value type")
				return
			}
			efloat = float64(ev.(float32))
		case reflect.Float64:
			if !compareFloats {
				t.Error("wrong expected value type")
				return
			}
			efloat = ev.(float64)
		}

		if compareFloats {
			if vfloat-efloat > 1e-7 {
				t.Error("wrong value")
			}
		} else {
			if vint != eint {
				t.Error("wrong value")
			}
		}

	}
}

func TestGetTimeSeriesFramesFromQuery(t *testing.T) {
	ctx := context.TODO()
	type Doc struct {
		Name  string    `bson:"name"`
		Ts    time.Time `bson:"ts"`
		Value int       `bson:"value"`
	}

	now := time.Now()
	toInsert := []interface{}{
		Doc{
			Name:  "name1",
			Ts:    now,
			Value: 1,
		},
		Doc{
			Name:  "name1",
			Ts:    now,
			Value: 2,
		},
		Doc{
			Name:  "name2",
			Ts:    now,
			Value: 3,
		},
		Doc{
			Name:  "name2",
			Ts:    now,
			Value: 4,
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
		t.Fatal("size of frames should be 2")
	}

	f1 := frames["name1"]
	f2 := frames["name2"]

	if f1 == nil || f2 == nil {
		t.Fatal("wrong frame names")
	}

	if len(f1.Fields) != 2 || len(f2.Fields) != 2 {
		t.Fatal("wrong field count")
	}

	checkTsField(t, f1.Fields[0], []time.Time{now, now})
	checkTsField(t, f2.Fields[0], []time.Time{now, now})

	checkValueField(t, f1.Fields[1], []interface{}{1, 2})
	checkValueField(t, f2.Fields[1], []interface{}{3, 4})
}
