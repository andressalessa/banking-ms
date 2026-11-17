import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUrl, Max, Min, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class Env {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  ACCOUNTS_PORT: number = 3001;

  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
  @IsNotEmpty()
  ACCOUNTS_DATABASE_URL: string;
}

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n')}`);
  }
  return env;
}
