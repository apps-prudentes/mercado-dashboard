import { VercelRequest, VercelResponse } from '@vercel/node';
import { mlAuth } from '../../backend/src/auth/oauth';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Cron Job para refrescar tokens de MercadoLibre
 * Trigger: Se ejecuta cada hora
 */
export default async (req: VercelRequest, res: VercelResponse) => {
    try {
        console.log('\n🔄 [CRON] Token refresh job started at', new Date().toISOString());

        // 1. Validar secret
        const authHeader = req.headers.authorization;
        const cronSecret = process.env['CRON_SECRET'];

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn('⚠️ [CRON] Unauthorized access attempt');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 2. Refrescar token si es necesario
        // mlAuth.getToken() maneja internamente el refresh si está expirado
        console.log('🔑 [CRON] Verificando y refrescando token si es necesario...');

        try {
            const token = await mlAuth.getToken();
            console.log('✅ [CRON] Token obtenido/refrescado exitosamente (length:', token.length, ')');
        } catch (err: any) {
            console.warn('⚠️ [CRON] No se pudo obtener token:', err.message);
            return res.status(200).json({ // No retornar 500 para evitar alarmas si solo es falta de login
                success: false,
                message: 'Auth required',
                error: err.message
            });
        }

        return res.json({
            success: true,
            message: 'Token check/refresh completed',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('❌ [CRON] Error en el refresh de tokens:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
};
