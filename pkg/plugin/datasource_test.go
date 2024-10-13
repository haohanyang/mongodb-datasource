package plugin

// TODO

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var uri = "mongodb://localhost:27018"

var datasetLinks = []string{
	"https://github.com/ozlerhakan/mongodb-json-files/raw/refs/heads/master/datasets/students.json",
	"https://github.com/ozlerhakan/mongodb-json-files/raw/refs/heads/master/datasets/covers.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_airbnb/listingsAndReviews.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_analytics/accounts.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_analytics/customers.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_analytics/transactions.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_mflix/comments.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_mflix/theaters.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_mflix/users.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_supplies/sales.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_training/grades.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_training/posts.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_training/tweets.json",
	"https://github.com/neelabalan/mongodb-sample-dataset/raw/refs/heads/main/sample_weatherdata/data.json",
}

func TestQueryTableData(t *testing.T) {

	ctx := context.Background()
	opts := options.Client().ApplyURI(uri)

	client, err := mongo.Connect(ctx, opts)

	if err != nil {
		t.Fatal(err)
	}

	ds := Datasource{
		client:   client,
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

			aggregate, err := json.Marshal(bson.A{})
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
				t.Fatal(err)
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

			rowCount, err := resp.Responses["A"].Frames[0].RowLen()
			if err != nil {
				t.Fatal(err)
			}
			t.Logf("%d rows in total", rowCount)
		})

		time.Sleep(time.Second)
	}
}
