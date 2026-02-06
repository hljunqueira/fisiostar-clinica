
import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { Lock, Mail, LogIn, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-6xl flex flex-row bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ minHeight: '600px', maxHeight: '90vh' }}>
                {/* Left Side - Image (Hidden on mobile) */}
                <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden">
                    <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAl6Ko_unAkMqVeTtXuGuv_ym2lu8s7HlpOb28ntU6D7GdGh2_EUGW3fYbrqXuZoXp9Uxa0U0VsWflXvlthBPnWCUjegtTdxJ9VsEGgNyZGKOD4a6aE7ffdg4dur6PbfPcx6VKadPamBePUwGCJdZoyXIfx3cJNwNdaXMkAxTcPAu1dTOwtDXF0mVvO4Yaf52YLZteXtDrKAYmQY_IGkzHsjow7_26hSGyR2KMGQydzeaRUKoiXkDTIPeKO89QOjQqWGEak5HHyKA6"
                        alt="Clinic Interior"
                        className="absolute inset-0 w-full h-full object-cover opacity-80 scale-105 hover:scale-110 transition-transform duration-[20s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-black/60 backdrop-blur-[1px]"></div>
                    <div className="relative z-10 flex flex-col justify-end p-12 h-full text-white">
                        <h2 className="text-3xl font-bold mb-3 tracking-tight">Recupere o seu movimento</h2>
                        <p className="text-base opacity-90 max-w-md">Centro de Prevenção e Reabilitação de excelência, focado no seu bem-estar e qualidade de vida.</p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 md:p-10">
                    <div className="w-full max-w-md space-y-8">

                        {/* Header with Logo */}
                        <div className="flex flex-col items-center mt-12">
                            <div className="w-24 h-24 rounded-full shadow-lg flex items-center justify-center bg-white border-4 border-gray-100 overflow-hidden mb-4 p-2">
                                <img
                                    src="/logo.png"
                                    alt="FisioStar Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bem-vindo de volta</h1>
                            <p className="text-sm text-gray-500 mt-1">Acesse sua conta para agendamentos e histórico.</p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="mt-6 space-y-6">
                            {error && (
                                <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
                                    <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-danger font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-secondary mb-1.5">E-mail</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            className="input-primary pl-10"
                                            placeholder="exemplo@fisiostar.com.br"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-semibold text-secondary">Senha</label>
                                        <a href="#" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">Esqueceu a senha?</a>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="input-primary pl-10"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer transition-colors"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">Lembrar-me</label>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg shadow-primary/30 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isLoading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                                <LogIn className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                                            </span>
                                            Entrar no Sistema
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>



                        {/* Demo Buttons Section */}
                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Acesso Rápido (Demo)</p>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => demoLogin('admin@fisiostar.com')} className="text-xs bg-gray-50 hover:bg-white hover:border-gray-300 text-gray-600 py-2.5 rounded-lg border border-transparent transition-all shadow-sm font-medium">Admin</button>
                                <button onClick={() => demoLogin('nay@fisiostar.com')} className="text-xs bg-gray-50 hover:bg-white hover:border-gray-300 text-gray-600 py-2.5 rounded-lg border border-transparent transition-all shadow-sm font-medium">Secretaria</button>
                                <button onClick={() => demoLogin('ana.silva@fisiostar.com')} className="text-xs bg-gray-50 hover:bg-white hover:border-gray-300 text-gray-600 py-2.5 rounded-lg border border-transparent transition-all shadow-sm font-medium">Profissional</button>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                                FisioStar © 2026
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
