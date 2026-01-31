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
      if (error.response) {
        console.error('❌ Error detallado de MercadoLibre:', JSON.stringify(error.response.data, null, 2));
        const mlError = error.response.data.message || 'Error desconocido de ML';
        throw new Error(`ML Error: ${mlError}`);
      }
      console.error('❌ Error duplicando publicación:', error.message);
      throw new Error('No se pudo publicar el item en ML');
    }
  }

  /**
   * Preparar datos para duplicar item
   */
  private prepareDuplicateItem(originalItem: MLItem, variation: any): any {
    // 1. Manejar Envío y Dimensiones
    let shipping: any = originalItem.shipping || {};
    if (shipping.logistic_type === 'fulfillment') {
      shipping.logistic_type = 'xd_drop_off';
    }

    // 2. Limpiar y Preparar Atributos
    const forbiddenAttrIds = [
      'ITEM_CONDITION',
      'PARENT_ITEM_ID',
      'PACKAGE_HEIGHT', 'PACKAGE_WIDTH', 'PACKAGE_LENGTH', 'PACKAGE_WEIGHT',
      'SELLER_PACKAGE_HEIGHT', 'SELLER_PACKAGE_WIDTH', 'SELLER_PACKAGE_LENGTH', 'SELLER_PACKAGE_WEIGHT'
    ];

    let cleanedAttributes = (originalItem.attributes || [])
      .filter((attr: any) => !forbiddenAttrIds.includes(attr.id))
      .map((attr: any) => ({
        id: attr.id,
        value_id: attr.value_id,
        value_name: attr.value_name
      }));

    // 3. Extraer y agregar dimensiones con reglas de validación (Min 20g, Min 3cm)
    const addDimension = (id: string, value: number, unit: 'cm' | 'g') => {
      const minVal = unit === 'cm' ? 3 : 20;
      const finalVal = Math.max(minVal, Math.floor(value));
      console.log(`🚚 Preparando atributo ${id}: ${finalVal} ${unit}`);
      cleanedAttributes.push({
        id,
        value_name: `${finalVal} ${unit}`,
        value_type: 'number_unit',
        values: [{
          name: `${finalVal} ${unit}`,
          struct: { number: finalVal, unit: unit }
        }]
      } as any);
    };

    if ((originalItem as any).shipping?.dimensions) {
      console.log(`📦 Dimensiones detectadas en shipping.dimensions: ${(originalItem as any).shipping.dimensions}`);
      const dims = this.parseShippingDimensions((originalItem as any).shipping.dimensions);
      if (dims) {
        addDimension('SELLER_PACKAGE_HEIGHT', dims.height, 'cm');
        addDimension('SELLER_PACKAGE_WIDTH', dims.width, 'cm');
        addDimension('SELLER_PACKAGE_LENGTH', dims.length, 'cm');
        addDimension('SELLER_PACKAGE_WEIGHT', dims.weight, 'g');
      }
    } else {
      console.log('🔍 Buscando dimensiones en atributos originales...');
      const getVal = (ids: string[]) => {
        for (const id of ids) {
          const attr = originalItem.attributes?.find(a => a.id === id);
          if (attr?.value_name) {
            const match = attr.value_name.match(/(\d+(\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
          }
        }
        return null;
      };

      const h = getVal(['SELLER_PACKAGE_HEIGHT', 'PACKAGE_HEIGHT']) || 3;
      const w = getVal(['SELLER_PACKAGE_WIDTH', 'PACKAGE_WIDTH']) || 3;
      const l = getVal(['SELLER_PACKAGE_LENGTH', 'PACKAGE_LENGTH']) || 3;
      const weight = getVal(['SELLER_PACKAGE_WEIGHT', 'PACKAGE_WEIGHT']) || 20;

      addDimension('SELLER_PACKAGE_HEIGHT', h, 'cm');
      addDimension('SELLER_PACKAGE_WIDTH', w, 'cm');
      addDimension('SELLER_PACKAGE_LENGTH', l, 'cm');
      addDimension('SELLER_PACKAGE_WEIGHT', weight, 'g');
    }

    // 4. Payload Final
    // Limpiar shipping de dimensiones si las enviamos como atributos para evitar conflictos
    const finalShipping = { ...shipping };
    delete finalShipping.dimensions;

    const payload: any = {
      family_name: originalItem.family_name || originalItem.title,
      category_id: originalItem.category_id,
      price: originalItem.price,
      currency_id: originalItem.currency_id,
      available_quantity: originalItem.available_quantity,
      condition: originalItem.condition,
      buying_mode: originalItem.buying_mode,
      listing_type_id: originalItem.listing_type_id,
      pictures: originalItem.pictures.map(p => ({ source: p.secure_url || p.url || p.source })),
      attributes: cleanedAttributes,
      sale_terms: originalItem.sale_terms,
      shipping: finalShipping,
    };

    // Si viene de una variación de IA, actualizar el nombre
    if (variation && (variation.title || variation.family_name)) {
      payload.family_name = variation.title || variation.family_name;
    }

    console.log(`📦 Payload listo para duplicar (Atributos: ${cleanedAttributes.length})`);
    return payload;
  }

  /**
   * Parsea el string de dimensiones de ML (ej: "10x20x30,500")
   */
  private parseShippingDimensions(dimString: string) {
    try {
      const [dims, weight] = dimString.split(',');
      const [h, w, l] = dims.split('x').map(Number);
      if (!h || !w || !l || !weight) return null;
      return { height: h, width: w, length: l, weight: Number(weight) };
    } catch (e) {
      return null;
    }
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
