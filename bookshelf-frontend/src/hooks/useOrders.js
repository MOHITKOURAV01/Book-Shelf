import { useCallback, useEffect, useState } from 'react';

import orderService from '../services/orderService.js';
import { isRenderableOrder } from '../utils/orderFormat.js';

/**
 * The signed-in customer's orders, from `GET /api/orders/mine`.
 *
 * There were two order histories before this: `/orders` read a `localStorage`
 * key that nothing had written since checkout moved to the server in #315, so
 * it showed "0 orders placed" forever, and `/account/orders` read the API.
 * The navbar linked to the empty one. See #326.
 *
 * Three things this hook is careful about, all of them because the data now
 * comes off a network rather than out of a local array:
 *
 *   1. The response shape is not trusted. `orders.filter is not a function`
 *      on an error body rendered as data white-screens the page instead of
 *      showing its error state.
 *   2. A response that arrives after the component has moved on is dropped,
 *      not applied.
 *   3. The request is aborted on unmount, so an unmounted component never
 *      sets state.
 */
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumping this re-runs the effect. A plain `refetch` that called the same
  // async function would race the in-flight one it is meant to replace.
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    orderService
      .getMyOrders()
      .then((data) => {
        if (!active) {
          return;
        }

        /*
         * The endpoint answers with an array. Anything else — an error
         * envelope, a paginated wrapper someone adds later, `null` from a
         * 204 — is not something to hand to `.map()`. Treating it as "no
         * orders" would be a lie; the honest answer is that the response
         * could not be read.
         */
        if (!Array.isArray(data)) {
          setOrders([]);
          setError({
            message: 'The server sent back something this page could not read.',
            code: 'MALFORMED_RESPONSE',
          });
          return;
        }

        setOrders(data.filter(isRenderableOrder));
        setError(null);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setOrders([]);
        setError(requestError);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { orders, loading, error, refetch };
}

export default useOrders;
