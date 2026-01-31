import { VercelRequest, VercelResponse } from '@vercel/node';
import { AIVariationsService } from '../../backend/src/services/ai-variations.service';
import { ScheduleStorageService } from '../../backend/src/services/schedule-storage.service';
import { PublicationSchedulerService } from '../../backend/src/services/publication-scheduler.service';
import { Client } from 'node-appwrite';
import { mlAuth } from '../../backend/src/auth/oauth';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cron Job para publicaciones automáticas
 * Se ejecuta cada hora automáticamente
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    console.log('\n🕐 [CRON] Auto-publish job started at', new Date().toISOString());

    // Validar secret (Vercel envía esto automáticamente)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    // En Vercel, los cron jobs vienen con header "authorization: Bearer <token>"
    // Si no coincide el secret, rechazar
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ [CRON] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Inicializar cliente de Appwrite
    const appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '697a48140027955e784e')
      .setKey(process.env.APPWRITE_API_KEY || '');

    const databaseId = process.env.APPWRITE_DATABASE_ID || '697a5575001e861c57a2';

    // Inicializar servicios
    const aiService = new AIVariationsService();
    const storageService = new ScheduleStorageService(appwriteClient, databaseId);
    const schedulerService = new PublicationSchedulerService(aiService, storageService);

    // Obtener token de MercadoLibre
    console.log('🔑 [CRON] Obteniendo token de ML...');
    const mlToken = await mlAuth.getToken();

    if (!mlToken) {
      throw new Error('No se pudo obtener token de MercadoLibre');
    }

    // Obtener programaciones listas para publicar
    console.log('📋 [CRON] Buscando programaciones listas...');
    const schedulesReadyToPublish = await storageService.getSchedulesReadyToPublish();

    console.log(`📦 [CRON] Encontradas ${schedulesReadyToPublish.length} programaciones para publicar`);

    if (schedulesReadyToPublish.length === 0) {
      console.log('✅ [CRON] No hay programaciones pendientes');
      return res.json({
        success: true,
        message: 'No scheduled publications to process',
        processed: 0,
        successful: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Procesar cada programación
    const result = await schedulerService.processScheduledPublications(
      schedulesReadyToPublish,
      mlToken
    );

    console.log(`✅ [CRON] Cron job completado: ${result.successful}/${result.processed} exitosas`);

    return res.json({
      success: true,
      message: 'Cron job completed successfully',
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [CRON] Error en cron job:', error.message);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
