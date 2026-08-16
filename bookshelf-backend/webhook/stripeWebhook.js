import dotenv from 'dotenv';
import orderRepository from '../repositories/orderRepository.js';
import { verifyWebhookSignature } from '../services/stripeService.js';
import { StripeConfigError } from '../config/stripe.js';
import {
  isHandledEventType,
  extractPaymentContext,
  decideTransition,
  ProcessedEventStore,
} from '../utils/webhookEvents.js';

dotenv.config();

/**
 * Events already applied, so a redelivery is a no-op.
 *
 * Module scope on purpose: one store for the life of the process, the same
 * shape as the counters in middleware/rateLimiter.js.
 */
export const processedEvents = new ProcessedEventStore({ maxSize: 1000 });

/**
 * How this endpoint answers, and why.
 *
 * Stripe reads the status code as an instruction. Anything outside 2xx means
 * "I could not take this, send it again", and it will keep sending — with
 * backoff, for up to three days, and then it disables the endpoint. Once the
 * endpoint is disabled, real payments stop being recorded. The status code is
 * not a formality here, it is flow control.
 *
 *   400  the signature did not verify. Not from Stripe, or the wrong secret.
 *        Never accepted.
 *   200  handled, or permanently unhandleable — an event type we do not act
 *        on, metadata with no orderId or a malformed one, an order that does
 *        not exist, a redelivery already applied. Retrying any of these
 *        produces the identical answer forever, so the honest reply is
 *        "received, nothing to do".
 *   500  a transient failure on our side, in practice the database. This is
 *        the only case a retry can fix, so it is the only case that asks for
 *        one.
 *
 * The previous handler answered 500 to every one of these. An `orderId` in the
 * metadata that was not a valid ObjectId made Mongoose throw a CastError,
 * which became a 500, which Stripe retried, which threw the same CastError.
 *
 * Built as a factory so the tests can drive it with a fake verifier and a fake
 * repository. Application code uses the default export below, which wires in
 * the real ones.
 */
export function createStripeWebhookHandler({
  verify = verifyWebhookSignature,
  orders = orderRepository,
  store = processedEvents,
  logger = console,
} = {}) {
  return async function stripeWebhookHandler(req, res) {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      // No secret argument, and no fallback behind it. The secret comes from
      // validated config inside the service.
      event = verify(req.body, signature);
    } catch (error) {
      if (error instanceof StripeConfigError) {
        // Refusing to verify is the right move when there is no real secret.
        // The alternative is what this code used to do: verify against a
        // constant printed in this repository, and accept forged events.
        // 500 so Stripe retries once the deployment is fixed.
        logger.error(`[webhook] not configured: ${error.message}`);
        return res.status(500).json({ message: 'Webhook is not configured' });
      }

      logger.error(`[webhook] signature verification failed: ${error.message}`);
      return res.status(400).json({ message: 'Signature verification failed' });
    }

    if (!isHandledEventType(event.type)) {
      // Subscribed to something we do not act on. Not an error.
      return res.status(200).json({ received: true, handled: false });
    }

    if (store.has(event.id)) {
      return res
        .status(200)
        .json({ received: true, handled: false, reason: 'duplicate event' });
    }

    const context = extractPaymentContext(event);

    if (!context.ok) {
      // Deterministically unusable. Worth logging — it means something
      // upstream is writing bad metadata — but not worth a retry.
      logger.warn(`[webhook] ignoring ${event.id}: ${context.reason}`);
      store.add(event.id);
      return res
        .status(200)
        .json({ received: true, handled: false, reason: context.reason });
    }

    try {
      const order = await orders.findById(context.orderId);

      const decision = decideTransition(order, event, {
        paymentIntentId: context.paymentIntentId,
      });

      if (decision.action === 'skip') {
        logger.log(
          `[webhook] ${event.type} for order ${context.orderId}: ${decision.reason}`
        );
        store.add(event.id);
        return res
          .status(200)
          .json({ received: true, handled: false, reason: decision.reason });
      }

      Object.assign(order, decision.changes);
      await orders.save(order);

      store.add(event.id);

      logger.log(
        `[webhook] ${event.type} applied to order ${context.orderId} ` +
          `(paymentStatus=${decision.changes.paymentStatus})`
      );

      return res.status(200).json({ received: true, handled: true });
    } catch (error) {
      // Reaching here means the database refused, not that the event was bad
      // — every bad-event path returned 200 above. This is the case a retry
      // can actually fix, so it is the case that gets a 500. The event id is
      // deliberately not recorded as processed.
      logger.error(
        `[webhook] failed to apply ${event.id} (${event.type}): ${error.message}`
      );
      return res.status(500).json({ message: 'Failed to process event' });
    }
  };
}

const stripeWebhookHandler = createStripeWebhookHandler();

export default stripeWebhookHandler;
