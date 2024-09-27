package plugin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func createTimeSeriesFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) (map[string]*data.Frame, error) {
	frames := make(map[string]*data.Frame)
	var handler func(*mongo.Cursor, map[string]*data.Frame) error
	rowCount := 0
	for cursor.Next(ctx) {
		if rowCount == 0 {
			value := cursor.Current.Lookup("value")
			if value.IsZero() {
				return frames, errors.New("value field is missing")
			}

			switch value.Type {
			case bson.TypeInt32:
				handler = updateFrameData[int32]
			case bson.TypeInt64:
				handler = updateFrameData[int64]
			case bson.TypeDouble:
				handler = updateFrameData[float64]
			default:
				return frames, errors.New("invalid value type")
			}

		}

		err := handler(cursor, frames)
		if err != nil {
			return frames, err
		}

		rowCount++
	}
	return frames, nil
}

// Decode the corrent document and update the dataframe
func updateFrameData[T any](cursor *mongo.Cursor, frames map[string]*data.Frame) error {
	var tr timeSeriesRow[T]
	err := cursor.Decode(&tr)
	if err != nil {
		return errors.New("failed to decode the data")
	}

	if tr.Timestamp.IsZero() {
		return errors.New("ts field is missing")
	}

	if frame, ok := frames[tr.Name]; ok {
		frame.AppendRow(tr.Timestamp, tr.Value)
	} else {
		frames[tr.Name] = data.NewFrame(tr.Name,
			data.NewField("time", nil, []time.Time{tr.Timestamp}),
			data.NewField("Value", nil, []T{tr.Value}))
	}
	return nil
}

func createTableFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) (*data.Frame, error) {
	frame := data.NewFrame("Table")

	columns := make(map[string]columnDefinition)
	rowCount := 0
	for cursor.Next(ctx) {
		var result bson.Raw
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}

		elements, err := result.Elements()
		if err != nil {
			return nil, err
		}

		for _, element := range elements {
			if rowCount == 0 {
				cd := initFrameField(element, frame)
				columns[cd.name] = cd
			} else {
				name := element.Key()
				if c, ok := columns[name]; ok {
					err = c.appendValue(frame, element.Value())
					if err != nil {
						return nil, err
					}
				} else {
					return nil, fmt.Errorf("extra field \"%s\"", name)
				}
			}
		}

		rowCount++
	}

	return frame, nil
}

func initFrameField(element bson.RawElement, frame *data.Frame) columnDefinition {
	key := element.Key()
	value := element.Value()
	var field *data.Field

	d := columnDefinition{
		name:      key,
		valueType: value.Type,
	}

	switch value.Type {
	case bson.TypeBoolean:
		field = data.NewField(key, nil, []bool{value.Boolean()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeBoolean {
				return fmt.Errorf("field \"%s\" should have boolean type", key)
			}
			f.Fields[index].Append(rv.Boolean())
			return nil
		}
	case bson.TypeInt32:
		field = data.NewField(key, nil, []int32{value.Int32()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeInt32 {
				return fmt.Errorf("field \"%s\" should have int32 type", key)
			}
			f.Fields[index].Append(rv.Int32())
			return nil
		}

	case bson.TypeInt64:
		field = data.NewField(key, nil, []int64{value.Int64()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeInt64 {
				return fmt.Errorf("field \"%s\" should have int64 type", key)
			}
			f.Fields[index].Append(rv.Int64())
			return nil
		}

	case bson.TypeDouble:
		field = data.NewField(key, nil, []float64{value.Double()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeDouble {
				return fmt.Errorf("field \"%s\" should have double type", key)
			}
			f.Fields[index].Append(rv.Double())
			return nil
		}

	case bson.TypeString:
		field = data.NewField(key, nil, []string{value.StringValue()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeString {
				return fmt.Errorf("field \"%s\" should have string type", key)
			}
			f.Fields[index].Append(rv.StringValue())
			return nil
		}

	case bson.TypeDateTime:
		field = data.NewField(key, nil, []time.Time{value.Time()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeDateTime {
				return fmt.Errorf("field \"%s\" should have datetime type", key)
			}
			f.Fields[index].Append(rv.Time())
			return nil
		}

	case bson.TypeObjectID:
		field = data.NewField(key, nil, []string{value.ObjectID().String()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			if rv.Type != bson.TypeObjectID {
				return fmt.Errorf("field \"%s\" should have objectId type", key)
			}

			f.Fields[index].Append(rv.ObjectID().String())
			return nil
		}

	default:
		field = data.NewField(key, nil, []string{value.String()})
		frame.Fields = append(frame.Fields, field)

		index := len(frame.Fields) - 1
		d.appendValue = func(f *data.Frame, rv bson.RawValue) error {
			f.Fields[index].Append(rv.String())
			return nil
		}
	}

	return d
}

func createTableFramesFromQuery_(ctx context.Context, cursor *mongo.Cursor) (*data.Frame, error) {

	columns := make(map[string]*models.Column)
	rowIndex := 0
	for cursor.Next(ctx) {
		var result bson.Raw
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}

		elements, err := result.Elements()
		if err != nil {
			return nil, err
		}

		for _, element := range elements {
			name := element.Key()
			if c, ok := columns[name]; ok {
				err = c.AppendValue(element.Value())
				if err != nil {
					return nil, err
				}
			} else {
				if element.Value().Type == bson.TypeNull {
					continue
				}
				columns[name] = models.NewColumn(rowIndex, element)
			}
		}

		// Make sure all columns have the same size
		for _, c := range columns {
			// Pad other columns with null value
			if c.Size != rowIndex+1 {
				c.Field.Append(nil)
			}
		}

		rowIndex++
	}

	frame := data.NewFrame("Table")
	for _, c := range columns {
		frame.Fields = append(frame.Fields, c.Field)
	}

	return frame, nil
}
