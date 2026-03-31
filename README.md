# Kokostream LMS

## Architecture
- **Backend**: Node.js + Express + TypeScript + TypeORM + SQLite (Production-ready code, easily swappable to PostgreSQL)
- **Web**: Vanilla HTML/CSS/JS (Served by Express)
- **Mobile**: React Native + Expo + Expo Router

## Setup Instructions

### Backend & Web
1. `npm install`
2. `npm run dev` (Starts server on port 3000)

### Mobile App
1. Navigate to `kokostream/app`
2. `npm install`
3. Update `API_URL` in `services/api.js` to your local IP or the provided App URL.
4. `npx expo start`

## Environment Variables
- `GEMINI_API_KEY`: Injected by AI Studio
- `JWT_SECRET`: Secret for signing tokens (default: 'kokostream-secret')
