import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase env vars. Copy .env.example → .env.local and fill in your keys.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
    // Reconnect automatically if the websocket drops
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries) => Math.min(tries * 500, 5000),
  },
  // Keep auth token refreshed so realtime stays authenticated
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Upload image to Supabase storage
export async function uploadImage(file, folder = 'tasks') {
  const ext  = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('task-images')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('task-images').getPublicUrl(path);
  return data.publicUrl;
}
