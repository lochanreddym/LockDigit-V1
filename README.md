# LockDigit

A premium digital identity wallet and payment app built with React Native (Expo). Manage your cards, bank accounts, documents, bills, and merchant payments — all secured with PIN and OTP verification.

## Tech Stack

- **Framework**: React Native with Expo (managed workflow)
- **Styling**: NativeWind v4 (Tailwind CSS for RN)
- **Backend/Database**: Convex (reactive database, server functions, file storage)
- **Authentication**: Firebase Phone Auth (OTP) + PIN-based local auth
- **Payments**: Stripe React Native SDK
- **AI Features**: OpenAI API (via Convex server actions)
- **Navigation**: Expo Router (file-based routing)
- **Security**: SHA-256 PIN hashing, device binding, Expo SecureStore

## Features

### Wallet & Payments
- **Card Management**: Add credit/debit cards with full card number entry, auto brand detection (Visa, Mastercard, Amex, Discover), issuing bank selection, and OTP-verified card linking
- **Bank Accounts**: Link bank accounts for direct debit payments
- **Saved Accounts**: View linked cards with real bank logos (BofA, Chase, US Bank, Wells Fargo, Citi, Capital One) and unlink anytime
- **Scan to Pay**: QR code-based merchant payments with Stripe integration
- **Credit Tracking**: Monitor credit card spending with visual progress indicators

### Identity Wallet
- **Document Storage**: Securely store official documents (driver's licenses, passports, vaccination certificates, insurance, national IDs)
- **AI-Powered OCR**: Automatic document field extraction via OpenAI
- **Expiry Alerts**: Smart notifications for documents nearing expiration

### Bill Management
- **Bill Tracking**: Track and pay bills, subscriptions, and financial obligations
- **Categories**: Organized by utility, insurance, subscriptions, and more
- **Recurring Bills**: Automatic tracking of recurring payment schedules

### Security
- **PIN Authentication**: 4-6 digit PIN with anti-pattern validation (no sequential/repeated digits)
- **OTP Verification**: Firebase Phone Auth for card linking and account recovery
- **Device Binding**: Ties account to a specific device for added security
- **Encrypted Storage**: Sensitive data stored via Expo SecureStore
- **Balance Protection**: PIN-gated balance viewing in the wallet

### Smart Features
- **AI Suggestions**: Bill analysis and smart payment suggestions
- **Smart Notifications**: Alerts for upcoming bills, document expiries, and government subsidies
- **Global Search**: Search across documents, bills, and transactions

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
    add-new-card.tsx    # Card linking flow (details -> OTP -> save)
    add-bank-account.tsx# Bank account linking
    my-wallet.tsx       # Wallet overview with saved accounts
    scan-to-pay.tsx     # QR code scanner for merchant payments
    payment-success.tsx # Payment confirmation screen
    document/[id].tsx   # Document detail view
    bill/[id].tsx       # Bill detail / payment
    search.tsx          # Global search
  pin-lock.tsx          # PIN entry screen
assets/
  images/banks/         # Bank logo assets (BofA, Chase, US Bank, etc.)
components/             # Reusable UI components
  glass/                # Glassmorphism components (GlassCard, GlassButton, GlassInput)
  common/               # Shared components (Header, SearchBar, etc.)
  documents/            # Document-specific components
  payments/             # Payment-specific components (BillCard, TransactionItem)
convex/                 # Convex backend
  schema.ts             # Database schema (users, bankAccounts, transactions, etc.)
  payments.ts           # Payment mutations/queries (Stripe, transactions, accounts)
  documents.ts          # Document CRUD operations
  bills.ts              # Bill management
  users.ts              # User queries and mutations
  notifications.ts      # Notification system
lib/                    # Utility functions
  card-utils.ts         # Card brand detection, formatting, bank logo mapping
  pin-manager.ts        # PIN hashing, validation, salt generation
  firebase.native.ts    # Firebase OTP (sendOTP, verifyOTP)
  stripe.ts             # Stripe payment utilities
  device-binding.ts     # Device binding logic
  secure-store.ts       # Encrypted local storage
hooks/                  # Custom React hooks (useAuth, useAppState)
constants/              # Theme colors, app config
```

## Roadmap

- [ ] Biometric authentication (Face ID / fingerprint)
- [ ] Transaction history with filters and export
- [ ] Multi-currency support
- [ ] Peer-to-peer payments
- [ ] Budget tracking and spending analytics
- [ ] Dark mode
- [ ] Push notifications via FCM
- [ ] Card freeze / temporary lock
