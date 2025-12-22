import { Client, Users, Account } from 'node-appwrite';

export class AppwriteService {
  private client: Client;
  private users: Users;

  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    this.users = new Users(this.client);
  }

  /**
   * Verifica un token de sesión y retorna el usuario
   */
  async verifySession(sessionToken: string): Promise<any> {
    try {
      // Crear cliente con el token del usuario
      const userClient = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT!)
        .setProject(process.env.APPWRITE_PROJECT_ID!)
        .setJWT(sessionToken);

      const account = new Account(userClient);
      const user = await account.get();

      return user;
    } catch (error) {
      throw new Error('Invalid or expired session token');
    }
  }

  /**
   * Obtiene información de un usuario por ID
   */
  async getUserById(userId: string): Promise<any> {
    try {
      return await this.users.get(userId);
    } catch (error) {
      throw new Error('User not found');
    }
  }
}

export const appwriteService = new AppwriteService();
