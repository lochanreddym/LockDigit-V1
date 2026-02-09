/**
 * Convex Auth Configuration
 *
 * Validates Firebase Phone Auth tokens.
 * FIREBASE_PROJECT_ID is set as a Convex environment variable.
 */

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
      applicationID: process.env.FIREBASE_PROJECT_ID,
    },
  ],
};
