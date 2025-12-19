import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ImageVariation {
  size: string;
  secure_url: string;
  url: string;
}

interface UploadedImage {
  id: string;
  fullSizeUrl: string;
  thumbnailUrl: string;
  variations: ImageVariation[];
  uploadDate: Date;
  status: string;
}

@Component({
  selector: 'app-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss']
})
export class ImageGalleryComponent implements OnInit {
  images: UploadedImage[] = [];
  isLoading = false;
  isDragging = false;
  uploadProgress = 0;
  errorMessage = '';
  successMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadImages();
  }

  /**
   * Load images from localStorage
   */
  loadImages(): void {
    const storedImages = localStorage.getItem('mlImageGallery');
    if (storedImages) {
      this.images = JSON.parse(storedImages);
    }
  }

  /**
   * Save images to localStorage
   */
  saveImages(): void {
    localStorage.setItem('mlImageGallery', JSON.stringify(this.images));
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  /**
   * Handle file input change
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(input.files);
    }
  }

  /**
   * Process and upload files
   */
  handleFiles(files: FileList): void {
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validFiles = Array.from(files).filter(file => validTypes.includes(file.type));

    if (validFiles.length === 0) {
      this.errorMessage = 'Por favor selecciona archivos de imagen válidos (JPG, PNG, GIF, WEBP)';
      return;
    }

    if (validFiles.length !== files.length) {
      this.errorMessage = `${files.length - validFiles.length} archivo(s) ignorado(s) por formato inválido`;
    }

    // Upload each file
    validFiles.forEach(file => this.uploadImage(file));
  }

  /**
   * Upload single image to ML CDN
   */
  uploadImage(file: File): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(`${environment.apiUrl}/images/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === 4) { // HttpEventType.Response
          const response = event.body;

          // Find the largest image variation (usually 800x800)
          const largestVariation = response.variations.find((v: ImageVariation) =>
            v.size === '800x800'
          ) || response.variations[0];

          // Find a thumbnail variation (using 200x200)
          const thumbnailVariation = response.variations.find((v: ImageVariation) =>
            v.size === '200x200'
          ) || response.variations[response.variations.length - 1];

          const uploadedImage: UploadedImage = {
            id: response.id,
            fullSizeUrl: largestVariation.secure_url,
            thumbnailUrl: thumbnailVariation.secure_url,
            variations: response.variations,
            uploadDate: new Date(),
            status: response.status
          };

          this.images.unshift(uploadedImage); // Add to beginning
          this.saveImages();
          this.successMessage = 'Imagen subida exitosamente!';
          this.isLoading = false;
          this.uploadProgress = 100;

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
            this.uploadProgress = 0;
          }, 3000);
        }
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        this.errorMessage = error.error?.message || 'Error al subir la imagen';
        this.isLoading = false;
        this.uploadProgress = 0;
      }
    });
  }

  /**
   * Copy URL to clipboard
   */
  copyUrl(url: string, type: 'full' | 'thumbnail'): void {
    navigator.clipboard.writeText(url).then(() => {
      this.successMessage = `URL ${type === 'full' ? 'completa' : 'miniatura'} copiada al portapapeles!`;
      setTimeout(() => this.successMessage = '', 2000);
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      this.errorMessage = 'Error al copiar URL';
    });
  }

  /**
   * Delete image from gallery
   */
  deleteImage(imageId: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta imagen de la galería?')) {
      this.images = this.images.filter(img => img.id !== imageId);
      this.saveImages();
      this.successMessage = 'Imagen eliminada de la galería';
      setTimeout(() => this.successMessage = '', 2000);
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
