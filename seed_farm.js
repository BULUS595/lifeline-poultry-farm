import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fyhogxsiqewnacvzwhrq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aG9neHNpcWV3bmFjdnp3aHJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAwNzY3MSwiZXhwIjoyMDg5NTgzNjcxfQ.nP1tRguZD5yU_A6zvZ7v3ogLDi67b9SoffUm90s2uFU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
    const { data: admin } = await supabase.from('users').select('id, farm_ids').eq('email', 'admin@lifeline.local').single();
    if (!admin) return;

    const farmId = '00000000-0000-0000-0000-000000000001';

    const { data, error } = await supabase.from('farms').insert([
        {
          id: farmId,
          name: 'Lifeline Central Farm',
          location: 'Main Road 10',
          total_birds: 5000,
          bird_type: 'Broiler',
          managed_by: admin.id,
          staff_ids: []
        }
    ]).select();

    if (error) {
        console.error('Error creating farm:', error);
    } else {
        console.log('Farm created:', JSON.stringify(data, null, 2));
        await supabase.from('users')
          .update({ farm_ids: [...(admin.farm_ids || []), farmId] })
          .eq('id', admin.id);
        
        // Update stock items to use this real UUID
        await supabase.from('stock_items').update({ farm_id: farmId }).eq('farm_id', 'farm-1');
    }
}

seed();
