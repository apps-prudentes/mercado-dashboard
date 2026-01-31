import axios from 'axios';
import { AIVariation } from '../types/schedule.types';

/**
 * Servicio para generar variaciones de títulos y descripciones
 * Usa DeepSeek API (muy económico)
 */
export class AIVariationsService {
  private apiKey: string;
  private apiUrl = 'https://api.deepseek.com/chat/completions';
  private model = 'deepseek-chat';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('❌ DEEPSEEK_API_KEY no configurada en .env');
    }
  }

  /**
   * Generar variaciones de título (y opcionalmente descripción)
   * @param original - Título y descripción original
   * @param varyDescription - Si también generar descripción
   * @param category - Categoría del producto (para contexto)
   */
  async generateVariations(
    original: { title: string; description?: string },
    varyDescription: boolean,
    category?: string
  ): Promise<AIVariation> {
    try {
      const prompt = this.buildPrompt(original, varyDescription, category);

      console.log('🔍 Llamando DeepSeek API para generar variación...');

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'Eres un experto en marketing de MercadoLibre. Generas títulos y descripciones atractivos y optimizados.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 15000,
        }
      );

      const content = response.data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Respuesta vacía de DeepSeek');
      }

      // Parsear respuesta JSON
      const parsed = this.parseResponse(content);

      console.log('✅ Variación generada exitosamente');

      return {
        title: this.validateTitle(parsed.title),
        description: varyDescription ? this.validateDescription(parsed.description) : undefined,
      };
    } catch (error: any) {
      console.error('❌ Error generando variaciones:', error.message);

      // Si falla DeepSeek, retornar una variación simple
      console.log('⚠️ Usando variación por defecto');
      return this.getFallbackVariation(original, varyDescription);
    }
  }

  /**
   * Construir prompt para DeepSeek
   */
  private buildPrompt(
    original: { title: string; description?: string },
    varyDescription: boolean,
    category?: string
  ): string {
    const descriptionPart = varyDescription
      ? `
3. Generar una NUEVA descripción breve y atractiva (máximo 500 caracteres)
   - Incluir puntos clave del producto
   - Ser conciso pero persuasivo
   - Usar palabras que atraigan compradores`
      : '3. NO generes descripción';

    return `
Necesito una variación de un producto de MercadoLibre.

Datos del producto:
${category ? `- Categoría: ${category}` : ''}
- Título actual: "${original.title}"
${original.description ? `- Descripción actual (para referencia): "${original.description}"` : ''}

Tu tarea:
1. Generar un NUEVO título que sea DIFERENTE pero igualmente relevante
   - Máximo 60 caracteres
   - Incluir palabras clave importantes
   - Mantener el tipo de producto
   - Sin caracteres especiales (excepto guiones y espacios)
   - Diferentes al original: no copies el título original

2. La descripción la haré manualmente después

Responde en este formato JSON (SIN texto adicional):
{
  "title": "nuevo título aquí",
  "description": "nueva descripción aquí"
}

IMPORTANTE: Responde SOLO el JSON, nada más.`;
  }

  /**
   * Parsear respuesta JSON de DeepSeek
   */
  private parseResponse(content: string): AIVariation {
    try {
      // Limpiar posibles espacios o caracteres extra
      const jsonString = content.trim();

      // Si no empieza con {, buscar el primer {
      const startIndex = jsonString.indexOf('{');
      const endIndex = jsonString.lastIndexOf('}');

      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON encontrado en respuesta');
      }

      const json = jsonString.substring(startIndex, endIndex + 1);
      const parsed = JSON.parse(json);

      return {
        title: String(parsed.title || '').trim(),
        description: parsed.description ? String(parsed.description).trim() : undefined,
      };
    } catch (error) {
      console.error('⚠️ Error parseando JSON:', error);
      throw new Error('No se pudo parsear respuesta de IA');
    }
  }

  /**
   * Validar título
   */
  private validateTitle(title: string): string {
    // Máximo 60 caracteres
    const maxLength = 60;
    if (title.length > maxLength) {
      return title.substring(0, maxLength).trim();
    }

    // Remover caracteres especiales peligrosos
    return title
      .replace(/[<>]/g, '')
      .trim();
  }

  /**
   * Validar descripción
   */
  private validateDescription(description?: string): string | undefined {
    if (!description) return undefined;

    // Máximo 500 caracteres
    const maxLength = 500;
    if (description.length > maxLength) {
      return description.substring(0, maxLength).trim();
    }

    return description.trim();
  }

  /**
   * Variación por defecto si falla IA
   * (Fallback simple para no dejar el sistema roto)
   */
  private getFallbackVariation(
    original: { title: string; description?: string },
    varyDescription: boolean
  ): AIVariation {
    const variations = [
      original.title + ' - Stock Disponible',
      original.title + ' - Entrega Rápida',
      original.title + ' - Garantizado',
      original.title + ' - Oferta Especial',
      'NUEVO: ' + original.title,
      original.title + ' | Envío a Todo el País',
    ];

    const randomTitle = variations[Math.floor(Math.random() * variations.length)];

    return {
      title: this.validateTitle(randomTitle),
      description: varyDescription ? original.description : undefined,
    };
  }
}

// Exportar instancia singleton
let instance: AIVariationsService;

export function getAIVariationsService(): AIVariationsService {
  if (!instance) {
    instance = new AIVariationsService();
  }
  return instance;
}
