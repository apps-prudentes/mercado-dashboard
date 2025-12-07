# Deploying to Vercel

Complete guide to deploy the MercadoLibre Dashboard to Vercel.

## 🚀 Quick Start

### 1. Install Vercel CLI (if not already installed)

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

```bash
cd c:\Users\omari\Desktop\code\MercadoLibre-Dashboard
vercel
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Select your Vercel account
- **Link to existing project**: No
- **Project name**: `mercadolibre-dashboard` (or your choice)
- **Directory**: `./` (current directory)
- **Override settings**: No

### 3. Configure Environment Variables

After deploy, go to your Vercel dashboard:
1. Go to your project settings
2. Click on "Environment Variables"
3. Add these variables:

```
APP_ID=664789754446720
APP_SECRET=hsOXl8f4XWvzts2YDdrSYs5Lux5jm9HK
REDIRECT_URI=https://your-project-name.vercel.app/api/callback
PORT=3000
```

⚠️ **Important**: Replace `your-project-name` with the actual Vercel URL

### 4. Update MercadoLibre Redirect URI

1. Go to https://developers.mercadolibre.com.mx/apps/664789754446720
2. Update **Redirect URI** to: `https://your-project-name.vercel.app/api/callback`
3. Save changes

### 5. Redeploy

```bash
vercel --prod
```

---

## 📋 What Gets Deployed

\`\`\`
Frontend: https://your-project-name.vercel.app/
Backend API: https://your-project-name.vercel.app/api/*
OAuth Callback: https://your-project-name.vercel.app/api/callback
\`\`\`

---

## 🧪 Testing After Deployment

1. **Visit your app**: `https://your-project-name.vercel.app`
2. **Authorize OAuth**: `https://your-project-name.vercel.app/api/auth`
3. **Check health**: `https://your-project-name.vercel.app/api`

---

## 🔧 Vercel Configuration

### Files Created

- `vercel.json` - Main Vercel configuration
- `.vercelignore` - Files to ignore during deployment
- `api/index.ts` - Serverless backend entry point
- `src/environments/environment.ts` - Dev environment
- `src/environments/environment.prod.ts` - Production environment

### How It Works

1. **Frontend** (Angular):
   - Builds with `npm run build`
   - Output: `dist/ml-dash/browser/`
   - Serves all routes except `/api/*`

2. **Backend** (Express):
   - Runs as Vercel serverless function
   - Entry: `api/index.ts`
   - Handles all `/api/*` routes

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
# Make sure backend dependencies are in root package.json
npm install express cors dotenv axios node-cron --save
```

### OAuth still pointing to localhost
```bash
# Check environment variables in Vercel dashboard
# Redeploy after changing env vars
vercel --prod
```

### CORS errors
- CORS is set to allow all origins (`*`) in production
- Check browser console for specific error details

---

## 📦 Project Structure

\`\`\`
MercadoLibre-Dashboard/
├── api/
│   └── index.ts                  # Vercel serverless entry
├── backend/                      # Backend code
│   ├── src/
│   │   ├── auth/oauth.ts
│   │   ├── routes/
│   │   └── types/
│   └── ...
├── src/                          # Angular frontend
│   ├── environments/
│   │   ├── environment.ts        # Dev config
│   │   └── environment.prod.ts   # Prod config
│   └── ...
├── vercel.json                   # Vercel config
└── .vercelignore                 # Ignore rules
\`\`\`

---

## 🎯 Next Steps After Deployment

1. ✅ Visit `/api/auth` to authorize with MercadoLibre
2. ✅ Dashboard should load your orders automatically
3. ✅ Test date filtering and charts
4. 🔄 Tokens auto-refresh every 6 hours (no manual intervention needed)

---

## 💡 Development vs Production

| Feature | Development | Production |
|---------|-------------|-------------|
| Frontend | `http://localhost:4200` | `https://your-app.vercel.app` |
| Backend | `http://localhost:3000/api` | `https://your-app.vercel.app/api` |
| API URL | `http://localhost:3000/api` | `/api` (relative) |
| CORS | `localhost:4200` | `*` (all origins) |
