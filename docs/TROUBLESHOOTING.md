# Checking Errors & Troubleshooting

Because the OYA system is distributed across multiple microservices, checking errors requires knowing where to look. We have built-in centralized logging and observability to make this process seamless.

## 1. Checking Logs via Docker CLI

If a specific service is crashing or returning 500 Internal Server Errors, the easiest way to see what's wrong is to check the container logs.

To view the last 100 log lines of the Loan Service:
```bash
docker logs --tail 100 -f oya-loan-service
```
*(The `-f` flag "follows" the logs, meaning it streams new logs to your terminal in real-time. Press `Ctrl+C` to exit).*

To view API Gateway logs (useful for checking CORS errors or proxy failures):
```bash
docker logs -f oya-api-gateway
```

## 2. Checking Logs via Grafana & Loki (Recommended)

Instead of manually checking individual Docker containers, all logs are automatically shipped to Grafana Loki using the Docker logging driver.

1. Open Grafana: [http://localhost:3001](http://localhost:3001)
2. Navigate to the **Explore** tab.
3. Select the `Loki` datasource.
4. Use the Log Browser to filter by container name (e.g., `{container_name="oya-loan-service"}`).
5. You can now see a unified, searchable stream of logs!

## Common Issues & Solutions

### Issue: Mobile App says "XMLHttpRequest error"
**Cause:** This happens on Flutter Web when the `api-gateway` does not inject the correct CORS headers, or the browser blocks the request.
**Solution:** Check the API Gateway logs. Ensure the request is hitting port `3000`. In `api-gateway/src/app.ts`, verify that `cors` is registered with `origin: true`.

### Issue: "Database connection failed"
**Cause:** The Postgres container might not have finished booting before the microservices tried to connect.
**Solution:** The containers are set to `restart: always`. However, if they get stuck, simply restart the failing service:
```bash
docker-compose restart api-gateway loan-service
```

### Issue: "Mobile app container failed to build"
**Cause:** The `flutter build web` command inside the Dockerfile failed. This usually happens if you made a syntax error in the Dart code.
**Solution:** 
1. Open the mobile app code locally (`apps/mobile`).
2. Run `flutter analyze` or simply look at your IDE's error squiggles.
3. Fix the syntax error.
4. Rebuild the container: `docker-compose up --build -d mobile-app`

### Issue: Prisma complains about missing tables
**Cause:** The database was created, but the schema migrations were not applied.
**Solution:** Run the database push command to sync the schema:
```bash
npx turbo run db:push
# or manually:
cd packages/database && npx prisma db push
```
