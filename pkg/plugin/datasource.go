package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/haohanyang/mongodb-datasource/pkg/models"
	"go.mongodb.org/mongo-driver/bson"
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

// NewDatasource creates a new MongoDB datasource instance.
func NewDatasource(ctx context.Context, source backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {

	config, err := models.LoadPluginSettings(source)
	if err != nil {
		backend.Logger.Error("Failed to load plugin settings", "error", err)
		return nil, err
	}

	uri, err := MongoUri(config)
	if err != nil {
		return nil, err
	}

	opts := options.Client().ApplyURI(uri)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		backend.Logger.Error(fmt.Sprintf("Failed to connect to db: %s", err.Error()))
		return nil, err
	}

	return &Datasource{
		client:   client,
		database: config.Database,
	}, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	d.client.Disconnect(context.TODO())
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

		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res

	}

	return response, nil
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	backend.Logger.Debug("Executing query", "refId", query.RefID, "json", query.JSON)

	var response backend.DataResponse
	var qm queryModel
	db := d.client.Database(d.database)

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to unmarshal json: %v", err.Error()))
	}

	if qm.Collection == "" {
		return backend.ErrDataResponse(backend.StatusBadRequest, "Collection field is required")
	}

	var pipeline []bson.D

	err = bson.UnmarshalExtJSON([]byte(qm.QueryText), false, &pipeline)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to unmarshal JsonExt: %v", err.Error()))
	}

	// Set aggregate options
	aggregateOpts := options.AggregateOptions{}

	if qm.AggregateMaxTimeMS > 0 {
		aggregateOpts.SetMaxTime(time.Hour * time.Duration(qm.AggregateMaxTimeMS))

		backend.Logger.Debug("Aggregate option was set", "maxTime", qm.AggregateMaxTimeMS)
	}

	if qm.AggregateComment != "" {
		aggregateOpts.SetComment(qm.AggregateComment)

		backend.Logger.Debug("Aggregate option was set", "comment", qm.AggregateComment)
	}

	if qm.AggregateBatchSize > 0 {
		aggregateOpts.SetBatchSize(qm.AggregateBatchSize)

		backend.Logger.Debug("Aggregate option was set", "batchSize", qm.AggregateBatchSize)
	}

	if qm.AggregateAllowDiskUse {
		aggregateOpts.SetAllowDiskUse(qm.AggregateAllowDiskUse)

		backend.Logger.Debug("Aggregate option was set", "allowDiskUse", qm.AggregateAllowDiskUse)
	}

	if qm.AggregateMaxAwaitTime > 0 {
		aggregateOpts.SetMaxAwaitTime(time.Hour * time.Duration(qm.AggregateMaxAwaitTime))

		backend.Logger.Debug("Aggregate option was set", "maxAwaitTime", qm.AggregateMaxAwaitTime)
	}

	if qm.AggregateBypassDocumentValidation {
		aggregateOpts.SetBypassDocumentValidation(qm.AggregateBypassDocumentValidation)

		backend.Logger.Debug("Aggregate option was set", "bypassDocumentValidation", qm.AggregateBypassDocumentValidation)
	}

	cursor, err := db.Collection(qm.Collection).Aggregate(ctx, pipeline, &aggregateOpts)
	if err != nil {
		backend.Logger.Error("Failed to execute aggregate", "error", err)

		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to query: %v", err.Error()))
	}

	defer cursor.Close(ctx)

	if qm.QueryType == "table" {
		frame, err := CreateTableFramesFromQuery(ctx, query.RefID, cursor)
		if err != nil {
			backend.Logger.Error("Failed to create data frame from query", "error", err)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to query: %v", err.Error()))
		}

		response.Frames = append(response.Frames, frame)

	} else {
		frames, err := CreateTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			backend.Logger.Error("Failed to create time series frames from query", "error", err)

			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to query: %v", err.Error()))
		}

		for _, frame := range frames {
			response.Frames = append(response.Frames, frame)
		}
	}

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}

	backend.Logger.Debug("Checking health")

	config, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)
	if err != nil {
		backend.Logger.Error("Failed to load settings", "error", err)

		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	uri, err := MongoUri(config)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = err.Error()
	}

	opts := options.Client().ApplyURI(uri).SetTimeout(5 * time.Second)
	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = err.Error()

		backend.Logger.Error("Failed to connect to db", "error", err)
		return res, nil
	}
	defer func() {
		if err = client.Disconnect(ctx); err != nil {
			backend.Logger.Error("Failed to disconnect to db", "error", err)
		}
	}()

	var result bson.M
	command := bson.D{{Key: "dbStats", Value: 1}}
	if err := client.Database(config.Database).RunCommand(ctx, command).Decode(&result); err != nil {
		backend.Logger.Error(fmt.Sprintf("Failed to get database status: %s", err.Error()))
		res.Status = backend.HealthStatusError

		if strings.Contains(strings.ToLower(err.Error()), "authenticationfailed") || strings.Contains(strings.ToLower(err.Error()), "unauthorized") {
			res.Message = "Authentication failed"
		} else {
			res.Message = err.Error()
		}

		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Successfully connects to MongoDB",
	}, nil
}
