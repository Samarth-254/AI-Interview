import 'dotenv/config';

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'LLM_API_KEY',
  'VAPI_API_KEY',
  'VAPI_WEBHOOK_SECRET',
  'BREVO_API_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[env] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!process.env.BACKEND_URL || process.env.BACKEND_URL.includes('YOUR_NGROK')) {
  console.warn('[env] ⚠️  BACKEND_URL is not set to a public URL. Vapi cannot reach your webhook at localhost:4000.');
  console.warn('[env]     Run: npx ngrok http 4000  then set BACKEND_URL=https://<your-ngrok-id>.ngrok-free.app in backend/.env');
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  llmApiKey: process.env.LLM_API_KEY,
  vapiApiKey: process.env.VAPI_API_KEY,
  vapiWebhookSecret: process.env.VAPI_WEBHOOK_SECRET,
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderEmail: process.env.EMAIL_FROM || 'no-reply@interviewai.com',
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'InterviewAI',
};
