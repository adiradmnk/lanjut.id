import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/aiRoutes';
import lanjutRoutes from './routes/lanjutRoutes';
import lanjutApi from './routes/lanjutApi';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', aiRoutes);
app.use('/api/lanjut', lanjutRoutes);
// Blueprint Strict Endpoints: /api/member, /api/merchant, /api/bni
app.use('/api', lanjutApi);

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'core-backend-service',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`Core backend service listening on port ${PORT}`);
});
