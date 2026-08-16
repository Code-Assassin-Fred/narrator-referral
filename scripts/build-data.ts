import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// Define the input and output paths
const INPUT_PATH = path.join(__dirname, '../data/referral-graph-accepted-narrators.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../data/narrators.json');

interface RawRow {
  relationship?: string;
  referral_depth?: number | string;
  root_referral_code?: string;
  parent_id?: number | string | null;
  parent_name?: string | null;
  parent_phone?: number | string | null;
  parent_referral_code?: string | null;
  child_id?: number | string;
  child_name?: string | null;
  child_phone?: number | string | null;
  child_referral_code?: string;
  accepted_clips?: number | string;
  accepted_hours?: number | string;
  full_referral_path?: string;
}

export type Narrator = {
  id: number;
  code: string;
  name: string | null;
  phone: string | null;
  parentId: number | null;
  parentCode: string | null;
  hours: number;
  clips: number;
  depth: number;
  rootCode: string;
};

function main() {
  console.log(`Reading Excel from: ${INPUT_PATH}`);
  
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Error: File does not exist at ${INPUT_PATH}`);
    process.exit(1);
  }
  
  const workbook = XLSX.readFile(INPUT_PATH);
  const targetSheetName = 'Referral Graph';
  let sheetName = workbook.SheetNames.find(n => n.toLowerCase() === targetSheetName.toLowerCase());
  if (!sheetName) {
    console.warn(`Warning: Sheet "${targetSheetName}" not found. Using first sheet: "${workbook.SheetNames[0]}"`);
    sheetName = workbook.SheetNames[0];
  }
  
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`Error: Sheet could not be loaded.`);
    process.exit(1);
  }
  
  // Skip the first 3 rows. The headers are at row 4, which is 0-indexed index 3.
  const rawData: RawRow[] = XLSX.utils.sheet_to_json<RawRow>(sheet, { range: 3 });
  
  console.log(`Parsed ${rawData.length} raw rows from Excel sheet.`);
  
  const narrators: Narrator[] = [];
  
  for (const row of rawData) {
    if (row.child_id === undefined || row.child_id === null || row.child_id === '') {
      continue;
    }
    
    const id = Number(row.child_id);
    if (isNaN(id)) {
      continue;
    }
    
    let parentId: number | null = null;
    if (row.parent_id !== undefined && row.parent_id !== null && row.parent_id !== '') {
      parentId = Number(row.parent_id);
      if (isNaN(parentId)) {
        parentId = null;
      }
    }
    
    const code = row.child_referral_code ? String(row.child_referral_code).trim() : '';
    const name = row.child_name ? String(row.child_name).trim() : null;
    const phone = row.child_phone !== undefined && row.child_phone !== null ? String(row.child_phone).trim() : null;
    const parentCode = row.parent_referral_code ? String(row.parent_referral_code).trim() : null;
    const rootCode = row.root_referral_code ? String(row.root_referral_code).trim() : '';
    
    const depth = row.referral_depth !== undefined ? Number(row.referral_depth) : 0;
    const hours = row.accepted_hours !== undefined ? Number(row.accepted_hours) : 0;
    const clips = row.accepted_clips !== undefined ? Number(row.accepted_clips) : 0;
    
    narrators.push({
      id,
      code,
      name: name === 'null' || name === '' ? null : name,
      phone: phone === 'null' || phone === '' ? null : phone,
      parentId,
      parentCode: parentCode === 'null' || parentCode === '' ? null : parentCode,
      hours: isNaN(hours) ? 0 : hours,
      clips: isNaN(clips) ? 0 : clips,
      depth: isNaN(depth) ? 0 : depth,
      rootCode,
    });
  }
  
  const seenIds = new Set<number>();
  const uniqueNarrators: Narrator[] = [];
  
  for (const n of narrators) {
    if (!seenIds.has(n.id)) {
      seenIds.add(n.id);
      uniqueNarrators.push(n);
    } else {
      console.warn(`Duplicate child_id skipped: ${n.id}`);
    }
  }
  
  console.log(`Successfully processed ${uniqueNarrators.length} unique narrators.`);
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(uniqueNarrators, null, 2), 'utf-8');
  console.log(`JSON written to ${OUTPUT_PATH}`);
}

main();
