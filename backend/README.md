# MercadoLibre Dashboard Backend

Backend server for the MercadoLibre Dashboard with OAuth 2.0 authentication and API integration.

## 🚀 Features

- ✅ OAuth 2.0 authentication with MercadoLibre API
- ✅ Automatic token refresh (tokens expire every 6 hours)
- ✅ RESTful API endpoints for orders and shipments
- ✅ CORS enabled for Angular frontend
- ✅ TypeScript support
- ✅ Token persistence to file

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MercadoLibre Developer Account with App ID and Secret

## 🔧 Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. The `.env` file is already configured with your credentials:
```env
APP_ID=664789754446720
APP_SECRET=hsOXl8f4XWvzts2YDdrSYs5Lux5jm9HK
REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

## 🎯 Usage

### First Time Setup (OAuth Authorization)

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and visit:
```
http://localhost:3000/auth
```

3. You'll be redirected to MercadoLibre's authorization page
4. Click "Authorize" to grant access
5. You'll be redirected back and see a success message
6. The access token will be saved to `tokens.json`

### Running the Server

For development with auto-reload:
```bash
npm run dev
```

For production:
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```
GET http://localhost:3000/
```
Returns server status and token validity.

### OAuth Authorization
```
GET http://localhost:3000/auth
```
Redirects to MercadoLibre authorization page.

### OAuth Callback
```
GET http://localhost:3000/callback?code=AUTH_CODE
```
Automatically called by MercadoLibre after authorization.

### Get Orders
```
GET http://localhost:3000/api/orders
```
Returns all orders from your MercadoLibre account.

**Query Parameters:**
- `offset` - Pagination offset
- `limit` - Number of results per page
- `sort` - Sort order (default: `date_desc`)

**Response:**
```json
[
  {
    "id": 123456789,
    "date_created": "2024-01-15T10:30:00.000Z",
    "fulfilled": true,
    "total_amount": 1500.00,
    "order_items": [...],
    "shipping": { "id": 987654321 }
  }
]
```

### Get Shipment
```
GET http://localhost:3000/api/shipments/:id
```
Returns shipment details including shipping costs.

**Response:**
```json
{
  "id": 987654321,
  "order_id": 123456789,
  "listCost": 150.00,
  "orderCost": 120.00,
  "status": "delivered"
}
```

## 🔄 Token Management

- Tokens are automatically refreshed when they expire
- Token refresh runs every hour via cron job
- Tokens are persisted to `tokens.json`
- Access tokens expire after 6 hours

## 🛠 Development

### Project Structure
```
backend/
├── src/
│   ├── auth/
│   │   └── oauth.ts          # OAuth 2.0 authentication logic
│   ├── routes/
│   │   ├── orders.ts         # Orders API endpoints
│   │   └── shipments.ts      # Shipments API endpoints
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── server.ts             # Express server setup
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled production server

## 🔐 Security Notes

- ⚠️ Never commit `.env` or `tokens.json` to version control
- ✅ Both files are already in `.gitignore`
- ✅ Keep your `APP_SECRET` secure

## 🐛 Troubleshooting

### "No token available" error
Visit `http://localhost:3000/auth` to authorize the app.

### CORS errors from frontend
Make sure the backend is running on port 3000 and the frontend on port 4200.

### Token refresh fails
Delete `tokens.json` and re-authorize the app at `/auth`.

## 📚 MercadoLibre API Documentation

- [OAuth 2.0 Guide](https://developers.mercadolibre.com.mx/es_ar/autenticacion-y-autorizacion)
- [Orders API](https://developers.mercadolibre.com.mx/es_ar/orders-management)
- [Shipping API](https://developers.mercadolibre.com.mx/es_ar/shipping)

## 🤝 Integration with Frontend

The Angular frontend should already be configured to call `http://localhost:3000/api/orders` and `http://localhost:3000/api/shipments/:id`.

Make sure both servers are running:
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:4200`
