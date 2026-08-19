import React, { useState, useEffect } from 'react';
import { ScheduleViewConfig, ScheduleDayConfig, WeekDay, UserRole, Professional } from '../../types';
import { professionalsApi } from '../../src/services/api';
import { CalendarColorModal } from '../Calendar/CalendarColorModal';
import toast from 'react-hot-toast';
import { Clock, Calendar, Check, Save } from 'lucide-react';

const STORAGE_KEY = 'fisiostar_schedule_view_config';

const DEFAULT_DAYS: ScheduleDayConfig[] = [
  { day: 'sunday', label: 'Dom', isOpen: false, start: '08:00', end: '12:00', breakStart: '', breakEnd: '' },
  { day: 'monday', label: 'Seg', isOpen: true, start: '06:00', end: '23:30', breakStart: '', breakEnd: '' },
  { day: 'tuesday', label: 'Ter', isOpen: true, start: '06:00', end: '23:30', breakStart: '', breakEnd: '' },
  { day: 'wednesday', label: 'Qua', isOpen: true, start: '06:00', end: '23:30', breakStart: '', breakEnd: '' },
  { day: 'thursday', label: 'Qui', isOpen: true, start: '06:00', end: '23:30', breakStart: '', breakEnd: '' },
  { day: 'friday', label: 'Sex', isOpen: true, start: '06:00', end: '23:30', breakStart: '', breakEnd: '' },
  { day: 'saturday', label: 'Sab', isOpen: true, start: '06:00', end: '23:30', breakStart: '', breakEnd: '' }
];

export const DEFAULT_SCHEDULE_CONFIG: ScheduleViewConfig = {
  defaultView: 'week',
  defaultDuration: 60,
  displayInterval: 60,
  defaultColor: 'emerald',
  repeatFrequency: 'biweekly',
  defaultRepeatCount: 10,
  showBirthdays: true,
  enableDragAndDrop: true,
  limitSlotByDuration: false,
  showProfessionalName: true,
  days: DEFAULT_DAYS
};

export const getSavedScheduleConfig = (): ScheduleViewConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SCHEDULE_CONFIG, ...parsed };
    }
  } catch (_) {}
  return DEFAULT_SCHEDULE_CONFIG;
};

interface ScheduleSettingsTabProps {
  currentRole?: UserRole;
}

const COLOR_PRESETS = [
  { id: 'emerald', label: 'Verde-mar', hex: '#059669', bg: 'bg-emerald-500' },
  { id: 'blue', label: 'Azul-oceano', hex: '#2563eb', bg: 'bg-blue-600' },
  { id: 'teal', label: 'Teal Clínico', hex: '#0d9488', bg: 'bg-teal-600' },
  { id: 'purple', label: 'Roxo Real', hex: '#7c3aed', bg: 'bg-purple-600' },
  { id: 'amber', label: 'Âmbar Solar', hex: '#d97706', bg: 'bg-amber-600' }
];

export const ScheduleSettingsTab: React.FC<ScheduleSettingsTabProps> = ({ currentRole = 'admin' }) => {
  const isAdmin = currentRole === 'admin' || currentRole === 'superadmin';
  const [config, setConfig] = useState<ScheduleViewConfig>(getSavedScheduleConfig());
  const [saving, setSaving] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  useEffect(() => {
    professionalsApi.getAll().then(setProfessionals).catch(() => []);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Somente administradores podem salvar as configurações globais da agenda.');
      return;
    }

    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast.success('Configurações de visualização da agenda salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayKey: WeekDay, updates: Partial<ScheduleDayConfig>) => {
    setConfig((prev) => ({
      ...prev,
      days: prev.days.map((d) => (d.day === dayKey ? { ...d, ...updates } : d))
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-900">
          Configurações de visualização de agenda
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Defina as preferências visuais, intervalo da grade e os horários de expediente e intervalo da clínica.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco 1: Visualização, Duração e Intervalo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Visualização padrão:*
            </label>
            <select
              value={config.defaultView}
              onChange={(e) => setConfig({ ...config, defaultView: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="week">Semana</option>
              <option value="day">Dia</option>
              <option value="month">Mês</option>
              <option value="dayList">Lista do dia</option>
              <option value="weekList">Lista da semana</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Formato de visualização padrão da agenda
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Duração padrão:*
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="15"
                step="15"
                required
                value={config.defaultDuration}
                onChange={(e) => setConfig({ ...config, defaultDuration: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-l-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-xs text-gray-600 font-medium">
                minutos
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Duração padrão de um agendamento
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Intervalo de exibição:*
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="15"
                step="15"
                required
                value={config.displayInterval}
                onChange={(e) => setConfig({ ...config, displayInterval: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-l-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-xs text-gray-600 font-medium">
                minutos
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Intervalo entre um horário e outro na exibição da agenda
            </p>
          </div>
        </div>

        {/* Bloco 2: Cores e Repetições */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                Cor dos agendamentos:
              </label>
              <button
                type="button"
                onClick={() => setIsColorModalOpen(true)}
                className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
              >
                Personalizar cores
              </button>
            </div>
            <div className="relative flex items-center">
              <div
                className="absolute left-3 w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10 z-10 pointer-events-none"
                style={{
                  backgroundColor: COLOR_PRESETS.find((c) => c.id === config.defaultColor)?.hex || '#059669'
                }}
              />
              <select
                value={config.defaultColor}
                onChange={(e) => setConfig({ ...config, defaultColor: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {COLOR_PRESETS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Esta cor selecionada será utilizada para colorir os agendamentos com o status "Agendado" que estão marcados para este profissional.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Frequência:
            </label>
            <select
              value={config.repeatFrequency}
              onChange={(e) => setConfig({ ...config, repeatFrequency: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">A cada 2 semanas</option>
              <option value="monthly">Mensal</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Frequência de repetição
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Repetições:*
            </label>
            <input
              type="number"
              min="1"
              max="52"
              required
              value={config.defaultRepeatCount}
              onChange={(e) => setConfig({ ...config, defaultRepeatCount: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Número de repetições padrão para agendamentos repetidos
            </p>
          </div>
        </div>

        {/* Bloco 3: Opções em Checkbox */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showBirthdays}
                onChange={(e) => setConfig({ ...config, showBirthdays: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-gray-800 block">Mostrar aniversariantes</span>
                <span className="text-[10px] text-gray-400 block">Exibe os aniversariantes na parte superior da agenda</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showProfessionalName}
                onChange={(e) => setConfig({ ...config, showProfessionalName: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-gray-800 block">Mostrar nome do profissional</span>
                <span className="text-[10px] text-gray-400 block">Exibe o nome do profissional nos agendamentos</span>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableDragAndDrop}
                onChange={(e) => setConfig({ ...config, enableDragAndDrop: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-gray-800 block">Habilitar arrasta e solta na agenda</span>
                <span className="text-[10px] text-gray-400 block">Permite alterar horários dos agendamentos no estilo arrasta e solta</span>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.limitSlotByDuration}
                onChange={(e) => setConfig({ ...config, limitSlotByDuration: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-gray-800 block">Delimitar horário de agendamentos</span>
                <span className="text-[10px] text-gray-400 block">Delimitar horário de início conforme a duração padrão</span>
              </div>
            </label>
          </div>
        </div>

        {/* Bloco 4: Tabela de Dias, Expediente e Intervalo */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-800 mb-2">
            Dias para exibir na agenda:*
          </label>

          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                  <th className="p-3 font-bold w-20 border-r border-gray-200">Dia</th>
                  <th className="p-3 font-bold border-r border-gray-200" colSpan={2}>Horário de expediente</th>
                  <th className="p-3 font-bold" colSpan={2}>Horário de intervalo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {config.days.map((d) => (
                  <tr key={d.day} className={`hover:bg-gray-50/50 transition-colors ${!d.isOpen ? 'opacity-60 bg-gray-50/30' : ''}`}>
                    <td className="p-3 font-bold border-r border-gray-200">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={d.isOpen}
                          onChange={(e) => updateDay(d.day, { isOpen: e.target.checked })}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="font-bold text-xs text-gray-800">{d.label}</span>
                      </label>
                    </td>

                    {/* Expediente: das [start] às [end] */}
                    <td className="p-2.5 border-r border-gray-200" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[11px]">das</span>
                        <input
                          type="time"
                          disabled={!d.isOpen}
                          value={d.start}
                          onChange={(e) => updateDay(d.day, { start: e.target.value })}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                        <span className="text-gray-400 text-[11px]">às</span>
                        <input
                          type="time"
                          disabled={!d.isOpen}
                          value={d.end}
                          onChange={(e) => updateDay(d.day, { end: e.target.value })}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                      </div>
                    </td>

                    {/* Intervalo: das [breakStart] às [breakEnd] */}
                    <td className="p-2.5" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[11px]">das</span>
                        <input
                          type="time"
                          disabled={!d.isOpen}
                          value={d.breakStart || ''}
                          placeholder="--:--"
                          onChange={(e) => updateDay(d.day, { breakStart: e.target.value })}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                        <span className="text-gray-400 text-[11px]">às</span>
                        <input
                          type="time"
                          disabled={!d.isOpen}
                          value={d.breakEnd || ''}
                          placeholder="--:--"
                          onChange={(e) => updateDay(d.day, { breakEnd: e.target.value })}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações da Agenda'}</span>
          </button>
        </div>
      </form>

      {/* Calendar Color Customizer Modal */}
      {isColorModalOpen && (
        <CalendarColorModal
          isOpen={isColorModalOpen}
          onClose={() => setIsColorModalOpen(false)}
          professionals={professionals}
          onSave={() => {}}
        />
      )}
    </div>
  );
};
