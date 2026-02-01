import express, { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { uploadValidation, handleValidationErrors } from '../../validators';
import { asyncHandler } from '../../utils/getSendResult';
import {
  UploadRequsetType,
  UploadResponseType,
  UploadFile,
  // 大文件上传相关
  BigFileInitRequestType,
  BigFileInitResponseType,
  BigFileChunkRequestType,
  BigFileChunkResponseType,
  BigFileMergeResponseType,
  BigFileStatusResponseType,
  initBigFileUpload,
  uploadBigFileChunk,
  mergeBigFileChunks,
  getBigFileStatus,
} from '../../services/blog/mediaFile';

const router = express.Router();


// 配置 multer（用于大文件分片上传，不限制单个分片大小）
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number.MAX_SAFE_INTEGER, // 不限制单个分片大小
  },
});

/**
 * 单文件上传
 */
router.post(
  '/upload',
  [...uploadValidation, handleValidationErrors],
  asyncHandler<UploadRequsetType, UploadResponseType, 'post'>(async req => {
    if (!req.file) {
      return { err: '请上传文件' };
    }
    return UploadFile({ file: req.file });
  })
);

/**
 * 大文件初始化上传（支持秒传）
 * POST /api/blog/media/bigFileInit
 */
router.post(
  '/bigFileInit',
  asyncHandler<BigFileInitRequestType, BigFileInitResponseType, 'post'>(async req => {
    const { fileName, fileSize, mimeType, chunkSize, fileHash } = req.body;
    return initBigFileUpload({ fileName, fileSize, mimeType, chunkSize, fileHash });
  })
);

/**
 * 大文件分片上传
 * POST /api/blog/media/bigFileChunk
 */
router.post(
  '/bigFileChunk',
  (req: Request, res: Response, next: NextFunction) => {
    chunkUpload.single('file')(req, res, err => {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(500).json({ err: '分片大小超出限制', code: 500 });
          return;
        }
      }
      next();
    });
  },
  [...uploadValidation, handleValidationErrors],
  asyncHandler<BigFileChunkRequestType, BigFileChunkResponseType, 'post'>(async req => {
    if (!req.file) {
      return { err: '请上传分片文件' };
    }
    const { identifier, chunkNumber, chunkHash } = req.body;
    return uploadBigFileChunk({
      file: req.file,
      identifier,
      chunkNumber,
      chunkHash,
    });
  })
);

/**
 * 大文件合并分片
 * POST /api/blog/media/bigFileMerge
 */
router.post(
  '/bigFileMerge',
  asyncHandler<{ identifier: string }, BigFileMergeResponseType, 'post'>(async req => {
    const { identifier } = req.body;
    return mergeBigFileChunks(identifier);
  })
);

/**
 * 大文件上传状态查询
 * GET /api/blog/media/bigFileStatus
 */
router.get(
  '/bigFileStatus',
  asyncHandler<{ identifier: string }, BigFileStatusResponseType, 'get'>(async req => {
    const { identifier } = req.query;
    if (!identifier || typeof identifier !== 'string') {
      return { err: '缺少文件标识', code: 500 };
    }
    return getBigFileStatus(identifier);
  })
);

export default router;
