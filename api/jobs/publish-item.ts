import { VercelRequest, VercelResponse } from '@vercel/node';
import { Receiver } from '@upstash/qstash';
import { AIVariationsService } from '../../backend/src/services/ai-variations.service';
import { ScheduleStorageService } from '../../backend/src/services/schedule-storage.service';
import { PublicationSchedulerService } from '../../backend/src/services/publication-scheduler.service';
import { Client } from 'node-appwrite';
import { mlAuth } from '../../backend/src/auth/oauth';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Job Handler para procesar una sola publicación
 * Invocado por Upstash QStash de forma independiente
 */
export default async (req: VercelRequest, res: VercelResponse) => {
    // 1. Verificar firma de QStash para seguridad
    const signature = req.headers['upstash-signature'] as string;
    const currentSigningKey = process.env['QSTASH_CURRENT_SIGNING_KEY'];
    const nextSigningKey = process.env['QSTASH_NEXT_SIGNING_KEY'];

    if (!signature || !currentSigningKey || !nextSigningKey) {
        console.error('❌ [JOB] Missing signature or keys');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
    });

    try {
        const isValid = await receiver.verify({
            signature,
            body: JSON.stringify(req.body),
        });

        if (!isValid) {
            console.warn('⚠️ [JOB] Invalid QStash signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        console.log('✅ [JOB] QStash signature verified');
    } catch (err: any) {
        console.error('❌ [JOB] Verification error:', err.message);
        return res.status(500).json({ error: 'Internal verification error' });
    }

    // 2. Procesar la publicación
    try {
        const { scheduleId } = req.body;

        if (!scheduleId) {
            return res.status(400).json({ error: 'Missing scheduleId' });
        }

        console.log(`\n🚀 [JOB] Processing publication for schedule: ${scheduleId}`);

        // Inicializar cliente de Appwrite
        const appwriteClient = new Client()
            .setEndpoint(process.env['APPWRITE_ENDPOINT'] || 'https://nyc.cloud.appwrite.io/v1')
            .setProject(process.env['APPWRITE_PROJECT_ID'] || '697a48140027955e784e')
            .setKey(process.env['APPWRITE_API_KEY'] || '');

        const databaseId = process.env['APPWRITE_DATABASE_ID'] || '697a5575001e861c57a2';

        // Inicializar servicios
        const aiService = new AIVariationsService();
        const storageService = new ScheduleStorageService(appwriteClient as any, databaseId);
        const schedulerService = new PublicationSchedulerService(aiService, storageService);

        // Obtener token de MercadoLibre
        const mlToken = await mlAuth.getToken();
        if (!mlToken) {
            throw new Error('No se pudo obtener token de MercadoLibre');
        }

        // Obtener el schedule específico
        const schedule = await storageService.getSchedule(scheduleId);

        if (!schedule.isActive) {
            console.log(`⏭️ [JOB] Schedule ${scheduleId} is inactive, skipping.`);
            return res.json({ success: true, message: 'Schedule inactive' });
        }

        // Publicar
        const result = await schedulerService.publishScheduledItem(schedule, mlToken);

        if (result.success) {
            console.log(`✅ [JOB] Successfully published item for schedule: ${scheduleId}`);
            return res.json({ success: true, newListingId: result.newListingId });
        } else {
            console.error(`❌ [JOB] Failed to publish item: ${result.error}`);
            return res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('❌ [JOB] Fatal error in job handler:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
};
