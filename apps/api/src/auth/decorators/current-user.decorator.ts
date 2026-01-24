/**
 * Current User Decorator
 *
 * Extracts the current user from the request.
 * Can extract the full user object or specific properties.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get current user from request
 * @param data - Optional property to extract from user
 * @returns User object or specific property
 *
 * @example
 * // Get full user
 * @CurrentUser() user: User
 *
 * @example
 * // Get user ID
 * @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
