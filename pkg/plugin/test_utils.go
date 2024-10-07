package plugin

import (
	"fmt"
	"math"
	"reflect"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/mongo"
)

func initCursorWithData(initData []interface{}, t *testing.T) *mongo.Cursor {
	cursor, err := mongo.NewCursorFromDocuments(initData, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	return cursor
}

var dataFieldComparer = cmp.Comparer(func(x, y data.Field) bool {
	if x.Name != y.Name {
		fmt.Printf("Field name %s != %s", x.Name, y.Name)
		return false
	}

	if x.Len() != y.Len() {
		fmt.Printf("Field size %d != %d", x.Len(), y.Len())
		return false
	}

	for i := 0; i < x.Len(); i++ {
		xi, _ := x.ConcreteAt(i)
		yi, _ := y.ConcreteAt(i)
		if !cmp.Equal(xi, yi, datetimeComparer, float32Comparer, float64Comparer) {
			fmt.Printf("%v != %v", xi, yi)
			return false
		}
	}

	return true
})

var float32Comparer = cmp.Comparer(func(x, y float32) bool {
	return math.Abs(float64(x-y)) < 1e-7
})

var float64Comparer = cmp.Comparer(func(x, y float64) bool {
	return math.Abs(x-y) < 1e-7
})

var dataFrameComparer = cmp.Comparer(func(x, y data.Frame) bool {
	if x.Name != y.Name || len(x.Fields) != len(y.Fields) {
		return false
	}

	for _, xField := range x.Fields {
		yField, index := y.FieldByName(xField.Name)
		if index == -1 {
			return false
		}

		if !cmp.Equal(xField, yField, dataFieldComparer) {
			return false
		}
	}
	return true
})

var datetimeComparer = cmp.Comparer(func(x, y time.Time) bool {

	// MongoDB datetime has precision of milliseconds
	return x.Truncate(time.Millisecond).Compare(y.Truncate(time.Millisecond)) == 0
})

func assertEq(t *testing.T, a interface{}, b interface{}) {
	if !cmp.Equal(a, b, datetimeComparer, float32Comparer, float64Comparer) {
		t.Errorf("(%v)%v != (%v)%v", reflect.TypeOf(a), reflect.ValueOf(a), reflect.TypeOf(b),
			reflect.ValueOf(b))
	}
}
