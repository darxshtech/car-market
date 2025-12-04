# DriveSphere - India's Trusted Car Market

A full-stack car buying and selling platform built with Next.js 14, MongoDB, and NextAuth.

## Features

- Google OAuth 2.0 authentication with profile verification
- Car listing with ownership verification
- Admin approval workflow
- Web scraping for external listings
- AI-powered chatbot assistance
- Responsive dark theme with cyan/blue accents

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MongoDB with Mongoose
- **Authentication:** NextAuth with Google OAuth
- **Styling:** TailwindCSS with custom dark theme
- **Animations:** Framer Motion
- **Image Storage:** Cloudinary
- **Web Scraping:** Cheerio & Puppeteer
- **Validation:** Zod
- **Testing:** Vitest & fast-check (Property-Based Testing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Google OAuth credentials
- Cloudinary account

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

4. Configure environment variables (see detailed setup below)

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run tests:

```bash
npm test
```

### Build

Build for production:

```bash
npm run build
npm start
```

## Environment Variables Setup

### Required Variables

#### MongoDB Configuration
- **MONGODB_URI**: MongoDB connection string
  - Format: `mongodb+srv://username:password@cluster.mongodb.net/drivesphere?retryWrites=true&w=majority`
  - Get from: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  - Create a free cluster and get the connection string from "Connect" → "Connect your application"

#### NextAuth Configuration
- **NEXTAUTH_URL**: Your application URL
  - Development: `http://localhost:3000`
  - Production: Your deployed URL (e.g., `https://yourdomain.com`)
  
- **NEXTAUTH_SECRET**: Secret key for NextAuth
  - Generate with: `openssl rand -base64 32`
  - Keep this secret and never commit to version control

#### Google OAuth Credentials
- **GOOGLE_CLIENT_ID**: Google OAuth client ID
- **GOOGLE_CLIENT_SECRET**: Google OAuth client secret
- Setup steps:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project or select existing
  3. Enable "Google+ API"
  4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
  5. Set application type to "Web application"
  6. Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://yourdomain.com/api/auth/callback/google`
  7. Copy the Client ID and Client Secret

#### Admin Credentials
- **ADMIN_EMAIL**: Admin email for accessing /admin routes
  - Example: `admin@drivesphere.com`
  
- **ADMIN_PASS**: Admin password
  - Use a strong password (minimum 8 characters)
  - This is used for admin authentication

#### Encryption Key
- **ENCRYPTION_KEY**: Key for encrypting sensitive data (Aadhaar/PAN numbers)
  - Must be at least 32 characters long
  - Generate with: `openssl rand -base64 32`
  - Keep this secret and never change it after storing encrypted data

#### TailorTalk AI Chatbot (Optional)
- **NEXT_PUBLIC_TAILORTALK_WIDGET_ID**: TailorTalk widget ID
  - Get from: [TailorTalk Dashboard](https://tailortalk.ai/)
  - This is optional; the app works without it

### Environment Variable Validation

The application validates all required environment variables on startup. If any are missing, you'll see an error message listing the missing variables.

### Security Best Practices

1. Never commit `.env.local` to version control
2. Use different credentials for development and production
3. Rotate secrets regularly
4. Use environment-specific MongoDB databases
5. Keep the `ENCRYPTION_KEY` secure - losing it means losing access to encrypted data

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── buy-car/           # Car browsing page
│   ├── sell-car/          # Car listing page
│   ├── my-garage/         # Seller dashboard
│   └── listings/          # Car detail pages
├── components/            # React components
├── lib/                   # Utility functions
│   ├── mongodb.ts        # Database connection
│   ├── validation.ts     # Zod schemas
│   └── scraper.ts        # Web scraping logic
└── middleware.ts         # Route protection

```

## License

MIT
