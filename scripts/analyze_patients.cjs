const fs = require('fs');
const readline = require('readline');
const xlsx = require('xlsx');

async function analyze() {
  console.log('--- 1. Analisando CSV Zenfisio ---');
  const csvFile = 'Pacientes - Wlisses de Oliveira Borges - 6ab76fc2d58aa.csv';
  const fileStream = fs.createReadStream(csvFile, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let totalLines = 0;
  const patientsByCode = new Map();
  const patientsByName = new Map();
  const patientsByCpf = new Map();
  const duplicateNames = [];
  const duplicateCpfs = [];

  let header = null;
  for await (const line of rl) {
    if (!header) {
      header = line.split(';');
      continue;
    }
    if (!line.trim()) continue;
    totalLines++;

    const cols = line.split(';').map(c => c.replace(/^"|"$/g, '').trim());
    const codigo = cols[0];
    const nome = cols[1];
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

    const cleanName = nome.toLowerCase().trim();
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

    const patientRecord = {
      codigo,
      nome,
      dataCadastro,
      dataNascimento,
      sexo,
      cpf: cleanCpf.length === 11 ? cleanCpf : null,
      rawCpf: cpf,
      rg,
      estadoCivil,
      cep,
      estado,
      cidade,
      endereco,
      bairro,
      numero,
      complemento,
      profissao,
      email,
      telefoneFixo,
      celular
    };

    patientsByCode.set(codigo, patientRecord);

    if (patientsByName.has(cleanName)) {
      duplicateNames.push({ name: nome, codigo, existing: patientsByName.get(cleanName).codigo });
    } else {
      patientsByName.set(cleanName, patientRecord);
    }

    if (patientRecord.cpf) {
      if (patientsByCpf.has(patientRecord.cpf)) {
        duplicateCpfs.push({ cpf: patientRecord.cpf, name: nome, existing: patientsByCpf.get(patientRecord.cpf).nome });
      } else {
        patientsByCpf.set(patientRecord.cpf, patientRecord);
      }
    }
  }

  console.log('Total de linhas lidas:', totalLines);
  console.log('Pacientes por Código único:', patientsByCode.size);
  console.log('Nomes distintos:', patientsByName.size);
  console.log('Nomes duplicados:', duplicateNames.length);
  console.log('Pacientes com CPF válido:', patientsByCpf.size);
  console.log('CPFs duplicados:', duplicateCpfs.length);

  if (duplicateNames.length > 0) {
    console.log('\nExemplos de duplicados por Nome:', duplicateNames.slice(0, 5));
  }
  if (duplicateCpfs.length > 0) {
    console.log('\nExemplos de duplicados por CPF:', duplicateCpfs.slice(0, 5));
  }

  console.log('\n--- 2. Analisando Planilhas Mensais (Agosto) ---');
  const monthlyPatients = new Map();

  // Pedro
  if (fs.existsSync('PEDRO AGOSTO ARROIO.xlsx')) {
    const wb = xlsx.readFile('PEDRO AGOSTO ARROIO.xlsx');
    const sheet = wb.Sheets['Planilha1'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let count = 0;
    rows.forEach(r => {
      if (Array.isArray(r) && r[1] && typeof r[1] === 'string') {
        const name = r[1].trim();
        if (name && name !== 'Paciente' && !name.includes('Dr:') && !name.includes('Modalidade') && !name.includes('Relação') && !name.includes('TOTAL') && !name.includes('VALES')) {
          count++;
          monthlyPatients.set(name.toLowerCase(), { name, source: 'PEDRO AGOSTO ARROIO', unit: 'Arroio' });
        }
      }
    });
    console.log('Pacientes em PEDRO AGOSTO ARROIO:', count);
  }

  // Douglas
  if (fs.existsSync('Douglas Agosto Ararangua.xlsx')) {
    const wb = xlsx.readFile('Douglas Agosto Ararangua.xlsx');
    const sheet = wb.Sheets['Plan1'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let count = 0;
    rows.forEach(r => {
      if (Array.isArray(r) && r[2] && typeof r[2] === 'string') {
        const name = r[2].trim();
        if (name && name !== 'PRESENÇA NATAÇÃO' && name !== 'TOTAL' && !name.includes('AULAS')) {
          count++;
          monthlyPatients.set(name.toLowerCase(), { name, source: 'Douglas Agosto Ararangua', unit: 'Araranguá' });
        }
      }
    });
    console.log('Pacientes em Douglas Agosto Ararangua:', count);
  }

  // Maria Laura
  if (fs.existsSync('Maria Laura Agosto Araranguá.xlsx')) {
    const wb = xlsx.readFile('Maria Laura Agosto Araranguá.xlsx');
    const sheet = wb.Sheets['Planilha1'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let count = 0;
    rows.forEach(r => {
      if (Array.isArray(r) && r[1] && typeof r[1] === 'string') {
        const name = r[1].trim();
        if (name && !name.includes('PRESENÇA') && !name.includes('TOTAL') && !name.includes('VALOR') && !name.includes('AULAS')) {
          count++;
          monthlyPatients.set(name.toLowerCase(), { name, source: 'Maria Laura Agosto Araranguá', unit: 'Araranguá' });
        }
      }
    });
    console.log('Pacientes em Maria Laura Agosto Araranguá:', count);
  }

  console.log('\nTotal de pacientes únicos nas planilhas mensais:', monthlyPatients.size);
  
  // Cruzando: quantos pacientes mensais existem no Zenfisio CSV?
  let foundInZenfisio = 0;
  let missingInZenfisio = 0;
  const missingList = [];
  monthlyPatients.forEach((val, key) => {
    if (patientsByName.has(key)) {
      foundInZenfisio++;
    } else {
      missingInZenfisio++;
      missingList.push(val);
    }
  });

  console.log('Pacientes mensais presentes no Zenfisio:', foundInZenfisio);
  console.log('Pacientes mensais que NÃO estavam no Zenfisio:', missingInZenfisio);
  if (missingList.length > 0) {
    console.log('Exemplos de faltantes no Zenfisio:', missingList.slice(0, 10));
  }
}

analyze().catch(console.error);
