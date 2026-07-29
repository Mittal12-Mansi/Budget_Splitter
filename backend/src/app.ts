import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { db, usersTable } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Smart Budget Splitter API Server" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Smart Budget Splitter API Server" });
});

app.get("/api/test-db", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(1);
    res.json({ status: "ok", message: "Database connection successful", usersCount: users.length });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message, name: err.name, stack: err.stack });
  }
});

app.use("/api", router);

export default app;
