import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AutoPublicationsService, Frequency } from '../../auto-publications.service';

@Component({
  selector: 'app-configure-frequency-dialog',
  templateUrl: './configure-frequency-dialog.component.html',
  styleUrls: ['./configure-frequency-dialog.component.css']
})
export class ConfigureFrequencyDialogComponent {
  form: FormGroup;
  mode: 'create' | 'edit';
  itemTitle: string = '';
  isSaving = false;

  frequencyIntervals = [1, 2, 4, 6, 12, 24];
  frequencyUnits = ['hours', 'days'];

  constructor(
    private fb: FormBuilder,
    private autoPublicationsService: AutoPublicationsService,
    public dialogRef: MatDialogRef<ConfigureFrequencyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.mode = data?.mode || 'create';
    this.itemTitle = data?.itemTitle || '';

    // Inicializar formulario
    const schedule = data?.schedule;
    const frequency = schedule?.frequency || { interval: 2, unit: 'hours' };

    this.form = this.fb.group({
      itemId: [data?.itemId || '', Validators.required],
      frequency: this.fb.group({
        interval: [frequency.interval, Validators.required],
        unit: [frequency.unit, Validators.required]
      }),
      variateDescription: [schedule?.variateDescription ?? false],
      maxPublications: [schedule?.maxPublications ?? null]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.form.valid) return;

    this.isSaving = true;
    try {
      const formValue = this.form.value;

      if (this.mode === 'create') {
        console.log('📝 Creando nueva programación:', formValue);
        await this.autoPublicationsService.createSchedule({
          itemId: formValue.itemId,
          frequency: formValue.frequency,
          variateDescription: formValue.variateDescription,
          maxPublications: formValue.maxPublications,
          itemTitle: this.itemTitle
        });
        console.log('✅ Programación creada exitosamente');
      } else {
        console.log('✏️ Actualizando programación:', formValue);
        await this.autoPublicationsService.updateSchedule(this.data.schedule.id, {
          frequency: formValue.frequency,
          variateDescription: formValue.variateDescription,
          maxPublications: formValue.maxPublications
        });
        console.log('✅ Programación actualizada exitosamente');
      }

      this.dialogRef.close({ success: true });
    } catch (error: any) {
      console.error('❌ Error guardando programación:', error);
      alert('Error al guardar la programación: ' + error.message);
    } finally {
      this.isSaving = false;
    }
  }

  get frequencyText(): string {
    const freq = this.form.get('frequency')?.value as Frequency;
    if (!freq) return '';
    const unit = freq.unit === 'hours' ? 'hora(s)' : 'día(s)';
    return `Cada ${freq.interval} ${unit}`;
  }
}
