import axios from 'axios';
import { MLItem, ScheduledPublication, PublicationResult } from '../types/schedule.types';
import { AIVariationsService } from './ai-variations.service';
import { ScheduleStorageService } from './schedule-storage.service';

/**
 * Servicio principal que orquesta:
 * 1. Obtener item de ML
 * 2. Generar variaciones con IA
 * 3. Duplicar publicación
 * 4. Registrar en historial
 */
export class PublicationSchedulerService {
  private aiService: AIVariationsService;
  private storageService: ScheduleStorageService;
  private mlApiUrl = 'https://api.mercadolibre.com';

  constructor(aiService: AIVariationsService, storageService: ScheduleStorageService) {
    this.aiService = aiService;
    this.storageService = storageService;
  }

  /**
   * Publicar producto automáticamente
   */
  async publishScheduledItem(
    schedule: ScheduledPublication,
    mlAuthToken: string
  ): Promise<PublicationResult> {
    try {
      console.log(`\n📢 Publicando: ${schedule.itemId}`);

      // 1. Obtener datos del item original
      console.log('1️⃣ Obteniendo datos del item...');
      const originalItem = await this.getMLItem(schedule.itemId, mlAuthToken);

      // 2. Generar variaciones
      console.log('2️⃣ Generando variaciones con IA...');
      const variation = await this.aiService.generateVariations(
        {
          title: schedule.originalTitle,
          description: schedule.originalDescription,
        },
        schedule.variateDescription,
        originalItem.category_id
      );

      // 3. Duplicar y publicar con nuevo título
      console.log('3️⃣ Duplicando publicación...');
      const newListingId = await this.duplicateAndPublish(
        originalItem,
        variation,
        mlAuthToken
      );

      // 4. Registrar en historial
      console.log('4️⃣ Registrando en historial...');
      await this.storageService.addToHistory({
        scheduleId: schedule.$id || '',
        userId: schedule.userId,
        itemId: schedule.itemId,
        publishedTitle: variation.title,
        publishedDescription: variation.description,
        newListingId,
        status: 'success',
        generatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      });

      // 5. Actualizar próxima fecha de publicación
      console.log('5️⃣ Actualizando próxima fecha...');
      await this.storageService.updatePublicationDates(
        schedule.$id || '',
        schedule.frequency
      );

      console.log(`✅ Publicación exitosa: ML-${newListingId}`);

      return {
        success: true,
        newListingId,
      };
    } catch (error: any) {
      console.error(`❌ Error publicando: ${error.message}`);

      // Registrar error en historial
      try {
        await this.storageService.addToHistory({
          scheduleId: schedule.$id || '',
          userId: schedule.userId,
          itemId: schedule.itemId,
          publishedTitle: '',
          status: 'failed',
          errorMessage: error.message,
          generatedAt: new Date().toISOString(),
        });
      } catch (historyError: any) {
        console.error('⚠️ No se pudo registrar error en historial:', historyError.message);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtener item de MercadoLibre
   */
  private async getMLItem(itemId: string, token: string): Promise<MLItem> {
    try {
      const response = await axios.get(`${this.mlApiUrl}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      return response.data as MLItem;
    } catch (error: any) {
      console.error('❌ Error obteniendo item de ML:', error.message);
      throw new Error(`No se pudo obtener el item ${itemId} de ML`);
    }
  }

  /**
   * Obtener descripción del item
   */
  private async getMLItemDescription(itemId: string, token: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.mlApiUrl}/items/${itemId}/description`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      return response.data.text || '';
    } catch (error: any) {
      console.warn('⚠️ No se pudo obtener descripción:', error.message);
      return '';
    }
  }

  /**
   * Duplicar y publicar item con nuevo título
   */
  private async duplicateAndPublish(
    originalItem: MLItem,
    variation: any,
    mlAuthToken: string
  ): Promise<string> {
    try {
      // Preparar datos del nuevo item
      const newItem = this.prepareDuplicateItem(originalItem, variation);

      // Publicar en ML
      const response = await axios.post(
        `${this.mlApiUrl}/items`,
        newItem,
        {
          headers: {
            Authorization: `Bearer ${mlAuthToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const newItemId = response.data.id;

      // Agregar descripción si existe
      if (variation.description && variation.description.length > 0) {
        try {
          await axios.post(
            `${this.mlApiUrl}/items/${newItemId}/description`,
            { text: variation.description },
            {
              headers: { Authorization: `Bearer ${mlAuthToken}` },
              timeout: 10000,
            }
          );
        } catch (error: any) {
          console.warn('⚠️ No se pudo agregar descripción:', error.message);
        }
      }

      return newItemId;
    } catch (error: any) {
      console.error('❌ Error duplicando publicación:', error.message);
      throw new Error('No se pudo publicar el item en ML');
    }
  }

  /**
   * Preparar datos para duplicar item
   */
  private prepareDuplicateItem(originalItem: MLItem, variation: any): any {
    // Convertir logistic_type si es necesario
    let shipping = originalItem.shipping || {};
    if (shipping.logistic_type === 'fulfillment') {
      shipping.logistic_type = 'xd_drop_off';
    }

    return {
      title: variation.title,
      category_id: originalItem.category_id,
      price: originalItem.price,
      currency_id: originalItem.currency_id,
      available_quantity: originalItem.available_quantity,
      condition: originalItem.condition,
      buying_mode: originalItem.buying_mode,
      listing_type_id: originalItem.listing_type_id,
      pictures: originalItem.pictures,
      attributes: originalItem.attributes,
      sale_terms: originalItem.sale_terms,
      shipping,
    };
  }

  /**
   * Procesar múltiples programaciones (para cron job)
   */
  async processScheduledPublications(
    schedules: ScheduledPublication[],
    mlAuthToken: string
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    console.log(`\n📦 Procesando ${schedules.length} programaciones...`);

    let successful = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        // Verificar que no se publicó ya en este ciclo
        const alreadyPublished = await this.storageService.wasPublishedInThisCycle(
          schedule.$id || '',
          schedule.frequency
        );

        if (alreadyPublished) {
          console.log(`⏭️ Saltando ${schedule.itemId} - ya se publicó en este ciclo`);
          continue;
        }

        const result = await this.publishScheduledItem(schedule, mlAuthToken);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error: any) {
        console.error(`❌ Error procesando ${schedule.itemId}:`, error.message);
        failed++;
      }

      // Pequeña pausa entre publicaciones para no sobrecargar ML API
      await this.sleep(1000);
    }

    console.log(`\n📊 Resumen: ${successful} exitosas, ${failed} fallidas`);

    return {
      processed: schedules.length,
      successful,
      failed,
    };
  }

  /**
   * Helper: dormir
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Exportar factory function
export function createPublicationSchedulerService(
  aiService: AIVariationsService,
  storageService: ScheduleStorageService
): PublicationSchedulerService {
  return new PublicationSchedulerService(aiService, storageService);
}
