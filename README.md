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

4. Configure environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
   - `CLOUDINARY_*`: From your Cloudinary dashboard
   - `ADMIN_EMAIL` & `ADMIN_PASS`: Admin credentials

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
