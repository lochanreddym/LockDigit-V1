/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as authHelpers from "../authHelpers.js";
import type * as bills from "../bills.js";
import type * as blockchain from "../blockchain.js";
import type * as cronHelpers from "../cronHelpers.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as identityRequests from "../identityRequests.js";
import type * as notifications from "../notifications.js";
import type * as ops from "../ops.js";
import type * as payments from "../payments.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  authHelpers: typeof authHelpers;
  bills: typeof bills;
  blockchain: typeof blockchain;
  cronHelpers: typeof cronHelpers;
  crons: typeof crons;
  documents: typeof documents;
  http: typeof http;
  identityRequests: typeof identityRequests;
  notifications: typeof notifications;
  ops: typeof ops;
  payments: typeof payments;
  subscriptions: typeof subscriptions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
