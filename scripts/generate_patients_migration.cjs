const fs = require('fs');
const readline = require('readline');
const xlsx = require('xlsx');

const UNIT_ARARANGUA = '550e8400-e29b-41d4-a716-446655440011';
const UNIT_ARROIO = '550e8400-e29b-41d4-a716-446655440012';

function cleanNameStr(name) {
  if (!name) return '';
  return name
    .replace(/^\"|\"$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function cleanCpfStr(cpf) {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11 && !/^(\d)\1{10}$/.test(digits)) {
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
  }
  return null;
}

function cleanPhoneStr(phone, dddDefault = '48') {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6,10)}`;
  }
  if (digits.length === 9) {
    return `(${dddDefault}) ${digits.slice(0,5)}-${digits.slice(5,9)}`;
  }
  if (digits.length === 8) {
    return `(${dddDefault}) 9${digits.slice(0,4)}-${digits.slice(4,8)}`;
  }
  return phone.trim() || null;
}

function parseDateStr(dt) {
  if (!dt) return null;
  const match = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [_, d, m, y] = match;
    const year = parseInt(y, 10);
    if (year >= 1910 && year <= 2026) {
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''").trim()}'`;
}

async function run() {
  console.log('--- Gerando Migração de Pacientes ---');

  const allPatients = new Map();

  // 1. Pacientes Ativos das Planilhas de Agosto
  // A) Pedro - Arroio
  if (fs.existsSync('PEDRO AGOSTO ARROIO.xlsx')) {
    const wb = xlsx.readFile('PEDRO AGOSTO ARROIO.xlsx');
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Planilha1'], { header: 1 });
    rows.forEach(r => {
      if (Array.isArray(r) && r[1] && typeof r[1] === 'string') {
        const raw = cleanNameStr(r[1]);
        if (raw && raw !== 'Paciente' && !raw.includes('Dr:') && !raw.includes('Modalidade') && !raw.includes('Relação') && !raw.includes('TOTAL') && !raw.includes('VALES')) {
          const key = normalizeKey(raw);
          if (key.length >= 4 && !allPatients.has(key)) {
            allPatients.set(key, {
              name: raw,
              unit_id: UNIT_ARROIO,
              phone: null,
              cpf: null,
              birth_date: null,
              city: 'Balneário Arroio do Silva',
              address: null,
              gender: null,
              rg: null,
              email: null
            });
          }
        }
      }
    });
  }

  // B) Douglas - Araranguá
  if (fs.existsSync('Douglas Agosto Ararangua.xlsx')) {
    const wb = xlsx.readFile('Douglas Agosto Ararangua.xlsx');
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Plan1'], { header: 1 });
    rows.forEach(r => {
      if (Array.isArray(r) && r[2] && typeof r[2] === 'string') {
        const raw = cleanNameStr(r[2]);
        if (raw && raw !== 'PRESENÇA NATAÇÃO' && raw !== 'TOTAL' && !raw.includes('AULAS')) {
          const key = normalizeKey(raw);
          if (key.length >= 4 && !allPatients.has(key)) {
            allPatients.set(key, {
              name: raw,
              unit_id: UNIT_ARARANGUA,
              phone: null,
              cpf: null,
              birth_date: null,
              city: 'Araranguá',
              address: null,
              gender: null,
              rg: null,
              email: null
            });
          }
        }
      }
    });
  }

  // C) Maria Laura - Araranguá
  if (fs.existsSync('Maria Laura Agosto Araranguá.xlsx')) {
    const wb = xlsx.readFile('Maria Laura Agosto Araranguá.xlsx');
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Planilha1'], { header: 1 });
    rows.forEach(r => {
      if (Array.isArray(r) && r[1] && typeof r[1] === 'string') {
        const raw = cleanNameStr(r[1]);
        if (raw && !raw.includes('PRESENÇA') && !raw.includes('TOTAL') && !raw.includes('VALOR') && !raw.includes('AULAS')) {
          const key = normalizeKey(raw);
          if (key.length >= 4 && !allPatients.has(key)) {
            allPatients.set(key, {
              name: raw,
              unit_id: UNIT_ARARANGUA,
              phone: null,
              cpf: null,
              birth_date: null,
              city: 'Araranguá',
              address: null,
              gender: null,
              rg: null,
              email: null
            });
          }
        }
      }
    });
  }

  // 2. Base Zenfisio CSV
  const csvFile = 'Pacientes - Wlisses de Oliveira Borges - 6ab76fc2d58aa.csv';
  const fileStream = fs.createReadStream(csvFile, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let header = null;
  for await (const line of rl) {
    if (!header) {
      header = line.split(';');
      continue;
    }
    if (!line.trim()) continue;

    const cols = line.split(';').map(c => c.replace(/^"|"$/g, '').trim());
    let nome = cleanNameStr(cols[1]);
    const dataCadastro = cols[2];
    const dataNascimento = cols[3];
    const sexo = cols[4];
    const cpf = cols[5];
    const rg = cols[6];
    const cep = cols[8];
    const estado = cols[9];
    const cidade = cols[10];
    const endereco = cols[11];
    const bairro = cols[12];
    const numero = cols[13];
    const email = cols[16];
    const telefoneFixo = cols[17];
    const celular = cols[18];

    if (!nome || nome.toLowerCase().includes('aula de hidroginástica') || (nome.toLowerCase().includes('teste') && nome.length < 10)) {
      continue;
    }

    let cleanDisplayName = nome
      .replace(/^\([^)]+\)\s*/, '')
      .replace(/^[\w\s]+\((?:Arroio|Araranguá)\)\s*-\s*/i, '')
      .replace(/^(?:Maili|Luan|Douglas|Gabriel|Giovanni|Camila|Danielle|Jeniffer)\s*-\s*/i, '')
      .trim();

    if (!cleanDisplayName || cleanDisplayName.length < 3) {
      cleanDisplayName = nome;
    }

    const key = normalizeKey(cleanDisplayName);
    if (!key || key.length < 3) continue;

    const formattedCpf = cleanCpfStr(cpf);
    const formattedPhone = cleanPhoneStr(celular || telefoneFixo);
    const parsedBirthDate = parseDateStr(dataNascimento);

    let unitId = UNIT_ARARANGUA;
    if (nome.toLowerCase().includes('arroio') || (cidade && cidade.toLowerCase().includes('arroio'))) {
      unitId = UNIT_ARROIO;
    }

    if (allPatients.has(key)) {
      const existing = allPatients.get(key);
      if (!existing.cpf && formattedCpf) existing.cpf = formattedCpf;
      if (!existing.phone && formattedPhone) existing.phone = formattedPhone;
      if (!existing.birth_date && parsedBirthDate) existing.birth_date = parsedBirthDate;
      if (!existing.address && endereco) existing.address = `${endereco}${numero ? ', ' + numero : ''}${bairro ? ' - ' + bairro : ''}`;
      if (!existing.city && cidade) existing.city = cidade;
      if (!existing.rg && rg) existing.rg = rg;
      if (!existing.email && email && email.includes('@')) existing.email = email.toLowerCase().trim();
      if (!existing.gender && sexo) existing.gender = sexo;
    } else {
      allPatients.set(key, {
        name: cleanDisplayName,
        unit_id: unitId,
        phone: formattedPhone,
        cpf: formattedCpf,
        birth_date: parsedBirthDate,
        city: cidade || (unitId === UNIT_ARROIO ? 'Balneário Arroio do Silva' : 'Araranguá'),
        address: endereco ? `${endereco}${numero ? ', ' + numero : ''}${bairro ? ' - ' + bairro : ''}` : null,
        gender: sexo || null,
        rg: rg || null,
        email: (email && email.includes('@')) ? email.toLowerCase().trim() : null
      });
    }
  }

  // Deduplicação de CPFs (para respeitar a restrição UNIQUE do banco)
  const seenCpfs = new Set();
  const patientList = [];

  for (const [k, p] of allPatients.entries()) {
    if (p.cpf) {
      if (seenCpfs.has(p.cpf)) {
        p.cpf = null; // CPF repetido zera para permitir cadastro do paciente
      } else {
        seenCpfs.add(p.cpf);
      }
    }
    patientList.push(p);
  }

  console.log(`Total de pacientes prontos para exportação: ${patientList.length}`);

  // Gerar SQL
  let sql = `-- ==============================================================================
-- FisioStar: Sincronização e Inclusão de Pacientes das Planilhas e Zenfisio
-- Total de Pacientes Consolidados: ${patientList.length}
-- ==============================================================================

BEGIN;

CREATE TEMP TABLE temp_patients_import (
    name TEXT NOT NULL,
    unit_id UUID,
    phone TEXT,
    cpf TEXT,
    birth_date DATE,
    city TEXT,
    address TEXT,
    gender TEXT,
    rg TEXT,
    email TEXT
) ON COMMIT DROP;

`;

  // Inserções em lote na tabela temporária
  const batchSize = 100;
  for (let i = 0; i < patientList.length; i += batchSize) {
    const chunk = patientList.slice(i, i + batchSize);
    sql += `INSERT INTO temp_patients_import (name, unit_id, phone, cpf, birth_date, city, address, gender, rg, email) VALUES\n`;
    const rowsSql = chunk.map(p => {
      return `(${escapeSql(p.name)}, ${escapeSql(p.unit_id)}, ${escapeSql(p.phone)}, ${escapeSql(p.cpf)}, ${p.birth_date ? escapeSql(p.birth_date) : 'NULL'}, ${escapeSql(p.city)}, ${escapeSql(p.address)}, ${escapeSql(p.gender)}, ${escapeSql(p.rg)}, ${escapeSql(p.email)})`;
    }).join(',\n');
    sql += rowsSql + ';\n\n';
  }

  // Atualizar pacientes existentes que têm dados faltando (telefone, cpf, etc.)
  sql += `
-- 1. Atualizar pacientes já existentes no banco que possuem dados novos
UPDATE public.patients p
SET 
    phone = COALESCE(p.phone, t.phone),
    cpf = COALESCE(p.cpf, t.cpf),
    birth_date = COALESCE(p.birth_date, t.birth_date),
    city = COALESCE(p.city, t.city),
    address = COALESCE(p.address, t.address),
    gender = COALESCE(p.gender, t.gender),
    rg = COALESCE(p.rg, t.rg),
    email = COALESCE(p.email, t.email),
    updated_at = NOW()
FROM temp_patients_import t
WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(t.name));

-- 2. Inserir novos pacientes faltantes que ainda não constam no banco
INSERT INTO public.patients (
    id,
    name,
    unit_id,
    phone,
    cpf,
    birth_date,
    city,
    address,
    gender,
    rg,
    email,
    status,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    t.name,
    COALESCE(t.unit_id, '${UNIT_ARARANGUA}'::uuid),
    t.phone,
    t.cpf,
    t.birth_date,
    t.city,
    t.address,
    t.gender,
    t.rg,
    t.email,
    'Active'::patient_status,
    NOW(),
    NOW()
FROM temp_patients_import t
WHERE NOT EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(t.name))
       OR (t.cpf IS NOT NULL AND p.cpf = t.cpf)
);

COMMIT;
`;

  const outputFile = 'supabase/sync_all_patients.sql';
  fs.writeFileSync(outputFile, sql, 'utf8');
  console.log(`✅ Arquivo SQL gerado com sucesso: ${outputFile} (${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB)`);
}

run().catch(console.error);
