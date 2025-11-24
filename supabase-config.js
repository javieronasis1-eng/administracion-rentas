// Supabase Configuration
const SUPABASE_URL = 'https://uitstrfhacpllhdfchvn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdHN0cmZoYWNwbGxoZGZjaHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjkxOTIsImV4cCI6MjA3OTUwNTE5Mn0.OEiODjUQZjPBdIbw4QiGfizJuCOha7HzI8UgIEYu5VQ';

// Initialize Supabase client (will be available after including the library in HTML)
let supabaseClient;

function initSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client initialized');
            return true;
        } else {
            console.warn('⚠️ Supabase library not loaded');
            return false;
        }
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return false;
    }
}
