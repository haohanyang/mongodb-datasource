package plugin

import (
	"context"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// Create time-series data frames of different names on Mongo query result.
// Each data frame has field "ts", "value" and "name"
func CreateTimeSeriesFramesFromQuery(ctx context.Context, cursor *mongo.Cursor) (map[string]*data.Frame, error) {
	timeSeriesTables := make(map[string]*models.TimeSeriesTable)
	dataFrames := make(map[string]*data.Frame)

	rowCount := 0
	for cursor.Next(ctx) {
		backend.Logger.Debug(fmt.Sprintf("Processing row %d\n", rowCount+1))
		elements, err := cursor.Current.Elements()
		if err != nil {
			return dataFrames, err
		}

		name := ""
		rawName := cursor.Current.Lookup("name")
		if !rawName.IsZero() && rawName.Type == bson.TypeString {
			name = rawName.StringValue()
		}

		if table, ok := timeSeriesTables[name]; ok {
			err = table.AppendRow(elements)
			if err != nil {
				return dataFrames, err
			}
		} else {
			table := models.NewTimeSeriesTable(name)
			err = table.AppendRow(elements)
			if err != nil {
				return dataFrames, err
			}

			timeSeriesTables[name] = table
		}
		rowCount++
	}

	for name, table := range timeSeriesTables {
		dataFrame := table.MakeDataFrame()
		if dataFrame != nil {
			dataFrames[name] = dataFrame
		}
	}

	return dataFrames, nil
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
			if c.Size() != rowIndex+1 {
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
