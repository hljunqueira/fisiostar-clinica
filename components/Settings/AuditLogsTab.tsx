import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../../types';
import { auditApi } from '../../src/services/audit-api';
import {
  ShieldCheck, Search, Filter, Download, Calendar, User, Clock, FileText,
  Eye, X, ArrowRight, Database, AlertCircle, CheckCircle2, ChevronRight, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [detailTab, setDetailTab] = useState<'diff' | 'raw_old' | 'raw_new'>('diff');

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

    const headers = ['Data/Hora', 'Usuário', 'Perfil', 'Módulo', 'Tabela', 'ID Registro', 'Ação', 'Campos Alterados', 'Detalhes'];
    const rows = logs.map(l => {
      const changedKeys = l.changedFields ? Object.keys(l.changedFields).join('; ') : '';
      return [
        new Date(l.createdAt).toLocaleString('pt-BR'),
        `"${l.userName || 'Sistema'}"`,
        `"${l.userRole || 'admin'}"`,
        `"${(l.category || '').toUpperCase()}"`,
        `"${l.tableName || '-'}"`,
        `"${l.recordId || '-'}"`,
        `"${l.action}"`,
        `"${changedKeys}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ];
    });

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
    const hasChangedFieldMatch = l.changedFields && Object.keys(l.changedFields).some(k => k.toLowerCase().includes(term));
    return (
      (l.userName && l.userName.toLowerCase().includes(term)) ||
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.category && l.category.toLowerCase().includes(term)) ||
      (l.tableName && l.tableName.toLowerCase().includes(term)) ||
      (l.recordId && l.recordId.toLowerCase().includes(term)) ||
      hasChangedFieldMatch ||
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
      case 'UNITS':
        return 'bg-orange-100 text-orange-800';
      case 'TEAM':
        return 'bg-cyan-100 text-cyan-800';
      case 'AGREEMENTS':
        return 'bg-rose-100 text-rose-800';
      case 'PLANS':
        return 'bg-violet-100 text-violet-800';
      case 'CLINICAL':
        return 'bg-lime-100 text-lime-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFieldValue = (val: any): string => {
    if (val === null || val === undefined) return '<vazio>';
    if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Logs de Auditoria & Conformidade
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Trilha de auditoria completa em tempo real para todas as tabelas (detalhes de quem alterou, o que alterou e valores anteriores).
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
            placeholder="Buscar por usuário, tabela, ação ou campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro Módulo */}
        <div>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos os Módulos & Tabelas</option>
            <option value="PATIENTS">Pacientes & Prontuários</option>
            <option value="SCHEDULE">Agenda & Sessões</option>
            <option value="FINANCIAL">Financeiro & Pagamentos</option>
            <option value="AUTH">Usuários & Permissões</option>
            <option value="ROOMS">Salas & Reservas</option>
            <option value="UNITS">Filiais & Horários</option>
            <option value="TEAM">Profissionais & Equipe</option>
            <option value="AGREEMENTS">Convênios</option>
            <option value="PLANS">Planos de Tratamento</option>
            <option value="CLINICAL">Modelos Clínicos</option>
            <option value="ANNOUNCEMENTS">Comunicados</option>
          </select>
        </div>

        {/* Data Início */}
        <div>
          <input
            type="date"
            placeholder="Data inicial"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Data Fim */}
        <div>
          <input
            type="date"
            placeholder="Data final"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  <th className="py-3 px-4">Módulo / Tabela</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Campos Alterados / Resumo</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {filteredLogs.map((log) => {
                  const changedCount = log.changedFields ? Object.keys(log.changedFields).length : 0;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{log.userName || 'Sistema'}</div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">{log.userRole || 'admin'}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase w-fit ${getModuleBadge(log.category)}`}>
                            {log.category}
                          </span>
                          {log.tableName && (
                            <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                              <Database className="w-2.5 h-2.5" />
                              {log.tableName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-gray-800">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-sm">
                        {changedCount > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {changedCount} campo(s) alterado(s):
                            </span>
                            <span className="text-[11px] text-gray-700 font-mono truncate">
                              {Object.keys(log.changedFields || {}).slice(0, 3).join(', ')}
                              {changedCount > 3 && ` +${changedCount - 3}`}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate block" title={log.details}>
                            {log.details || 'Sem detalhes adicionais'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailTab('diff');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspecionar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE INSPEÇÃO DETALHADA DE AUDITORIA */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-base">
                    Auditoria de Alteração
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${getModuleBadge(selectedLog.category)}`}>
                    {selectedLog.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Realizado por <strong className="text-gray-800">{selectedLog.userName}</strong> ({selectedLog.userRole}) em {new Date(selectedLog.createdAt).toLocaleString('pt-BR')}
                </p>
                {selectedLog.tableName && (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Tabela: <span className="text-gray-700 font-semibold">{selectedLog.tableName}</span>
                    {selectedLog.recordId && <> &bull; ID do Registro: <span className="text-gray-700 font-semibold">{selectedLog.recordId}</span></>}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="px-5 pt-3 border-b border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('diff')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  detailTab === 'diff'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Campos Alterados (Antes vs Depois)
              </button>
              {selectedLog.oldData && (
                <button
                  type="button"
                  onClick={() => setDetailTab('raw_old')}
                  className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    detailTab === 'raw_old'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Snapshot Anterior (JSON)
                </button>
              )}
              {selectedLog.newData && (
                <button
                  type="button"
                  onClick={() => setDetailTab('raw_new')}
                  className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    detailTab === 'raw_new'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Snapshot Atual (JSON)
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 text-xs">
              {detailTab === 'diff' && (
                <div>
                  {selectedLog.changedFields && Object.keys(selectedLog.changedFields).length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                          <tr>
                            <th className="p-3">Campo</th>
                            <th className="p-3 bg-red-50/50 text-red-700">Valor Anterior</th>
                            <th className="p-3 bg-emerald-50/50 text-emerald-700">Valor Novo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                          {Object.entries(selectedLog.changedFields).map(([field, rawDiff]) => {
                            const diff = (rawDiff || {}) as { old?: any; new?: any };
                            return (
                              <tr key={field} className="hover:bg-gray-50/50">
                                <td className="p-3 font-bold text-gray-800 font-sans">
                                  {field}
                                </td>
                                <td className="p-3 bg-red-50/20 text-red-800 line-through">
                                  {formatFieldValue(diff.old)}
                                </td>
                                <td className="p-3 bg-emerald-50/20 text-emerald-800 font-bold">
                                  {formatFieldValue(diff.new)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                        <p className="font-semibold text-gray-900 mb-1">Ação registrada:</p>
                        <p>{selectedLog.action}</p>
                        <p className="text-gray-500 mt-2 font-mono text-[11px]">{selectedLog.details}</p>
                      </div>

                      {selectedLog.newData && !selectedLog.oldData && (
                        <div>
                          <p className="font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Registro Inserido:
                          </p>
                          <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl text-[11px] overflow-x-auto max-h-60">
                            {JSON.stringify(selectedLog.newData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {selectedLog.oldData && !selectedLog.newData && (
                        <div>
                          <p className="font-bold text-red-800 mb-2 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            Registro Excluído:
                          </p>
                          <pre className="p-3 bg-gray-900 text-red-300 rounded-xl text-[11px] overflow-x-auto max-h-60">
                            {JSON.stringify(selectedLog.oldData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'raw_old' && selectedLog.oldData && (
                <div>
                  <p className="text-gray-500 text-[11px] mb-2 font-semibold">Snapshot completo antes da modificação:</p>
                  <pre className="p-4 bg-gray-900 text-gray-200 rounded-xl text-[11px] overflow-x-auto max-h-96">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {detailTab === 'raw_new' && selectedLog.newData && (
                <div>
                  <p className="text-gray-500 text-[11px] mb-2 font-semibold">Snapshot completo após a modificação:</p>
                  <pre className="p-4 bg-gray-900 text-emerald-300 rounded-xl text-[11px] overflow-x-auto max-h-96">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
