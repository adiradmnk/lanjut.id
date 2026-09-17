import { Router, Request, Response } from 'express';
import { checkAiHealth, requestAiInference } from '../services/aiClient';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const aiHealth = await checkAiHealth();
  res.json({
    service: 'core-backend-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dependencies: {
      ai_service: aiHealth
    }
  });
});

router.post('/prompt', async (req: Request, res: Response): Promise<void> => {
  const { prompt, model_type } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  try {
    const aiResponse = await requestAiInference({ prompt, model_type });
    res.json({
      success: true,
      routed_through: 'core-backend',
      result: aiResponse
    });
  } catch (error: any) {
    res.status(502).json({
      success: false,
      error: 'Failed to communicate with AI microservice',
      detail: error.message
    });
  }
});

export default router;
