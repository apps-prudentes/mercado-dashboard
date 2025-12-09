# Guía de Solución de Problemas - MercadoLibre Dashboard

## Problema: Error "Unauthorized scopes" al publicar productos

### Descripción del error
```json
{
    "error": "Unauthorized scopes",
    "message": "Your app does not have permission to create items. Please re-authorize by visiting /api/auth",
    "details": {
        "message": "Unauthorized scopes",
        "error": "unauthorized_scopes",
        "status": 401,
        "cause": []
    }
}
```

### Causa del problema
El token de acceso OAuth actual no tiene los scopes (permisos) necesarios para crear publicaciones en MercadoLibre. Esto puede ocurrir porque:

1. La aplicación fue autorizada inicialmente sin el scope `write`
2. Los scopes de la aplicación cambiaron después de la autorización inicial
3. La aplicación en el panel de desarrolladores de MercadoLibre no tiene habilitados los scopes necesarios

---

## Solución Paso a Paso

### Paso 1: Verificar scopes en el Panel de Desarrolladores de MercadoLibre

1. Ve a: https://developers.mercadolibre.com.mx/apps
2. Inicia sesión con tu cuenta de MercadoLibre
3. Selecciona tu aplicación (ID: `664789754446720`)
4. En la sección de **"Scopes"** o **"Permisos"**, verifica que estén habilitados:
   - ✅ `offline_access` - Para mantener la sesión activa
   - ✅ `read` - Para leer órdenes, envíos, datos de usuario
   - ✅ `write` - Para crear/actualizar/eliminar publicaciones ⚠️ **CRÍTICO**

5. Si alguno falta, actívalo y guarda los cambios

### Paso 2: Verificar Redirect URI

En el mismo panel de la aplicación, verifica que la **Redirect URI** sea exactamente:

**Producción (Vercel):**
```
https://mercado-libre-dashboard.vercel.app/api/callback
```

**Desarrollo local:**
```
http://localhost:3000/callback
```

⚠️ **Importante:** La URL debe coincidir EXACTAMENTE (incluyendo http/https, con/sin www, etc.)

### Paso 3: Revocar autorización previa (Opcional pero recomendado)

1. Ve a tu cuenta de MercadoLibre
2. Navega a **Configuración → Seguridad → Aplicaciones conectadas**
3. Busca tu aplicación y **revoca el acceso**
4. Esto forzará una nueva autorización con los scopes actualizados

### Paso 4: Re-autorizar la aplicación

#### En Producción (Vercel):

1. Abre tu navegador y visita:
   ```
   https://mercado-libre-dashboard.vercel.app/api/auth
   ```

2. Serás redirigido a MercadoLibre para autorizar

3. **Acepta TODOS los permisos** que solicita la aplicación

4. Después de autorizar, verás una pantalla de confirmación que muestra:
   ```
   ✅ Autorización exitosa!
   Scopes: offline_access read write
   ```

5. **VERIFICA** que los scopes incluyan `write`. Si no aparece, repite desde el Paso 1.

#### En Desarrollo Local:

1. Asegúrate de que tu backend esté corriendo:
   ```bash
   cd backend
   npm run dev
   ```

2. Visita:
   ```
   http://localhost:3000/auth
   ```

3. Sigue los mismos pasos de autorización

### Paso 5: Verificar que el token esté cargado correctamente

#### En Producción:
Visita: https://mercado-libre-dashboard.vercel.app/api

Deberías ver:
```json
{
  "status": "running",
  "message": "MercadoLibre Dashboard API",
  "hasToken": true
}
```

Si `hasToken` es `false`, revisa los logs de Vercel.

#### En Desarrollo:
Visita: http://localhost:3000

Deberías ver el mismo JSON con `hasToken: true`

### Paso 6: Intentar publicar un producto

1. Ve a tu dashboard
2. Navega a **"Publicar Producto"**
3. Llena el formulario con datos de prueba:
   - **Título:** "Producto de Prueba"
   - **Categoría:** Cualquier categoría
   - **Precio:** 100.00
   - **Cantidad:** 1
   - **Condición:** Nuevo
   - **Tipo de Publicación:** Gratuita
4. Haz clic en **"Publicar Producto"**

Si todo está correcto, verás:
```
✅ ¡Producto publicado exitosamente! ID: MLM123456789
```

---

## Variables de Entorno Requeridas

Asegúrate de tener estas variables configuradas en Vercel:

```env
# Aplicación de MercadoLibre
APP_ID=664789754446720
APP_SECRET=tu_app_secret

# URLs
REDIRECT_URI=https://mercado-libre-dashboard.vercel.app/api/callback

# Vercel KV (Base de datos Redis)
KV_REST_API_URL=https://endless-opossum-45260.upstash.io
KV_REST_API_TOKEN=tu_kv_token
KV_REST_API_READ_ONLY_TOKEN=tu_read_only_token
KV_URL=redis://default:...
REDIS_URL=redis://default:...

# Puerto (para desarrollo local)
PORT=3000
```

---

## Logs útiles para debugging

### Backend (Vercel Function Logs):

Logs exitosos después de re-autorizar:
```
✅ Access token obtained successfully
🔍 Granted Scopes: offline_access read write
✅ Tokens saved to Vercel KV (REST)
```

Logs al crear un producto:
```
🔑 Using token to create item (length): 64
📦 Creating item with data: {...}
✅ Item created successfully with ID: MLM123456789
✅ Description added successfully
```

### Frontend (Console del navegador):

Si hay error:
```javascript
Error creating product: {
  error: "Unauthorized scopes",
  message: "Your app does not have permission..."
}
```

Si es exitoso:
```javascript
Product created: {
  success: true,
  item: { id: "MLM123456789", ... }
}
```

---

## Mejoras Implementadas (Última actualización)

### Backend (`backend/src/routes/items.ts`):
- ✅ `listing_type_id` por defecto es `'free'` para evitar problemas de permisos
- ✅ Descripción se agrega en 2 pasos (primero crea item, luego agrega descripción)
- ✅ Soporte para garantía (`warranty_type` y `warranty_time`)
- ✅ Soporte para atributos personalizados
- ✅ Límite de 6 imágenes (máximo según MercadoLibre)
- ✅ Mejor manejo de errores y logging detallado

### Frontend (`src/app/publish-product/`):
- ✅ Campo: Tipo de Publicación (Gratuita, Bronce, Plata, Oro)
- ✅ Campo: Tipo de Garantía (Sin garantía, del vendedor, de fábrica)
- ✅ Campo: Tiempo de Garantía (90 días, 6 meses, 1 año, 2 años)
- ✅ Opción "Reacondicionado" en condición del producto
- ✅ Validación mejorada de campos requeridos

### OAuth (`backend/src/auth/oauth.ts`):
- ✅ Scopes configurados: `offline_access read write`
- ✅ Carga de tokens desde Vercel KV con REST API
- ✅ Refresh automático de tokens cuando expiran
- ✅ Logging detallado de scopes otorgados

---

## Solución de Problemas Adicionales

### El token se carga pero sigue dando error de scopes

**Causa:** El token guardado es antiguo y no tiene los scopes correctos

**Solución:**
1. Elimina el token de Vercel KV manualmente (desde el dashboard de Vercel)
2. Re-autoriza la aplicación visitando `/api/auth`

### Error 400: Invalid item data

**Causa:** Algún campo del producto tiene un formato inválido

**Solución:**
- Verifica que el `category_id` sea válido para México (debe empezar con "MLM")
- Asegúrate de que `price` y `available_quantity` sean números válidos
- El título no debe exceder 60 caracteres
- Las URLs de imágenes deben ser accesibles públicamente

### Error 403: Listing type not available

**Causa:** Tu cuenta no tiene acceso a tipos de publicación premium

**Solución:**
- Cambia `listing_type_id` a `'free'` en el formulario
- Los tipos premium (gold_special, gold_premium) requieren una cuenta verificada

### El producto se crea pero sin descripción

**Esto es normal.** La descripción se agrega en un segundo paso. Si falla, el producto se crea de todas formas sin descripción. Puedes agregar la descripción manualmente después desde MercadoLibre.

---

## Contacto y Recursos

- **Documentación de MercadoLibre:** https://developers.mercadolibre.com.mx
- **Panel de aplicaciones:** https://developers.mercadolibre.com.mx/apps
- **Foro de desarrolladores:** https://developers.mercadolibre.com.mx/forum

---

## Checklist Final

Antes de intentar publicar, verifica:

- [ ] Los scopes están habilitados en el panel de MercadoLibre
- [ ] La Redirect URI coincide exactamente
- [ ] Has revocado la autorización previa (opcional)
- [ ] Has re-autorizado visitando `/api/auth`
- [ ] La pantalla de confirmación muestra: `Scopes: offline_access read write`
- [ ] `/api` devuelve `hasToken: true`
- [ ] Las variables de entorno están configuradas en Vercel
- [ ] El código actualizado está desplegado en Vercel

Si todos los puntos están marcados y aún tienes problemas, revisa los logs de Vercel para más detalles.
