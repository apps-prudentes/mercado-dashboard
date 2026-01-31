// setup-appwrite.ts - REST API sin dependencias extras
const API_KEY = 'standard_fc6da658f90802caab6f7d3ca34512851cdf44c31c2d0451333b481721a3ae5ac9f77910b9e8d11eea99f4d74fa3c36fadc80954cebe2856034c48ce344eb71bf036032b9b2a76ccadc3b58330c8d767b002959dbb2e6bb5e52e0a339cbf6f104a462d9694b151d76787e7f6a1830811c14d6c369acda451d8d96c4b21886ca7';
const PROJECT_ID = '697a48140027955e784e';
const DATABASE_ID = '697a5575001e861c57a2';
const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';

async function createCollection(collectionId: string, name: string, attributes: any[]) {
  try {
    // Crear colección
    const collRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collectionId,
        name,
        documentSecurity: true,
      }),
    });

    if (collRes.status === 409) {
      console.log(`⚠️  ${name} ya existe`);
      return;
    }

    if (!collRes.ok) {
      throw new Error(`Error creando colección: ${collRes.statusText}`);
    }

    console.log(`✅ ${name} creada`);

    // Agregar atributos
    for (const attr of attributes) {
      await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/${attr.type}`, {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attr),
      });
    }

    console.log(`   └─ ${attributes.length} atributos agregados`);

  } catch (error: any) {
    console.error(`❌ Error en ${name}:`, error.message);
  }
}

async function main() {
  console.log('📦 Creando colecciones en Appwrite...\n');

  // Colección 1: scheduled_publications
  console.log('1️⃣ Creando: scheduled_publications');
  await createCollection('scheduled_publications', 'scheduled_publications', [
    { key: 'userId', type: 'string', required: true, size: 255 },
    { key: 'itemId', type: 'string', required: true, size: 255 },
    { key: 'originalTitle', type: 'string', required: true, size: 500 },
    { key: 'originalDescription', type: 'string', required: false, size: 5000 },
    { key: 'frequencyInterval', type: 'integer', required: true },
    { key: 'frequencyUnit', type: 'string', required: true, size: 50 },
    { key: 'variateDescription', type: 'boolean', required: false, default: false },
    { key: 'maxPublications', type: 'integer', required: false },
    { key: 'isActive', type: 'boolean', required: true, default: true },
    { key: 'lastPublishedAt', type: 'datetime', required: false },
    { key: 'nextPublishAt', type: 'datetime', required: true },
    { key: 'variationHistory', type: 'string', required: false, size: 10000 },
    { key: 'createdAt', type: 'datetime', required: true },
    { key: 'updatedAt', type: 'datetime', required: true },
  ]);

  // Colección 2: publication_history
  console.log('\n2️⃣ Creando: publication_history');
  await createCollection('publication_history', 'publication_history', [
    { key: 'scheduleId', type: 'string', required: true, size: 255 },
    { key: 'userId', type: 'string', required: true, size: 255 },
    { key: 'itemId', type: 'string', required: true, size: 255 },
    { key: 'publishedTitle', type: 'string', required: true, size: 500 },
    { key: 'publishedDescription', type: 'string', required: false, size: 5000 },
    { key: 'newListingId', type: 'string', required: false, size: 255 },
    { key: 'status', type: 'string', required: true, size: 50 },
    { key: 'errorMessage', type: 'string', required: false, size: 1000 },
    { key: 'generatedAt', type: 'datetime', required: true },
    { key: 'publishedAt', type: 'datetime', required: false },
    { key: 'variationIndex', type: 'integer', required: false },
  ]);

  console.log('\n🎉 Listo! Las colecciones están creadas o ya existen');
}

main().catch(console.error);
