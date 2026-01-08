import { apiLogger } from './logger';
import log4js from 'log4js';

export default log4js.connectLogger(apiLogger, {
  level: 'auto',
});
