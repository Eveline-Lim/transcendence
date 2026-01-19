User Story: Authentication & Security
As a user (and potential player),
I want to create an account, securely log in using standard credentials or OAuth, and enable 2FA,
So that my account data and stats are protected.

1. Description
- The system supports local (User/Pass) and OAuth (42, Google) login.
- Users can enable Two-Factor Authentication (2FA) via Google Authenticator.
- Session management is handled via JWT.

2. Acceptance Criteria
    - [ ] **Registration**:
        - User can register with Email, Username, Password.
        - Passwords must be hashed (bcrypt/Argon2).
        - Unique email/username validation.
    - [ ] **Login**:
        - Login with Username/Password returns a JWT.
        - Login with 42/Google redirects correctly and returns a JWT.
    - [ ] **Two-Factor Authentication (2FA)**:
        - User can enable 2FA in settings (QR Code generation).
        - On login, if 2FA is enabled, user is prompted for the OTP.
        - Valid OTP grants the final JWT.
    - [ ] **Logout**:
        - Client discards the token.
    - [ ] **Security**:
        - Passwords are never stored in plain text.
        - JWT has an expiration time (e.g., 2 hours).

3. Technical Implementation
    - **Auth Service**:
        - `POST /auth/register`
        - `POST /auth/login`
        - `POST /auth/2fa/generate`
        - `POST /auth/2fa/verify`
        - Strategies: Local, 42-Intranet, Google (Passport.js or similar).
    - **Database**:
        - Users table: store `password_hash`, `2fa_secret` (encrypted), `is_2fa_enabled`.

4. Edge Cases
    - User loses 2FA device (Recovery codes?).
    - Email already taken by an OAuth user vs Local user (Account linking?).
