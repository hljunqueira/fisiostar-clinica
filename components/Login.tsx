
import React, { useState } from 'react';
import { UserRole } from '../types';
import { Lock, Mail, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulação de autenticação
    setTimeout(() => {
      setIsLoading(false);
      
      // Lógica simples para demo baseada no email
      if (email.includes('admin')) {
        onLogin('admin');
      } else if (email.includes('sec')) {
        onLogin('secretary');
      } else if (email.includes('prof')) {
        onLogin('professional');
      } else {
        // Fallback default
        onLogin('admin');
      }
    }, 1000);
  };

  const demoLogin = (roleEmail: string) => {
      setEmail(roleEmail);
      setPassword('123456');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 m-0 overflow-hidden font-sans">
        <div className="w-full h-screen flex flex-row">
            {/* Left Side - Image (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden">
                <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAl6Ko_unAkMqVeTtXuGuv_ym2lu8s7HlpOb28ntU6D7GdGh2_EUGW3fYbrqXuZoXp9Uxa0U0VsWflXvlthBPnWCUjegtTdxJ9VsEGgNyZGKOD4a6aE7ffdg4dur6PbfPcx6VKadPamBePUwGCJdZoyXIfx3cJNwNdaXMkAxTcPAu1dTOwtDXF0mVvO4Yaf52YLZteXtDrKAYmQY_IGkzHsjow7_26hSGyR2KMGQydzeaRUKoiXkDTIPeKO89QOjQqWGEak5HHyKA6" 
                    alt="Clinic Interior" 
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#449498]/30 to-black/40"></div>
                <div className="relative z-10 flex flex-col justify-end p-16 h-full text-white">
                    <h2 className="text-4xl font-bold mb-4 tracking-tight">Recupere o seu movimento</h2>
                    <p className="text-lg opacity-90 max-w-md">Centro de Prevenção e Reabilitação de excelência, focado no seu bem-estar e qualidade de vida.</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 md:p-12 lg:p-16 relative">
                <div className="w-full max-w-md space-y-8">
                    
                    {/* Header with Logo */}
                    <div className="flex flex-col items-center">
                        <div className="w-28 h-28 rounded-full shadow-lg flex items-center justify-center bg-white border-4 border-gray-100 overflow-hidden mb-6 p-2">
                             <img 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuByFqYlCdRZYgxSm6QuAFifTxBa-pGyslRI-P78ydaEmBSCje_VS4RW3J_7AUK2K8flzsgp_sEclcrKMm4idyxC_WbNl728pOIwXZKQIZSSPq6T_lAXZZB-1Dn7Q55eWZeq57bQkhK3DKByMHlJZbjh15CU79POeSU5aqNL29Zg1Br_HrcuNhtFGvoQNEm6E0MOLjMF2YHfD6sBpCngiw4WNGk6UYP1UN5i3nxgAkBdRbytnWBQP0ftN9Ji9U4fuFOyjsVBE22JXlsW" 
                                alt="FisioStar Logo" 
                                className="w-full h-full object-contain transform scale-125"
                             />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bem-vindo de volta</h1>
                        <p className="text-sm text-gray-500 mt-2">Acesse sua conta para agendamentos e histórico.</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="mt-8 space-y-6">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input 
                                        type="email" 
                                        required 
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#449498] focus:border-transparent bg-white transition-all duration-200"
                                        placeholder="exemplo@fisiostar.com.br"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Senha</label>
                                    <a href="#" className="text-sm font-medium text-[#449498] hover:text-[#449498]/80 transition-colors">Esqueceu a senha?</a>
                                </div>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input 
                                        type="password" 
                                        required 
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#449498] focus:border-transparent bg-white transition-all duration-200"
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
                                className="h-4 w-4 text-[#449498] focus:ring-[#449498] border-gray-300 rounded cursor-pointer"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">Lembrar-me</label>
                        </div>

                        <div>
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#449498] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#449498] shadow-lg shadow-[#449498]/30 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                            <LogIn className="h-5 w-5 text-white/50 group-hover:text-white/80 transition-colors" />
                                        </span>
                                        Entrar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-500">
                            Não tem uma conta? 
                            <a href="#" className="font-medium text-[#449498] hover:text-[#449498]/80 transition-colors ml-1">Cadastre-se</a>
                        </p>
                    </div>

                    {/* Demo Buttons Section */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-center text-xs text-gray-400 mb-4">Acesso Rápido (Demo)</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => demoLogin('admin@fisiostar.com')} className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded border border-gray-200 transition-colors">Admin</button>
                            <button onClick={() => demoLogin('sec@fisiostar.com')} className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded border border-gray-200 transition-colors">Secretária</button>
                            <button onClick={() => demoLogin('prof@fisiostar.com')} className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded border border-gray-200 transition-colors">Profissional</button>
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
