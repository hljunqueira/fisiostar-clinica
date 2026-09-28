const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

const secretaries = [
  {
    id: '1ca84d45-38f1-4c34-9d6d-dc6891f32ede',
    name: 'Nairelle Braun Junqueira',
    crf: 'REC-NAI',
    specialty: 'Recepção & Administrativo',
    hourly_rate: 0,
    color: '#8b5cf6',
    email: 'nay@fisiostarclinica.com.br',
    roles: ['secretary'],
    contract_type: 'clt',
    base_salary: 1800,
    unit_id: '550e8400-e29b-41d4-a716-446655440012' // Arroio
  },
  {
    id: '39779617-f1d6-4020-8a39-026d863fe761',
    name: 'Ariane Secretaria',
    crf: 'REC-ARIANE',
    specialty: 'Recepção & Administrativo',
    hourly_rate: 0,
    color: '#a855f7',
    email: 'ariane@fisiostarclinica.com.br',
    roles: ['secretary'],
    contract_type: 'clt',
    base_salary: 1800,
    unit_id: '550e8400-e29b-41d4-a716-446655440011' // Araranguá
  },
  {
    id: '74a187a1-20da-4419-8043-2e0348954aea',
    name: 'Kelly Secretaria',
    crf: 'REC-KELLY',
    specialty: 'Recepção & Administrativo',
    hourly_rate: 0,
    color: '#c084fc',
    email: 'kelly@fisiostarclinica.com.br',
    roles: ['secretary'],
    contract_type: 'clt',
    base_salary: 1800,
    unit_id: '550e8400-e29b-41d4-a716-446655440012' // Arroio
  },
  {
    id: '156a98fe-f74b-43e4-8263-63022c27e747',
    name: 'Vitória Secretaria',
    crf: 'REC-VITORIA',
    specialty: 'Recepção & Administrativo',
    hourly_rate: 0,
    color: '#7c3aed',
    email: 'vitoria@fisiostarclinica.com.br',
    roles: ['secretary'],
    contract_type: 'clt',
    base_salary: 1800,
    unit_id: '550e8400-e29b-41d4-a716-446655440011' // Araranguá
  }
];

async function run() {
  console.log('--- Syncing secretaries into professionals table ---');
  for (const sec of secretaries) {
    const { unit_id, ...profData } = sec;
    
    // Check if exists by id or email or crf
    const { data: existing } = await supabase
      .from('professionals')
      .select('id, name')
      .or(`id.eq.${sec.id},email.eq.${sec.email},crf.eq.${sec.crf}`)
      .maybeSingle();

    let profId = sec.id;
    if (existing) {
      console.log(`Updating existing professional for ${sec.name} (${existing.id})`);
      profId = existing.id;
      const { error: updErr } = await supabase
        .from('professionals')
        .update({
          name: sec.name,
          specialty: sec.specialty,
          roles: sec.roles,
          contract_type: sec.contract_type,
          base_salary: sec.base_salary,
          hourly_rate: 0,
          color: sec.color,
          email: sec.email
        })
        .eq('id', profId);
      if (updErr) console.error('Error updating:', updErr);
    } else {
      console.log(`Inserting professional for ${sec.name} (${sec.id})`);
      const { error: insErr } = await supabase
        .from('professionals')
        .insert({
          id: sec.id,
          name: sec.name,
          crf: sec.crf,
          specialty: sec.specialty,
          hourly_rate: 0,
          color: sec.color,
          email: sec.email,
          roles: sec.roles,
          contract_type: sec.contract_type,
          base_salary: sec.base_salary
        });
      if (insErr) console.error('Error inserting:', insErr);
    }

    // Link unit
    if (unit_id) {
      const { error: unitErr } = await supabase
        .from('professional_units')
        .upsert({
          professional_id: profId,
          unit_id: unit_id
        }, { onConflict: 'professional_id, unit_id' });
      if (unitErr) console.error('Error linking unit:', unitErr);
      else console.log(`Linked ${sec.name} to unit ${unit_id}`);
    }
  }

  // Verify
  const { data: allProfs } = await supabase.from('professionals').select('id, name, specialty, base_salary, roles');
  console.log('\nTotal professionals in DB now:', allProfs.length);
  console.log('Secretaries in professionals:');
  allProfs.filter(p => p.roles?.includes('secretary') || p.specialty?.toLowerCase().includes('secret')).forEach(p => {
    console.log(`- ${p.name} | Role: ${p.roles} | Fixo: R$ ${p.base_salary}`);
  });
}

run();
