package plugin

import (
	"context"
	"errors"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func getTimeSeriesFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) (map[string]*data.Frame, error) {
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
				return frames, errors.New("unsupported value type")
			}

		}

		err := handler(cursor, frames)
		if err != nil {
			continue
		}

		rowCount++
	}
	return frames, nil
}

func updateFrameData[T any](cursor *mongo.Cursor, allFrames map[string]*data.Frame) error {
	var tr timeSeriesRow[T]
	err := cursor.Decode(&tr)
	if err != nil {
		return err
	}

	if tr.Timestamp.IsZero() {
		return errors.New("ts field is missing")
	}

	if frame, ok := allFrames[tr.Name]; ok {
		frame.Fields[0].Append(tr.Timestamp)
		frame.Fields[1].Append(tr.Value)
	} else {
		allFrames[tr.Name] = data.NewFrame(tr.Name,
			data.NewField("time", nil, []time.Time{tr.Timestamp}),
			data.NewField("Value", nil, []T{tr.Value}))
	}
	return nil
}
