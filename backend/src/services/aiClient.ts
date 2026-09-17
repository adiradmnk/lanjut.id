import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface PromptPayload {
  prompt: string;
  model_type?: string;
  max_tokens?: number;
}

export const checkAiHealth = async () => {
  try {
    const res = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    return { status: 'healthy', data: res.data };
  } catch (err: any) {
    return { status: 'unhealthy', error: err.message };
  }
};

export const requestAiInference = async (payload: PromptPayload) => {
  const res = await axios.post(`${AI_SERVICE_URL}/api/v1/analyze`, payload, {
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });
  return res.data;
};
