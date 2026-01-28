export const environment = {
    production: true,
    apiUrl: '/api',
    appwrite: {
        endpoint: 'https://nyc.cloud.appwrite.io/v1',
        projectId: '697a48140027955e784e',
        databaseId: '697a5575001e861c57a2', // ID de la base de datos
        collections: {
            userPreferences: 'user_preferences' // ID de la colección de preferencias
        }
    }
};
