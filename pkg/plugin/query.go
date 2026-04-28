package plugin

import (
	"context"
	"fmt"

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

func queryVariable(ctx context.Context, cursor *mongo.Cursor) ([]variableQueryEntry, error) {
	results := make([]variableQueryEntry, 0)

	// Parse results row by row
	// The value is either string or int32/int64/float64
	for cursor.Next(ctx) {
		var result bson.Raw
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}

		// Get text(label)
		var text *string

		textRaw := result.Lookup("text")
		if textRaw.Type == bson.TypeString {
			text = pointer(textRaw.StringValue())
		}

		// Check value
		valueRaw := result.Lookup("value")
		if valueRaw.Type == bson.TypeString {

			strVal := valueRaw.StringValue()

			if text == nil {
				text = pointer(strVal)
			}

			results = append(results, variableQueryEntry{
				Value: strVal,
				Text:  *text,
			})

		} else if valueRaw.Type == bson.TypeInt32 {
			intVav := valueRaw.Int32()
			if text == nil {
				text = pointer(fmt.Sprintf("%d", intVav))
			}

			results = append(results, variableQueryEntry{
				Value: intVav,
				Text:  *text,
			})
		} else if valueRaw.Type == bson.TypeInt64 {
			intVav := valueRaw.Int64()
		
			if text == nil {
				text = pointer(fmt.Sprintf("%d", intVav))
			}
		
			results = append(results, variableQueryEntry{
				Value: intVav,
				Text:  *text,
			})
		} else if valueRaw.Type == bson.TypeDouble {
			floatVal := valueRaw.Double()
			if text == nil {
				text = pointer(fmt.Sprintf("%f", floatVal))
			}

			results = append(results, variableQueryEntry{
				Value: floatVal,
				Text:  *text,
			})
		}
	}

	return results, nil
}
