package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/mongodb/mongo-tools/mongoimport"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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

	mongodbContainer, err := mongodb.Run(ctx, "mongo")
	testcontainers.CleanupContainer(t, mongodbContainer)

	if err != nil {
		t.Fatal(err)
	}

	mongoUri, err := mongodbContainer.ConnectionString(ctx)
	if err != nil {
		t.Fatal(err)
	}

	mongoOpts := options.Client().ApplyURI(mongoUri)
	client, err := mongo.Connect(ctx, mongoOpts)

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

	tempDir := t.TempDir()

	for _, dataUrl := range datasetLinks {
		fileName := filepath.Base(dataUrl)
		coll := strings.Split(fileName, ".")[0]
		t.Run(fmt.Sprintf("test table query of %s", fileName), func(t *testing.T) {
			// Download and import data
			resp, err := http.Get(dataUrl)
			if err != nil {
				t.Fatal(err)
			}

			defer resp.Body.Close()

			filePath := filepath.Join(tempDir, fileName)

			out, err := os.Create(filePath)
			if err != nil {
				t.Fatal(err)
			}

			defer out.Close()

			_, err = io.Copy(out, resp.Body)
			if err != nil {
				t.Fatal(err)
			}

			t.Logf("File downloaded to %s\n", filePath)

			importOpts, err := mongoimport.ParseOptions([]string{"--drop", "--collection", coll, "--uri", mongoUri, "--file", filePath, "--type", "json"},
				"", "")
			if err != nil {
				t.Fatal(err)
			}

			importer, err := mongoimport.New(importOpts)
			if err != nil {
				t.Fatal(err)
			}

			defer importer.Close()

			numDocs, numFailure, err := importer.ImportDocuments()
			if err != nil {
				t.Fatal(err)
			}

			t.Logf("Imported %d documents with %d failures\n", numDocs, numFailure)

			count, err := client.Database("test").Collection(coll).CountDocuments(ctx, bson.D{})
			if err != nil {
				t.Fatal(err)
			}

			t.Logf("There are %d documents in collection %s\n", count, coll)

			qm := queryModel{
				QueryText:     "[]",
				Collection:    coll,
				QueryType:     "table",
				QueryLanguage: "json",
			}

			rawJson, err := json.Marshal(qm)
			if err != nil {
				t.Fatal(err)
			}

			queryRes, err := ds.QueryData(
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

			if len(queryRes.Responses["A"].Frames) != 1 {
				t.Fatal("The number of Frame should be 1")
			}

			rowCount, err := queryRes.Responses["A"].Frames[0].RowLen()
			if err != nil {
				t.Fatal(err)
			}
			if int64(rowCount) != count {
				t.Fatalf("The number of rows should be %d, got %d", count, rowCount)
			}
		})

	}
}
