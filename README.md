# LockDigit

A premium digital identity wallet and payment app built with React Native (Expo).

## Tech Stack

- **Framework**: React Native with Expo (managed workflow)
- **Styling**: NativeWind v4 (Tailwind CSS for RN)
- **Backend/Database**: Convex (reactive database, server functions, file storage)
- **Authentication**: Convex Auth + Firebase Phone Auth (OTP verification)
- **Payments**: Stripe React Native SDK
- **AI Features**: OpenAI API (via Convex server actions)
- **Navigation**: Expo Router (file-based routing)

## Features

- **Identity Wallet**: Securely store and view official documents (driver's licenses, passports, vaccination certificates)
- **Scan to Pay**: QR code-based payments at merchants
- **Bill Management**: Track and pay bills, subscriptions, and financial obligations
- **Smart Notifications**: Alerts for upcoming bills, document expiries, and subsidies
- **AI-Powered**: Document OCR extraction, bill analysis, and smart suggestions
- **Security**: PIN-based authentication, device binding, and encrypted storage

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Phone Authentication enabled
- Stripe account with API keys
- Convex account

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Convex:
   ```bash
   npx convex dev
   ```

3. Configure environment variables in `.env`:
   ```
   EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   ```

4. Set Convex server environment variables (via Convex Dashboard):
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `FIREBASE_PROJECT_ID`

5. Start the development server:
   ```bash
   npx expo start
   ```

### Building for Device

Since this app uses native modules (camera, secure store, Stripe), you need EAS builds:

```bash
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

## Project Structure

```
app/                    # Expo Router file-based routes
  (auth)/               # Authentication screens (login, verify, create-pin)
  (app)/                # Main app screens
    (tabs)/             # Tab navigation (home, wallet, payments, notifications, profile)
    document/[id].tsx   # Document detail view
    bill/[id].tsx       # Bill detail / payment
    scan-to-pay.tsx     # QR code scanner
    search.tsx          # Global search
  pin-lock.tsx          # PIN entry screen
components/             # Reusable UI components
  glass/                # Glassmorphism components (GlassCard, GlassButton, GlassInput)
  common/               # Shared components (Header, SearchBar, etc.)
  documents/            # Document-specific components
  payments/             # Payment-specific components
convex/                 # Convex backend (schema, queries, mutations, actions, crons)
lib/                    # Utility functions (PIN, device binding, Firebase, Stripe)
hooks/                  # Custom React hooks
constants/              # Theme colors, config
```
