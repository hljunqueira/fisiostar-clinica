const fs = require('fs');
const readline = require('readline');
const xlsx = require('xlsx');

// Unidades oficiais no banco de dados
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
  // Ex: 14/01/2020 ou 14/01/2020 14:11:23
  const match = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [_, d, m, y] = match;
    return `${y}-${m}-${d}`;
  }
  return null;
}

async function prepareData() {
  console.log('Iniciando processamento e unificação dos clientes...');

  const allPatients = new Map(); // key -> patient object
  const usedCpfs = new Set();

  // 1. Carregar Pacientes Ativos das Planilhas de Agosto (Máxima Relevância)
  
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
              email: null,
              source: 'PEDRO AGOSTO ARROIO'
            });
          }
        }
      }
    });
  }

  // B) Douglas - Araranguá (Natação)
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
              email: null,
              source: 'Douglas Agosto Ararangua'
            });
          }
        }
      }
    });
  }

  // C) Maria Laura - Araranguá (Pilates / Fisio)
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
              email: null,
              source: 'Maria Laura Agosto Araranguá'
            });
          }
        }
      }
    });
  }

  console.log(`Pacientes das planilhas mensais carregados: ${allPatients.size}`);

  // 2. Carregar e Enriquecer com a base Zenfisio CSV
  const csvFile = 'Pacientes - Wlisses de Oliveira Borges - 6ab76fc2d58aa.csv';
  const fileStream = fs.createReadStream(csvFile, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let zenfisioTotal = 0;
  let header = null;

  for await (const line of rl) {
    if (!header) {
      header = line.split(';');
      continue;
    }
    if (!line.trim()) continue;
    zenfisioTotal++;

    const cols = line.split(';').map(c => c.replace(/^"|"$/g, '').trim());
    let nome = cleanNameStr(cols[1]);
    const dataCadastro = cols[2];
    const dataNascimento = cols[3];
    const sexo = cols[4];
    const cpf = cols[5];
    const rg = cols[6];
    const estadoCivil = cols[7];
    const cep = cols[8];
    const estado = cols[9];
    const cidade = cols[10];
    const endereco = cols[11];
    const bairro = cols[12];
    const numero = cols[13];
    const complemento = cols[14];
    const profissao = cols[15];
    const email = cols[16];
    const telefoneFixo = cols[17];
    const celular = cols[18];

    // Ignorar registros genéricos que não são pessoas
    if (!nome || nome.toLowerCase().includes('aula de hidroginástica') || nome.toLowerCase().includes('teste') && nome.length < 10) {
      continue;
    }

    // Se o nome tiver prefixo como "(Gabriel) Nome" ou "Wlisses (Arroio) - Nome", limpar para busca
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
    const parsedLastVisit = parseDateStr(dataCadastro);

    // Determina unidade sugerida pelo nome ou cidade
    let unitId = UNIT_ARARANGUA;
    if (nome.toLowerCase().includes('arroio') || (cidade && cidade.toLowerCase().includes('arroio'))) {
      unitId = UNIT_ARROIO;
    }

    if (allPatients.has(key)) {
      // Paciente já está na lista das planilhas: enriquece com dados do Zenfisio!
      const existing = allPatients.get(key);
      if (!existing.cpf && formattedCpf) existing.cpf = formattedCpf;
      if (!existing.phone && formattedPhone) existing.phone = formattedPhone;
      if (!existing.birth_date && parsedBirthDate) existing.birth_date = parsedBirthDate;
      if (!existing.address && endereco) existing.address = endereco;
      if (!existing.city && cidade) existing.city = cidade;
      if (!existing.rg && rg) existing.rg = rg;
      if (!existing.email && email && email.includes('@')) existing.email = email.toLowerCase().trim();
      if (!existing.gender && sexo) existing.gender = sexo;
    } else {
      // Novo paciente do Zenfisio
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
        email: (email && email.includes('@')) ? email.toLowerCase().trim() : null,
        last_visit: parsedLastVisit,
        source: 'Zenfisio'
      });
    }
  }

  console.log(`Total Zenfisio lidos: ${zenfisioTotal}`);
  console.log(`Total consolidado único (após deduplicação por nome normalizado): ${allPatients.size}`);

  // 3. Deduplicação adicional por CPF (Garantir que nenhum CPF duplicado quebre a constraint)
  const finalPatients = [];
  const seenCpfs = new Set();
  let duplicateCpfCount = 0;

  for (const [k, p] of allPatients.entries()) {
    if (p.cpf) {
      if (seenCpfs.has(p.cpf)) {
        // CPF já usado por outro registro: zera o CPF deste registro para permitir inclusão sem conflito
        p.cpf = null;
        duplicateCpfCount++;
      } else {
        seenCpfs.add(p.cpf);
      }
    }
    finalPatients.push(p);
  }

  console.log(`CPFs duplicados neutralizados para conformidade UNIQUE: ${duplicateCpfCount}`);
  console.log(`Pacientes finais prontos para banco de dados: ${finalPatients.length}`);

  // Amostra dos 5 primeiros
  console.log('\nAmostra de 5 pacientes prontos:');
  console.log(finalPatients.slice(0, 5));

  return finalPatients;
}

prepareData().catch(console.error);
