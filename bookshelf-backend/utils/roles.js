/**
 * Roles, defined once.
 *
 * The bug this file exists to stop: orderController checked
 * `req.user.isAdmin`, a field the User model does not have. It was always
 * undefined, so the admin branch was dead code and admins got a 403 on any
 * order that was not their own. Nothing failed loudly — the check just
 * quietly did the wrong thing, which is the worst failure mode for an
 * authorisation branch.
 */

export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

/**
 * True when the user is an admin.
 *
 * Takes the whole user rather than a role string so callers cannot reach for
 * a field name themselves, and returns false for null/undefined so a missing
 * user is never mistaken for a privileged one.
 */
export function isAdmin(user) {
  return Boolean(user) && user.role === ROLES.ADMIN;
}

/**
 * True when the user owns the resource.
 *
 * ObjectId comparison is the trap here: `order.userId` is an ObjectId and
 * `user._id` is an ObjectId, and `===` on two ObjectIds wrapping the same
 * value is false. Both sides are stringified. A null on either side returns
 * false rather than matching another null.
 */
export function isOwner(user, resourceUserId) {
  if (!user?._id || !resourceUserId) {
    return false;
  }

  return String(resourceUserId) === String(user._id);
}

/**
 * The rule almost every "read one" handler wants: the owner or an admin.
 */
export function canAccess(user, resourceUserId) {
  return isOwner(user, resourceUserId) || isAdmin(user);
}
