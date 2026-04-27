import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import * as nodeCrypto from 'crypto';
import { Blob as NodeBlob } from 'buffer';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

// Runtime polyfills for older Node environments (e.g. Node < 18)
const globalAny: any = globalThis as any;

// 1) Polyfill global crypto.randomUUID (used by @nestjs/schedule)
if (!globalAny.crypto || typeof globalAny.crypto.randomUUID !== 'function') {
  const randomUUID =
    (nodeCrypto as any).randomUUID ??
    (() => nodeCrypto.randomBytes(16).toString('hex'));

  globalAny.crypto = {
    ...(globalAny.crypto || {}),
    randomUUID,
  };
}

// 2) Minimal Headers polyfill (some Google libs expect global Headers)
if (typeof globalAny.Headers === 'undefined') {
  class SimpleHeaders {
    private readonly map = new Map<string, string>();

    constructor(init?: any) {
      if (!init) return;
      if (Array.isArray(init)) {
        for (const [k, v] of init) {
          this.set(k, v);
        }
      } else if (typeof init === 'object') {
        for (const key of Object.keys(init)) {
          this.set(key, (init as any)[key]);
        }
      }
    }

    append(name: string, value: string) {
      const key = name.toLowerCase();
      const existing = this.map.get(key);
      this.map.set(key, existing ? `${existing}, ${value}` : value);
    }

    set(name: string, value: string) {
      this.map.set(name.toLowerCase(), value);
    }

    get(name: string): string | null {
      const value = this.map.get(name.toLowerCase());
      return typeof value === 'undefined' ? null : value;
    }

    forEach(callback: (value: string, name: string) => void) {
      this.map.forEach((value, key) => callback(value, key));
    }
  }

  globalAny.Headers = SimpleHeaders;
}

// 3) Minimal Blob polyfill (used by some fetch/Google client internals)
if (typeof globalAny.Blob === 'undefined' && typeof NodeBlob !== 'undefined') {
  globalAny.Blob = NodeBlob;
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'server';

  let httpsOptions: HttpsOptions | undefined = undefined;

  if (isProduction) {
    // SSL Certificate paths - using your existing certificates for production
    const sslBase = '/home/customdevnewonli/public_html/ssl';
    try {
      httpsOptions = {
        key: readFileSync(`${sslBase}/customdevnewonli.key`),
        cert: readFileSync(`${sslBase}/customdevnewonli.crt`),
        ca: readFileSync(`${sslBase}/customdevnewonli.ca`),
      };
      console.log('🔒 HTTPS enabled for production environment');
    } catch (error) {
      console.warn('⚠️ SSL certificates not found, falling back to HTTP');
    }
  }

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
    logger: isProduction ? ['error', 'warn', 'log'] : ['debug', 'error', 'warn', 'log']
  });

  const reflector = app.get(Reflector);

  // Trust proxy for production - using Express instance directly
  if (isProduction) {
    const expressInstance = app.getHttpAdapter().getInstance();
    if (expressInstance.set) { // Check if set method exists (Express)
      expressInstance.set('trust proxy', 1);
    }
  }

  const defaultProdOrigins = [
    'https://custom-dev.onlinetestingserver.com',
    'http://custom-dev.onlinetestingserver.com',
  ];
  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4200',
    'http://127.0.0.1:4200',
  ];
  /** Comma-separated extra origins (staging domains, tunnel URLs, etc.). */
  const corsOriginsFromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  /**
   * When unset/false: production still allows browsers on `http(s)://localhost` / `127.0.0.1` (any port)
   * so a local UI can call the deployed API. Set `CORS_STRICT_PRODUCTION=true` to allow only prod domains + CORS_ORIGINS.
   */
  const strictProduction =
    process.env.CORS_STRICT_PRODUCTION === '1' ||
    process.env.CORS_STRICT_PRODUCTION === 'true' ||
    process.env.CORS_STRICT_PRODUCTION === 'yes';

  const staticAllowList = isProduction
    ? strictProduction
      ? [...defaultProdOrigins]
      : [...defaultProdOrigins, ...defaultDevOrigins]
    : [...defaultDevOrigins];
  const corsAllowedOrigins = [...new Set([...staticAllowList, ...corsOriginsFromEnv])];
  const allowedOriginSet = new Set(corsAllowedOrigins);

  const localhostOriginOk = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOriginSet.has(origin)) {
        return callback(null, true);
      }
      const allowLooseLocalhost = !(isProduction && strictProduction);
      if (allowLooseLocalhost && localhostOriginOk(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  if (isProduction && !strictProduction) {
    console.log('🌐 CORS: production API allows requests from localhost / 127.0.0.1 (any port). Set CORS_STRICT_PRODUCTION=true to disable.');
  }

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global serialization interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Global transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Note: JWT guard is now registered as APP_GUARD in CommonModule
  // This ensures it runs before RolesGuard and has access to DI container

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('File Management API')
    .setDescription('File management system with user authentication')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Swagger available at api-docs
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 8858;
  await app.listen(port);

  // Environment-specific log messages
  const protocol = isProduction && httpsOptions ? 'https' : 'http';
  const domain = isProduction ? 'custom-dev.onlinetestingserver.com' : 'localhost';

  console.log(`🚀 Application is running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📍 Server: ${protocol}://${domain}:${port}/api/v1`);
  console.log(`📚 Swagger: ${protocol}://${domain}:${port}/api-docs`);

  if (isProduction && httpsOptions) {
    console.log('🔒 SSL/TLS Encryption: Enabled');
  }
}

bootstrap();