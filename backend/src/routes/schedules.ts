import { Router, Request, Response } from 'express';
import axios from 'axios';
import { Client } from 'node-appwrite';
import { AIVariationsService } from '../services/ai-variations.service';
import { ScheduleStorageService } from '../services/schedule-storage.service';
import { PublicationSchedulerService } from '../services/publication-scheduler.service';
import { CreateScheduleRequest, UpdateScheduleRequest } from '../types/schedule.types';

const router = Router();

/**
 * Inicializar servicios
 */
function initializeServices() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '697a48140027955e784e')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const databaseId = process.env.APPWRITE_DATABASE_ID || '697a5575001e861c57a2';
  const aiService = new AIVariationsService();
  const storageService = new ScheduleStorageService(client, databaseId);
  const schedulerService = new PublicationSchedulerService(aiService, storageService);

  return { aiService, storageService, schedulerService, client };
}

/**
 * POST /api/schedules
 * Crear nueva programación
 */
router.post('/schedules', async (req: Request, res: Response) => {
  try {
    const { itemId, frequency, variateDescription, maxPublications, itemTitle } = req.body as CreateScheduleRequest & { itemTitle?: string };
    const userId = req.user?.id || 'test-user'; // Obtener del token JWT

    // Validaciones
    if (!itemId) {
      return res.status(400).json({ error: 'itemId es requerido' });
    }

    if (!frequency || !frequency.interval || !frequency.unit) {
      return res.status(400).json({ error: 'frequency es requerido (interval, unit)' });
    }

    if (!['hours', 'days'].includes(frequency.unit)) {
      return res.status(400).json({ error: 'frequency.unit debe ser "hours" o "days"' });
    }

    if (frequency.interval < 1) {
      return res.status(400).json({ error: 'frequency.interval debe ser >= 1' });
    }

    // Usar el título del frontend si viene, sino intentar obtenerlo de MercadoLibre
    let originalTitle = itemTitle || 'Sin título';
    let originalDescription = '';

    // Solo obtener de MercadoLibre si no viene el título del frontend
    if (!itemTitle) {
      console.log(`🔍 Intentando obtener producto: ${itemId}`);
      try {
        console.log(`🌐 Llamando: https://api.mercadolibre.com/items/${itemId}`);
        const mlResponse = await axios.get(`https://api.mercadolibre.com/items/${itemId}`);
        originalTitle = mlResponse.data.title || 'Sin título';
        originalDescription = mlResponse.data.description || '';
        console.log(`✅ Obtenido título del producto: ${originalTitle}`);
      } catch (error: any) {
        console.error(`⚠️ Error obteniendo producto de ML:`, error.message);
        console.error(`Response status:`, error.response?.status);
        console.error(`Response data:`, error.response?.data);
        // Continuar sin el título si hay error
      }
    } else {
      console.log(`✅ Usando título del frontend: ${originalTitle}`);
    }

    const { storageService } = initializeServices();

    // Crear programación
    const schedule = await storageService.createSchedule(userId, {
      itemId,
      frequency,
      variateDescription: variateDescription ?? false,
      maxPublications: maxPublications ?? null,
      originalTitle,
      originalDescription,
    });

    res.status(201).json({
      id: schedule.$id,
      itemId: schedule.itemId,
      originalTitle: schedule.originalTitle,
      frequency: {
        interval: schedule.frequencyInterval,
        unit: schedule.frequencyUnit,
      },
      variateDescription: schedule.variateDescription,
      isActive: schedule.isActive,
      nextPublishAt: schedule.nextPublishAt,
      publicationCount: 0,
      createdAt: schedule.createdAt,
    });
  } catch (error: any) {
    console.error('❌ Error en POST /schedules:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedules
 * Listar todas las programaciones del usuario
 */
router.get('/schedules', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'test-user';
    const isActive = req.query.status === 'active' ? true : req.query.status === 'inactive' ? false : undefined;

    const { storageService } = initializeServices();

    const schedules = await storageService.getSchedules(userId, isActive);

    const response = schedules.map((s) => ({
      id: s.$id,
      itemId: s.itemId,
      originalTitle: s.originalTitle,
      frequency: {
        interval: s.frequencyInterval,
        unit: s.frequencyUnit,
      },
      variateDescription: s.variateDescription,
      isActive: s.isActive,
      lastPublishedAt: s.lastPublishedAt,
      nextPublishAt: s.nextPublishAt,
      publicationCount: s.variationHistory?.length || 0,
    }));

    res.json(response);
  } catch (error: any) {
    console.error('❌ Error en GET /schedules:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedules/:id
 * Obtener una programación específica
 */
router.get('/schedules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { storageService } = initializeServices();

    const schedule = await storageService.getSchedule(id);

    res.json({
      id: schedule.$id,
      itemId: schedule.itemId,
      originalTitle: schedule.originalTitle,
      frequency: {
        interval: schedule.frequencyInterval,
        unit: schedule.frequencyUnit,
      },
      variateDescription: schedule.variateDescription,
      isActive: schedule.isActive,
      nextPublishAt: schedule.nextPublishAt,
      lastPublishedAt: schedule.lastPublishedAt,
      publicationCount: schedule.variationHistory?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Error en GET /schedules/:id:', error.message);
    res.status(404).json({ error: 'Programación no encontrada' });
  }
});

/**
 * PUT /api/schedules/:id
 * Actualizar programación
 */
router.put('/schedules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateScheduleRequest;

    // Validaciones
    if (updateData.frequency) {
      if (!['hours', 'days'].includes(updateData.frequency.unit)) {
        return res.status(400).json({ error: 'frequency.unit inválido' });
      }
      if (updateData.frequency.interval < 1) {
        return res.status(400).json({ error: 'frequency.interval debe ser >= 1' });
      }
    }

    const { storageService } = initializeServices();

    const schedule = await storageService.updateSchedule(id, updateData);

    res.json({
      id: schedule.$id,
      itemId: schedule.itemId,
      originalTitle: schedule.originalTitle,
      frequency: {
        interval: schedule.frequencyInterval,
        unit: schedule.frequencyUnit,
      },
      variateDescription: schedule.variateDescription,
      isActive: schedule.isActive,
      nextPublishAt: schedule.nextPublishAt,
      publicationCount: schedule.variationHistory?.length || 0,
      updatedAt: schedule.updatedAt,
    });
  } catch (error: any) {
    console.error('❌ Error en PUT /schedules/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/schedules/:id
 * Eliminar programación
 */
router.delete('/schedules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { storageService } = initializeServices();

    await storageService.deleteSchedule(id);

    res.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('❌ Error en DELETE /schedules/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedules/:id/history
 * Ver historial de publicaciones
 */
router.get('/schedules/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const { storageService } = initializeServices();

    // Obtener schedule
    const schedule = await storageService.getSchedule(id);

    // Obtener historial
    const history = await storageService.getScheduleHistory(id, limit, offset);

    res.json({
      schedule: {
        id: schedule.$id,
        itemId: schedule.itemId,
        originalTitle: schedule.originalTitle,
        frequency: {
          interval: schedule.frequencyInterval,
          unit: schedule.frequencyUnit,
        },
        nextPublishAt: schedule.nextPublishAt,
      },
      history: history.map((h) => ({
        id: h.$id,
        publishedTitle: h.publishedTitle,
        status: h.status,
        publishedAt: h.publishedAt,
        newListingId: h.newListingId,
        errorMessage: h.errorMessage,
      })),
    });
  } catch (error: any) {
    console.error('❌ Error en GET /schedules/:id/history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schedules/:id/publish-now
 * Publicar ahora (manual trigger, no esperar a cron)
 */
router.post('/schedules/:id/publish-now', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mlAuthToken = req.headers.authorization?.replace('Bearer ', '') || '';

    if (!mlAuthToken) {
      return res.status(401).json({ error: 'Token de ML no proporcionado' });
    }

    const client = req.appwriteClient as Client;
    const databaseId = process.env.APPWRITE_DATABASE_ID || '';
    const { storageService, schedulerService } = initializeServices(client, databaseId);

    // Obtener schedule
    const schedule = await storageService.getSchedule(id);

    // Publicar
    const result = await schedulerService.publishScheduledItem(schedule, mlAuthToken);

    if (result.success) {
      res.json({
        success: true,
        newListingId: result.newListingId,
        message: `Publicado correctamente: ML-${result.newListingId}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('❌ Error en POST /schedules/:id/publish-now:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
