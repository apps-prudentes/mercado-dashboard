import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { TokenData } from '../types';

const TOKEN_FILE = path.join(__dirname, '../../tokens.json');
const TOKEN_KV_KEY = 'meli_oauth_token';

// Lazy load Vercel KV to avoid import errors in non-Vercel environments
let kv: any = null;
const getKV = async () => {
    console.log('[DEBUG] getKV called. Existing kv:', !!kv);
    if (!kv && process.env['KV_REST_API_URL'] && process.env['KV_REST_API_TOKEN']) {
        console.log('[DEBUG] Attempting to import @vercel/kv...');
        try {
            const { kv: kvClient } = await import('@vercel/kv');
            kv = kvClient;
            console.log('[DEBUG] @vercel/kv imported successfully');
        } catch (error) {
            console.log('⚠️  Vercel KV not available, using file storage', error);
        }
    }
    return kv;
};

export class MercadoLibreAuth {
    private appId: string;
    private appSecret: string;
    private redirectUri: string;
    private tokenData: TokenData | null = null;

    constructor() {
        this.appId = process.env['APP_ID'] || '';
        this.appSecret = process.env['APP_SECRET'] || '';
        this.redirectUri = process.env['REDIRECT_URI'] || 'http://localhost:3000/callback';
        this.loadTokens();
    }

    /**
     * Generate authorization URL for OAuth 2.0 flow
     * Includes 'offline_access' and 'write' scopes for creating/editing products
     */
    getAuthorizationUrl(): string {
        return `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${this.appId}&redirect_uri=${this.redirectUri}&scope=offline_access write`;
    }

    /**
     * Exchange authorization code for access token
     */
    async getAccessToken(code: string): Promise<TokenData> {
        try {
            const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
                grant_type: 'authorization_code',
                client_id: this.appId,
                client_secret: this.appSecret,
                code: code,
                redirect_uri: this.redirectUri,
            });

            this.tokenData = {
                ...response.data,
                created_at: Date.now(),
            };

            this.saveTokens();
            console.log('✅ Access token obtained successfully');
            return this.tokenData;
        } catch (error: any) {
            console.error('Error getting access token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Refresh the access token using refresh token
     */
    async refreshAccessToken(): Promise<TokenData> {
        if (!this.tokenData?.refresh_token) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
                grant_type: 'refresh_token',
                client_id: this.appId,
                client_secret: this.appSecret,
                refresh_token: this.tokenData.refresh_token,
            });

            this.tokenData = {
                ...response.data,
                created_at: Date.now(),
            };

            this.saveTokens();
            console.log('✅ Access token refreshed successfully');
            return this.tokenData;
        } catch (error: any) {
            console.error('Error refreshing token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Check if token is expired or about to expire (within 5 minutes)
     */
    isTokenExpired(): boolean {
        if (!this.tokenData) return true;

        const expirationTime = this.tokenData.created_at + (this.tokenData.expires_in * 1000);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        return now >= (expirationTime - fiveMinutes);
    }

    /**
     * Get current access token, refreshing if necessary
     */
    async getToken(): Promise<string> {
        // Ensure tokens are loaded
        if (!this.tokenData) {
            await this.loadTokensAsync();
        }

        if (!this.tokenData) {
            throw new Error('No token available. Please authorize the app first.');
        }

        if (this.isTokenExpired()) {
            console.log('🔄 Token expired, refreshing...');
            await this.refreshAccessToken();
        }

        return this.tokenData.access_token;
    }

    /**
     * Check if we have a valid token
     */
    hasValidToken(): boolean {
        return this.tokenData !== null && !this.isTokenExpired();
    }

    /**
     * Check if running in Vercel serverless environment
     */
    private isServerless(): boolean {
        return !!process.env['VERCEL'] || !!process.env['AWS_LAMBDA_FUNCTION_NAME'];
    }

    /**
     * Load tokens from Vercel KV (serverless) or file (local)
     */
    private async loadTokensAsync(): Promise<void> {
        console.log('[DEBUG] Starting loadTokensAsync...');
        // Try Vercel KV first
        const kvClient = await getKV();
        if (kvClient) {
            console.log('[DEBUG] KV Client obtained, attempting to get token...');
            try {
                const data = await kvClient.get(TOKEN_KV_KEY);
                console.log('[DEBUG] KV Get Result:', data ? 'Data found' : 'No data found');
                if (data) {
                    this.tokenData = data as TokenData;
                    console.log('✅ Tokens loaded from Vercel KV');
                    return;
                }
            } catch (error) {
                console.log('⚠️  Error loading tokens from Vercel KV:', error);
            }
        } else {
            console.log('[DEBUG] No KV Client available. Env vars:', {
                url: !!process.env['KV_REST_API_URL'],
                token: !!process.env['KV_REST_API_TOKEN']
            });
        }

        // Fallback to file storage for local development
        if (!this.isServerless()) {
            try {
                if (fs.existsSync(TOKEN_FILE)) {
                    const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
                    this.tokenData = JSON.parse(data);
                    console.log('✅ Tokens loaded from file');
                }
            } catch (error) {
                console.log('⚠️  No existing tokens found or error loading tokens');
            }
        }
    }

    /**
     * Synchronous wrapper for backwards compatibility
     */
    private loadTokens(): void {
        // This will be called in constructor, but tokens will be loaded lazily
        // when getToken() is called
        this.loadTokensAsync().catch(err => {
            console.log('⚠️  Error in async token loading:', err);
        });
    }

    /**
     * Save tokens to Vercel KV (serverless) or file (local)
     */
    private async saveTokens(): Promise<void> {
        // Try Vercel KV first
        const kvClient = await getKV();
        if (kvClient) {
            try {
                await kvClient.set(TOKEN_KV_KEY, this.tokenData);
                console.log('✅ Tokens saved to Vercel KV');
                return;
            } catch (error) {
                console.error('Error saving tokens to Vercel KV:', error);
            }
        }

        // Fallback to file storage for local development
        if (!this.isServerless()) {
            try {
                fs.writeFileSync(TOKEN_FILE, JSON.stringify(this.tokenData, null, 2));
                console.log('✅ Tokens saved to file');
            } catch (error) {
                console.error('Error saving tokens:', error);
            }
        }
    }
}

export const mlAuth = new MercadoLibreAuth();