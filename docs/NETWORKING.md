# Networking & Port Configuration

The OYA platform relies on a carefully configured Docker internal network and exposes a specific set of ports to the host machine for public access.

## Docker Internal Networking

All services are connected to a custom bridged Docker network defined in the `docker-compose.yml` as `oya_network`.
Within this network:
- Services communicate with each other using their container names as hostnames.
- Example: The `api-gateway` communicates with the `loan-service` by sending requests to `http://loan-service:3002`.
- Databases like Postgres and Redis are completely hidden from the public internet. They only expose their ports (5432 and 6379) *internally* to the `oya_network`. They are **NOT** mapped to the host machine to prevent unauthorized access.

## Exposed Ports (Host Machine)

The following ports are mapped to your local machine (localhost) and are accessible from your web browser:

| Service | Port | Description |
|---|---|---|
| **API Gateway** | `3000` | The unified REST API endpoint. The Mobile app and Admin app send all HTTP traffic here. |
| **Admin Dashboard** | `5173` | The web portal for administrative staff. |
| **Mobile App** | `8080` | The Nginx web server hosting the Flutter Web build. |
| **Grafana** | `3001` | The observability dashboard for viewing logs and metrics. |

*(Note: The internal microservices (3001-3004) do NOT expose their ports to the host machine. You cannot query them directly from Postman on localhost; you must route through the API Gateway on port 3000).*

## CORS (Cross-Origin Resource Sharing)

The API Gateway is configured to allow CORS requests. This is mandatory because the Admin Dashboard (running on `:5173`) and the Mobile App (running on `:8080`) operate on different origins than the API itself (`:3000`).
CORS configurations in Fastify (`@fastify/cors`) inject the necessary `Access-Control-Allow-Origin` headers into responses so the browser does not block the requests.
