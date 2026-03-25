import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fyhogxsiqewnacvzwhrq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aG9neHNpcWV3bmFjdnp3aHJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAwNzY3MSwiZXhwIjoyMDg5NTgzNjcxfQ.nP1tRguZD5yU_A6zvZ7v3ogLDi67b9SoffUm90s2uFU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getData() {
    const { data: farms, error: fErr } = await supabase.from('farms').select('*');
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    const { data: stock, error: sErr } = await supabase.from('stock_items').select('*');

    console.log('FARMS:', JSON.stringify(farms, null, 2));
    console.log('USERS count:', users?.length);
    console.log('STOCK:', JSON.stringify(stock, null, 2));
}

getData();
