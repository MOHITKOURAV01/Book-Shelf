import { useContext } from 'react';
import { CartContext } from '../context/CartContext.jsx';

/**
 * Access the cart.
 *
 * Prefer this over `useContext(CartContext)` directly. Reading the context
 * straight gives you `undefined` when the provider is missing, and every
 * caller then blows up on the destructuring line with a message that points
 * at the consumer rather than at the missing provider. This throws with the
 * actual cause instead.
 */
export function useCart() {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error(
      'useCart() must be used inside a <CartProvider>. ' +
        'Check that CartProvider wraps the component tree in main.jsx.'
    );
  }

  return context;
}

export default useCart;
