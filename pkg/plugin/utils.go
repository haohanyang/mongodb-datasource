package plugin

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/mongo"
)

func PrintDataFrame(dataFrame *data.Frame) {
	// Print headers
	fmt.Print("|")
	for i, field := range dataFrame.Fields {
		fmt.Print(field.Name)
		if i < len(dataFrame.Fields)-1 {
			fmt.Print(",")
		}
	}
	fmt.Println("|")

	// Print data
	for i := 0; i < dataFrame.Rows(); i++ {
		fmt.Print("|")
		for j, field := range dataFrame.Fields {
			v, ok := field.ConcreteAt(i)

			if ok {
				if field.Type() == data.FieldTypeNullableJSON {
					rm := v.(json.RawMessage)
					rb, err := rm.MarshalJSON()
					if err != nil {
						panic(err)
					}
					fmt.Print(string(rb))
				} else if field.Type() == data.FieldTypeNullableString {
					s := v.(string)
					if len(s) > 10 {
						fmt.Print(s[:10] + "...")
					} else {
						fmt.Print(s)
					}
				} else {
					fmt.Print(v)
				}
			} else {
				fmt.Print("null")
			}

			if j < len(dataFrame.Fields)-1 {
				fmt.Print(",")
			}
		}
		fmt.Println("|")
	}
}

func pointer[K any](val K) *K {
	return &val
}
func null[K any]() *K {
	var nullValue *K
	return nullValue
}

// Test utils

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
		t.Errorf("Received %v (type %v), expected %v (type %v)", reflect.ValueOf(a), reflect.TypeOf(a), reflect.TypeOf(b), reflect.TypeOf(b))
	}
}
