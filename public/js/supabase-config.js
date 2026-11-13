
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';

const supabaseUrl = 'https://krksscqjjrobapxpkofm.supabase.co';

const supabaseKey = 'sb_publishable_wDS6dLugMc-v1NhAfhgkbg_ZDBe7zw3';

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);
