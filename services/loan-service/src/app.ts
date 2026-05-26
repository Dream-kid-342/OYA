import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import pino from "pino";

const app = Fastify({
  logger: pino({ level: process.env.LOG_LEVEL || "info" }),
});

app.register(cors, { origin: true });
app.register(helmet);
app.register(multipart);

import loanRoutes from "./routes/loan.routes";

app.get("/health", async () => {
  return { status: "ok", service: "loan-service" };
});

app.register(loanRoutes, { prefix: "/api/v1/loans" });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3002", 10);
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
