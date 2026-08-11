export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'comercial',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },

  siesa: {
    baseUrl: process.env.SIESA_BASE_URL ?? '',
    conniKey: process.env.SIESA_CONNI_KEY ?? '',
    conniToken: process.env.SIESA_CONNI_TOKEN ?? '',
    username: process.env.SIESA_USERNAME ?? '',
    password: process.env.SIESA_PASSWORD ?? '',
    companyId: process.env.SIESA_COMPANY_ID ?? '',
    timeoutMs: parseInt(process.env.SIESA_TIMEOUT_MS ?? '15000', 10),
  },

  priceLists: {
    baseUrl:
      process.env.PRICE_LISTS_BASE_URL ??
      'https://apiconsulta.grupo-santacruz.com',
    token: process.env.PRICE_LISTS_TOKEN ?? '',
    timeoutMs: parseInt(process.env.PRICE_LISTS_TIMEOUT_MS ?? '30000', 10),
  },
});
