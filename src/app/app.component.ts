import { Component } from '@angular/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ml-dash';

  constructor(private themeService: ThemeService) {
    // ThemeService se inicializa automáticamente al inyectarlo
    // Esto asegura que el tema guardado se aplique al cargar la app
  }
}
