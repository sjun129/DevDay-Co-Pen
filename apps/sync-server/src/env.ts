import 'dotenv/config';
import { parseSyncServerEnvironment } from './config';

export const env = parseSyncServerEnvironment(process.env);
