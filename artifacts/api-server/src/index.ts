import app from "./app";
import { logger } from "./lib/logger";
import { retryFailedBookingEmails } from "./lib/bookings";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Background scheduler: retry failed booking emails independently of
  // HTTP traffic. 60s tick is well below the shortest (2 min) backoff.
  const EMAIL_RETRY_INTERVAL_MS = Number(
    process.env.EMAIL_RETRY_INTERVAL_MS ?? 60 * 1000,
  );
  // Initial pass shortly after startup to pick up any backlog.
  setTimeout(() => {
    logger.info("Email retry scheduler: initial pass");
    void retryFailedBookingEmails();
  }, 5 * 1000).unref();
  setInterval(() => {
    void retryFailedBookingEmails();
  }, EMAIL_RETRY_INTERVAL_MS).unref();
});
