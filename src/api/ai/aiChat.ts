// ai对话

import express from 'express';
import { RequestType, ResponseType } from '../../utils/type';
import { setupSSE } from '../../utils/utils';

const router = express.Router();

router.get('chat', async (req: RequestType<null, 'get'>, res: ResponseType) => {
  setupSSE(res);
});

export default router;
