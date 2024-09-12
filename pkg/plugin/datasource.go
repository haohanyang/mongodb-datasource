package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, _ backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	const uri = "mongodb://mongo:27017"
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)

	client, err := mongo.Connect(context.TODO(), opts)
	return &Datasource{mongoClient: client}, err
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	mongoClient *mongo.Client
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	d.mongoClient.Disconnect(context.TODO())
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()
	// loop over queries and execute them individually.
	for _, q := range req.Queries {

		res := d.query(ctx, req.PluginContext, d.mongoClient, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res

	}

	return response, nil
}

type queryModel struct {
	QueryText  string `json:"queryText"`
	Collection string `json:"collection"`
}

type queryResult struct {
	Timestamp primitive.DateTime `bson:"ts"`
	Value     int                `bson:"value"`
	Name      string             `bson:"name"`
}

type frame_ struct {
	timestamps []time.Time
	values     []int32
}

func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, mongo *mongo.Client, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse
	backend.Logger.Debug("Raw query", query.JSON)
	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to unmarshal json: %v", err.Error()))
	}

	var pipeline []bson.D
	err = bson.UnmarshalExtJSON([]byte(qm.QueryText), true, &pipeline)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to unmarshal JsonExt: %v", err.Error()))
	}

	cursor, err := mongo.Database("test").Collection(qm.Collection).Aggregate(context.TODO(), pipeline)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to query: %v", err.Error()))

	}
	defer cursor.Close(context.TODO())

	type frame_ struct {
		timestamps []time.Time
		values     []int32
	}

	frames := make(map[string]frame_)

	for cursor.Next(context.TODO()) {
		var result queryResult
		if err := cursor.Decode(&result); err != nil {
			backend.Logger.Error("Failed to decode doc: %v", err.Error())
		} else {
			name := result.Name
			if f, ok := frames[name]; ok {
				f.timestamps = append(f.timestamps, result.Timestamp.Time())
				f.values = append(f.values, int32(result.Value))
			} else {
				frames[name] = frame_{
					timestamps: []time.Time{result.Timestamp.Time()},
					values:     []int32{int32(result.Value)},
				}

			}
		}
	}

	for k, v := range frames {
		frame := data.NewFrame("response")
		frame.Fields = append(frame.Fields,
			data.NewField("time", nil, v.timestamps),
			data.NewField("values", nil, v.values),
		)
		frame.Name = k
		response.Frames = append(response.Frames, frame)
	}

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	config, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)

	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	if config.Secrets.ApiKey == "" {
		res.Status = backend.HealthStatusError
		res.Message = "API key is missing"
		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
