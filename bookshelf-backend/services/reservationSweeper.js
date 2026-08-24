import orderRepository from '../repositories/orderRepository.js';
import { restoreInventory } from '../repositories/bookRepository.js';
import { DEFAULT_RESERVATION_TTL_MS, planSweep } from '../utils/reservations.js';

/**
 * Put back stock held by checkouts that were never completed.
 *
 * The decisions live in `utils/reservations.js` and are pure; this is the
 * part that talks to Mongo and to books.json.
 *
 * Built as a factory so tests can drive it with fake repositories, the same
 * way `createStripeWebhookHandler` is built. The default export at the bottom
 * wires in the real ones.
 */
export function createReservationSweeper({
  orders = orderRepository,
  restore = restoreInventory,
  ttlMs = DEFAULT_RESERVATION_TTL_MS,
  logger = console,
  now = () => Date.now(),
} = {}) {
  // Guards against two runs overlapping. The interval keeps firing even if a
  // sweep is slow, and two passes over the same order would hand the same
  // units back twice — `restoreInventory` is deliberately not version-checked
  // and would happily do it.
  let running = false;

  async function sweep() {
    if (running) {
      logger.warn?.('[reservations] previous sweep still running, skipping this pass');
      return { released: 0, restored: 0, failed: 0, skipped: 0 };
    }

    running = true;

    try {
      const pending = await orders.findExpiredReservations({
        before: new Date(now() - ttlMs),
      });

      const { releases } = planSweep(pending, { now: now(), ttlMs });

      let restoredLines = 0;
      let failedLines = 0;
      let releasedOrders = 0;

      for (const { order, lines, changes } of releases) {
        /*
         * Order of operations. The inventory goes back first, and only then
         * is the order marked released.
         *
         * The other way round loses stock outright: if the write to
         * books.json failed after the order had been marked, the marker
         * would stop the next sweep from ever retrying it. Doing it this way
         * risks the opposite — a crash between the two restores the stock
         * without recording it, and the next sweep restores it again. That
         * is a bounded over-count on a shop's own catalogue, against
         * permanently vanished stock. The safer failure is the recoverable
         * one.
         */
        const result = restore(lines);

        restoredLines += result.restored.length;
        failedLines += result.failed.length;

        if (result.failed.length > 0) {
          logger.error(
            `[reservations] order ${order._id}: ${result.failed.length} line(s) ` +
              'could not be restored:',
            result.failed
          );
        }

        try {
          Object.assign(order, changes);
          await orders.save(order);
          releasedOrders += 1;
        } catch (saveError) {
          // The stock is back, which is the part that matters. The order is
          // still 'pending', so the next sweep will try again — and
          // re-restore. Loud, because it needs a human eventually.
          logger.error(
            `[reservations] restored stock for order ${order._id} but could not ` +
              `mark it released: ${saveError.message}`
          );
        }
      }

      if (releasedOrders > 0 || failedLines > 0) {
        logger.log(
          `[reservations] released ${releasedOrders} abandoned checkout(s), ` +
            `restored ${restoredLines} line(s), ${failedLines} failed`
        );
      }

      return {
        released: releasedOrders,
        restored: restoredLines,
        failed: failedLines,
        skipped: pending.length - releases.length,
      };
    } catch (error) {
      // A sweeper that throws into an interval takes the process down. It
      // runs again in a few minutes; the next pass picks up whatever this
      // one missed.
      logger.error(`[reservations] sweep failed: ${error.message}`);
      return { released: 0, restored: 0, failed: 0, skipped: 0, error };
    } finally {
      running = false;
    }
  }

  return { sweep };
}

/**
 * Run the sweep on a schedule.
 *
 * Also runs once immediately: a process that crashed mid-checkout left stock
 * reserved against an order nobody will ever pay for, and waiting a full
 * interval to notice is a whole interval of a shop being wrong.
 *
 * `unref()` so the timer does not hold the event loop open — otherwise the
 * process will not exit on its own, and neither will a test run.
 */
export function startReservationSweeper({
  intervalMs = 5 * 60 * 1000,
  ...options
} = {}) {
  const sweeper = createReservationSweeper(options);

  sweeper.sweep();

  const timer = setInterval(() => {
    sweeper.sweep();
  }, intervalMs);

  timer.unref?.();

  return {
    stop: () => clearInterval(timer),
    sweep: sweeper.sweep,
  };
}

export default createReservationSweeper;
