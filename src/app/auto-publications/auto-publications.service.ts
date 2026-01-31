import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Frequency {
  interval: number;
  unit: 'hours' | 'days';
}

export interface CreateScheduleRequest {
  itemId: string;
  frequency: Frequency;
  variateDescription?: boolean;
  maxPublications?: number | null;
  itemTitle?: string;
}

export interface ScheduledPublication {
  id: string;
  itemId: string;
  originalTitle: string;
  frequency: Frequency;
  variateDescription: boolean;
  isActive: boolean;
  lastPublishedAt?: string;
  nextPublishAt: string;
  publicationCount: number;
}

export interface PublicationHistory {
  id: string;
  publishedTitle: string;
  status: 'success' | 'failed';
  publishedAt: string;
  newListingId?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AutoPublicationsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Mapear datos del backend al formato de frontend
   */
  private mapScheduleData(data: any): ScheduledPublication {
    console.log('🟣 Mapping data:', data);

    // Si ya viene con frequency como objeto, usarlo directamente
    let frequency: Frequency;
    if (data.frequency && typeof data.frequency === 'object' && data.frequency.interval) {
      frequency = {
        interval: data.frequency.interval,
        unit: data.frequency.unit as 'hours' | 'days'
      };
    } else {
      // Si viene con campos planos (frequencyInterval, frequencyUnit)
      frequency = {
        interval: data.frequencyInterval || 0,
        unit: data.frequencyUnit === 'hours' ? 'hours' : 'days'
      };
    }

    const mapped = {
      ...data,
      id: data.$id || data.id,
      frequency
    };
    console.log('🟣 Mapped result:', mapped);
    return mapped;
  }

  /**
   * Crear nueva programación
   */
  async createSchedule(request: CreateScheduleRequest): Promise<ScheduledPublication> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/schedules`,
          request
        )
      );
      console.log('✅ Programación creada:', response);
      return this.mapScheduleData(response);
    } catch (error: any) {
      console.error('❌ Error creando programación:', error);
      throw error;
    }
  }

  /**
   * Listar todas las programaciones
   */
  async getSchedules(status?: 'active' | 'inactive' | 'all'): Promise<ScheduledPublication[]> {
    try {
      console.log('🟡 Calling getSchedules, apiUrl:', this.apiUrl);
      let params = new HttpParams();
      if (status && status !== 'all') {
        params = params.set('status', status);
      }

      const url = `${this.apiUrl}/schedules`;
      console.log('🟡 GET request to:', url);

      const response = await firstValueFrom(
        this.http.get<any[]>(url, { params })
      );

      console.log('🟢 Response received:', response);
      const mapped = response.map(item => this.mapScheduleData(item));
      console.log('🟢 After mapping:', mapped);
      return mapped;
    } catch (error: any) {
      console.error('❌ Error listando programaciones:', error);
      console.error('Error details:', error.error, error.status, error.message);
      throw error;
    }
  }

  /**
   * Obtener una programación específica
   */
  async getSchedule(id: string): Promise<ScheduledPublication> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/schedules/${id}`)
      );
      return this.mapScheduleData(response);
    } catch (error: any) {
      console.error('❌ Error obteniendo programación:', error);
      throw error;
    }
  }

  /**
   * Actualizar programación
   */
  async updateSchedule(id: string, data: Partial<CreateScheduleRequest>): Promise<ScheduledPublication> {
    try {
      const response = await firstValueFrom(
        this.http.put<any>(
          `${this.apiUrl}/schedules/${id}`,
          data
        )
      );
      console.log('✅ Programación actualizada:', response);
      return this.mapScheduleData(response);
    } catch (error: any) {
      console.error('❌ Error actualizando programación:', error);
      throw error;
    }
  }

  /**
   * Eliminar programación
   */
  async deleteSchedule(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/schedules/${id}`)
      );
      console.log('✅ Programación eliminada:', id);
    } catch (error: any) {
      console.error('❌ Error eliminando programación:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de publicaciones
   */
  async getScheduleHistory(id: string, limit: number = 10, offset: number = 0): Promise<{
    schedule: any;
    history: PublicationHistory[];
  }> {
    try {
      const params = new HttpParams()
        .set('limit', limit.toString())
        .set('offset', offset.toString());

      const response = await firstValueFrom(
        this.http.get<any>(
          `${this.apiUrl}/schedules/${id}/history`,
          { params }
        )
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error obteniendo historial:', error);
      throw error;
    }
  }

  /**
   * Publicar ahora (manual trigger)
   */
  async publishNow(id: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/schedules/${id}/publish-now`,
          {}
        )
      );
      console.log('✅ Publicado exitosamente:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Error publicando ahora:', error);
      throw error;
    }
  }
}
