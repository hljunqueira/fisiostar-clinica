import React, { useState } from 'react';
import { Database, DownloadCloud, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { professionalsApi, patientsApi, specialtiesApi, unitsApi, systemUsersApi, planTemplatesApi, sessionsApi } from '../src/services/api';
import { PlanTemplate, SessionStatus } from '../types';

const DataSeeder: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');

    const fetchFakerData = async (quantity: number) => {
        const response = await fetch(`https://fakerapi.it/api/v1/persons?_quantity=${quantity}&_locale=pt_BR`);
        const data = await response.json();
        return data.data;
    };

    const handleSeedData = async () => {
        if (!window.confirm('ATENÇÃO: Isso irá APAGAR TODOS os dados atuais de pacientes e profissionais e gerar novos. Tem certeza?')) return;

        setLoading(true);
        setProgress('Iniciando...');

        try {
            // 0. Clean Data
            setProgress('Limpando dados antigos...');
            // Delete order matters due to foreign keys (though cascade handles most)
            // Patients cascade to sessions and plans. Professionals cascade to units.
            // System Users (secretaries) need manual deletion?
            await patientsApi.deleteAll();
            await professionalsApi.deleteAll();
            await (systemUsersApi as any).deleteAllSecretaries();

            // 1. Load Dependencies
            setProgress('Carregando dependências...');
            const [units, specialties, existingPlans] = await Promise.all([
                unitsApi.getAll(),
                specialtiesApi.getAll(),
                planTemplatesApi.getAll()
            ]);

            if (units.length === 0) throw new Error('Crie pelo menos uma unidade antes de gerar dados.');
            if (specialties.length === 0) throw new Error('Crie especialidades antes de gerar dados.');

            // 1b. Ensure Plan Templates Exist
            let planTemplates = existingPlans;
            if (planTemplates.length === 0) {
                setProgress('Criando Modelos de Planos...');
                const newPlans = [
                    { name: 'Pilates Mensal (2x)', sessions: 8, price: 350, active: true },
                    { name: 'Fisioterapia Pacote 10', sessions: 10, price: 800, active: true },
                    { name: 'Hidroterapia Avulsa', sessions: 1, price: 120, active: true },
                    { name: 'Plano Trimestral', sessions: 24, price: 900, active: true }
                ];

                for (const p of newPlans) {
                    await planTemplatesApi.create(p);
                }
                planTemplates = await planTemplatesApi.getAll();
            }

            // Loop through ALL units
            for (const unit of units) {
                const unitName = unit.name.split(' ')[0];

                // 2. Generate Professionals
                setProgress(`Gerando 10 Profissionais para ${unitName}...`);
                const fakeProfs = await fetchFakerData(10);
                const createdProfs: any[] = []; // Store IDs for sessions

                for (const fake of fakeProfs) {
                    const randomSpecialty = specialties[Math.floor(Math.random() * specialties.length)];

                    const prof = await professionalsApi.create({
                        name: `Dr(a). ${fake.firstname} ${fake.lastname}`,
                        crf: `${Math.floor(Math.random() * 10000)}-F`,
                        specialty: randomSpecialty.name,
                        hourlyRate: 80 + Math.floor(Math.random() * 100),
                        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                        unitIds: [unit.id],
                        avatarUrl: fake.image
                    });
                    createdProfs.push(prof);
                }

                // 3. Generate Secretaries
                setProgress(`Gerando 4 Secretárias para ${unitName}...`);
                const fakeSecs = await fetchFakerData(4);
                for (const fake of fakeSecs) {
                    try {
                        await (systemUsersApi as any).create({
                            name: `Sec. ${fake.firstname} ${fake.lastname}`,
                            email: fake.email,
                            role: 'secretary',
                            unitId: unit.id,
                            avatarUrl: fake.image
                        });
                    } catch (e) { }
                }

                // 4. Generate Patients with Plans
                setProgress(`Gerando 100 Pacientes para ${unitName}...`);
                const fakePatients = await fetchFakerData(100);

                for (const [index, fake] of fakePatients.entries()) {
                    // 80% chance of having a plan (Increased from 30% per user request)
                    const hasPlan = Math.random() < 0.8;
                    let patientPlan = undefined;

                    if (hasPlan) {
                        const template = planTemplates[Math.floor(Math.random() * planTemplates.length)];
                        patientPlan = {
                            name: template.name,
                            totalSessions: template.sessions,
                            remainingSessions: Math.floor(Math.random() * template.sessions),
                            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +90 days
                        };
                    }

                    const patient = await patientsApi.create({
                        name: `${fake.firstname} ${fake.lastname}`,
                        phone: fake.phone,
                        cpf: generateFakeCPF(),
                        birthDate: fake.birthday,
                        address: `${fake.address.street}, ${fake.address.buildingNumber}`,
                        city: fake.address.city,
                        unitId: unit.id,
                        status: 'Active',
                        plan: patientPlan
                    });

                    // 5. Generate Sessions (History & Future)
                    // Generate for 50% of patients
                    if (Math.random() < 0.5 && createdProfs.length > 0) {
                        const prof = createdProfs[Math.floor(Math.random() * createdProfs.length)];

                        // Past Sessions (Last 30 days) - Clinical Record (Ficha)
                        const numPast = Math.floor(Math.random() * 5);
                        for (let i = 0; i < numPast; i++) {
                            const date = new Date();
                            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

                            // Clinical notes variations
                            const evolutions = [
                                "Paciente relatou melhora na dor lombar. Exercícios de fortalecimento de core realizados.",
                                "Evolução positiva. Aumento de amplitude de movimento em ombro direito.",
                                "Paciente queixou-se de dor leve. Aplicada crioterapia ao final da sessão.",
                                "Sessão focada em reeducação postural e alongamento de cadeia posterior.",
                                "Realizada mobilização articular e liberação miofascial. Paciente saiu sem dor.",
                                "Paciente evoluindo bem, carga nos exercícios aumentada progressivamente."
                            ];
                            const note = evolutions[Math.floor(Math.random() * evolutions.length)];

                            await sessionsApi.create({
                                patientId: patient.id,
                                professionalId: prof.id,
                                unitId: unit.id,
                                date: date.toISOString().split('T')[0],
                                time: `${9 + Math.floor(Math.random() * 8)}:00`,
                                duration: 30,
                                type: prof.specialty,
                                status: SessionStatus.COMPLETED,
                                notes: note,
                                signed: true,
                                isOutsidePlan: !hasPlan,
                                price: !hasPlan ? prof.hourlyRate : undefined
                            });
                        }

                        // Future Sessions (Next 7 days)
                        const numFuture = Math.floor(Math.random() * 3);
                        for (let i = 0; i < numFuture; i++) {
                            const date = new Date();
                            date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);

                            await sessionsApi.create({
                                patientId: patient.id,
                                professionalId: prof.id,
                                unitId: unit.id,
                                date: date.toISOString().split('T')[0],
                                time: `${9 + Math.floor(Math.random() * 8)}:00`,
                                duration: 30,
                                type: prof.specialty,
                                status: SessionStatus.SCHEDULED,
                                isOutsidePlan: !hasPlan
                            });
                        }
                    }
                }
            }

            toast.success('Dados antigos removidos e novos gerados com sucesso!');
            setProgress('Concluído!');

        } catch (error) {
            console.error('Erro ao gerar dados:', error);
            toast.error('Erro: ' + (error as any).message);
            setProgress('Erro!');
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate valid-looking CPF (not mathematically valid, just format)
    const generateFakeCPF = () => {
        const r = () => Math.floor(Math.random() * 9);
        return `${r()}${r()}${r()}.${r()}${r()}${r()}.${r()}${r()}${r()}-${r()}${r()}`;
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Database className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900">Gerador de Dados de Teste</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Popule o banco de dados com pacientes e profissionais fictícios usando a API <code>fakerapi.it</code>.
                        Útil para demonstrar o sistema.
                    </p>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSeedData}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {progress}
                                </>
                            ) : (
                                <>
                                    <DownloadCloud className="w-4 h-4" />
                                    Gerar Dados Brasileiros
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataSeeder;
