package plugin

import (
	"context"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestGetTableFramesFromQuery(t *testing.T) {
	ctx := context.TODO()
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")

	// Connect to a mongodb server.
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		panic(err)
	}

	defer func() { _ = client.Disconnect(ctx) }()

	type Dog struct {
		Name       string
		Breed      string
		Age        int
		Weight     float32
		Vaccinated bool
	}

	toInsert := []interface{}{
		Dog{
			Name:       "Bailey",
			Breed:      "German Shepherd",
			Age:        5,
			Weight:     22.1,
			Vaccinated: true,
		},
		Dog{
			Name:       "Lola",
			Breed:      "French Bulldog",
			Age:        7,
			Weight:     15.2,
			Vaccinated: true,
		},
		Dog{
			Name:       "Leo",
			Breed:      "Beagle",
			Age:        10,
			Weight:     18.6,
			Vaccinated: false,
		},
	}

	collection := client.Database("test").Collection("test")
	if _, err := collection.InsertMany(ctx, toInsert); err != nil {
		panic(err)
	}

	defer func() {
		client.Database("test").Collection("test").Drop(context.TODO())
	}()

	var pipeline []bson.D
	cursor, err := client.Database("test").Collection("test").Aggregate(context.TODO(), pipeline)
	if err != nil {
		panic(err)
	}
	defer cursor.Close(context.TODO())

	frames, err := getTableFramesFromQuery(context.TODO(), cursor)
	if frames == nil {
		t.Fatal(err)
	}
}

func TestGetTimeSeriesFramesFromQuery(t *testing.T) {
	ctx := context.TODO()
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")

	// Connect to a mongodb server.
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		panic(err)
	}

	defer func() { _ = client.Disconnect(ctx) }()

	type Doc struct {
		Name  string    `bson:"name"`
		Ts    time.Time `bson:"ts"`
		Value int       `bson:"value"`
	}

	toInsert := []interface{}{
		Doc{
			Name:  "name1",
			Ts:    time.Now(),
			Value: 1,
		},
		Doc{
			Name:  "name1",
			Ts:    time.Now(),
			Value: 2,
		},
		Doc{
			Name:  "name2",
			Ts:    time.Now(),
			Value: 3,
		},
		Doc{
			Name:  "name2",
			Ts:    time.Now(),
			Value: 4,
		},
	}

	collection := client.Database("test").Collection("test")
	if _, err := collection.InsertMany(ctx, toInsert); err != nil {
		panic(err)
	}

	defer func() {
		client.Database("test").Collection("test").Drop(context.TODO())
	}()

	pipeline := bson.A{
		bson.D{
			{
				Key: "$sort", Value: bson.D{
					{Key: "value", Value: 1},
				},
			},
		},
	}
	cursor, err := client.Database("test").Collection("test").Aggregate(context.TODO(), pipeline)
	if err != nil {
		panic(err)
	}
	defer cursor.Close(context.TODO())

	frames, err := getTimeSeriesFramesFromQuery(context.TODO(), cursor)
	if err != nil {
		t.Fatal(err)
	}
	if len(frames) != 2 {
		t.Error("Size of frames should be 2")
	}

	f1 := frames[0]
	f2 := frames[1]

	if f1.Name != "name1" || f2.Name != "name2" {
		t.Error("wrong frame names")
	}

	if f1.Fields[0].Name != "time" || f1.Fields[1].Name != "values" {
		t.Error("wrong field names")
	}

	if f1.Fields[0].Len() != 2 || f2.Fields[0].Len() != 2 {
		t.Error("wrong row count")
	}
}
