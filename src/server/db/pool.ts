// PX CUSTOM — Infraestrutura Isolada de Conexão MySQL (Etapa 1 - Homologação)
// Este módulo opera de forma desacoplada: NÃO inicia conexões automaticamente a menos
// que as variáveis explícitas de ambiente MySQL estejam configuradas.
// NUNCA expõe senhas, hosts ou detalhes internos em logs ou erros.

import mysql from 'mysql2/promise';

export interface MySqlConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionLimit?: number;
  connectTimeout?: number;
}

let poolInstance: mysql.Pool | null = null;
let isShutdownRegistered = false;

/**
 * Valida se as variáveis mínimas necessárias para conexão MySQL estão presentes.
 */
export function isMySqlConfigured(): boolean {
  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  return Boolean(host && user && database);
}

/**
 * Retorna as configurações sanitizadas extraídas das variáveis de ambiente.
 */
export function getSanitizedConfig(): {
  isConfigured: boolean;
  port: number;
  database: string;
  connectionLimit: number;
} {
  return {
    isConfigured: isMySqlConfigured(),
    port: Number(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE?.trim() || '',
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
  };
}

/**
 * Obtém ou inicializa o pool de conexões MySQL de forma preguiçosa (lazy).
 * Se as variáveis de ambiente não estiverem configuradas, retorna null
 * sem gerar erros ou derrubar o processo.
 */
export function getMySqlPool(): mysql.Pool | null {
  if (!isMySqlConfigured()) {
    return null;
  }

  if (poolInstance) {
    return poolInstance;
  }

  try {
    const config: mysql.PoolOptions = {
      host: process.env.MYSQL_HOST?.trim(),
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER?.trim(),
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE?.trim(),
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 10000, // Timeout seguro de 10s para evitar travamento
      timezone: '-03:00',
    };

    poolInstance = mysql.createPool(config);

    // Registra graceful shutdown para fechar conexões abertas ao encerrar processo
    if (!isShutdownRegistered) {
      isShutdownRegistered = true;
      const gracefulShutdown = async () => {
        if (poolInstance) {
          try {
            await poolInstance.end();
            poolInstance = null;
          } catch {
            // Encerramento silencioso seguro
          }
        }
      };

      process.once('SIGTERM', gracefulShutdown);
      process.once('SIGINT', gracefulShutdown);
    }

    return poolInstance;
  } catch (err: any) {
    // Log estritamente sanitizado — sem credenciais
    console.error('[PX MYSQL POOL] Erro na criação da configuração do pool:', err?.code || 'CONFIG_ERROR');
    return null;
  }
}

/**
 * Executa uma verificação segura de conectividade (ping) com timeout restrito.
 * Retorna status genérico sem expor dados confidenciais.
 */
export async function testConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  status: 'UNCONFIGURED' | 'CONNECTED' | 'ERROR';
  code?: string;
}> {
  if (!isMySqlConfigured()) {
    return {
      configured: false,
      connected: false,
      status: 'UNCONFIGURED',
    };
  }

  const pool = getMySqlPool();
  if (!pool) {
    return {
      configured: true,
      connected: false,
      status: 'ERROR',
      code: 'POOL_INIT_FAILED',
    };
  }

  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1 AS ping');
    return {
      configured: true,
      connected: true,
      status: 'CONNECTED',
    };
  } catch (err: any) {
    const safeCode = err?.code || 'CONNECTION_FAILED';
    return {
      configured: true,
      connected: false,
      status: 'ERROR',
      code: safeCode,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Encerra explicitamente o pool de conexões (usado em testes e shutdown).
 */
export async function closeMySqlPool(): Promise<void> {
  if (poolInstance) {
    try {
      await poolInstance.end();
    } catch {
      // Ignora erro no fechamento
    } finally {
      poolInstance = null;
    }
  }
}
