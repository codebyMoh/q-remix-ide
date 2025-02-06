import express from 'express';
import { compileCode } from '../controllers/editorController';

const router = express.Router();


router.post('/compile', (req, res) => {
    compileCode(req, res).catch((error) => {
        console.error('Unhandled error in compileCode:', error);
        res.status(500).json({ error: 'Internal server error' });
    });
});

export default router;