import { Router, type IRouter, type Request } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { fetchBookingViews, dispatchBookingEmails } from "../lib/bookings";

const router: IRouter = Router();

/**
 * Verify the HMAC-SHA256 signature Whop attaches to every webhook delivery.
 * Whop signs the raw request body with the webhook secret and puts the result
 * in the `whop-signature` header as a hex string.
 *
 * If WHOP_WEBHOOK_SECRET is not set we skip verification and log a warning —
 * the secret is only available after the webhook is registered in production.
 */
function verifyWhopSignature(req: Request & { rawBody?: Buffer }): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    // In local development (NODE_ENV=development) allow unverified requests so
    // you can test the webhook handler via curl before the secret is configured.
    // In all other environments (staging, production) fail closed.
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[whop/webhook] WHOP_WEBHOOK_SECRET not set — skipping signature verification in dev mode. " +
          "Set WHOP_WEBHOOK_SECRET before deploying to production.",
      );
      return true;
    }
    console.error(
      "[whop/webhook] WHOP_WEBHOOK_SECRET is not configured. " +
        "Set this env var to the signing secret from the Whop webhook dashboard.",
    );
    return false;
  }

  const rawBody = req.rawBody;
  if (!rawBody || rawBody.length === 0) {
    console.error("[whop/webhook] rawBody missing — cannot verify signature");
    return false;
  }

  const signature = req.headers["whop-signature"];
  if (!signature || typeof signature !== "string") {
    console.error("[whop/webhook] Missing whop-signature header");
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * POST /whop/webhook
 * Receives Whop payment events. Updates booking status when payment succeeds.
 *
 * Security:
 * - Signature is verified via HMAC-SHA256 against WHOP_WEBHOOK_SECRET (when set)
 * - Booking lookup is by whopCheckoutId stored at booking creation time
 * - Idempotent: already-confirmed bookings are silently acknowledged
 */
router.post("/whop/webhook", async (req, res): Promise<void> => {
  // Verify Whop signature before processing
  if (!verifyWhopSignature(req as Request & { rawBody?: Buffer })) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    const body = req.body as {
      event?: string;
      data?: {
        checkout_configuration_id?: string;
        checkout?: { id?: string };
        membership?: {
          checkout_session?: { checkout_configuration_id?: string };
        };
      };
    };

    const event = body?.event;

    if (event !== "payment.succeeded") {
      // Acknowledge other events without action
      res.json({ ok: true });
      return;
    }

    // Extract checkout_configuration_id from event data
    const checkoutConfigId =
      body?.data?.checkout_configuration_id ??
      body?.data?.checkout?.id ??
      body?.data?.membership?.checkout_session?.checkout_configuration_id;

    if (!checkoutConfigId) {
      console.error("[whop/webhook] payment.succeeded missing checkout_configuration_id");
      res.status(400).json({ error: "Missing checkout_configuration_id" });
      return;
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.whopCheckoutId, checkoutConfigId));

    if (!booking) {
      // Not our booking or already deleted — acknowledge anyway
      res.json({ ok: true });
      return;
    }

    if (booking.status !== "pending_payment") {
      // Already processed (idempotent)
      res.json({ ok: true });
      return;
    }

    // Confirm the booking
    await db
      .update(bookingsTable)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
      })
      .where(eq(bookingsTable.id, booking.id));

    res.json({ ok: true });

    // Send confirmation emails after response is sent (fire-and-forget).
    // dispatchBookingEmails records success/failure on the booking row so
    // failed emails surface in the admin panel instead of only in logs.
    const [view] = await fetchBookingViews({ id: booking.id });
    if (view) {
      void dispatchBookingEmails(view);
    }
  } catch (err) {
    console.error("Whop webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
