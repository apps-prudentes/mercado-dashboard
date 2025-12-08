
import 'dotenv/config'; // Load env vars
import { MercadoLibreAuth } from './src/auth/oauth';

// Mock env vars if missing (since we are running this script in isolation)
if (!process.env.APP_ID) process.env.APP_ID = 'test_app_id';
if (!process.env.REDIRECT_URI) process.env.REDIRECT_URI = 'http://localhost:3000/callback';

const auth = new MercadoLibreAuth();
console.log('--- GENERATED URL ---');
console.log(auth.getAuthorizationUrl());
console.log('---------------------');
