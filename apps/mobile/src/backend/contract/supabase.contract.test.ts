import { createSupabaseBackend } from '../supabase';
import { describeBackendContract } from './backendContract';
import { localSupabase } from './localSupabase';

const connection = localSupabase();

describeBackendContract('Supabase', () => createSupabaseBackend(connection));
