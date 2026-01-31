import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AutoPublicationsService, PublicationHistory } from '../../auto-publications.service';

@Component({
  selector: 'app-view-history-dialog',
  templateUrl: './view-history-dialog.component.html',
  styleUrls: ['./view-history-dialog.component.css']
})
export class ViewHistoryDialogComponent implements OnInit {
  history: PublicationHistory[] = [];
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<ViewHistoryDialogComponent>,
    private autoPublicationsService: AutoPublicationsService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    try {
      this.isLoading = true;
      const result = await this.autoPublicationsService.getScheduleHistory(
        this.data.schedule.id,
        10,
        0
      );
      this.history = result.history;
    } catch (error: any) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
