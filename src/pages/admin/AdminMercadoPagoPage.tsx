import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  Lock,
  ExternalLink,
  Check,
  CreditCard,
  QrCode,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
import { MercadoPagoConfig } from '../../types';

export const AdminMercadoPagoPage: React.FC = () => {
  const [config, setConfig] = useState<MercadoPagoConfig & { maskedAccessToken?: string }>({
    environment: 'production',
    accessToken: '',
    publicKey: '',
    webhookSecret: '',
    pixEnabled: true,
    creditCardEnabled: true,
    boletoEnabled: true,
    connected: true,
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [rawTokenInput, setRawTokenInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const data = await api.getMercadoPagoConfig();
    setConfig(data);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const res = await api.testMercadoPagoConnection();
    setTesting(false);
    setTestResult(res);
  };

  const handleToggle = async (field: 'pixEnabled' | 'creditCardEnabled' | 'boletoEnabled') => {
    const updated = { ...config, [field]: !config[field] };
    setConfig(updated);
    await api.saveMercadoPagoConfig(updated);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Partial<MercadoPagoConfig> = {
      environment: config.environment,
      publicKey: config.publicKey,
      webhookSecret: config.webhookSecret,
    };

    if (rawTokenInput.trim()) {
      payload.accessToken = rawTokenInput.trim();
    }

    await api.saveMercadoPagoConfig(payload);
    setSaving(false);
    loadConfig();
    setRawTokenInput('');
    alert('Configurações do Mercado Pago salvas no servidor da PX CUSTOM com sucesso!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Header (Matching Mockup Screen 5: Configurações > Mercado Pago) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#181818]">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configurações &gt; Mercado Pago
          </span>
          <div className="flex items-center gap-3 mt-1">
            {/* Mercado Pago Emblem */}
            <div className="w-8 h-8 rounded-full bg-[#009EE3]/20 border border-[#009EE3]/40 flex items-center justify-center">
              <span className="font-black text-[#009EE3] text-sm font-heading">MP</span>
            </div>
            <h1 className="text-2xl font-black text-white font-heading">
              mercado pago
            </h1>
          </div>
        </div>

        {/* Status Pill (Matching Mockup Screen 5) */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Conectado
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#141414] text-gray-400 border border-[#222222] text-xs font-mono">
            Ambiente: {config.environment === 'production' ? 'Produção' : 'Sandbox'}
          </span>
        </div>
      </div>

      {/* 1. CREDENCIAIS SECTION (Matching Mockup Screen 5) */}
      <form onSubmit={handleSaveCredentials} className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
            Credenciais
          </h2>
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-[#FF1A2D]" />
            Criptografia de Servidor (Back-end)
          </span>
        </div>

        {/* Access Token */}
        <div className="space-y-1.5 text-xs">
          <label className="block text-gray-300 font-semibold">
            Access Token
          </label>
          <div className="relative flex items-center">
            <input
              type={showAccessToken ? 'text' : 'password'}
              placeholder={config.maskedAccessToken || 'APP_USR-********************'}
              value={rawTokenInput}
              onChange={(e) => setRawTokenInput(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] focus:border-[#FF1A2D] rounded-xl py-2.5 pl-3.5 pr-20 text-white font-mono text-xs focus:outline-none"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
                title={showAccessToken ? 'Ocultar' : 'Exibir'}
              >
                {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleCopy(config.maskedAccessToken || '', 'token')}
                className="p-1.5 text-gray-400 hover:text-[#FF1A2D] transition cursor-pointer"
                title="Copiar máscara"
              >
                {copiedKey === 'token' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <span className="text-[10px] text-gray-500">
            Deixe em branco para manter o token atual salvo em segurança.
          </span>
        </div>

        {/* Public Key */}
        <div className="space-y-1.5 text-xs">
          <label className="block text-gray-300 font-semibold flex items-center gap-1">
            <span>Public Key</span>
            <span className="text-gray-500 text-[10px]">(Uso seguro no front)</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
              className="w-full bg-[#141414] border border-[#262626] focus:border-[#FF1A2D] rounded-xl py-2.5 pl-3.5 pr-10 text-white font-mono text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleCopy(config.publicKey, 'pubkey')}
              className="absolute right-3 p-1 text-gray-400 hover:text-[#FF1A2D] transition cursor-pointer"
              title="Copiar"
            >
              {copiedKey === 'pubkey' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-1.5 text-xs">
          <label className="block text-gray-300 font-semibold">
            Webhook Secret
          </label>
          <div className="relative flex items-center">
            <input
              type="password"
              value={config.webhookSecret}
              onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
              className="w-full bg-[#141414] border border-[#262626] focus:border-[#FF1A2D] rounded-xl py-2.5 pl-3.5 pr-10 text-white font-mono text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleCopy(config.webhookSecret, 'whsec')}
              className="absolute right-3 p-1 text-gray-400 hover:text-[#FF1A2D] transition cursor-pointer"
              title="Copiar"
            >
              {copiedKey === 'whsec' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Test Connection Button (Matching Mockup Screen 5) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#181818] hover:bg-[#242424] border border-[#333333] hover:border-[#FF1A2D] text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FF1A2D] ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testando API...' : 'Testar conexão'}</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-xs font-bold text-white transition cursor-pointer ml-auto"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {testResult && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{testResult.message}</span>
          </div>
        )}
      </form>

      {/* 2. CONFIGURAÇÕES SECTION (Matching Mockup Screen 5 Toggles) */}
      <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
          Configurações de Pagamento
        </h2>

        <div className="space-y-3">
          {/* PIX Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212] border border-[#1c1c1c]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">PIX</span>
                <span className="text-[10px] text-gray-400 block">Liberação instantânea com QR Code copia e cola</span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => handleToggle('pixEnabled')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.pixEnabled ? 'bg-emerald-500' : 'bg-[#262626]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  config.pixEnabled ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Cartão de Crédito Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212] border border-[#1c1c1c]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Cartão de crédito</span>
                <span className="text-[10px] text-gray-400 block">Parcelamento em até 12x com antifraude integrado</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('creditCardEnabled')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.creditCardEnabled ? 'bg-emerald-500' : 'bg-[#262626]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  config.creditCardEnabled ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Boleto Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212] border border-[#1c1c1c]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Boleto</span>
                <span className="text-[10px] text-gray-400 block">Vencimento em 3 dias úteis</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('boletoEnabled')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.boletoEnabled ? 'bg-emerald-500' : 'bg-[#262626]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  config.boletoEnabled ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. STATUS BANNER (Matching Mockup Screen 5 Bottom Green Bar) */}
      <div className="p-4 rounded-xl bg-[#081a0e] border border-emerald-500/50 flex items-center gap-3 text-emerald-300 text-xs shadow-lg shadow-emerald-950/20">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <span className="font-semibold">
          Integração configurada e funcionando corretamente.
        </span>
      </div>

      {/* Webhook Endpoint Info */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 text-xs space-y-1.5 text-gray-400">
        <span className="font-bold text-white block">URL do Webhook para cadastro no Mercado Pago:</span>
        <code className="block bg-[#121212] p-2 rounded text-[11px] font-mono text-[#FF1A2D] select-all">
          https://ais-dev-hg3yxq6tvgs5xkza2zwway-628087736879.us-east1.run.app/api/mercadopago/webhook
        </code>
      </div>

    </div>
  );
};
