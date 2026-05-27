import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || "info" },
});

app.register(cors, { origin: true });
app.register(helmet);

app.get("/health", async () => {
  return { status: "ok", service: "payment-service" };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3003", 10);
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
