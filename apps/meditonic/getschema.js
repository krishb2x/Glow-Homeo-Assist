const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) { console.error('No URL'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('mt_ebooks').select('*').limit(1).then(({ data, error }) => {
  if (error) { console.error(error); }
  else { console.log(Object.keys(data[0] || {})); }
});
