export const APP_NAME = "Base Chat";

export const AUTH_SECRET = process.env.AUTH_SECRET!;

export const COMPANY_NAME = "Acme Corp";

// assert(process.env.BASE_URL);
export const BASE_URL = process.env.BASE_URL!;

// assert(process.env.DATABASE_URL);
export const DATABASE_URL = process.env.DATABASE_URL!;

// assert(process.env.RAGIE_API_BASE_URL);
export const RAGIE_API_BASE_URL = process.env.RAGIE_API_BASE_URL || "https://api.ragie.ai";

// assert(process.env.RAGIE_API_KEY);
export const RAGIE_API_KEY = process.env.RAGIE_API_KEY!;

// assert(process.env.OPENAI_API_KEY);
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// assert(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
export const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

// assert(process.env.ANTHROPIC_API_KEY);
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// assert(process.env.RAGIE_WEBHOOK_SECRET);
export const RAGIE_WEBHOOK_SECRET = process.env.RAGIE_WEBHOOK_SECRET!;

//assert(process.env.ENCRYPTION_KEY)
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

export const SMTP_FROM = process.env.SMTP_FROM!;
export const SMTP_HOST = process.env.SMTP_HOST!;
export const SMTP_PORT = Number(process.env.SMTP_PORT!);
export const SMTP_SECURE = process.env.SMTP_SECURE === "1";
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// Google OAuth configs - Optional
export const AUTH_GOOGLE_ID = process.env.AUTH_GOOGLE_ID;
export const AUTH_GOOGLE_SECRET = process.env.AUTH_GOOGLE_SECRET;
