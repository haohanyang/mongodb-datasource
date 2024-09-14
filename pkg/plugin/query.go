package plugin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
	"go.mongodb.org/mongo-driver/mongo"
)

var supportedBsonTypes = map[bsontype.Type]bool{
	bson.TypeBoolean:  true,
	bson.TypeInt32:    true,
	bson.TypeInt64:    true,
	bson.TypeDouble:   true,
	bson.TypeString:   true,
	bson.TypeDateTime: true,
	bson.TypeObjectID: true,
}

func getTimeSeriesFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) ([]*data.Frame, error) {
	/*
		Fields "value", "ts" must exist in the raw result.
		Each "name" value corresponds to a frame
	*/
	results := make([]*data.Frame, 0)
	rawValues := make([]bson.RawValue, 0)
	frameData := make(map[string]timeSeriesFrameData)
	var valueType bsontype.Type

	for cursor.Next(ctx) {
		var row bson.Raw
		if err := cursor.Decode(&row); err != nil {
			return results, err
			// backend.Logger.Error(fmt.Sprintf("Failed to decode doc: %v", err.Error()))
		}

		tr, err := parseTimeSeriesRow(row)
		if err != nil {
			continue
		}

		if !valueType.IsValid() {
			valueType = tr.valueType
		}

		if len(rawValues) > 0 && tr.valueType != valueType {
			return results, errors.New("values should have the same type")
		}

		if f, ok := frameData[tr.name]; ok {
			f.timestamps = append(f.timestamps, tr.timestamp)
			f.rawValues = append(f.rawValues, tr.rawValue)
		} else {
			frameData[tr.name] = timeSeriesFrameData{
				timestamps: append(make([]time.Time, 1), tr.timestamp),
				rawValues:  append(make([]bson.RawValue, 1), tr.rawValue),
			}
		}
	}

	for k, v := range frameData {

		tsField := data.NewField("time", nil, v.timestamps)
		var valueField *data.Field

		switch valueType {
		case bson.TypeInt32:
			values := make([]int32, len(rawValues))
			for i, r := range rawValues {
				values[i] = r.Int32()
			}
			valueField = data.NewField("values", nil, values)

		case bson.TypeInt64:
			values := make([]int64, len(rawValues))
			for i, r := range rawValues {
				values[i] = r.Int64()
			}
			valueField = data.NewField("values", nil, values)

		case bson.TypeDouble:
			values := make([]float64, len(rawValues))
			for i, r := range rawValues {
				values[i] = r.Double()
			}
			valueField = data.NewField("values", nil, values)

		default:
			return results, errors.New("unsupported value type")
		}

		frame := data.NewFrame(k, tsField, valueField)
		results = append(results, frame)
	}
	return results, nil
}

func parseTimeSeriesRow(r bson.Raw) (*timeSeriesRow, error) {
	tr := &timeSeriesRow{
		name: "Unnamed",
	}
	elements, err := r.Elements()

	if err != nil {
		return nil, err
	}

	for _, element := range elements {
		if element.Key() == "name" {
			value := element.Value()
			if value.Type != bson.TypeString {
				return nil, errors.New("name field should be string")
			} else {
				tr.name = element.Value().StringValue()
			}
		}

		if element.Key() == "ts" {
			value := element.Value()
			if value.Type != bson.TypeDateTime {
				return nil, errors.New("ts field should be datetime")
			} else {
				tr.timestamp = value.Time()
			}
		}

		if element.Key() == "value" {
			value := element.Value()
			tr.rawValue = value
			tr.valueType = value.Type
		}
	}

	if tr.rawValue.IsZero() {
		return nil, errors.New("value field is missing")
	}

	if tr.timestamp.IsZero() {
		return nil, errors.New("ts field is missing")
	}

	return tr, nil
}

func getTableFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) (*data.Frame, error) {

	columns := make(map[string]tableColumn)
	columnCount := 0
	localColumnCount := 0

	rowCount := 0

	for cursor.Next(ctx) {
		var result bson.Raw
		if err := cursor.Decode(&result); err != nil {
			// backend.Logger.Error(fmt.Sprintf("Failed to decode doc: %v", err.Error()))
			return nil, err
		}

		elements, err := result.Elements()
		if err != nil {
			return nil, err
		}

		for _, element := range elements {
			key := element.Key()
			value := element.Value()
			if rowCount == 0 {
				// Decide table columns and types on the first row
				column, err := getInitColumn(element)
				if err != nil {
					return nil, err
				}
				columns[key] = column
				columnCount++
			} else {
				if c, ok := columns[key]; ok {
					if c.columnType != value.Type {
						return nil, fmt.Errorf("field %s has more types", key)
					}
					c.rawValues = append(c.rawValues, element.Value())
					localColumnCount++
				}
			}
		}

		if rowCount > 0 && localColumnCount != columnCount {
			return nil, errors.New("columns mismatch")
		}

		rowCount++
		localColumnCount = 0
	}

	frame := data.NewFrame("default")
	for _, v := range columns {
		frame.Fields = append(frame.Fields, v.toDataField())
	}

	return frame, nil
}

func getInitColumn(element bson.RawElement) (tableColumn, error) {
	if _, ok := supportedBsonTypes[element.Value().Type]; ok {
		rawValues := append(make([]bson.RawValue, 0), element.Value())
		return tableColumn{
			columnName: element.Key(),
			columnType: element.Value().Type,
			rawValues:  rawValues,
		}, nil
	}

	return tableColumn{}, fmt.Errorf("unsupported bson type %v", element.Value().Type)
}

func (column *tableColumn) toDataField() *data.Field {
	size := len(column.rawValues)
	switch column.columnType {
	case bson.TypeBoolean:
		values := make([]bool, size)
		for i, r := range column.rawValues {
			values[i] = r.Boolean()
		}
		return data.NewField(column.columnName, nil, values)
	case bson.TypeInt32:
		values := make([]int32, size)
		for i, r := range column.rawValues {
			values[i] = r.Int32()
		}
		return data.NewField(column.columnName, nil, values)

	case bson.TypeInt64:
		values := make([]int64, size)
		for i, r := range column.rawValues {
			values[i] = r.Int64()
		}
		return data.NewField(column.columnName, nil, values)

	case bson.TypeDouble:
		values := make([]float64, size)
		for i, r := range column.rawValues {
			values[i] = r.Double()
		}
		return data.NewField(column.columnName, nil, values)

	case bson.TypeString:
		values := make([]string, size)
		for i, r := range column.rawValues {
			values[i] = r.StringValue()
		}
		return data.NewField(column.columnName, nil, values)

	case bson.TypeDateTime:
		values := make([]time.Time, size)
		for i, r := range column.rawValues {
			values[i] = r.Time()
		}
		return data.NewField(column.columnName, nil, values)
	case bson.TypeObjectID:
		values := make([]string, size)
		for i, r := range column.rawValues {
			values[i] = r.ObjectID().Hex()
		}
		return data.NewField(column.columnName, nil, values)

	default:
		return nil
	}

}
