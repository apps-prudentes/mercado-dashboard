import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client as QStashClient } from '@upstash/qstash';
import { ScheduleStorageService } from '../../backend/src/services/schedule-storage.service';
import { Client as AppwriteClient } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Cron Job para publicaciones automáticas
 * Trigger: Se ejecuta cada hora
 * Rol: Fan-out. Busca qué hay que publicar y lo encola en QStash.
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    console.log('\n🕐 [CRON] Auto-publish trigger started at', new Date().toISOString());

    // 1. Validar secret (Vercel envía esto automáticamente)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env['CRON_SECRET'];
    const isForced = req.query['force'] === 'true';

    if (!isForced && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ [CRON] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Inicializar clientes
    const appwriteClient = new AppwriteClient()
      .setEndpoint(process.env['APPWRITE_ENDPOINT'] || 'https://nyc.cloud.appwrite.io/v1')
      .setProject(process.env['APPWRITE_PROJECT_ID'] || '697a48140027955e784e')
      .setKey(process.env['APPWRITE_API_KEY'] || '');

    const databaseId = process.env['APPWRITE_DATABASE_ID'] || '697a5575001e861c57a2';
    const storageService = new ScheduleStorageService(appwriteClient as any, databaseId);

    const qstashClient = new QStashClient({
      token: process.env['QSTASH_TOKEN'] || '',
    });

    // 3. Obtener programaciones listas para publicar
    console.log('📋 [CRON] Buscando programaciones listas...');
    const schedulesReadyToPublish = await storageService.getSchedulesReadyToPublish();

    console.log(`📦 [CRON] Encontradas ${schedulesReadyToPublish.length} programaciones para encolar`);

    if (schedulesReadyToPublish.length === 0) {
      console.log('✅ [CRON] No hay programaciones pendientes');
      return res.json({
        success: true,
        message: 'No scheduled publications to process',
        enqueued: 0,
      });
    }

    // 4. Encolar cada una en QStash (Fan-out)
    // El host debe ser dinámico basándose en la URL actual o una variable de entorno
    // Usaremos la URL de producción o el host del request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const jobUrl = `${protocol}://${host}/api/jobs/publish-item`;

    console.log(`🔗 [CRON] Apuntando jobs a: ${jobUrl}`);

    const publishPromises = schedulesReadyToPublish.map((schedule) => {
      console.log(`📤 [CRON] Encolando schedule: ${schedule.$id}`);
      return qstashClient.publishJSON({
        url: jobUrl,
        body: {
          scheduleId: schedule.$id,
        },
        // Puedes agregar retries específicos aquí si quieres
        retries: 3,
      });
    });

    await Promise.all(publishPromises);

    console.log(`✅ [CRON] Todas las publicaciones encoladas exitosamente`);

    return res.json({
      success: true,
      message: 'Jobs enqueued successfully',
      enqueued: schedulesReadyToPublish.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [CRON] Error en disparador de cron:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
