import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../../types';
import { auditApi } from '../../src/services/audit-api';
import { ShieldCheck, Search, Filter, Download, Calendar, User, Clock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const AuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [selectedModule, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await auditApi.getAll({
        module: selectedModule,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setLogs(data);
    } catch (e) {
      console.error('Error loading audit logs:', e);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('Não há registros para exportar');
      return;
    }

    const headers = ['Data/Hora', 'Usuário', 'Perfil', 'Módulo', 'Ação', 'Detalhes'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString('pt-BR'),
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.category.toUpperCase()}"`,
      `"${l.action}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fisiostar_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs exportados com sucesso!');
  };

  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.userName.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      l.category.toLowerCase().includes(term) ||
      (typeof l.details === 'string' && l.details.toLowerCase().includes(term))
    );
  });

  const getModuleBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'PATIENTS':
      case 'PACIENTES':
        return 'bg-blue-100 text-blue-800';
      case 'SCHEDULE':
      case 'AGENDA':
        return 'bg-emerald-100 text-emerald-800';
      case 'ROOMS':
      case 'SALAS':
        return 'bg-indigo-100 text-indigo-800';
      case 'CHAT':
        return 'bg-teal-100 text-teal-800';
      case 'FINANCIAL':
      case 'FINANCEIRO':
        return 'bg-amber-100 text-amber-800';
      case 'AUTH':
      case 'SISTEMA':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Logs de Auditoria & Conformidade
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Trilha de auditoria e registro de ações críticas realizadas na plataforma
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação ou detalhe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filtro Módulo */}
        <div>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">Todos os Módulos</option>
            <option value="PATIENTS">Pacientes & Prontuários</option>
            <option value="SCHEDULE">Agenda & Sessões</option>
            <option value="ROOMS">Salas & Reservas</option>
            <option value="CHAT">Chat & Comunicação</option>
            <option value="FINANCIAL">Financeiro & Planos</option>
            <option value="AUTH">Segurança & Acessos</option>
          </select>
        </div>

        {/* Data Início */}
        <div>
          <input
            type="date"
            placeholder="Data inicial"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          />
        </div>

        {/* Data Fim */}
        <div>
          <input
            type="date"
            placeholder="Data final"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          />
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando logs de auditoria...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            Nenhum registro de auditoria encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{log.userName}</div>
                      <span className="text-[10px] text-gray-400 uppercase">{log.userRole}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${getModuleBadge(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-gray-800">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
