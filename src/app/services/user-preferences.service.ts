import { Injectable } from '@angular/core';
import { Client, Databases, ID, Query } from 'appwrite';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface PublicationFilters {
  searchQuery: string;
  statusFilter: string;
  listingTypeFilter: string;
  sortBy: string;
}

export interface UserPreferences {
  userId: string;
  publicationFilters: PublicationFilters;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private client: Client;
  private databases: Databases;
  private readonly DATABASE_ID = environment.appwrite.databaseId;
  private readonly COLLECTION_ID = environment.appwrite.collections.userPreferences;

  constructor(private authService: AuthService) {
    this.client = new Client()
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);

    this.databases = new Databases(this.client);
  }

  /**
   * Guarda las preferencias de filtros de publicaciones
   */
  async savePublicationFilters(filters: PublicationFilters): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const userId = user.$id;

      // Convertir el objeto a JSON string para guardar en Appwrite
      const preferences: any = {
        userId,
        publicationFilters: JSON.stringify(filters),
        updatedAt: new Date().toISOString()
      };

      // Intentar actualizar documento existente
      try {
        const existing = await this.getPublicationFilters();
        if (existing) {
          // Actualizar documento existente
          await this.databases.updateDocument(
            this.DATABASE_ID,
            this.COLLECTION_ID,
            userId,
            preferences
          );
          console.log('✅ Preferencias de filtros actualizadas');
          return;
        }
      } catch (error) {
        // El documento no existe, crear uno nuevo
      }

      // Crear nuevo documento
      await this.databases.createDocument(
        this.DATABASE_ID,
        this.COLLECTION_ID,
        userId, // Usar userId como documentId para fácil lookup
        preferences
      );
      console.log('✅ Preferencias de filtros guardadas');
    } catch (error: any) {
      console.error('❌ Error al guardar preferencias de filtros:', error);
      throw new Error(error.message || 'Error al guardar preferencias');
    }
  }

  /**
   * Obtiene las preferencias de filtros de publicaciones guardadas
   */
  async getPublicationFilters(): Promise<PublicationFilters | null> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        return null;
      }

      const userId = user.$id;

      // Obtener documento por userId
      const document = await this.databases.getDocument(
        this.DATABASE_ID,
        this.COLLECTION_ID,
        userId
      );

      // Parsear el JSON string de vuelta a objeto
      const filtersString = document['publicationFilters'] as string;
      const filters = JSON.parse(filtersString) as PublicationFilters;

      console.log('✅ Preferencias de filtros cargadas:', filters);
      return filters;
    } catch (error: any) {
      // Si el documento no existe, retornar null
      if (error.code === 404) {
        console.log('ℹ️ No hay preferencias guardadas');
        return null;
      }
      console.error('❌ Error al cargar preferencias de filtros:', error);
      return null;
    }
  }

  /**
   * Elimina las preferencias de filtros de publicaciones
   */
  async deletePublicationFilters(): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const userId = user.$id;

      await this.databases.deleteDocument(
        this.DATABASE_ID,
        this.COLLECTION_ID,
        userId
      );
      console.log('✅ Preferencias de filtros eliminadas');
    } catch (error: any) {
      if (error.code === 404) {
        // El documento no existe, no hacer nada
        return;
      }
      console.error('❌ Error al eliminar preferencias de filtros:', error);
      throw new Error(error.message || 'Error al eliminar preferencias');
    }
  }
}
