package plugin

// MongoDB auth methods. Corresponds to src/types.ts MongoDBAuthMethod
const (
	MongoAuthNone             = ""
	MongoAuthUsernamePassword = "username-password"
	MongoAuthX509             = "x509"
)

const (
	tlsDefault  = ""
	tlsEnabled  = "enabled"
	tlsDisabled = "disabled"
)
