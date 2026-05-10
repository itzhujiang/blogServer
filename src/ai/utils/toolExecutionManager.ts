export class ToolExecutionManager {
  private pending = new Map<
    string,
    {
      resolve: (result: string) => void;
      reject: (error: Error) => void;
    }
  >();

  /**
   * 创建一个等待前端执行的 Promise
   * @param toolCallId 工具调用 ID
   * @param timeout 超时时间（毫秒），默认 60000
   */
  waitForResult(toolCallId: string, timeout = 60000): Promise<string> {
    return new Promise((resolve, reject) => {
      // 设置超时
      const timer = setTimeout(() => {
        if (this.pending.has(toolCallId)) {
          this.pending.delete(toolCallId);
          reject(new Error(`工具执行超时: ${toolCallId}`));
        }
      }, timeout);

      const originalResolve = resolve;
      const originalReject = reject;

      this.pending.set(toolCallId, {
        resolve: (result: string) => {
          clearTimeout(timer);
          this.pending.delete(toolCallId);
          originalResolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          this.pending.delete(toolCallId);
          originalReject(error);
        },
      });
    });
  }

  /**
   * 提交工具执行结果
   * @param toolCallId 工具调用 ID
   * @param result 执行结果
   */
  submitResult(toolCallId: string, result: string) {
    const pending = this.pending.get(toolCallId);
    if (pending) {
      pending.resolve(result);
      return true;
    }
    return false;
  }

  /**
   * 提交工具执行错误
   * @param toolCallId 工具调用 ID
   * @param error 错误信息
   */
  submitError(toolCallId: string, error: string): boolean {
    const pending = this.pending.get(toolCallId);
    if (pending) {
      pending.reject(new Error(error));
      return true;
    }
    return false;
  }

  /**
   * 检查是否有等待中的工具调用
   */
  hasPending(toolCallId: string): boolean {
    return this.pending.has(toolCallId);
  }
}

export const toolExecutionManager = new ToolExecutionManager();
