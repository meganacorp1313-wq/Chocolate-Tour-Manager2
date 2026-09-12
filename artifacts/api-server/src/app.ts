import path from "node:path";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
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
app.use(cookieParser());

// For the Whop webhook route, capture raw body before JSON parsing so we can
// verify the HMAC-SHA256 signature that Whop attaches to each request.
app.use(
  "/api/whop/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    // Attach rawBody to request for signature verification in the handler.
    (req as express.Request & { rawBody: Buffer }).rawBody = req.body as Buffer;
    // Re-parse as JSON so route handlers can use req.body as an object.
    try {
      req.body = JSON.parse((req.body as Buffer).toString("utf8"));
    } catch {
      req.body = {};
    }
    next();
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Single-origin deployments (gagarin) serve the built frontend from this same
// process, so session cookies and relative /api calls keep working.
const staticDir = process.env.STATIC_DIR;

if (staticDir) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
