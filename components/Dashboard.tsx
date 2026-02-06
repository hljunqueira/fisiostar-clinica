
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  ArrowUpRight,
  Megaphone,
  Plus,
  Trash2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UnitId, Announcement, Patient, Session, Revenue } from '../types';
import { patientsApi, sessionsApi } from '../src/services/api';
import { revenuesApi } from '../src/services/financial-api';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
  currentUnit: UnitId;
  announcements: Announcement[];
  onAddAnnouncement: (a: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  canManageAnnouncements?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  currentUnit,
  announcements,
  onAddAnnouncement,
  onDeleteAnnouncement,
  canManageAnnouncements = false
}) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [patientsData, sessionsData, revenuesData] = await Promise.all([
          patientsApi.getAll(),
          sessionsApi.getAll(),
          revenuesApi.getAll({ unitId: currentUnit }) // Fetch revenues for current unit
        ]);
        setPatients(patientsData);
        setSessions(sessionsData);
        setRevenues(revenuesData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate metrics
  const filteredSessions = sessions.filter(s => s.unitId === currentUnit);
  const todaySessions = filteredSessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length;

  const activePatients = patients.filter(p => p.status === 'Active').length;

  // Calculate monthly revenue from completed sessions
  const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const monthlyCompletedSessions = filteredSessions.filter(s =>
    s.date.startsWith(thisMonth) && s.status === 'Realizada'
  ).length;

  // Calculate revenue from REAL revenues table
  const monthlyRevenue = revenues
    .filter(r => r.revenueDate.startsWith(thisMonth))
    .reduce((sum, r) => sum + r.amount, 0);

  // Calculate no-show rate
  const totalSessions = filteredSessions.length;
  const noShows = filteredSessions.filter(s => s.status === 'Falta').length;
  const noShowRate = totalSessions > 0 ? ((noShows / totalSessions) * 100).toFixed(1) : '0.0';

  // Generate week data for chart
  const getLastWeekDates = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  const weekData = getLastWeekDates().map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
    const count = sessions.filter(s =>
      s.unitId === currentUnit &&
      s.date === dateStr &&
      s.status === 'Realizada'
    ).length;

    return { name: dayName, sessions: count };
  });

  // Get patients with remaining sessions, sorted by expiration
  const patientsWithPlans = patients
    .filter(p => p.plan && p.plan.remainingSessions !== undefined)
    .sort((a, b) => {
      const dateA = new Date(a.plan!.expiresAt).getTime();
      const dateB = new Date(b.plan!.expiresAt).getTime();
      return dateA - dateB;
    })
    .slice(0, 7); // Show top 7

  const handleNewSession = () => {
    navigate('/agenda?action=new');
  };




  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const handleAddClick = () => {
    const title = prompt('Título do aviso:');
    if (!title) return;
    const message = prompt('Mensagem:');
    if (!message) return;
    const role = prompt('Para quem? (all/admin/secretary/professional)', 'all');

    onAddAnnouncement({
      id: crypto.randomUUID(),
      title,
      message,
      targetRole: (role as any) || 'all',
      createdAt: new Date().toISOString()
    });
  };

  const handleDeleteClick = (id: string) => {
    setAnnouncementToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = () => {
    if (announcementToDelete) {
      onDeleteAnnouncement(announcementToDelete);
      setAnnouncementToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando dashboard...</div>
      </div>
    );
  }

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
          trend={`${filteredSessions.length} total esta semana`}
          color="blue"
        />
        <KpiCard
          title="Faturamento (Mês)"
          value={`R$ ${monthlyRevenue.toLocaleString('pt-BR')}`}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          trend={`${monthlyCompletedSessions} sessões realizadas`}
          color="green"
        />
        <KpiCard
          title="Pacientes Ativos"
          value={activePatients.toString()}
          icon={<Users className="h-5 w-5 text-purple-600" />}
          trend={`${patients.length} total cadastrados`}
          color="purple"
        />
        <KpiCard
          title="Taxa de Faltas"
          value={`${noShowRate}%`}
          icon={<Activity className="h-5 w-5 text-orange-600" />}
          trend={parseFloat(noShowRate) > 5 ? "Atenção necessária" : "Dentro do esperado"}
          color="orange"
          alert={parseFloat(noShowRate) > 5}
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
              <BarChart data={weekData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]} barSize={32}>
                  {weekData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#2563EB" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Actions & Info */}
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

            <h3 className="font-semibold text-gray-900 mb-4 border-t pt-5 border-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Aulas Restantes
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 max-h-80 pr-1 custom-scrollbar">
              {patientsWithPlans.map(patient => {
                const isExpired = new Date(patient.plan!.expiresAt) < new Date();
                const expiresSoon = new Date(patient.plan!.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                const expDateFormatted = new Date(patient.plan!.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                return (
                  <div key={patient.id} className={`p-3 rounded-lg border flex items-center justify-between transition-colors hover:bg-gray-50 ${isExpired ? 'bg-red-50/50 border-red-100' :
                    expiresSoon ? 'bg-orange-50/50 border-orange-100' :
                      'bg-white border-gray-100'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isExpired ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {patient.photoUrl ? (
                          <img src={patient.photoUrl} alt={patient.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          patient.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500">{patient.plan!.name}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${patient.plan!.remainingSessions === 0 ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                        }`}>
                        {patient.plan!.remainingSessions} left
                      </span>
                      <div className="mt-1">
                        {isExpired ? (
                          <span className="text-[10px] text-red-600 font-medium flex items-center justify-end gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Expirado
                          </span>
                        ) : (
                          <span className={`text-[10px] block ${expiresSoon ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                            Exp: {expDateFormatted}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {patientsWithPlans.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Nenhum plano ativo.</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Announcements Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" />
                Gestão de Avisos

              </h3>
              {canManageAnnouncements && (
                <button onClick={handleAddClick} className="text-blue-600 hover:text-blue-800 transition-colors" title="Adicionar novo aviso">
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group">
                  <p className="font-bold text-sm text-gray-900 mb-1">{ann.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{ann.message}</p>

                  {canManageAnnouncements && (
                    <button
                      onClick={() => handleDeleteClick(ann.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                      title="Remover aviso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Remover Aviso"
        description="Tem certeza que deseja remover este aviso? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        variant="danger"
      />
    </div>
  );
};

const KpiCard = ({ title, value, icon, trend, color, alert = false }: any) => {
  const bgColors: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const iconColors: any = {
    blue: 'text-blue-600 dark:text-blue-300',
    green: 'text-emerald-600 dark:text-emerald-300',
    purple: 'text-purple-600 dark:text-purple-300',
    orange: 'text-orange-600 dark:text-orange-300',
  }

  return (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl border ${alert ? 'border-orange-200 ring-2 ring-orange-50 dark:border-orange-900/50 dark:ring-orange-900/20' : 'border-gray-200 dark:border-slate-700'} shadow-card hover:shadow-lg transition-all duration-300 group`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${bgColors[color]} group-hover:scale-110 transition-transform`}>
          {React.cloneElement(icon, { className: `w-6 h-6 ${iconColors[color]}` })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {alert && <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
        <p className={`text-xs font-medium ${alert ? 'text-orange-700 dark:text-orange-400' : 'text-gray-400 dark:text-slate-500'}`}>
          {trend}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
