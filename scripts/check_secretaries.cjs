const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fisiostarclinica.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc3MDYxNzMwLCJleHAiOjIwOTI0MjE3MzB9.SODr_-a0tLXL8wHbScf3vhyfjGyTTjo3MIrspModkvQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('=== SYSTEM USERS (role = secretary ou admin) ===');
  const { data: users, error: errUsers } = await supabase.from('system_users').select('*');
  if (errUsers) console.error(errUsers);
  else {
    users.forEach(u => console.log(`[USER] ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Unit: ${u.unit_id}`));
  }

  console.log('\n=== PROFESSIONALS ===');
  const { data: profs, error: errProfs } = await supabase.from('professionals').select('id, name, specialty, contract_type, base_salary, roles');
  if (errProfs) console.error(errProfs);
  else {
    profs.forEach(p => console.log(`[PROF] ID: ${p.id} | Name: ${p.name} | Specialty: ${p.specialty} | Contract: ${p.contract_type} | Base Salary: R$ ${p.base_salary} | Roles: ${JSON.stringify(p.roles)}`));
  }

  console.log('\n=== ADVANCES (VALES) ===');
  const { data: advs, error: errAdvs } = await supabase.from('employee_advances').select('*').limit(15);
  if (errAdvs) console.error(errAdvs);
  else {
    advs.forEach(a => console.log(`[ADVANCE] ID: ${a.id} | ProfId: ${a.professional_id} | Amount: R$ ${a.amount} | Date: ${a.advance_date} | Desc: ${a.description}`));
  }
}

run();
