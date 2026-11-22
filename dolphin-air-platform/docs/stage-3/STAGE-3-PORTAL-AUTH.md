# Stage 3 Portal Authentication

The portal contains a customer auth boundary and login route, but customer sign-in/session issuance and secure customer-profile association are not complete. The API retains a separate `csess_` bearer-session validator backed by Firestore; no verified flow creates those sessions. Firebase Auth customer authentication is **Not implemented**. Protected customer routes, restoration, expiry UI, and cross-customer isolation are **Not verified**. Do not treat a phone number alone as identity.
