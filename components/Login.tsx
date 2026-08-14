import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { Lock, Mail, LogIn, AlertCircle, Eye, EyeOff, MessageSquare } from 'lucide-react';

const Login: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // URL de suporte via WhatsApp para recuperação de senha (substituível quando passar o número)
    const WHATSAPP_SUPPORT_URL = "https://wa.me/?text=Ol%C3%A1!%20Esqueci%20minha%20senha%20no%20sistema%20FisioStar%20e%20preciso%20de%20ajuda%20para%20recuper%C3%A1-la.";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signIn(email, password);
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setIsLoading(false);
        }
    };

    const demoLogin = (roleEmail: string) => {
        setEmail(roleEmail);
        setPassword('123456');
    };

    return (
        <div className="w-screen h-screen min-h-screen flex flex-col lg:flex-row overflow-hidden bg-slate-900 font-sans">
            {/* Lado Esquerdo - Minimalista: Apenas Logo, Título e Frase (50% Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 relative h-full bg-slate-950 text-white overflow-hidden select-none">
                {/* Imagem de Fundo com Blur Elegante */}
                <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1920&q=80"
                    alt="FisioStar Clínica de Fisioterapia"
                    className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 transition-transform duration-[25s] ease-out hover:scale-110"
                />
                
                {/* Overlay de Gradiente Limpo */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-blue-950/40 backdrop-blur-[2px]" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                {/* Conteúdo Institucional Direto */}
                <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 h-full w-full">
                    {/* Logo & Marca */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl">
                            <img src="/logo.png" alt="FisioStar" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <span className="text-2xl font-bold tracking-tight text-white">FisioStar</span>
                            <span className="block text-xs font-medium text-blue-300/80 tracking-wider uppercase">Centro de Fisioterapia</span>
                        </div>
                    </div>

                    {/* Título Principal e Frase */}
                    <div className="space-y-4 max-w-lg mb-12">
                        <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-white">
                            Recupere o seu <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">movimento.</span>
                        </h1>

                        <p className="text-slate-300 text-lg leading-relaxed font-light">
                            Centro de Prevenção e Reabilitação de excelência, focado no seu bem-estar e qualidade de vida.
                        </p>
                    </div>

                    {/* Rodapé Minimalista */}
                    <div className="text-xs text-slate-400 font-medium">
                        FisioStar © 2026
                    </div>
                </div>
            </div>

            {/* Lado Direito - Formulário de Login (50% Desktop) */}
            <div className="w-full lg:w-1/2 h-full bg-white flex flex-col justify-between p-8 lg:p-16 overflow-y-auto">
                <div className="w-full max-w-md mx-auto my-auto space-y-8">
                    {/* Topo do Formulário */}
                    <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 p-2.5 shadow-lg flex items-center justify-center lg:hidden mb-2">
                            <img src="/logo.png" alt="FisioStar" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Bem-vindo de volta
                        </h2>
                        <p className="text-sm text-slate-500">
                            Acesse sua conta para agendamentos e histórico.
                        </p>
                    </div>

                    {/* Alerta de Erro */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 animate-fadeIn">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Formulário */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                E-mail
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all"
                                    placeholder="exemplo@fisiostar.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Senha + Link WhatsApp para Esqueceu a Senha */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Senha
                                </label>
                                <a
                                    href={WHATSAPP_SUPPORT_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                    title="Clique para solicitar a recuperação de senha via WhatsApp"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Esqueceu a senha?</span>
                                </a>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Lembrar-me */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="ml-2 text-sm text-slate-600">Lembrar-me</span>
                            </label>
                        </div>

                        {/* Botão Principal */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 px-6 rounded-xl text-white font-semibold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 focus:outline-none focus:ring-4 focus:ring-blue-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Entrar no Sistema</span>
                                    <LogIn className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Acesso Rápido (Demo) */}
                    <div className="pt-6 border-t border-slate-100 space-y-3">
                        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Acesso Rápido (Demo)</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                onClick={() => demoLogin('admin@fisiostar.com')}
                                className="py-2.5 px-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-all text-center"
                            >
                                Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => demoLogin('nay@fisiostar.com')}
                                className="py-2.5 px-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-all text-center"
                            >
                                Secretaria
                            </button>
                            <button
                                type="button"
                                onClick={() => demoLogin('pedro@fisiostar.com')}
                                className="py-2.5 px-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-all text-center"
                            >
                                Profissional
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Suporte WhatsApp */}
                <div className="pt-6 text-center text-xs text-slate-400 font-medium">
                    Suporte técnico? <a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">Fale com a equipe via WhatsApp</a>
                </div>
            </div>
        </div>
    );
};

export default Login;
