# Starting & Running the System

Because the entire OYA system is containerized, starting the system is incredibly simple. You do not need to boot the frontend, backend, and databases in separate terminal windows.

## Booting the Full Stack

To start the databases, observability stack, all microservices, the API gateway, the Admin Dashboard, and the Mobile App, simply run:

```bash
docker-compose up --build -d
```

### What this command does:
1. **`up`**: Tells Docker to create and start the containers defined in `docker-compose.yml`.
2. **`--build`**: Forces Docker to rebuild the images. This is important if you recently pulled new code or made changes to the Flutter app or backend services. *(Note: Building the Mobile App container takes a few minutes as it downloads the Flutter SDK and compiles the web bundle).*
3. **`-d`** (Detached mode): Runs the containers in the background, allowing you to continue using your terminal.

## Stopping the System

When you are done developing or want to shut down the servers, run:
```bash
docker-compose down
```
This stops and removes the containers. It does **not** delete your database data, as Postgres is using a persistent named volume.

If you ever want to completely wipe your database and start fresh, you can remove the volumes using:
```bash
docker-compose down -v
```

## Accessing the Live Applications

Once `docker-compose up -d` finishes booting all the services, open your web browser and navigate to the following URLs:

- **📱 Mobile App (Customer Facing):** [http://localhost:8080](http://localhost:8080)
- **💻 Admin Dashboard (Staff Facing):** [http://localhost:5173](http://localhost:5173)
- **🚪 API Gateway (Backend API):** [http://localhost:3000](http://localhost:3000)
- **📊 Grafana (System Logs & Metrics):** [http://localhost:3001](http://localhost:3001)

## Running Locally (Without Docker)

While Docker is recommended, you can run the microservices locally using Turborepo for rapid development:
```bash
# Start Postgres and Redis in Docker first
docker-compose up -d postgres redis

# Run all microservices simultaneously in development mode
npm run dev
```
