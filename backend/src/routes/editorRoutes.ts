import express, { Request, Response, NextFunction } from 'express';
import { compileCode } from '../controllers/editorController';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const compileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

router.post(
  '/compile',
  compileLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    compileCode(req, res).catch(next); // Handle promise rejection
  }
);

export default router;