# SmartPresence Frontend

React 19 + Vite 8 + Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react + motion.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

The dev server proxies `/api` to the Django backend at `http://127.0.0.1:8000`, so the backend's HttpOnly auth cookies work on the same origin.

## Structure

- `src/pages` - route pages (lazy loaded): landing, login, signed-in placeholder, 404
- `src/components/landing` - landing page sections (below-the-fold sections are lazy loaded)
- `src/components/layout` - navbar, footer, root layout
- `src/lib/api.ts` - fetch client for the API envelope, with automatic token refresh
- `src/context/auth.tsx` - session state from `GET /auth/profile/`
