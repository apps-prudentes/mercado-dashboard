import { Component, OnInit } from '@angular/core';
import { ThemeService, Theme } from '../services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  currentTheme: Theme;
  isDarkMode: boolean;

  constructor(private themeService: ThemeService) {
    // Initialize with current theme to avoid flash/change on load
    const current = this.themeService.getCurrentTheme();
    this.currentTheme = current;
    this.isDarkMode = current === 'dark';
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
      this.isDarkMode = theme === 'dark';
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }
}
