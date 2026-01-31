import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { mlAuth } from '../backend/src/auth/oauth';
import ordersRouter from '../backend/src/routes/orders';
import shipmentsRouter from '../backend/src/routes/shipments';
import itemsRouter from '../backend/src/routes/items';
import imagesRouter from '../backend/src/routes/images';
import categoriesRouter from '../backend/src/routes/categories';
import schedulesRouter from '../backend/src/routes/schedules';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in production
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    status: 'running',
    message: 'MercadoLibre Dashboard API',
    hasToken: mlAuth.hasValidToken(),
  });
});

// Debug endpoint to get current token
app.get('/api/debug/token', async (req: Request, res: Response) => {
  try {
    await (mlAuth as any).loadTokensAsync?.() || Promise.resolve();
    const tokenData = (mlAuth as any).tokenData;

    if (!tokenData) {
      return res.json({
        hasToken: false,
        message: 'No token found. Please authorize at /api/auth'
      });
    }

    const scopesArray = tokenData.scope?.split(' ') || [];

    res.json({
      hasToken: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      tokenLength: tokenData.access_token?.length || 0,
      scopes: tokenData.scope || 'No scopes found',
      scopesArray: scopesArray,
      hasOfflineAccess: scopesArray.includes('offline_access'),
      hasReadScope: scopesArray.includes('read'),
      hasWriteScope: scopesArray.includes('write'),
      tokenCreatedAt: tokenData.created_at ? new Date(tokenData.created_at).toISOString() : 'unknown',
      isExpired: mlAuth.isTokenExpired(),
      expiresIn: tokenData.expires_in
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get token info',
      message: error.message
    });
  }
});

// Check user/seller status
app.get('/api/user/status', async (req: Request, res: Response) => {
  try {
    const token = await mlAuth.getToken();

    // Get user info
    const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const userId = userResponse.data.id;

    // Get listing limits
    const limitsResponse = await axios.get(`https://api.mercadolibre.com/users/${userId}/listings_limit`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json({
      user: {
        id: userResponse.data.id,
        nickname: userResponse.data.nickname,
        email: userResponse.data.email,
        sellerReputation: userResponse.data.seller_reputation,
        status: userResponse.data.status,
      },
      listingLimits: limitsResponse.data,
      canPublish: userResponse.data.status?.site_status === 'active'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get user status',
      details: error.response?.data || error.message
    });
  }
});

// OAuth authorization endpoint
app.get('/api/auth', (req: Request, res: Response) => {
  const authUrl = mlAuth.getAuthorizationUrl();
  res.redirect(authUrl);
});

// OAuth callback endpoint
app.get('/api/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).send('Authorization code not found');
    return;
  }

  try {
    await mlAuth.getAccessToken(code);
    res.send(`
      <html>
        <body>
          <h1>¡Autorización exitosa!</h1>
          <a href="/">Ir al Dashboard</a>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error en la autorización');
  }
});

// Inject token endpoint
app.post('/api/auth/inject-token', async (req: Request, res: Response) => {
  try {
    const { access_token, refresh_token, expires_in, scope } = req.body;
    await mlAuth.injectToken(access_token, refresh_token, expires_in, scope);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api', schedulesRouter);

// NEW: Job handler for local testing
import publishItemJob from './jobs/publish-item';
app.post('/api/jobs/publish-item', async (req: Request, res: Response) => {
  await publishItemJob(req as any, res as any);
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server for local development only (not in Vercel) 
if (!process.env['VERCEL']) {
  const PORT = process.env['PORT'] || 3000;
  app.listen(PORT, () => {
    console.log('\n🚀 MercadoLibre Dashboard Backend (Local)');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🔐 CORS enabled for all origins\n`);
  });
}

// Export for Vercel serverless
export default app;
