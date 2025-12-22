import { Injectable } from '@angular/core';
import { Client, Account } from 'appwrite';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: Client;
  private account: Account;
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>;

  constructor() {
    // Inicializar cliente de Appwrite
    this.client = new Client()
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);

    this.account = new Account(this.client);

    // Verificar si hay sesión guardada
    const savedSession = localStorage.getItem('appwrite_session');
    this.currentUserSubject = new BehaviorSubject<any>(
      savedSession ? JSON.parse(savedSession) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();

    // Verificar sesión al iniciar
    this.checkSession();
  }

  /**
   * Verifica si hay una sesión activa
   */
  private async checkSession(): Promise<void> {
    try {
      const user = await this.account.get();
      this.currentUserSubject.next(user);
      localStorage.setItem('appwrite_session', JSON.stringify(user));
    } catch (error) {
      // No hay sesión activa
      this.currentUserSubject.next(null);
      localStorage.removeItem('appwrite_session');
    }
  }

  /**
   * Login con email y password
   */
  async login(email: string, password: string): Promise<any> {
    try {
      // Crear sesión
      await this.account.createEmailPasswordSession(email, password);

      // Obtener datos del usuario
      const user = await this.account.get();

      // Guardar sesión
      localStorage.setItem('appwrite_session', JSON.stringify(user));
      this.currentUserSubject.next(user);

      return user;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('appwrite_session');
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Obtiene el token JWT para hacer requests al backend
   */
  async getJWT(): Promise<string> {
    try {
      const jwt = await this.account.createJWT();
      return jwt.jwt;
    } catch (error) {
      throw new Error('Failed to get JWT token');
    }
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }
}
