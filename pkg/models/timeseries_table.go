package models

import (
	"errors"
	"reflect"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
)

type TimeSeriesTable struct {
	Name                string
	Timestamps          []*time.Time
	RawValues           []bson.RawValue
	IntrinsictValueType reflect.Kind
}

func pointer[K any](val K) *K {
	return &val
}

func (t *TimeSeriesTable) AppendRow(elements []bson.RawElement) error {
	var rawValue bson.RawValue
	var time time.Time

	for _, element := range elements {
		if element.Key() == "value" {
			value := element.Value()
			if value.Type != bson.TypeInt32 && value.Type != bson.TypeInt64 && value.Type != bson.TypeDouble && value.Type != bson.TypeNull {
				return errors.New("value should be numeric")
			}

			if value.Type == bson.TypeInt32 {
				if t.IntrinsictValueType == reflect.Invalid {
					t.IntrinsictValueType = reflect.Int32
				}

			} else if value.Type == bson.TypeInt64 {
				if t.IntrinsictValueType == reflect.Invalid || t.IntrinsictValueType == reflect.Int32 {
					t.IntrinsictValueType = reflect.Int64
				}
			} else if value.Type == bson.TypeDouble {
				t.IntrinsictValueType = reflect.Float64
			} else if value.Type != bson.TypeNull {
				return errors.New("value should be numeric")
			}

			rawValue = element.Value()
		}

		if element.Key() == "ts" {
			value := element.Value()
			if value.Type != bson.TypeDateTime && value.Type != bson.TypeNull {
				return errors.New("ts should be timestamp")
			}

			if value.Type == bson.TypeDateTime {
				time = value.Time()
			}

		}
	}

	if time.IsZero() && rawValue.IsZero() {
		return nil
	}

	if time.IsZero() {
		t.Timestamps = append(t.Timestamps, nil)
	} else {
		t.Timestamps = append(t.Timestamps, &time)
	}

	t.RawValues = append(t.RawValues, rawValue)

	return nil
}

func NewTimeSeriesTable(name string) *TimeSeriesTable {
	t := &TimeSeriesTable{
		Name: name,
	}
	return t
}

func (t *TimeSeriesTable) MakeDataFrame() *data.Frame {
	n := len(t.RawValues)
	timeField := data.NewField("time", nil, t.Timestamps)

	var valueField *data.Field
	if t.IntrinsictValueType == reflect.Int32 {
		valueField = data.NewField("Value", nil, make([]*int32, n))
	} else if t.IntrinsictValueType == reflect.Int64 {
		valueField = data.NewField("Value", nil, make([]*int64, n))
	} else if t.IntrinsictValueType == reflect.Float64 {
		valueField = data.NewField("Value", nil, make([]*float64, n))
	} else {
		return nil
	}

	for i, rawValue := range t.RawValues {
		if rawValue.Type == bson.TypeInt32 {
			v := rawValue.Int32()
			if t.IntrinsictValueType == reflect.Int32 {
				valueField.Set(i, pointer(v))
			} else if t.IntrinsictValueType == reflect.Int64 {
				valueField.Set(i, pointer(int64(v)))
			} else if t.IntrinsictValueType == reflect.Float64 {
				valueField.Set(i, pointer(float64(v)))
			}
		} else if rawValue.Type == bson.TypeInt64 {
			v := rawValue.Int64()
			if t.IntrinsictValueType == reflect.Int64 {
				valueField.Set(i, pointer(v))
			} else if t.IntrinsictValueType == reflect.Float64 {
				valueField.Set(i, pointer(float64(v)))
			}
		} else if rawValue.Type == bson.TypeDouble {
			v := rawValue.Double()
			valueField.Set(i, pointer(v))
		} else {
			valueField.Set(i, nil)
		}
	}

	return data.NewFrame(t.Name, timeField, valueField)
}
