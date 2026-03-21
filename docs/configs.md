# Configuration

This guide walks you through setting up the MongoDB datasource.

---

## Connection

### Schema

Choose the connection protocol that matches your MongoDB deployment:

- **`mongodb`** — Standard connection. Use this for self-hosted or locally running MongoDB instances.
- **`mongodb+srv`** — DNS seed list connection. Use this for MongoDB Atlas or other cloud-hosted deployments that provide an `+srv` connection string.

> If you're unsure which to use, check your connection string from your database provider. Atlas connection strings always start with `mongodb+srv`.

### Host

Enter the address of your MongoDB server. For a standard connection, this includes both the hostname and port (e.g., `localhost:27017`). For `mongodb+srv` connections, enter only the hostname — the port is resolved automatically via DNS.

| Schema        | Example Host                 |
| ------------- | ---------------------------- |
| `mongodb`     | `localhost:27017`            |
| `mongodb`     | `db.example.com:27017`       |
| `mongodb+srv` | `cluster0.abc12.mongodb.net` |

### Database Name

The name of the database you want to connect to. This is required.

### Extra Connection String Options

Advanced parameters appended to the connection string, formatted as `key=value` pairs separated by `&` — similar to URL query parameters.

**Example:** `retryWrites=true&w=majority&connectTimeoutMS=5000`

Leave this field blank unless you have specific requirements. Refer to the [MongoDB Connection String Options](https://www.mongodb.com/docs/manual/reference/connection-string/#connection-string-options) documentation for a full list of available parameters.

---

## Authentication

Select the authentication method that matches your MongoDB server's configuration.

### No Authentication

Use this option for local development instances or servers where authentication is disabled. No credentials are required.

> **Not recommended for production environments.**

### Username / Password

The most common authentication method. Enter your MongoDB credentials:

- **Username** — Your MongoDB user.
- **Password** — Your MongoDB user's password.
- **Authentication Database** _(optional)_ — The database where the user account is defined. Defaults to `admin` if left blank. Change this only if your user was created in a specific database (e.g., `myAppDb`).

### X.509 Certificate

Authentication using a client certificate instead of a password. This is common in high-security or Atlas environments. You will need a valid `.pem` client certificate issued for your MongoDB user.

> When using X.509, make sure TLS is enabled — certificate-based authentication requires an encrypted connection.

---

## TLS

TLS (Transport Layer Security) encrypts the connection between the application and your MongoDB server.

### TLS Option

Controls whether TLS is used for the connection:

- **Default** — Follows the server's TLS requirements. Recommended in most cases.
- **On** — Forces TLS. The connection will fail if the server does not support TLS.
- **Off** — Disables TLS entirely. Use only for local, trusted networks.

> For cloud-hosted databases (e.g., MongoDB Atlas), TLS is always required. Set this to **On** or **Default**.

### Certificate Authority (.pem)

Path to a custom Certificate Authority (CA) file in `.pem` format. This is used to verify the server's certificate when connecting to MongoDB instances that use a self-signed or private CA.

Leave this blank if your server uses a publicly trusted certificate (e.g., Atlas).

### Client Key Password

If your client certificate (used for X.509 authentication) is encrypted with a passphrase, enter it here. Leave blank if your certificate file is not password-protected.

You can toggle common TLS-related connection options `tlsInsecure`, `tlsAllowInvalidHostnames` and `tlsAllowInvalidCertificates`.
