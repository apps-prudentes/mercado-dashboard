import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastComponent } from '../shared/toast/toast.component';
import { environment } from '../../environments/environment';
import { AutoPublicationsService, ScheduledPublication, CreateScheduleRequest, Frequency } from './auto-publications.service';
import { ConfigureFrequencyDialogComponent } from './dialogs/configure-frequency/configure-frequency-dialog.component';
import { ViewHistoryDialogComponent } from './dialogs/view-history/view-history-dialog.component';

interface Product {
  id: string;
  title: string;
  price: number;
  thumbnail?: string;
  available_quantity: number;
}

@Component({
  selector: 'app-auto-publications',
  templateUrl: './auto-publications.component.html',
  styleUrls: ['./auto-publications.component.css']
})
export class AutoPublicationsComponent implements OnInit {
  schedules: ScheduledPublication[] = [];
  isLoading = false;
  selectedProduct: any = null;

  // Material Table
  displayedColumns: string[] = ['producto', 'frecuencia', 'variar', 'proxima', 'estado', 'total', 'acciones'];

  // Search
  searchQuery = '';
  searchResults: Product[] = [];
  isSearching = false;
  showSearchResults = false;

  constructor(
    private autoPublicationsService: AutoPublicationsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit() {
    console.log('🔵 AutoPublicationsComponent initialized');
    this.loadSchedules();
  }

  /**
   * Cargar todas las programaciones
   */
  async loadSchedules() {
    try {
      console.log('🟡 loadSchedules started');
      this.isLoading = true;
      console.log('🟡 Calling service.getSchedules()');
      this.schedules = await this.autoPublicationsService.getSchedules();
      console.log('✅ Programaciones cargadas:', this.schedules);
      console.log('✅ schedules.length:', this.schedules.length);
    } catch (error: any) {
      console.error('❌ Error cargando programaciones:', error);
      console.error('Error full:', error);
      this.showToast('Error cargando programaciones', 'error');
    } finally {
      console.log('🟡 loadSchedules finished');
      this.isLoading = false;
    }
  }

  /**
   * Abrir diálogo para crear programación
   */
  openCreateDialog() {
    const dialogRef = this.dialog.open(ConfigureFrequencyDialogComponent, {
      width: '400px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createSchedule(result);
      }
    });
  }

  /**
   * Crear nueva programación
   */
  async createSchedule(data: any) {
    try {
      if (!data.itemId) {
        this.showToast('Selecciona un producto', 'warning');
        return;
      }

      const request: CreateScheduleRequest = {
        itemId: data.itemId,
        frequency: data.frequency,
        variateDescription: data.variateDescription ?? false,
        maxPublications: data.maxPublications ?? null
      };

      await this.autoPublicationsService.createSchedule(request);
      this.showToast('✅ Programación creada correctamente', 'success');
      this.loadSchedules();
    } catch (error: any) {
      this.showToast(`❌ Error: ${error.error?.error || error.message}`, 'error');
    }
  }

  /**
   * Abrir historial
   */
  openHistoryDialog(schedule: ScheduledPublication) {
    this.dialog.open(ViewHistoryDialogComponent, {
      width: '600px',
      data: { schedule }
    });
  }

  /**
   * Editar programación
   */
  openEditDialog(schedule: ScheduledPublication) {
    const dialogRef = this.dialog.open(ConfigureFrequencyDialogComponent, {
      width: '400px',
      data: { mode: 'edit', schedule }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateSchedule(schedule.id, result);
      }
    });
  }

  /**
   * Actualizar programación
   */
  async updateSchedule(id: string, data: any) {
    try {
      await this.autoPublicationsService.updateSchedule(id, {
        frequency: data.frequency,
        variateDescription: data.variateDescription,
        maxPublications: data.maxPublications
      });
      this.showToast('✅ Programación actualizada', 'success');
      this.loadSchedules();
    } catch (error: any) {
      this.showToast(`❌ Error actualizando: ${error.message}`, 'error');
    }
  }

  /**
   * Publicar ahora
   */
  async publishNow(schedule: ScheduledPublication) {
    try {
      if (!confirm(`¿Publicar ahora "${schedule.originalTitle}"?`)) return;

      await this.autoPublicationsService.publishNow(schedule.id);
      this.showToast('✅ Publicado exitosamente', 'success');
      this.loadSchedules();
    } catch (error: any) {
      this.showToast(`❌ Error publicando: ${error.error?.error || error.message}`, 'error');
    }
  }

  /**
   * Eliminar programación
   */
  async deleteSchedule(schedule: ScheduledPublication) {
    try {
      if (!confirm(`¿Eliminar programación de "${schedule.originalTitle}"?`)) return;

      await this.autoPublicationsService.deleteSchedule(schedule.id);
      this.showToast('✅ Programación eliminada', 'success');
      this.loadSchedules();
    } catch (error: any) {
      this.showToast(`❌ Error eliminando: ${error.message}`, 'error');
    }
  }

  /**
   * Obtener cantidad de programaciones activas
   */
  getActiveCount(): number {
    return this.schedules.filter(s => s.isActive).length;
  }

  /**
   * Obtener cantidad de programaciones pausadas
   */
  getPausedCount(): number {
    return this.schedules.filter(s => !s.isActive).length;
  }

  /**
   * Obtener total de publicaciones
   */
  getTotalPublications(): number {
    return this.schedules.reduce((sum, s) => sum + s.publicationCount, 0);
  }

  /**
   * Buscar productos
   */
  async searchProducts(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    this.isSearching = true;
    this.showSearchResults = true;

    try {
      const params = new HttpParams()
        .set('q', this.searchQuery)
        .set('limit', '10');

      const response = await this.http.get<{ items: Product[] }>(
        `${environment.apiUrl}/items`,
        { params }
      ).toPromise();

      this.searchResults = response?.items || [];
      console.log('✅ Productos encontrados:', this.searchResults);
    } catch (error: any) {
      console.error('❌ Error buscando productos:', error);
      this.showToast('Error buscando productos', 'error');
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Seleccionar un producto y abrir diálogo de configuración
   */
  selectProduct(product: Product): void {
    console.log('🔵 Producto seleccionado:', product);
    this.showSearchResults = false;
    this.searchQuery = '';

    const dialogRef = this.dialog.open(ConfigureFrequencyDialogComponent, {
      width: '400px',
      data: {
        mode: 'create',
        itemId: product.id,
        itemTitle: product.title
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadSchedules();
      }
    });
  }

  /**
   * Limpiar búsqueda
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  /**
   * Mostrar toast
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    this.snackBar.openFromComponent(ToastComponent, {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      data: {
        message,
        type
      }
    });
  }
}
