import { getUserGlobalMemories } from './memory';

export * from './weather';
export * from './position';
export * from './image';
export * from './memory';

// 需要进行权限申请的工具
export const permissionTool = ['getIpPosition'];

// 可以使用a2ui组件的工具
export const a2uiTool = ['textToImage'];

export const generalTools = [getUserGlobalMemories];
