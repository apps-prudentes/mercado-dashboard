import { Client, Databases } from 'appwrite';
import {
  ScheduledPublication,
  PublicationHistory,
  CreateScheduleRequest,
  UpdateScheduleRequest,
} from '../types/schedule.types';

/**
 * Servicio para guardar/leer/actualizar programaciones en Appwrite 
 */
export class ScheduleStorageService {
  private databases: Databases;
  private databaseId: string;
  private collectionsId = {
    schedules: 'scheduled_publications',
    history: 'publication_history',
  };

  constructor(client: Client, databaseId: string) {
    this.databases = new Databases(client);
    this.databaseId = databaseId;
  }

  /**
   * Crear nueva programación
   */
  async createSchedule(
    userId: string,
    data: CreateScheduleRequest & { originalTitle: string; originalDescription?: string }
  ): Promise<ScheduledPublication> {
    try {
      const now = new Date().toISOString();

      // Calcular nextPublishAt
      const nextPublishAt = this.calculateNextPublishDate(data.frequency);

      const document: any = {
        userId,
        itemId: data.itemId,
        originalTitle: data.originalTitle,
        originalDescription: data.originalDescription,
        frequencyInterval: data.frequency.interval,
        frequencyUnit: data.frequency.unit,
        variateDescription: data.variateDescription ?? false,
        maxPublications: data.maxPublications ?? null,
        isActive: true,
        nextPublishAt,
        variationHistory: JSON.stringify([]),
        createdAt: now,
        updatedAt: now,
      };

      const response = await this.databases.createDocument(
        this.databaseId,
        this.collectionsId.schedules,
        'unique()', // Appwrite genera ID automático
        document
      );

      console.log(`✅ Programación creada: ${response.$id}`);

      return { ...document, $id: response.$id };
    } catch (error: any) {
      console.error('❌ Error creando programación:', error.message);
      throw error;
    }
  }

  /**
   * Obtener todas las programaciones del usuario
   */
  async getSchedules(userId: string, isActive?: boolean): Promise<ScheduledPublication[]> {
    try {
      const queries = [];

      // Usar Query helper si existe, sino usar strings
      try {
        // Intentar formato Query de Appwrite
        const { Query } = require('node-appwrite');
        queries.push(Query.equal('userId', userId));
        if (isActive !== undefined) {
          queries.push(Query.equal('isActive', isActive));
        }
      } catch (e) {
        // Fallback a strings simples
        queries.push(`userId == "${userId}"`);
        if (isActive !== undefined) {
          queries.push(`isActive == ${isActive ? 'true' : 'false'}`);
        }
      }

      const response = await this.databases.listDocuments(
        this.databaseId,
        this.collectionsId.schedules,
        queries as any
      );

      return response.documents.map((doc: any) => {
        if (!doc.frequency && doc.frequencyInterval) {
          doc.frequency = {
            interval: doc.frequencyInterval,
            unit: doc.frequencyUnit || 'hours'
          };
        }
        return doc as ScheduledPublication;
      });
    } catch (error: any) {
      console.error('❌ Error listando programaciones:', error.message);
      throw error;
    }
  }

  /**
   * Obtener programación por ID
   */
  async getSchedule(scheduleId: string): Promise<ScheduledPublication> {
    try {
      const response = await this.databases.getDocument(
        this.databaseId,
        this.collectionsId.schedules,
        scheduleId
      );

      const doc = response as any;

      // Re-mapear frequency si viene plano de Appwrite
      if (!doc.frequency && doc.frequencyInterval) {
        doc.frequency = {
          interval: doc.frequencyInterval,
          unit: doc.frequencyUnit || 'hours'
        };
      }

      return doc as ScheduledPublication;
    } catch (error: any) {
      console.error('❌ Error obteniendo programación:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar programación
   */
  async updateSchedule(scheduleId: string, data: UpdateScheduleRequest): Promise<ScheduledPublication> {
    try {
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      // Mapear frequency correctamente
      if (data.frequency) {
        updateData.frequencyInterval = data.frequency.interval;
        updateData.frequencyUnit = data.frequency.unit;
        updateData.nextPublishAt = this.calculateNextPublishDate(data.frequency);
      }

      // Otros campos
      if (data.variateDescription !== undefined) {
        updateData.variateDescription = data.variateDescription;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }
      if (data.maxPublications !== undefined) {
        updateData.maxPublications = data.maxPublications;
      }

      const response = await this.databases.updateDocument(
        this.databaseId,
        this.collectionsId.schedules,
        scheduleId,
        updateData
      );

      console.log(`✅ Programación actualizada: ${scheduleId}`);

      return response as any as ScheduledPublication;
    } catch (error: any) {
      console.error('❌ Error actualizando programación:', error.message);
      throw error;
    }
  }

  /**
   * Eliminar programación
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await this.databases.deleteDocument(
        this.databaseId,
        this.collectionsId.schedules,
        scheduleId
      );

      console.log(`✅ Programación eliminada: ${scheduleId}`);
    } catch (error: any) {
      console.error('❌ Error eliminando programación:', error.message);
      throw error;
    }
  }

  /**
   * Registrar publicación en historial
   */
  async addToHistory(history: PublicationHistory): Promise<PublicationHistory> {
    try {
      const response = await this.databases.createDocument(
        this.databaseId,
        this.collectionsId.history,
        'unique()',
        history as any
      );

      return { ...history, $id: response.$id };
    } catch (error: any) {
      console.error('❌ Error registrando en historial:', error.message);
      throw error;
    }
  }

  /**
   * Obtener historial de una programación
   */
  async getScheduleHistory(
    scheduleId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PublicationHistory[]> {
    try {
      const queries = [`scheduleId == "${scheduleId}"`];

      const response = await this.databases.listDocuments(
        this.databaseId,
        this.collectionsId.history,
        queries as any,
        limit,
        offset
      );

      return response.documents as any as PublicationHistory[];
    } catch (error: any) {
      console.error('❌ Error obteniendo historial:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar lastPublishedAt y nextPublishAt después de publicar
   */
  async updatePublicationDates(scheduleId: string, frequency: any): Promise<void> {
    try {
      const now = new Date().toISOString();
      const nextPublishAt = this.calculateNextPublishDate(frequency);

      await this.databases.updateDocument(
        this.databaseId,
        this.collectionsId.schedules,
        scheduleId,
        {
          lastPublishedAt: now,
          nextPublishAt,
          updatedAt: now,
        } as any
      );

      console.log(`✅ Fechas de publicación actualizadas: ${scheduleId}`);
    } catch (error: any) {
      console.error('❌ Error actualizando fechas:', error.message);
      throw error;
    }
  }

  /**
   * Obtener programaciones que deben publicarse ahora
   */
  async getSchedulesReadyToPublish(): Promise<ScheduledPublication[]> {
    try {
      const now = new Date().toISOString();

      const queries = [
        'isActive == true',
        `nextPublishAt <= "${now}"`,
      ];

      const response = await this.databases.listDocuments(
        this.databaseId,
        this.collectionsId.schedules,
        queries as any
      );

      return response.documents.map((doc: any) => {
        if (!doc.frequency && doc.frequencyInterval) {
          doc.frequency = {
            interval: doc.frequencyInterval,
            unit: doc.frequencyUnit || 'hours'
          };
        }
        return doc as ScheduledPublication;
      });
    } catch (error: any) {
      console.error('❌ Error obteniendo programaciones listas:', error.message);
      throw error;
    }
  }

  /**
   * Calcular próxima fecha de publicación
   */
  private calculateNextPublishDate(frequency: any): string {
    const now = new Date();

    if (!frequency || !frequency.unit) {
      console.warn('⚠️ No frequency provided, setting default next publish to 24h');
      now.setHours(now.getHours() + 24);
      return now.toISOString();
    }

    if (frequency.unit === 'hours') {
      now.setHours(now.getHours() + (frequency.interval || 1));
    } else if (frequency.unit === 'minutes') {
      now.setMinutes(now.getMinutes() + (frequency.interval || 1));
    } else {
      now.setDate(now.getDate() + (frequency.interval || 1));
    }

    return now.toISOString();
  }

  /**
   * Verificar si ya se publicó en este ciclo (para evitar duplicados)
   */
  async wasPublishedInThisCycle(scheduleId: string, frequency: any): Promise<boolean> {
    try {
      const schedule = await this.getSchedule(scheduleId);
      const lastPublished = schedule.lastPublishedAt
        ? new Date(schedule.lastPublishedAt)
        : null;

      if (!lastPublished) return false;

      const now = new Date();
      const timeDiff = now.getTime() - lastPublished.getTime();

      const intervalMs =
        frequency.unit === 'hours'
          ? frequency.interval * 60 * 60 * 1000
          : frequency.interval * 24 * 60 * 60 * 1000;

      // Si pasó menos del intervalo, ya se publicó en este ciclo
      return timeDiff < intervalMs * 1.1; // 10% de margen
    } catch (error: any) {
      console.error('❌ Error verificando ciclo:', error.message);
      return false;
    }
  }
}

// Exportar factory function
export function createScheduleStorageService(client: Client, databaseId: string): ScheduleStorageService {
  return new ScheduleStorageService(client, databaseId);
}
