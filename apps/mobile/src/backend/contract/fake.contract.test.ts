import { createFakeBackend } from '../fake';
import { describeBackendContract } from './backendContract';

describeBackendContract('fake', createFakeBackend);
