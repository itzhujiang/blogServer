// 视频工具

import { tool } from '@langchain/core/tools';
import z from 'zod/v3';
// import { createVideoLLM } from '../utils/llm';

// 文本输入
const textInputSchema = z.object({
  type: z.literal('text'),
  text: z
    .string()
    .describe('文本提示词，描述视频内容和镜头，建议中文不超过500字，英文不超过1000词'),
});

// 图片输入
const imageInputSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z
      .string()
      .describe(
        '图片地址，支持公网URL、Base64编码或素材ID。格式：jpeg/png/webp/bmp/tiff/gif，宽高比(0.4,2.5)，尺寸(300,6000)px，单张不超过30MB'
      ),
  }),
  role: z
    .enum(['first_frame', 'last_frame', 'reference_image'])
    .describe(
      '图片用途：first_frame(首帧，以首帧宽高比为准) / last_frame(尾帧，自动裁剪适配) / reference_image(参考图，最多9张)'
    ),
});

// 视频输入
const videoInputSchema = z.object({
  type: z.literal('video_url'),
  video_url: z.object({
    url: z
      .string()
      .describe(
        '视频地址，支持公网URL或素材ID。格式：mp4/mov，分辨率480p/720p，帧率[24,60]FPS，时长[2,15]s，单个不超过50MB，最多3个，总时长不超过15s'
      ),
  }),
  role: z.literal('reference_video').describe('视频用途，固定为 reference_video（参考视频）'),
});

// 音频输入
const audioInputSchema = z.object({
  type: z.literal('audio_url'),
  audio_url: z.object({
    url: z
      .string()
      .describe(
        '音频地址，支持公网URL、Base64编码或素材ID。格式：wav/mp3，时长[2,15]s，最多3段，总时长不超过15s，单段不超过15MB'
      ),
  }),
  role: z
    .literal('reference_audio')
    .describe(
      '音频用途，固定为 reference_audio（参考音频），不可单独传入，必须至少包含1个参考图片或视频'
    ),
});

const inputItemSchema = z.discriminatedUnion('type', [
  textInputSchema,
  imageInputSchema,
  videoInputSchema,
  audioInputSchema,
]);

// 生成视频工具
export const generateVideo = tool(async () => {}, {
  name: 'generateVideo',
  description:
    '用于生成视频，支持：纯文字生视频、首帧生视频、首尾帧生视频、多模态参考生视频、视频延长',
  schema: z.object({
    input: z
      .array(inputItemSchema)
      .describe(
        '多模态输入数组，必须包含1个text元素。可选组合：纯文字 / 文字+图片(首帧/尾帧/参考图) / 文字+视频(参考视频) / 文字+图片+视频+音频'
      )
      .nonempty(),
    ratio: z
      .enum(['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'])
      .default('adaptive')
      .describe(
        '生成视频的宽高比，默认 adaptive，可选值: "16:9"(横屏) / "4:3" / "1:1"(方形) / "3:4" / "9:16"(竖屏) / "21:9"(超宽) / "adaptive"(根据提示词智能选择)'
      ),
    resolution: z
      .enum(['480p', '720p'])
      .default('720p')
      .describe(' 视频分辨率， 默认 720p。可选值: "480p" / "720p"'),
    duration: z.number().int().min(4).max(15).default(5).describe('视频时长（秒），默认值 5'),
    generate_audio: z
      .boolean()
      .default(true)
      .describe(
        '是否生成与画面同步的音频，默认 true。true: 自动生成匹配的人声、音效及背景音乐（生成的有声视频均为单声道），false: 生成无声视频'
      ),
    watermark: z
      .boolean()
      .default(false)
      .describe('生成视频是否包含水印，默认 false。false: 不含水印；true: 含有水印'),
    return_last_frame: z
      .boolean()
      .default(false)
      .describe(
        '是否返回视频尾帧图像，默认 false。true: 返回 png 格式尾帧，宽高像素与生成视频一致，无水印，可用于衔接下一段连续视频'
      ),
  }),
});
