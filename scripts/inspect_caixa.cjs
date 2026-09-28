const xlsx = require('xlsx');

const files = [
  'PEDRO AGOSTO ARROIO.xlsx',
  'Douglas Agosto Ararangua.xlsx',
  'Maria Laura Agosto Araranguá.xlsx',
  'app-zenfisio-com-2026-08-19.xlsx'
];

for (const file of files) {
  try {
    const wb = xlsx.readFile(file);
    console.log('=== FILE:', file, 'Sheets:', wb.SheetNames);
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const json = xlsx.utils.sheet_to_json(ws, { header: 1 });
      for (let i = 0; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;
        const line = row.join(' | ');
        const lower = line.toLowerCase();
        if (
          lower.includes('vale') ||
          lower.includes('secret') ||
          lower.includes('kelly') ||
          lower.includes('nai') ||
          lower.includes('ariane') ||
          lower.includes('vitor') ||
          lower.includes('fixo')
        ) {
          console.log(`[${file} -> ${name}:${i}] ${line}`);
        }
      }
    }
  } catch (err) {
    console.log('Error with', file, err.message);
  }
}
