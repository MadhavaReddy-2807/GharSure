import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://demo-gharsure-project.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("demo-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("demo-service-role-key"),
  
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().default("demo_phone_number_id"),
  META_WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default("demo_waba_id"),
  META_WHATSAPP_ACCESS_TOKEN: z.string().default("demo_access_token"),
  META_GRAPH_API_VERSION: z.string().default("v21.0"),
  META_WHATSAPP_OTP_TEMPLATE_NAME: z.string().default("gharsure_auth_otp"),
  META_WHATSAPP_OTP_TEMPLATE_LANGUAGE: z.string().default("en_US"),
  
  AUTH_SESSION_SECRET: z.string().min(32).default("gharsure-development-super-secure-jwt-signing-key-32-chars-minimum"),
  
  OTP_EXPIRY_SECONDS: z.coerce.number().positive().default(300),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().positive().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().positive().default(5),
  OTP_MAX_SENDS_PER_WINDOW: z.coerce.number().positive().default(5),
  
  OTP_DEV_MOCK_ENABLED: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default(process.env.NODE_ENV === "production" ? "false" : "true"),
  OTP_DEV_MOCK_CODE: z.string().optional().default("123456"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment variable validation failed:", result.error.format());
    throw new Error("Invalid application environment configuration.");
  }
  parsedEnv = result.data;
  return parsedEnv;
}
