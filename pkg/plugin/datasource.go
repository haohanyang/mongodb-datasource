package plugin

import (
	"context"
	"encoding/json"
	"errors"
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

// NewDatasource creates a new datasource instance.
func NewDatasource(ctx context.Context, source backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {

	var uri string

	config, err := models.LoadPluginSettings(source)
	if err != nil {
		backend.Logger.Error(fmt.Sprintf("Failed to load plugin settings: %s", err.Error()))
		return nil, err
	}

	if config.Database == "" {
		return nil, errors.New("missing MongoDB database")
	}

	if config.AuthMethod == "auth-none" {
		uri = fmt.Sprintf("mongodb://%s:%d", config.Host, config.Port)
	} else if config.AuthMethod == "auth-username-password" {
		if config.Username == "" || config.Secrets.Password == "" {
			return nil, errors.New("missing MongoDB username or password")
		}
		uri = fmt.Sprintf("mongodb://%s:%s@%s:%d", config.Username, config.Secrets.Password, config.Host, config.Port)
	} else {
		return nil, errors.New("authentication method not supported")
	}

	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI).SetTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		backend.Logger.Error(fmt.Sprintf("Failed to connect to db: %s", err.Error()))
		return nil, err
	}

	return &Datasource{
		client:   client,
		database: config.Database,
		host:     config.Host,
		port:     config.Port}, nil
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
	backend.Logger.Debug("New queries", d.host, d.port, d.database)
	for _, q := range req.Queries {

		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res

	}

	return response, nil
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse
	backend.Logger.Debug("Raw query", query.JSON)
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

	cursor, err := db.Collection(qm.Collection).Aggregate(ctx, pipeline)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to query: %v", err.Error()))

	}
	defer cursor.Close(ctx)

	if qm.QueryType == "table" {
		frame, err := createTableFramesFromQuery(ctx, cursor)
		if err != nil {
			backend.Logger.Error(err.Error())
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Failed to query: %v", err.Error()))
		}

		response.Frames = append(response.Frames, frame)

	} else {
		frames, err := createTimeSeriesFramesFromQuery(ctx, cursor)
		if err != nil {
			backend.Logger.Error(err.Error())
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
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	backend.Logger.Debug(fmt.Sprintf("Config: %v", config))

	if config.AuthMethod == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Please specify the authentication type"
		return res, nil
	}

	if config.Host == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Please specify the host address"
		return res, nil
	}

	if config.Database == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Please specify the database"
		return res, nil
	}

	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	var uri string

	if config.AuthMethod == "auth-none" {
		uri = fmt.Sprintf("mongodb://%s:%d", config.Host, config.Port)
	} else if config.AuthMethod == "auth-username-password" {
		if config.Username == "" || config.Secrets.Password == "" {
			res.Status = backend.HealthStatusError
			res.Message = "Please specify the username and password"
			return res, nil
		}
		uri = fmt.Sprintf("mongodb://%s:%s@%s:%d", config.Username, config.Secrets.Password, config.Host, config.Port)
	} else {
		res.Status = backend.HealthStatusError
		res.Message = "Please specify the authentication type"
		return res, nil
	}

	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI).SetTimeout(5 * time.Second)
	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = err.Error()
		backend.Logger.Error(err.Error())
		return res, nil
	}
	defer func() {
		if err = client.Disconnect(ctx); err != nil {
			backend.Logger.Error(fmt.Sprintf("Failed to disconnect db: %s", err.Error()))
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
