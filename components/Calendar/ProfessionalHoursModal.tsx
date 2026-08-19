import React, { useState, useEffect } from 'react';
import { Professional, WeekDay, DaySchedule } from '../../types';
import { X, Clock, User } from 'lucide-react';

interface ProfessionalHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionals: Professional[];
  initialProfessionalId?: string;
}

const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: 'sunday', label: 'Domingo' },
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' }
];

export const ProfessionalHoursModal: React.FC<ProfessionalHoursModalProps> = ({
  isOpen,
  onClose,
  professionals,
  initialProfessionalId
}) => {
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(
    initialProfessionalId || (professionals[0]?.id || '')
  );

  useEffect(() => {
    if (initialProfessionalId) {
      setSelectedProfessionalId(initialProfessionalId);
    } else if (professionals.length > 0 && !selectedProfessionalId) {
      setSelectedProfessionalId(professionals[0].id);
    }
  }, [initialProfessionalId, professionals]);

  if (!isOpen) return null;

  const selectedProfessional =
    professionals.find((p) => p.id === selectedProfessionalId) || professionals[0];

  // Helper para obter escala do dia (padrão de expediente da clínica ou personalizado)
  const getDaySchedule = (day: WeekDay): { work: string; breakTime: string } => {
    // Se for domingo, padrão sem expediente
    if (day === 'sunday') {
      return { work: 'Sem expediente', breakTime: 'Sem intervalo' };
    }
    // Se for sábado, padrão 08:00 às 12:00
    if (day === 'saturday') {
      return { work: '08:00 às 12:00', breakTime: 'Sem intervalo' };
    }
    // Dias úteis: 08:00 às 18:00 ou 06:00 às 23:30
    return { work: '08:00 às 18:00', breakTime: '12:00 às 13:00' };
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Horários dos profissionais</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Seletor de Profissional */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Profissional:
            </label>
            <select
              value={selectedProfessionalId}
              onChange={(e) => setSelectedProfessionalId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* Tabela de Horários */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                  <th className="p-3 font-bold text-gray-900 border-r border-gray-200 w-28">
                    Horários
                  </th>
                  {WEEK_DAYS.map((d) => (
                    <th key={d.key} className="p-3 font-bold border-r border-gray-200 last:border-r-0 text-center min-w-[95px]">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Linha de Expediente */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 font-bold text-gray-800 border-r border-gray-200 bg-gray-50/30">
                    Expediente
                  </td>
                  {WEEK_DAYS.map((d) => {
                    const sch = getDaySchedule(d.key);
                    const isOff = sch.work.includes('Sem expediente');
                    return (
                      <td
                        key={d.key}
                        className={`p-3 text-center border-r border-gray-200 last:border-r-0 font-medium ${
                          isOff ? 'text-gray-400 bg-gray-50/50' : 'text-gray-800 font-semibold'
                        }`}
                      >
                        {sch.work}
                      </td>
                    );
                  })}
                </tr>

                {/* Linha de Intervalo */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 font-bold text-gray-800 border-r border-gray-200 bg-gray-50/30">
                    Intervalo
                  </td>
                  {WEEK_DAYS.map((d) => {
                    const sch = getDaySchedule(d.key);
                    const isNoBreak = sch.breakTime.includes('Sem intervalo');
                    return (
                      <td
                        key={d.key}
                        className={`p-3 text-center border-r border-gray-200 last:border-r-0 text-[11px] ${
                          isNoBreak ? 'text-gray-400' : 'text-amber-700 font-medium'
                        }`}
                      >
                        {sch.breakTime}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-[11px] text-blue-900">
            <span>
              💡 Para agendamentos fora do horário de expediente ou no intervalo, utilize a opção de <strong>Encaixe de Horário</strong>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
