package plugin

// TODO

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var uri = "mongodb://localhost:27018"

var datasetLinks = []string{
	"https://github.com/ozlerhakan/mongodb-json-files/raw/refs/heads/master/datasets/books.json",
	"https://github.com/ozlerhakan/mongodb-json-files/raw/refs/heads/master/datasets/city_inspections.json"}

func TestQueryData(t *testing.T) {

	ctx := context.Background()
	opts := options.Client().ApplyURI(uri)

	client, err := mongo.Connect(ctx, opts)

	if err != nil {
		t.Fatal(err)
	}

	ds := Datasource{
		client:   client,
		host:     "localhost",
		port:     27018,
		database: "test",
	}

	t.Cleanup(func() {
		ds.client.Database(ds.database).Drop(ctx)
	})

	for _, url := range datasetLinks {
		fileName := filepath.Base(url)
		t.Run(fmt.Sprintf("test table query of %s", fileName), func(t *testing.T) {
			temDir := t.TempDir()
			err := downloadAndImportMongoData(url, temDir)
			if err != nil {
				t.Fatal(err)
			}

			aggregate, err := json.Marshal(bson.A{bson.M{"$limit": 50000}})
			if err != nil {
				t.Fatal(err)
			}

			qm := queryModel{
				QueryText:     string(aggregate),
				Collection:    strings.Split(fileName, ".")[0],
				QueryType:     "table",
				QueryLanguage: "json",
			}

			rawJson, err := json.Marshal(qm)
			if err != nil {
				panic(err)
			}

			resp, err := ds.QueryData(
				ctx,
				&backend.QueryDataRequest{
					Queries: []backend.DataQuery{
						{RefID: "A", JSON: rawJson},
					},
				},
			)
			if err != nil {
				t.Fatal(err)
			}

			if len(resp.Responses["A"].Frames) != 1 {
				t.Fatal("The number of Frame should be 1")
			}

			rowLen, err := resp.Responses["A"].Frames[0].RowLen()
			if err != nil {
				t.Fatal(err)
			}
			fmt.Printf("%d rows\n", rowLen)
		})
	}
}
