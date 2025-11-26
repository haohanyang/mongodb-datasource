package plugin

// MongoDB auth methods. Corresponds to src/types.ts MongoDBAuthMethod
const (
	MongoAuthNone             = "none"
	MongoAuthUsernamePassword = "username-password"
	MongoAuthX509             = "x509"
)

const (
	tlsDefault  = "default"
	tlsEnabled  = "enabled"
	tlsDisabled = "disabled"
)
