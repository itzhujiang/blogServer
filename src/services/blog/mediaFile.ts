import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { HandlerResult } from '../../utils/getSendResult';
import { TempMedia, TEMP_FILE_EXPIRY } from '../../models/temp-media';
import { MediaFile } from '../../models/media-file';
import { BigFileRecord, BigFileChunk } from '../../models';
import { sequelize } from '../../models/db';

// 默认分片大小 2MB
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 上传请求类型
 */
type UploadRequsetType = {
  /** file文件 */
  file: Express.Multer.File;
};

/**
 * 上传文件响应
 */
type UploadResponseType = {
  /** 上传文件得到的code值，用于在使用别的接口时传入，永久保存这个文件 */
  code: string;
  /** 文件大小 */
  size: number;
  /** 文件url，临时、有效期1天 */
  url: string;
  /** 文件原始名字 */
  fileName: string;
};

/**
 * 确认使用临时媒体文件的结果
 */
type ConfirmResultType = {
  /** 永久文件ID */
  mediaId: number;
  /** 永久文件URL */
  fileUrl: string;
};

// ==================== 大文件上传相关类型 ====================

/**
 * 大文件初始化请求类型
 */
type BigFileInitRequestType = {
  /** 文件名 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** MIME 类型 */
  mimeType: string;
  /** 分片大小（可选，默认 2MB） */
  chunkSize?: number;
  /** 文件 MD5（可选，用于秒传） */
  fileHash?: string;
};

/**
 * 大文件初始化响应类型
 */
type BigFileInitResponseType = {
  /** 文件唯一标识 */
  identifier: string;
  /** 分片大小 */
  chunkSize: number;
  /** 总分片数 */
  totalChunks: number;
  /** 已上传的分片列表 */
  uploadedChunks: number[];
  /** 是否新文件（false 表示秒传） */
  isNew: boolean;
  /** 秒传时返回已有文件 URL */
  existingFileUrl: string | null;
};

/**
 * 大文件分片上传请求类型
 */
type BigFileChunkRequestType = {
  /** 分片文件 */
  file: Express.Multer.File;
  /** 文件标识 */
  identifier: string;
  /** 分片序号（从 1 开始） */
  chunkNumber: number;
  /** 分片 MD5（可选） */
  chunkHash?: string;
};

/**
 * 大文件分片上传响应类型
 */
type BigFileChunkResponseType = {
  /** 当前上传的分片序号 */
  chunkNumber: number;
  /** 已上传的分片列表 */
  uploadedChunks: number[];
  /** 上传进度百分比 */
  progress: number;
};

/**
 * 大文件合并响应类型
 */
type BigFileMergeResponseType = {
  /** 用于永久保存的凭证 */
  code: string;
  /** 文件大小 */
  size: number;
  /** 临时文件 URL */
  url: string;
  /** 原始文件名 */
  fileName: string;
};

/**
 * 大文件状态响应类型
 */
type BigFileStatusResponseType = {
  /** 文件唯一标识 */
  identifier: string;
  /** 上传状态 */
  status: 'uploading' | 'completed' | 'failed';
  /** 已上传的分片列表 */
  uploadedChunks: number[];
  /** 上传进度百分比 */
  progress: number;
};

// 确保目录存在
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 单文件上传（临时文件）
 * @param param
 * @returns
 */
const UploadFile = async (param: UploadRequsetType): Promise<HandlerResult<UploadResponseType>> => {
  const file = param.file;

  // 生成唯一文件名
  const ext = path.extname(file.originalname);
  const storedName = `${uuidv4()}${ext}`;
  const tempDir = path.join(process.cwd(), 'uploads', 'temp');

  // 确保 temp 目录存在
  await ensureDir(tempDir);
  const filePath = path.join(tempDir, storedName);

  // 保存文件
  const buffer = Buffer.from(file.buffer);
  await fs.writeFile(filePath, buffer);

  // 生成 code
  const code = uuidv4();
  const now = Date.now();
  const expiresAt = now + TEMP_FILE_EXPIRY;

  // 保存到临时媒体表
  await TempMedia.create({
    code,
    originalName: file.originalname,
    storedName,
    filePath: path.join('uploads', 'temp', storedName),
    fileSize: file.size,
    mimeType: file.mimetype || 'application/octet-stream',
    expiresAt,
    isUsed: false,
    createdAt: now,
  });

  return {
    data: {
      code,
      size: file.size,
      url: `/uploads/temp/${storedName}`,
      fileName: file.originalname,
    },
  };
};

/**
 * 确认使用临时媒体文件
 * 将临时文件移动到永久目录，并在 media_files 表创建记录
 * @param code - 临时文件凭证
 * @returns 永久文件信息
 */
const confirmTempMedia = async (code: string): Promise<HandlerResult<ConfirmResultType>> => {
  // 查询临时文件记录
  const tempMedia = await TempMedia.findByPk(code);

  if (!tempMedia) {
    return { err: '临时文件不存在', code: 500 };
  }

  // 检查是否已使用
  if (tempMedia.isUsed) {
    return { err: '临时文件已被使用', code: 500 };
  }

  // 检查是否过期
  if (Date.now() > tempMedia.expiresAt) {
    // 清理过期文件
    try {
      await fs.unlink(path.join(process.cwd(), tempMedia.filePath));
    } catch (e) {
      // 忽略删除错误
    }
    await tempMedia.destroy();
    return { err: '临时文件已过期', code: 500 };
  }

  const transaction = await sequelize.transaction();

  try {
    // 移动文件到永久目录
    const year = new Date().getFullYear().toString();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const permDir = path.join(process.cwd(), 'uploads', 'file', year, month);
    await ensureDir(permDir);

    const newStoredName = `${uuidv4()}${path.extname(tempMedia.storedName)}`;
    const newFilePath = path.join(permDir, newStoredName);
    const oldFilePath = path.join(process.cwd(), tempMedia.filePath);

    // 移动文件
    await fs.rename(oldFilePath, newFilePath);

    // 创建永久媒体记录
    const mediaFile = await MediaFile.create(
      {
        originalName: tempMedia.originalName,
        storedName: newStoredName,
        filePath: path.join('uploads', 'file', year, month, newStoredName),
        fileUrl: `/uploads/file/${year}/${month}/${newStoredName}`,
        fileSize: Number(tempMedia.fileSize),
        mimeType: tempMedia.mimeType,
        usageType: 'general',
        createdAt: Date.now(),
      },
      { transaction }
    );

    // 标记临时文件已使用
    tempMedia.isUsed = true;
    await tempMedia.save({ transaction });

    await transaction.commit();

    return {
      data: {
        mediaId: mediaFile.id,
        fileUrl: mediaFile.fileUrl,
      },
    };
  } catch (error) {
    await transaction.rollback();
    console.error('确认临时文件失败:', error);
    return { err: '确认临时文件失败', code: 500 };
  }
};

/**
 * 清理过期的临时文件
 */
const cleanupExpiredTempFiles = async (): Promise<{ deleted: number }> => {
  const now = Date.now();

  // 查找所有过期且未使用的临时文件
  const expiredFiles = await TempMedia.findAll({
    where: {
      isUsed: false,
      expiresAt: { [Symbol.for('sequelize.op.lt')]: now },
    },
  });

  let deleted = 0;

  for (const tempMedia of expiredFiles) {
    try {
      const fullPath = path.join(process.cwd(), tempMedia.filePath);
      await fs.unlink(fullPath);
    } catch (e) {
      // 忽略删除错误（文件可能已不存在）
    }
    await tempMedia.destroy();
    deleted++;
  }

  return { deleted };
};

// ==================== 大文件上传服务 ====================

/**
 * 初始化大文件上传（支持秒传）
 */
const initBigFileUpload = async (
  param: BigFileInitRequestType
): Promise<HandlerResult<BigFileInitResponseType>> => {
  const { fileName, fileSize, mimeType, chunkSize, fileHash } = param;
  const actualChunkSize = chunkSize || DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.ceil(fileSize / actualChunkSize);
  const now = Date.now();

  // 秒传检查：如果传入了 fileHash，查询是否已存在相同文件
  if (fileHash) {
    const existingFile = await MediaFile.findOne({
      where: { fileHash },
    });

    if (existingFile) {
      return {
        data: {
          identifier: fileHash,
          chunkSize: actualChunkSize,
          totalChunks,
          uploadedChunks: [], // 秒传时无需上传分片
          isNew: false,
          existingFileUrl: existingFile.fileUrl,
        },
      };
    }
  }

  // 生成文件标识（使用 fileHash 或 UUID）
  const identifier = fileHash || uuidv4();

  // 检查是否已有上传记录
  const existingRecord = await BigFileRecord.findByPk(identifier);

  if (existingRecord) {
    // 返回已上传的分片列表
    const uploadedChunks = await BigFileChunk.findAll({
      where: { fileIdentifier: identifier, status: 'uploaded' },
      attributes: ['chunkNumber'],
    });

    return {
      data: {
        identifier: existingRecord.identifier,
        chunkSize: existingRecord.chunkSize,
        totalChunks: existingRecord.totalChunks,
        uploadedChunks: uploadedChunks.map(c => c.chunkNumber),
        isNew: true,
        existingFileUrl: null,
      },
    };
  }

  // 创建大文件记录
  await BigFileRecord.create({
    identifier,
    originalName: fileName,
    totalSize: fileSize,
    chunkSize: actualChunkSize,
    totalChunks,
    mimeType,
    fileHash: fileHash || null,
    status: 'uploading',
    createdAt: now,
  });

  return {
    data: {
      identifier,
      chunkSize: actualChunkSize,
      totalChunks,
      uploadedChunks: [],
      isNew: true,
      existingFileUrl: null,
    },
  };
};

/**
 * 上传大文件分片
 */
const uploadBigFileChunk = async (
  param: BigFileChunkRequestType
): Promise<HandlerResult<BigFileChunkResponseType>> => {
  const { file, identifier, chunkNumber, chunkHash } = param;

  // 查询大文件记录
  const fileRecord = await BigFileRecord.findByPk(identifier);

  if (!fileRecord) {
    return { err: '大文件记录不存在', code: 500 };
  }

  if (fileRecord.status === 'completed') {
    return { err: '大文件已合并完成', code: 500 };
  }

  // 检查分片序号是否有效
  if (chunkNumber < 1 || chunkNumber > fileRecord.totalChunks) {
    return { err: '分片序号无效', code: 500 };
  }

  // 检查分片是否已上传
  const existingChunk = await BigFileChunk.findOne({
    where: { fileIdentifier: identifier, chunkNumber },
  });

  // 如果分片已上传，返回成功响应
  if (existingChunk && existingChunk.status === 'uploaded') {
    // 返回已上传的分片列表
    const uploadedChunks = await BigFileChunk.findAll({
      where: { fileIdentifier: identifier, status: 'uploaded' },
      attributes: ['chunkNumber'],
    });

    const progress = Math.round((uploadedChunks.length / fileRecord.totalChunks) * 100);

    return {
      data: {
        chunkNumber,
        uploadedChunks: uploadedChunks.map(c => c.chunkNumber),
        progress,
      },
    };
  }

  // 确保分片目录存在
  const chunksDir = path.join(process.cwd(), 'uploads', 'temp', 'chunks', identifier);
  await ensureDir(chunksDir);

  // 保存分片文件
  const chunkPath = path.join(chunksDir, `${chunkNumber}.part`);
  const buffer = Buffer.from(file.buffer);
  await fs.writeFile(chunkPath, buffer);

  // 更新或创建分片记录
  if (existingChunk) {
    // 更新已有记录（状态为 pending）
    existingChunk.status = 'uploaded';
    existingChunk.chunkPath = path.join('uploads', 'temp', 'chunks', identifier, `${chunkNumber}.part`);
    existingChunk.chunkHash = chunkHash || null;
    existingChunk.uploadedAt = Date.now();
    await existingChunk.save();
  } else {
    // 创建新记录
    await BigFileChunk.create({
      fileIdentifier: identifier,
      chunkNumber,
      chunkSize: file.size,
      chunkHash: chunkHash || null,
      chunkPath: path.join('uploads', 'temp', 'chunks', identifier, `${chunkNumber}.part`),
      status: 'uploaded',
      uploadedAt: Date.now(),
    });
  }

  // 获取所有已上传的分片
  const uploadedChunks = await BigFileChunk.findAll({
    where: { fileIdentifier: identifier, status: 'uploaded' },
    attributes: ['chunkNumber'],
  });

  const progress = Math.round((uploadedChunks.length / fileRecord.totalChunks) * 100);

  return {
    data: {
      chunkNumber,
      uploadedChunks: uploadedChunks.map(c => c.chunkNumber),
      progress,
    },
  };
};

/**
 * 合并大文件分片
 */
const mergeBigFileChunks = async (
  identifier: string
): Promise<HandlerResult<BigFileMergeResponseType>> => {
  // 查询大文件记录
  const fileRecord = await BigFileRecord.findByPk(identifier);

  if (!fileRecord) {
    return { err: '大文件记录不存在', code: 500 };
  }

  if (fileRecord.status === 'completed') {
    return { err: '大文件已合并完成', code: 500 };
  }

  // 获取所有已上传的分片
  const chunks = await BigFileChunk.findAll({
    where: { fileIdentifier: identifier, status: 'uploaded' },
    order: [['chunkNumber', 'ASC']],
  });

  if (chunks.length !== fileRecord.totalChunks) {
    return {
      err: `分片未全部上传，已上传 ${chunks.length}/${fileRecord.totalChunks}`,
      code: 500,
    };
  }

  const chunksDir = path.join(process.cwd(), 'uploads', 'temp', 'chunks', identifier);
  const tempDir = path.join(process.cwd(), 'uploads', 'temp');
  await ensureDir(tempDir);

  // 生成合并后的文件名
  const ext = path.extname(fileRecord.originalName);
  const storedName = `${identifier}${ext}`;
  const mergedPath = path.join(tempDir, storedName);

  // 合并分片
  const writeStream = await fs.open(mergedPath, 'w');

  try {
    for (const chunk of chunks) {
      const chunkFilePath = path.join(process.cwd(), chunk.chunkPath);
      const chunkBuffer = await fs.readFile(chunkFilePath);
      await writeStream.write(chunkBuffer);
    }
  } finally {
    await writeStream.close();
  }

  // 清理分片文件
  try {
    await fs.rm(chunksDir, { recursive: true, force: true });
  } catch (e) {
    // 忽略删除错误
  }

  // 更新大文件记录状态
  fileRecord.status = 'completed';
  fileRecord.completedAt = Date.now();
  fileRecord.storedName = storedName;
  fileRecord.filePath = path.join('uploads', 'temp', storedName);
  fileRecord.fileUrl = `/uploads/temp/${storedName}`;
  await fileRecord.save();

  // 创建临时媒体记录（以便用户可以调用 confirmTempMedia 永久保存）
  const now = Date.now();
  const expiresAt = now + TEMP_FILE_EXPIRY;

  await TempMedia.create({
    code: identifier,
    originalName: fileRecord.originalName,
    storedName,
    filePath: path.join('uploads', 'temp', storedName),
    fileSize: Number(fileRecord.totalSize),
    mimeType: fileRecord.mimeType,
    expiresAt,
    isUsed: false,
    createdAt: now,
  });

  return {
    data: {
      code: identifier,
      size: Number(fileRecord.totalSize),
      url: `/uploads/temp/${storedName}`,
      fileName: fileRecord.originalName,
    },
  };
};

/**
 * 获取大文件上传状态
 */
const getBigFileStatus = async (
  identifier: string
): Promise<HandlerResult<BigFileStatusResponseType>> => {
  const fileRecord = await BigFileRecord.findByPk(identifier);

  if (!fileRecord) {
    return { err: '大文件记录不存在', code: 500 };
  }

  const uploadedChunks = await BigFileChunk.findAll({
    where: { fileIdentifier: identifier, status: 'uploaded' },
    attributes: ['chunkNumber'],
  });

  const progress = Math.round((uploadedChunks.length / fileRecord.totalChunks) * 100);

  return {
    data: {
      identifier: fileRecord.identifier,
      status: fileRecord.status,
      uploadedChunks: uploadedChunks.map(c => c.chunkNumber),
      progress,
    },
  };
};

/**
 * 清理过期的大文件上传记录
 */
const cleanupExpiredBigFiles = async (): Promise<{ deletedRecords: number; deletedChunks: number }> => {
  const expiryTime = 24 * 60 * 60 * 1000; // 24小时
  const cutoffTime = Date.now() - expiryTime;

  // 查找过期的大文件记录
  const expiredRecords = await BigFileRecord.findAll({
    where: {
      status: 'uploading',
      createdAt: { [Symbol.for('sequelize.op.lt')]: cutoffTime },
    },
  });

  let deletedRecords = 0;
  let deletedChunks = 0;

  for (const record of expiredRecords) {
    // 清理分片文件
    const chunksDir = path.join(process.cwd(), 'uploads', 'temp', 'chunks', record.identifier);
    try {
      await fs.rm(chunksDir, { recursive: true, force: true });
    } catch (e) {
      // 忽略删除错误
    }

    // 删除分片记录
    const deletedChunkCount = await BigFileChunk.destroy({
      where: { fileIdentifier: record.identifier },
    });
    deletedChunks += deletedChunkCount;

    // 删除大文件记录
    await record.destroy();
    deletedRecords++;
  }

  return { deletedRecords, deletedChunks };
};

export {
  UploadRequsetType,
  UploadResponseType,
  ConfirmResultType,
  UploadFile,
  confirmTempMedia,
  cleanupExpiredTempFiles,
  // 大文件上传相关类型
  BigFileInitRequestType,
  BigFileInitResponseType,
  BigFileChunkRequestType,
  BigFileChunkResponseType,
  BigFileMergeResponseType,
  BigFileStatusResponseType,
  // 大文件上传相关函数
  initBigFileUpload,
  uploadBigFileChunk,
  mergeBigFileChunks,
  getBigFileStatus,
  cleanupExpiredBigFiles,
};
