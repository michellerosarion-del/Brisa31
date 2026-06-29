import React from 'react';
import { DollarSign, Info, TrendingUp, CreditCard, Percent, Tag } from 'lucide-react';
import { Card } from '../../components/ui/Card';

interface PricingProps {
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  storeSettings: any;
}

export const Pricing = ({ formatCurrency, toNum, storeSettings }: PricingProps) => {
  const [pricingMode, setPricingMode] = React.useState<'margin' | 'markup'>('margin');
  const [pricingData, setPricingData] = React.useState({
    cost: '32',
    frete: '3.33',
    margin: '30',
    cardFee: storeSettings?.card_fee || '16.27'
  });

  const handleInputChange = (key: string, value: string) => {
    if (/^-?\d*[.,]?\d*$/.test(value) || value === '' || value === '-') {
      setPricingData({ ...pricingData, [key]: value });
    }
  };

  const cost = toNum(pricingData.cost);
  const frete = toNum(pricingData.frete);
  const totalCost = cost + frete;
  const feeDecimal = toNum(pricingData.cardFee) / 100;
  const valueDecimal = toNum(pricingData.margin) / 100;

  // Visual warning logic
  const marginValueNum = toNum(pricingData.margin);
  const showMarkupHint = pricingMode === 'margin' && marginValueNum >= 100;

  let suggestedPrice = 0;
  let isImpossible = false;

  if (pricingMode === 'margin') {
    // MARGEM (SOBRE VENDA): lucro desejado como % do preço final
    // Preço = Custo / (1 - Margem - Taxa)
    const divisor = (1 - valueDecimal - feeDecimal);
    if (divisor > 0) {
      suggestedPrice = totalCost / divisor;
    } else {
      isImpossible = true;
      suggestedPrice = 0;
    }
  } else {
    // MARKUP (SOBRE CUSTO): lucro desejado como % em cima do custo
    // Garantindo que o lucro se mantenha mesmo APÓS cobrar a taxa do cartão no final
    // Preço * (1 - Taxa) = Custo * (1 + Markup)
    // Preço = (Custo * (1 + Markup)) / (1 - Taxa)
    const taxDivisor = (1 - feeDecimal);
    if (taxDivisor > 0) {
      suggestedPrice = (totalCost * (1 + valueDecimal)) / taxDivisor;
    } else {
      isImpossible = true;
      suggestedPrice = 0;
    }
  }

  // Rounding for currency
  suggestedPrice = Math.round(suggestedPrice * 100) / 100;

  const valorLiquido = suggestedPrice * (1 - feeDecimal);
  const netProfit = valorLiquido - totalCost;
  const realMarginOnSale = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;
  const realMarkupOnCost = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const equilibriumPrice = feeDecimal < 1 ? totalCost / (1 - feeDecimal) : totalCost;

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-3xl font-black text-[#000000] tracking-tighter">Precificação Estratégica</h2>
          </div>
          <p className="text-base text-[#1f2937] font-medium leading-relaxed max-w-xl pl-1">
            Escolha o modelo de lucro ideal. <span className="font-black">Margem</span> protege o caixa, <span className="font-black">Markup</span> acelera o crescimento.
          </p>
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-xl w-full lg:w-auto shadow-inner">
          <button
            onClick={() => setPricingMode('margin')}
            className={`flex-1 lg:flex-none px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
              pricingMode === 'margin' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-slate-600 hover:text-black'
            }`}
          >
            Margem de Venda
          </button>
          <button
            onClick={() => setPricingMode('markup')}
            className={`flex-1 lg:flex-none px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
              pricingMode === 'markup' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-slate-600 hover:text-black'
            }`}
          >
            Markup s/ Custo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* INPUTS COLUMN */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <Card className="p-8 rounded-[1.5rem] border border-slate-300 shadow-2xl relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-12 -mt-12 border-l border-b border-slate-200" />
            
            <h3 className="font-serif italic text-xs text-slate-600 uppercase tracking-widest mb-6 pb-2 border-b border-slate-100">1. Dados da Operação</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] block pl-1">Custo de Compra</label>
                <div className="group relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" />
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={pricingData.cost}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/30 focus:bg-white focus:border-black outline-none font-black text-xl text-black transition-all shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] block pl-1">Frete / Entregas</label>
                <div className="group relative">
                  <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" />
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={pricingData.frete}
                    onChange={(e) => handleInputChange('frete', e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/30 focus:bg-white focus:border-black outline-none font-black text-xl text-black transition-all shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <h3 className="font-serif italic text-xs text-slate-600 uppercase tracking-widest mb-6 pb-2 border-b border-slate-100">2. Estratégia de Ganho</h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    {pricingMode === 'margin' ? 'Lucro por Venda (%)' : 'Lucro por Acréscimo (%)'}
                  </label>
                  {pricingMode === 'margin' && (
                    <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-200">Máx: 99.9%</span>
                  )}
                </div>
                <div className="group relative">
                  <Percent className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${showMarkupHint ? 'text-red-600' : 'text-slate-400 group-focus-within:text-black'}`} />
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={pricingData.margin}
                    onChange={(e) => handleInputChange('margin', e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 ${showMarkupHint ? 'border-red-500 bg-red-50/30 scale-[0.98]' : 'border-slate-200 bg-slate-50/30 focus:bg-white focus:border-black'} outline-none font-black text-4xl text-black transition-all shadow-md`}
                  />
                  {showMarkupHint && (
                    <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-200 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[11px] text-red-900 font-bold leading-tight">
                         ⚠️ Limite de Margem atingido. Para lucros acima de 100%, mude para <button onClick={() => setPricingMode('markup')} className="underline font-black hover:text-red-600">MARKUP S/ CUSTO</button>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] block pl-1">Taxa Máquina/Cartão (%)</label>
                <div className="group relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" />
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={pricingData.cardFee}
                    onChange={(e) => handleInputChange('cardFee', e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/30 focus:bg-white focus:border-black outline-none font-black text-xl text-black transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="bg-slate-50 p-6 rounded-[1.5rem] flex items-start gap-4 border border-slate-300">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
              <Info className="w-5 h-5 text-blue-700" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest leading-none">Dica de Gestão</p>
              <p className="text-xs text-slate-800 leading-relaxed font-bold">
                {pricingMode === 'margin' 
                  ? "Foca no que sobra no caixa após todas as taxas." 
                  : "Foca no retorno sobre o investimento inicial."}
              </p>
            </div>
          </div>
        </div>

        {/* RESULTS COLUMN */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-10">
          <Card className="text-slate-900 p-8 lg:p-12 rounded-[2.5rem] shadow-2xl border-2 border-slate-200 relative overflow-hidden h-full flex flex-col justify-between group bg-white">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-radial from-slate-100 to-transparent opacity-40 -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-1000" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1 h-5 bg-slate-200 rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800">Análise de Viabilidade</h4>
              </div>
              
              <div className="space-y-12">
                <div className="space-y-4">
                  <label className="text-slate-700 text-sm font-black block border-b border-slate-100 pb-2 max-w-fit pr-8">Preço de venda sugerido</label>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-none text-slate-950 transition-all transform hover:scale-[1.01] cursor-default">
                      {isImpossible ? 'ERRO' : formatCurrency(suggestedPrice)}
                    </h1>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 lg:gap-14 pt-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 block">Lucro p/ Venda</span>
                    <p className={`text-4xl lg:text-5xl font-black ${isImpossible ? 'text-slate-200' : 'text-emerald-700'}`}>
                      {isImpossible ? '---' : formatCurrency(netProfit)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 block">Rentabilidade</span>
                    <p className="text-4xl lg:text-5xl font-black text-slate-950">
                      {isImpossible ? '---' : `${(realMarginOnSale || 0).toFixed(1)}%`}
                    </p>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Margem líquida</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12 p-6 bg-white rounded-2xl border border-slate-300 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-400 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-700 block leading-none">Ponto de Equilíbrio</span>
                  <span className="text-[8px] font-black text-slate-600 block uppercase tracking-tighter">Preço mínimo de faturamento</span>
                </div>
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-950">{formatCurrency(equilibriumPrice)}</span>
            </div>
          </Card>

          {/* AUDIT CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-8 bg-white border border-slate-300 rounded-[2rem] shadow-md hover:shadow-lg space-y-4 hover:border-slate-400 transition-colors">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Fluxo Financeiro</h4>
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200"><CreditCard className="w-3.5 h-3.5 text-slate-700" /></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                  <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.15em]">Bruto:</span>
                  <span className="font-black text-slate-900 text-base">{formatCurrency(suggestedPrice)}</span>
                </div>
                <div className="flex justify-between items-center px-4">
                  <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.15em]">(-) Taxa:</span>
                  <span className="font-black text-rose-600 font-mono text-sm">-{formatCurrency(suggestedPrice * feeDecimal)}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/10 p-4 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-black text-emerald-950 uppercase tracking-widest leading-none">Líquido:</span>
                  <span className="font-black text-emerald-800 text-lg leading-none">{formatCurrency(valorLiquido)}</span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border border-slate-300 rounded-[2rem] shadow-md hover:shadow-lg space-y-4 hover:border-slate-400 transition-colors">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Meta de Retorno</h4>
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200"><TrendingUp className="w-3.5 h-3.5 text-slate-700" /></div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.1em] block mb-1">Markup</span>
                    <span className="font-black text-slate-950 text-lg">{realMarkupOnCost.toFixed(1)}%</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.1em] block mb-1">Custo Tot.</span>
                    <span className="font-black text-rose-700 text-lg">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl flex justify-between items-center text-white">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-200 block leading-none">Lucro Real</span>
                  </div>
                  <span className="font-black text-xl tracking-tighter text-emerald-400">{formatCurrency(netProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
