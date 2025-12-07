# Vercel Deployment - Quick Reference

## 🚀 Deploy Command

```bash
vercel --prod
```

## 📝 Before Deploying

1. **Push to Git** (optional but recommended):
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push
```

2. **Install Vercel** CLI (if not installed):
```bash
npm i -g vercel
```

## ⚙️ Environment Variables to Add in Vercel Dashboard

After first deploy, go to Vercel project settings → Environment Variables:

```
APP_ID=664789754446720
APP_SECRET=hsOXl8f4XWvzts2YDdrSYs5Lux5jm9HK
REDIRECT_URI=https://YOUR_VERCEL_URL.vercel.app/api/callback
PORT=3000
```

**Replace `YOUR_VERCEL_URL`** with your actual Vercel deployment URL.

## 🔐 Update MercadoLibre App

Go to: https://developers.mercadolibre.com.mx/apps/664789754446720

Update **Redirect URI** to:
```
https://YOUR_VERCEL_URL.vercel.app/api/callback
```

## ✅ Test After Deployment

1. Visit: `https://YOUR_VERCEL_URL.vercel.app`
2. Authorize: `https://YOUR_VERCEL_URL.vercel.app/api/auth`
3. Dashboard should load with your MercadoLibre data

## 🎯 Deployment Structure

- **Frontend**: `/` → Angular app
- **Backend API**: `/api/*` → Express serverless functions
- **Health check**: `/api` → API status
- **OAuth auth**: `/api/auth` → Start authorization
- **OAuth callback**: `/api/callback` → After ML authorization

---

For detailed instructions, see [DEPLOYMENT.md](file:///c:/Users/omari/Desktop/code/MercadoLibre-Dashboard/DEPLOYMENT.md)
