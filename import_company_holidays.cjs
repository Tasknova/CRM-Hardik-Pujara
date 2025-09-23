// import_company_holidays.cjs
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function loadHolidays(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  return json.response.holidays;
}

async function importHolidays() {
  const files = ['holidays_2025.json', 'holidays_2026.json'];
  let allHolidays = [];
  for (const file of files) {
    const holidays = loadHolidays(file);
    for (const h of holidays) {
      if (!h.date || !h.date.iso || !h.name) continue;
      const year = parseInt(h.date.iso.slice(0, 4), 10);
      allHolidays.push({
        holiday_name: h.name,
        date: h.date.iso.slice(0, 10),
        description: h.description || '',
        year,
      });
    }
  }
  // Remove duplicates (same date + name)
  const unique = Array.from(new Map(allHolidays.map(h => [h.date + h.holiday_name, h])).values());
  for (const holiday of unique) {
    const { error } = await supabase.from('company_holidays').upsert(holiday, { onConflict: ['date', 'holiday_name'] });
    if (error) {
      console.error('Error inserting', holiday, error);
    } else {
      console.log('Inserted', holiday);
    }
  }
}

importHolidays(); 