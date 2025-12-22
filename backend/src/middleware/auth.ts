import { Request, Response, NextFunction } from 'express';
import { appwriteService } from '../auth/appwrite';

/**
 * Middleware de autenticación
 * Valida que el usuario tenga un token de sesión válido de Appwrite
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No authorization token provided',
        message: 'Please login to access this resource'
      });
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Validar token con Appwrite
    const user = await appwriteService.verifySession(sessionToken);

    // Agregar usuario al request para uso en rutas
    (req as any).user = user;

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);

    return res.status(401).json({
      error: 'Invalid or expired session',
      message: 'Please login again'
    });
  }
}
