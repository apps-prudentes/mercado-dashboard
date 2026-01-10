export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api',
    appwrite: {
        endpoint: 'https://nyc.cloud.appwrite.io/v1',
        projectId: '6945f16200205ab1a28e',
        databaseId: '695ef9f00023c888da5e', // ID de la base de datos
        collections: {
            userPreferences: 'user_preferences' // ID de la colección de preferencias
        }
    }
};
