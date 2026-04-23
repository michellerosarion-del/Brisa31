import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Percent } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StoreSettings as StoreSettingsType, InstallmentFee } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface StoreSettingsProps {
  storeSettings: StoreSettingsType;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  toNum: (val: any) => number;
  onRefresh?: () => void;
}

export const StoreSettings = ({ storeSettings, showNotification, toNum, onRefresh }: StoreSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(storeSettings?.logo_url || '');
  const [taxas, setTaxas] = useState<any[]>(
    (storeSettings?.taxasParcelamento || 
    Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, fee: 0 })))
    .map(t => ({ ...t, fee: String(t.fee).replace('.', ',') }))
  );

  useEffect(() => {
    if (storeSettings?.taxasParcelamento) {
      setTaxas(storeSettings.taxasParcelamento.map(t => ({ ...t, fee: String(t.fee).replace('.', ',') })));
    }
  }, [storeSettings?.taxasParcelamento]);

  const handleUpdateSettings = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const processedTaxas = taxas.map(t => {
      const numFee = toNum(t.fee);
      return {
        installments: t.installments,
        fee: numFee > 100 ? 100 : numFee
      };
    });

    const cardFee = toNum(data.card_fee);
    const processedCardFee = cardFee > 100 ? 100 : cardFee;

    const debitFee = toNum(data.debit_fee);
    const processedDebitFee = debitFee > 100 ? 100 : debitFee;

    try {
      const settingsData = {
        nome_loja: data.nome_loja,
        logo_url: data.logo_url,
        telefone_whatsapp: data.telefone_whatsapp,
        mensagem_padrao_whatsapp: data.mensagem_padrao_whatsapp,
        monthly_goal: toNum(data.monthly_goal),
        card_fee: processedCardFee,
        debit_fee: processedDebitFee,
        low_stock_threshold: toNum(data.low_stock_threshold),
        low_stock_alert_enabled: data.low_stock_alert_enabled === 'on',
        taxasParcelamento: processedTaxas,
        updatedAt: new Date().toISOString()
      };

      if (storeSettings?.id) {
        await updateDoc(doc(db, 'configuracoes', storeSettings.id), settingsData);
        showNotification('Configurações atualizadas com sucesso!');
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      showNotification(err.message || 'Erro ao atualizar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFeeChange = (installments: number, fee: string) => {
    // Allow digits and one comma/dot
    const cleanFee = fee.replace(/[^0-9.,]/g, '');
    setTaxas(prev => prev.map(t => t.installments === installments ? { ...t, fee: cleanFee } : t));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-midnight rounded-2xl flex items-center justify-center text-white shadow-xl shadow-midnight/10">
            <SettingsIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Configurações da Loja</h3>
            <p className="text-gray-500 text-sm">Gerencie as informações básicas e preferências do sistema.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateSettings} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome da Loja</label>
              <input name="nome_loja" defaultValue={storeSettings?.nome_loja} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Meta Mensal (R$)</label>
              <input 
                name="monthly_goal" 
                type="text" 
                inputMode="decimal" 
                defaultValue={String(storeSettings?.monthly_goal || 0).replace('.', ',')} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Logo da Loja (URL)</label>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <input 
                name="logo_url" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
                className="flex-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" 
              />
              {logoUrl && (
                <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                  <img 
                    src={logoUrl} 
                    alt="Preview Logo" 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">WhatsApp de Contato</label>
              <input name="telefone_whatsapp" defaultValue={storeSettings?.telefone_whatsapp} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Taxa de Débito (%)</label>
              <input 
                name="debit_fee" 
                type="text" 
                inputMode="decimal" 
                defaultValue={String(storeSettings?.debit_fee || 0).replace('.', ',')} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Taxa Crédito 1x (%)</label>
              <input 
                name="card_fee" 
                type="text" 
                inputMode="decimal" 
                defaultValue={String(storeSettings?.card_fee || 0).replace('.', ',')} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Mensagem Padrão WhatsApp</label>
            <textarea 
              name="mensagem_padrao_whatsapp" 
              defaultValue={storeSettings?.mensagem_padrao_whatsapp} 
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none resize-none"
            />
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Alerta de Estoque Baixo</p>
                <p className="text-xs text-gray-500">Notificar quando um produto atingir o limite mínimo.</p>
              </div>
              <input 
                type="checkbox" 
                name="low_stock_alert_enabled" 
                defaultChecked={storeSettings?.low_stock_alert_enabled}
                className="w-5 h-5 accent-midnight"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Limite Mínimo Padrão</label>
              <input 
                name="low_stock_threshold" 
                type="number" 
                defaultValue={storeSettings?.low_stock_threshold} 
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" 
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-midnight" />
              <h4 className="text-sm font-bold text-gray-900">Taxas de Parcelamento (Crédito)</h4>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {taxas.filter(t => t.installments > 1).map((t) => (
                <div key={t.installments} className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.installments}x (%)</label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={t.fee}
                    onChange={(e) => handleFeeChange(t.installments, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      </Card>
    </div>
  );
};
