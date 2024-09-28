package plugin

import (
	"context"
	"errors"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// Create time-series data frames of different names on Mongo query result.
// Each data frame has field "ts", "value" and "name"
func CreateTimeSeriesFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) (map[string]*data.Frame, error) {
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
	var tr TimeSeriesRow[T]
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

func CreateTableFramesFromQuery(ctx context.Context, tableName string, cursor *mongo.Cursor) (*data.Frame, error) {

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

	frame := data.NewFrame(tableName)
	for _, c := range columns {
		frame.Fields = append(frame.Fields, c.Field)
	}

	return frame, nil
}
