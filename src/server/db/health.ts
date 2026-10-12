// PX CUSTOM — Verificação Isolada de Integridade do Banco (Health Check)
// Retorna exclusivamente status genérico, sem vazar host, usuário, banco ou senhas.

import { isMySqlConfigured, testConnection } from './pool.ts';

export interface DatabaseHealthResult {
  status: 'UNCONFIGURED' | 'CONNECTED' | 'ERROR';
  configured: boolean;
  message: string;
}

/**
 * Avalia a saúde da infraestrutura de banco de dados sem expor detalhes internos.
 */
export async function getDatabaseHealth(): Promise<DatabaseHealthResult> {
  if (!isMySqlConfigured()) {
    return {
      status: 'UNCONFIGURED',
      configured: false,
      message: 'Banco MySQL de homologação não configurado no ambiente atual.',
    };
  }

  const result = await testConnection();

  if (result.connected) {
    return {
      status: 'CONNECTED',
      configured: true,
      message: 'Conexão com o banco MySQL de homologação estabelecida com sucesso.',
    };
  }

  return {
    status: 'ERROR',
    configured: true,
    message: 'Não foi possível conectar ao banco MySQL de homologação. Verifique as credenciais.',
  };
}
