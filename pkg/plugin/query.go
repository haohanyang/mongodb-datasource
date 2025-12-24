package plugin

import (
	"context"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func createTableFramesFromQuery(ctx context.Context, tableName string, cursor *mongo.Cursor) (*data.Frame, error) {

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
				nc, err := models.NewColumn(rowIndex, element)
				if err != nil {
					return nil, err
				}
				columns[name] = nc
			}
		}

		// Make sure all columns have the same size
		for _, c := range columns {
			// Pad other columns with null value
			if c.Size() != rowIndex+1 {
				c.Field.Append(nil)
			}
		}

		rowIndex++
	}

	frame := data.NewFrame(tableName)

	if c, ok := columns["_id"]; ok {
		frame.Fields = append(frame.Fields, c.Field)
	}

	for _, c := range columns {
		if c.Name != "_id" {
			c.Rectify()
			frame.Fields = append(frame.Fields, c.Field)
		}
	}

	return frame, nil
}
