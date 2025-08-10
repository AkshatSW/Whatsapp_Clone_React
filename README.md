
# WhatsApp Clone (Backend + Frontend)

This repo contains a demo WhatsApp Web-like interface backed by an Express + MongoDB backend.
- Backend: `backend/`
- Frontend: `frontend/`

## Quick local run

1. Backend:
```
cd backend
npm install
# put your .env here (already included in the zip)
node process_payloads.js   # load sample payloads into MongoDB
npm start
```

2. Frontend:
```
cd frontend
npm install
npm run dev
```

## Deployment
- Backend is ready for Render/Heroku (uses PORT and MONGO_URI env vars)
- Frontend is Vite/React; deploy to Vercel or Render static site. Set `VITE_API_URL` env var to the backend URL.
