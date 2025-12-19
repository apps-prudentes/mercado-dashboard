import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { mlAuth } from '../auth/oauth';

const router = Router();

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.'));
        }
    }
});

/**
 * POST /api/images/upload
 * Upload an image to MercadoLibre CDN
 *
 * Uses the /pictures/items/upload endpoint which allows uploading images
 * without needing to associate them with a specific item ID first.
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({
                error: 'No file uploaded',
                message: 'Please provide an image file'
            });
            return;
        }

        // Get valid access token
        const token = await mlAuth.getToken();

        console.log('📸 Uploading image to ML CDN...');
        console.log('  - File name:', req.file.originalname);
        console.log('  - File size:', (req.file.size / 1024).toFixed(2), 'KB');
        console.log('  - MIME type:', req.file.mimetype);

        // Create form data with the image file
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Upload to MercadoLibre CDN using the pictures/items/upload endpoint
        // This endpoint doesn't require an item ID
        const uploadResponse = await axios.post(
            'https://api.mercadolibre.com/pictures/items/upload',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        console.log('✅ Image uploaded successfully!');
        console.log('  - Image ID:', uploadResponse.data.id);
        console.log('  - Variations:', uploadResponse.data.variations?.length || 0);

        // Return the full response from ML
        res.json(uploadResponse.data);

    } catch (error: any) {
        console.error('❌ Error uploading image:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Access token is invalid or expired. Please re-authorize the app.',
                details: error.response.data
            });
            return;
        }

        if (error.response?.status === 400) {
            res.status(400).json({
                error: 'Invalid image',
                message: 'The image does not meet MercadoLibre requirements (JPG/PNG, 500x500 to 1920x1920, max 10MB)',
                details: error.response.data
            });
            return;
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to upload image',
            message: error.response?.data?.message || error.message,
            details: error.response?.data
        });
    }
});

export default router;
