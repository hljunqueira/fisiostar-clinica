
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Activity, 
  ArrowUpRight,
  Megaphone,
  Plus,
  Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UnitId, Announcement } from '../types';
import { SESSIONS, PROFESSIONALS } from '../constants';

interface DashboardProps {
  currentUnit: UnitId;
  announcements: Announcement[];
  onAddAnnouncement: (a: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    currentUnit, 
    announcements, 
    onAddAnnouncement, 
    onDeleteAnnouncement 
}) => {
  const navigate = useNavigate();
  
  // Mock logic to filter data by unit
  const filteredSessions = SESSIONS.filter(s => s.unitId === currentUnit);
  const todaySessions = filteredSessions.length;
  const monthlyRevenue = filteredSessions.length * 85; // Simple mock calculation

  const data = [
    { name: 'Seg', sessions: 12 },
    { name: 'Ter', sessions: 19 },
    { name: 'Qua', sessions: 15 },
    { name: 'Qui', sessions: 22 },
    { name: 'Sex', sessions: 18 },
    { name: 'Sáb', sessions: 8 },
  ];

  const handleNewSession = () => {
      navigate('/agenda?action=new');
  };

  const handleAddClick = () => {
      const title = prompt("Título do Aviso:");
      if (!title) return;
      const message = prompt("Mensagem:");
      if (!message) return;

      const newAnnouncement: Announcement = {
          id: `a_${Date.now()}`,
          title,
          message,
          type: 'info',
          date: new Date().toISOString().split('T')[0],
          targetRole: 'all'
      };
      onAddAnnouncement(newAnnouncement);
  };

  const handleDeleteClick = (id: string) => {
      if(confirm('Tem certeza que deseja remover este aviso?')) {
          onDeleteAnnouncement(id);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-gray-500">Acompanhe o desempenho da unidade hoje.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Sessões Hoje" 
          value={todaySessions.toString()} 
          icon={<Calendar className="h-5 w-5 text-blue-600" />} 
          trend="+12% vs ontem"
          color="blue"
        />
        <KpiCard 
          title="Faturamento (Mês)" 
          value={`R$ ${monthlyRevenue.toLocaleString('pt-BR')}`} 
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />} 
          trend="Dentro da meta"
          color="green"
        />
        <KpiCard 
          title="Pacientes Ativos" 
          value="142" 
          icon={<Users className="h-5 w-5 text-purple-600" />} 
          trend="+3 novos esta semana"
          color="purple"
        />
        <KpiCard 
          title="Taxa de Faltas" 
          value="4.2%" 
          icon={<Activity className="h-5 w-5 text-orange-600" />} 
          trend="Atenção necessária"
          color="orange"
          alert
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Sessões Realizadas (Semana)</h3>
            <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">Últimos 7 dias</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]} barSize={32}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#2563EB" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Actions & Announcements */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                <div className="space-y-3 mb-6">
                    <button 
                        onClick={handleNewSession}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                    <span>Nova Sessão</span>
                    <ArrowUpRight className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => navigate('/pacientes')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                    <span>Cadastrar Paciente</span>
                    <Users className="h-4 w-4" />
                    </button>
                </div>

                <h3 className="font-semibold text-gray-900 mb-3 border-t pt-4 border-gray-100">Próximos Horários</h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                    {filteredSessions.slice(0, 3).map(session => {
                    const prof = PROFESSIONALS.find(p => p.id === session.professionalId);
                    return (
                        <div key={session.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-gray-900">{session.time} - {session.type}</p>
                            <p className="text-gray-500">{prof?.name.split(' ')[0]}</p>
                        </div>
                        </div>
                    )
                    })}
                    {filteredSessions.length === 0 && (
                        <p className="text-sm text-gray-400 italic">Nenhum horário próximo.</p>
                    )}
                </div>
            </div>

            {/* Admin Announcements Card - Styled exactly as requested */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-fit">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-orange-500" />
                        Gestão de Avisos
                    </h3>
                    <button onClick={handleAddClick} className="text-blue-600 hover:text-blue-800 transition-colors" title="Adicionar novo aviso">
                        <Plus className="w-5 h-5" />
                    </button>
                 </div>
                 
                 <div className="space-y-3">
                    {announcements.map(ann => (
                        <div key={ann.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group">
                            <p className="font-bold text-sm text-gray-900 mb-1">{ann.title}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{ann.message}</p>
                            
                            {/* Delete button appearing on hover */}
                            <button 
                                onClick={() => handleDeleteClick(ann.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                                title="Remover aviso"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {announcements.length === 0 && (
                        <div className="text-center py-4 text-sm text-gray-400 italic">
                            Nenhum aviso cadastrado.
                        </div>
                    )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, icon, trend, color, alert = false }: any) => {
  const bgColors: any = {
    blue: 'bg-blue-50',
    green: 'bg-emerald-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };

  return (
    <div className={`bg-white p-5 rounded-xl border ${alert ? 'border-orange-200 ring-2 ring-orange-50' : 'border-gray-200'} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${bgColors[color]}`}>
          {icon}
        </div>
        {alert && <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        <p className={`text-xs mt-1 ${alert ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
          {trend}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
