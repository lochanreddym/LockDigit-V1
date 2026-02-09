/**
 * Convex Auth Configuration
 *
 * This configures Convex to validate Firebase Auth tokens.
 * The Firebase project ID is set via the Convex dashboard as an environment variable.
 *
 * Steps to configure:
 * 1. Go to the Convex dashboard
 * 2. Add environment variable: FIREBASE_PROJECT_ID = your-firebase-project-id
 * 3. Deploy with `npx convex dev`
 */
export default {
  providers: [
    {
      // Firebase Auth issuer domain
      domain: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
      applicationID: process.env.FIREBASE_PROJECT_ID,
    },
  ],
};
