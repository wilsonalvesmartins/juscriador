import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  Layout, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Video, 
  Clock, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
  Sparkles,
  Wand2,
  Settings,
  Key
} from 'lucide-react';

// --- CONFIGURAÇÃO DA API DO GEMINI ---
const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Agora capturamos o erro exato que o Google retorna para facilitar o debug
        const errorText = await response.text();
        console.error("Erro detalhado da API do Gemini:", errorText);
        // Lançar o erro com o texto da resposta ajuda a ver o problema real no console
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

const suggestTopicsWithGemini = async (userApiKey) => {
  // CORREÇÃO: Utilizando o modelo oficial gemini-1.5-flash e mantendo a limpeza de espaços
  const cleanKey = userApiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
  const systemPrompt = "Você é um especialista em marketing jurídico trabalhista no Brasil.";
  const userPrompt = "Liste 3 temas de direito do trabalho que estão em alta ou que geram muito engajamento nas redes sociais (dores comuns de trabalhadores ou erros de empresas). Retorne APENAS os 3 temas, separados estritamente por '|' (pipe), sem numeração, sem marcadores e sem texto adicional. Exemplo: Horas extras no home office|Limbo previdenciário|Trabalho sem carteira assinada";

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.split('|').map(t => t.trim()).filter(t => t.length > 0);
};

const refineContentWithGemini = async (draft, action, userApiKey) => {
  // CORREÇÃO: Utilizando o modelo oficial gemini-1.5-flash e mantendo a limpeza de espaços
  const cleanKey = userApiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
  const systemPrompt = "Você é um especialista em marketing jurídico. Respeite as regras da OAB (sem promessas de resultado).";
  
  let userPrompt = "";
  if (action === 'simplify') {
    userPrompt = `Reescreva o seguinte conteúdo trabalhista para deixá-lo MAIS SIMPLES, didático e persuasivo, removendo qualquer "juridiquês" pesado, mas mantendo a precisão técnica. Retorne apenas o novo texto:\n\n${draft}`;
  } else if (action === 'hashtags') {
    userPrompt = `Crie uma legenda curta e engajadora para acompanhar este conteúdo nas redes sociais, e adicione 5 a 8 hashtags estratégicas sobre direito trabalhista. Mantenha o conteúdo original abaixo da legenda. Retorne o resultado completo:\n\n${draft}`;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || draft;
};

const generateGeminiContent = async (topic, category, userApiKey) => {
  // CORREÇÃO: Utilizando o modelo oficial gemini-1.5-flash e mantendo a limpeza de espaços
  const cleanKey = userApiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
  
  let systemPrompt = `Você é um renomado especialista em marketing jurídico e um advogado trabalhista de sucesso no Brasil. 
OBJETIVOS DO SEU CONTEÚDO:
1. Posicionar o advogado como referência em Direito Trabalhista;
2. Educar o público leigo sobre direitos (foco trabalhista e reflexos previdenciários);
3. Gerar autoridade, confiança e demanda qualificada;
4. Converter seguidores em agendamentos de atendimento de forma ética.
PÚBLICO-ALVO: Trabalhadores CLT e autônomos, MEI, e Empresários.
SEUS PILARES DE CONTEÚDO:
Pilar 1 (Educativo): Explicar direitos e entendimentos de tribunais de forma simples.
Pilar 2 (Autoridade): Demonstrar conhecimento técnico (Erros, compliance).
Pilar 3 (Dores Práticas): Foco em problemas reais.
Pilar 4 (Prova Social/Ético): Rotina, importância do acompanhamento.
Pilar 5 (Conversão): Chamadas éticas da OAB.
REGRA DE OURO: Respeite rigorosamente o Código de Ética da OAB.`;

  let userPrompt = "";

  switch (category) {
    case 'completo':
      userPrompt = `Atue com base nos Pilares 1 e 2. Crie um roteiro de vídeo completo e informativo sobre: "${topic}". 
ESTRUTURA OBRIGATÓRIA:
1. Gancho (Hook): Forte nos primeiros 3 segundos, focando na Dor do Cliente (Pilar 3).
2. Desenvolvimento: Embasa legalmente na CLT de forma simples.
3. Alerta de Autoridade: Mostre um erro comum.
4. CTA (Pilar 5): Chamada ética no final.`;
      break;
    case 'simples':
      userPrompt = `Atue com foco no Pilar 3 e 5. Crie um post ou roteiro curto sobre: "${topic}".
ESTRUTURA:
1. Hook Sensacionalista e Ético: Frase curta que chame atenção para a dor.
2. Explicação Flash: Resposta rápida da lei.
3. CTA Rápido: "Você passa por isso? Procure um advogado trabalhista."`;
      break;
    case 'meme':
      userPrompt = `Crie uma ideia de meme para Reels/TikTok sobre: "${topic}". Foco na relação Patrão vs Empregado.
ESTRUTURA:
1. Descrição da Cena: O que acontece no vídeo.
2. Texto da Tela (POV): O texto escrito no vídeo.
3. Legenda: Explicação jurídica breve e CTA ético.`;
      break;
    case 'encenacao':
      userPrompt = `Atue com foco no Pilar 3. Crie um roteiro de encenação (POV) simulando violação de direitos sobre: "${topic}".
ESTRUTURA:
1. Personagens: Diálogo Patrão vs Empregado.
2. Intervenção: Advogado Trabalhista entra em cena.
3. Explicação Legal: Advogado explica o direito violado (CLT).
4. Fechamento ético.`;
      break;
    default:
      userPrompt = `Crie um conteúdo sobre direito trabalhista focado em: ${topic}`;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar conteúdo.";
};

// --- COMPONENTES PRINCIPAIS ---

export default function App() {
  const [activeTab, setActiveTab] = useState('generate');
  
  const [apiKey, setApiKey] = useState('');
  const [items, setItems] = useState([]);
  const [isLoadingApp, setIsLoadingApp] = useState(true);

  // Carregar dados da VPS (Backend) ao iniciar o App
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setApiKey(data.apiKey || '');
          setItems(data.items || []);
        }
        setIsLoadingApp(false);
      })
      .catch(err => {
        console.error("Erro ao conectar com a VPS:", err);
        setIsLoadingApp(false);
      });
  }, []);

  // Função central para sincronizar dados com a VPS
  const saveToVPS = async (newKey, newItems) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newKey, items: newItems })
      });
    } catch (err) {
      console.error("Erro ao salvar na VPS", err);
    }
  };

  const handleSaveSettings = (newKey) => {
    setApiKey(newKey);
    saveToVPS(newKey, items);
  };

  const handleApprove = (newItem) => {
    const newItemsList = [{ ...newItem, id: Date.now().toString() }, ...items];
    setItems(newItemsList);
    saveToVPS(apiKey, newItemsList);
    setActiveTab('pipeline');
  };

  const updateItemStatus = (id, newStatus, extraData = {}) => {
    const newItemsList = items.map(item => 
      item.id === id ? { ...item, status: newStatus, ...extraData } : item
    );
    setItems(newItemsList);
    saveToVPS(apiKey, newItemsList);
  };

  const deleteItem = (id) => {
    const newItemsList = items.filter(item => item.id !== id);
    setItems(newItemsList);
    saveToVPS(apiKey, newItemsList);
  };

  if (isLoadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4 text-slate-500">
        <Loader2 size={40} className="animate-spin text-amber-500" />
        <p className="font-medium">Carregando dados da VPS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 shadow-xl z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-amber-500">Jus<span className="text-white">Criador</span></h1>
          <p className="text-xs text-slate-400 mt-1">Marketing Trabalhista</p>
        </div>
        <nav className="px-4 space-y-2 pb-6 md:pb-0">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'generate' ? 'bg-amber-500 text-slate-900 font-semibold' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <PenTool size={20} />
            Gerar Conteúdo
          </button>
          <button 
            onClick={() => setActiveTab('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pipeline' ? 'bg-amber-500 text-slate-900 font-semibold' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <Layout size={20} />
            Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'calendar' ? 'bg-amber-500 text-slate-900 font-semibold' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <CalendarIcon size={20} />
            Calendário
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-amber-500 text-slate-900 font-semibold' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <Settings size={20} />
            Configurações
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50 h-screen">
        {activeTab === 'generate' && <GenerateView onApprove={handleApprove} apiKey={apiKey} />}
        {activeTab === 'pipeline' && <PipelineView items={items} onUpdate={updateItemStatus} onDelete={deleteItem} />}
        {activeTab === 'calendar' && <CalendarView items={items} />}
        {activeTab === 'settings' && <SettingsView currentApiKey={apiKey} onSave={handleSaveSettings} />}
      </main>
    </div>
  );
}

// --- VIEW DE CONFIGURAÇÕES ---
function SettingsView({ currentApiKey, onSave }) {
  const [keyInput, setKeyInput] = useState(currentApiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(keyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Configurações do Sistema</h2>
        <p className="text-slate-500 mt-1">Gerencie chaves de API e preferências na VPS.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Key className="text-amber-500" size={24} />
          <h3 className="text-xl font-bold text-slate-800">API Key do Google Gemini</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Sua chave da API será enviada e salva diretamente na sua VPS (Servidor). 
          O uso de volumes no Docker garante que atualizações via GitHub não apaguem esses dados.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Chave da API</label>
          <input 
            type="password" 
            placeholder="Insira sua chave AIzaSy..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button 
            onClick={handleSave}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Salvar na VPS
          </button>
          {saved && <span className="text-green-600 font-medium text-sm flex items-center gap-1"><CheckCircle size={16} /> Salvo na nuvem com sucesso!</span>}
        </div>
      </div>
    </div>
  );
}

// --- VIEW 1: GERAÇÃO DE CONTEÚDO ---
function GenerateView({ onApprove, apiKey }) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('completo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  
  const [suggestedTopics, setSuggestedTopics] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const handleSuggestTopics = async () => {
    if (!apiKey) {
      setError("Configure sua chave de API nas Configurações primeiro.");
      return;
    }
    setIsSuggesting(true);
    setError('');
    try {
      const topics = await suggestTopicsWithGemini(apiKey);
      if (topics.length > 0) setSuggestedTopics(topics);
    } catch (err) {
      setError(`Erro ao acessar a API: ${err.message}. Verifique o console do navegador (F12) para detalhes.`);
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleRefineDraft = async (action) => {
    if (!draft || !apiKey) return;
    setIsRefining(true);
    try {
      const refinedText = await refineContentWithGemini(draft, action, apiKey);
      setDraft(refinedText);
    } catch (err) {
      setError(`Erro ao refinar o texto: ${err.message}. Verifique o console (F12).`);
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("Configure sua chave de API na aba 'Configurações' antes de gerar conteúdo.");
      return;
    }
    if (!topic.trim()) {
      setError("Por favor, insira um tema trabalhista.");
      return;
    }
    setError('');
    setIsGenerating(true);
    setDraft(null);

    try {
      const generatedText = await generateGeminiContent(topic, category, apiKey);
      setDraft(generatedText);
    } catch (err) {
      setError(`Erro ao gerar o conteúdo: ${err.message}. Verifique o console (F12) para mais detalhes.`);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = [
    { id: 'completo', label: 'Completo & Informativo', desc: 'Roteiros longos com base na CLT' },
    { id: 'simples', label: 'Simples & Direto', desc: 'Hooks fortes para prender a atenção' },
    { id: 'meme', label: 'Meme / Humor', desc: 'Engajamento através do humor' },
    { id: 'encenacao', label: 'Encenação (POV)', desc: 'Simulação de conflito patrão/empregado' }
  ];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Criar Novo Conteúdo</h2>
        <p className="text-slate-500 mt-2">Gere roteiros especializados em direito trabalhista com IA.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-medium text-slate-700">Qual o tema do conteúdo?</label>
            <button 
              onClick={handleSuggestTopics}
              disabled={isSuggesting}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              ✨ Ideias de Temas
            </button>
          </div>

          {suggestedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in duration-300">
              {suggestedTopics.map((sug, idx) => (
                <button 
                  key={idx}
                  onClick={() => setTopic(sug)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-200"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          <input 
            type="text" 
            placeholder="Ex: Horas extras não pagas, Demissão por justa causa, Assédio moral..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-3">Escolha o
