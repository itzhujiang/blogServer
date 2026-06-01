// 记忆agent，本记忆agent，不会有用户进行发起调用，并且不会出现在index.ts中的agent图中，而是作为一个工具被其他agent调用
import { createOpenAiLLM } from '@/ai/utils/llm';
// import { AgentStateAnnotation } from '../utils/utils';
import { Role } from '@ag-ui/core';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import {
  saveGlobalMemoryIndex,
  saveUserGlobalMemories,
  fetchGlobalMemoryIndex,
  fetchSessionMemories,
  saveSessionMemories,
} from '@/ai/tools';
import { AiGlobalChatMemoryCategory, AiChatMessages } from '@/models';
import { Op } from 'sequelize';
import { AIMessage } from '@langchain/core/messages';
import { AgentStateAnnotation } from '@/ai/utils/utils';

export type MsgList = {
  /** 消息ID */
  messageId: string;
  /** 内容 */
  content: string;
  /**  角色 */
  role: Role;
};

const MEMORY_TYPES = Object.values(AiGlobalChatMemoryCategory);
// 全局记忆的行数
const MAX_ENTRYPOINT_LINES = 200;
// 全局记忆的总字数
const MAX_ENTRYPOINT_BYTES = 8000;
// 会话记忆每一项的字数
const MAX_SECTION_LENGTH = 600;

// 会话记忆一共字数
const MAX_TOTAL_SESSION_MEMORY_LENGTH = 4300;

const MAX_SESSION_MEMORY_LENGTH = 500; // 超过这个字数的记忆内容会被压缩

const globalMemoryAgentStateAnnotation = Annotation.Root({
  threadId: Annotation<string>,
  userId: Annotation<number>,
  ...MessagesAnnotation.spec,
});

const sessionMemoryAgentStateAnnotation = Annotation.Root({
  threadId: Annotation<string>,
  userId: Annotation<number>,
  lastMessageId: Annotation<string>,
  ...MessagesAnnotation.spec,
});

const globalPreviousMessageIdMap = new Map<string, string>(); // 用于存储消息ID与上一条已经被记录的消息ID的映射关系
const globalIsRunningMap = new Map<string, boolean>(); // 按 threadId 隔离运行状态，避免同一线程重复调用
const globalMsgListMap = new Map<string, MsgList[]>(); // 按 threadId 存储消息列表，供记忆提取使用
const globalPendingMap = new Map<string, boolean>(); // 运行期间是否有新调用进来

const sessionLastTimeMemory = new Map<
  string,
  {
    lastMessageId: string;
    memoryContent: string;
  }
>(); // 存储上一次处理完的最后一个messageId

const sessionIsRunningMap = new Map<string, boolean>(); // 按 threadId 隔离会话记忆运行状态

function mergeMsgList(a: MsgList[], b: MsgList[]): MsgList[] {
  const map = new Map<string, MsgList>();
  for (const msg of [...a, ...b]) {
    map.set(msg.messageId, msg);
  }
  return Array.from(map.values());
}

/**
 * 生成过长内容的提示词
 * @param currentMemories 当前会话记忆内容
 */
function generateSectionReminders(currentMemories: string) {
  const total = currentMemories.length; // 总字数
  const sections: Record<string, number> = {}; // 存储的就是标题对应内容的字数
  const lines = currentMemories.split('\n'); // 按照换行分成数组
  let currentSection = ''; // 当前标题
  let currentContent = []; // 内容数组
  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (currentSection && currentContent.length > 0) {
        const sectionContent = currentContent.join('\n').trim();
        sections[currentSection] = sectionContent.length;
      }
      currentSection = line;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentSection && currentContent.length > 0) {
    const sectionContent = currentContent.join('\n').trim();
    sections[currentSection] = sectionContent.length;
  }
  const isExcessive = total > MAX_TOTAL_SESSION_MEMORY_LENGTH;
  const isExcessiveSections = Object.entries(sections)
    .filter(([_, length]) => length > MAX_SECTION_LENGTH)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([section, length]) => `- “${section}” 大约有 ${length} 个字数（限制：${MAX_SECTION_LENGTH}）`
    );
  let prompt: string = '';
  if (isExcessive) {
    prompt += `\n\n关键：当前 会话记忆 大约有 ${total} 个 token，已经超过最大限制 ${MAX_TOTAL_SESSION_MEMORY_LENGTH} 个字数。你必须将文件压缩到这个预算范围内。请积极缩短那些过长的 section，删除不那么重要的细节，合并相关条目，并总结较早的内容。优先保证 "当前状态" 和 "错误与修正" 这两个部分准确且详细。`;
  }

  if (isExcessiveSections.length > 0) {
    prompt += isExcessive
      ? ''
      : `重要：以下 section 已超出单 section 长度上限，必须压缩:\n${isExcessiveSections.join('\n')}`;
  }

  return prompt;
}

/**
 * 得到前200条记忆索引
 * @param globalMemoryIndex
 * @returns
 */
function truncateEntrypointContent(globalMemoryIndex: string) {
  const trimmed = globalMemoryIndex.trim();
  const contentLines = trimmed.split('\n');
  const lineCount = contentLines.length;
  const byteCount = trimmed.length;

  const wasLineTruncated = lineCount > MAX_ENTRYPOINT_LINES;
  const wasByteTruncated = byteCount > MAX_ENTRYPOINT_BYTES;

  if (!wasLineTruncated && !wasByteTruncated) {
    return {
      content: trimmed,
    };
  }

  let truncated = wasLineTruncated
    ? contentLines.slice(0, MAX_ENTRYPOINT_LINES).join('\n')
    : trimmed;

  if (truncated.length > MAX_ENTRYPOINT_BYTES) {
    const cutAt = truncated.lastIndexOf('\n', MAX_ENTRYPOINT_BYTES);
    truncated = truncated.slice(0, cutAt > 0 ? cutAt : MAX_ENTRYPOINT_BYTES);
  }

  return {
    content: truncated,
  };
}
/**
 * 构建保存记忆提示词
 * @param newMessageCount
 * @param memoryIndexContent
 * @returns
 */
const buildSaveGlobalMemoryPrompt = (newMessageCount: number, memoryIndexContent: string) => {
  return [
    `# 你是一个记忆助手，负责根据提供的新的消息信息，约 ${newMessageCount}条信息，提取关键信息形成记忆，帮助AI更好地理解用户的需求和背景。`,
    `可用工具:saveGlobalMemoryIndex（保存指定用户全局记忆索引工具）、saveUserGlobalMemories(保存指定用户全局记忆工具)。禁止直接访问数据库或存储系统来读写记忆内容。`,
    `你只能使用最近约 ${newMessageCount} 条消息中的内容来更新持久化记忆系统。`,
    `以下是现有的全局记忆索引内容，供你参考：`,
    `<existing_memory_index>`,
    memoryIndexContent,
    `</existing_memory_index>`,
    `如果用户明确让你记住某件事，就立刻按最合适的类型将其保存下来；如果用户要求你忘记某件事，就找到相关条目并将其删除。`,
    '## 记忆的类型',
    '在你的记忆系统中，可以存储若干种彼此离散的记忆类型：',
    ...MEMORY_TYPES.map(type => `- ${type}`),
    '<types>',
    '<type>',
    '<name>user</name>',
    `<description>
        用于保存关于用户角色、目标、职责和知识背景的信息。优秀的 user 记忆
        能帮助你在未来根据用户的偏好和视角来调整自己的行为。你在写入这类记忆时，目标是逐步建立对“用户是谁”以及“怎样才能
        更有针对性地帮助这个用户”的理解。例如，你与一位资深软件工程师协作的方式，应该不同于与你第一次写代码的学生协作的方式。
        请记住，这里的目标是更好地帮助用户。避免记录那些可能被视为负面评价、或者与当前协作目标无关的用户信息。
      </description>`,
    '<when_to_save>当你了解到任何关于用户角色、偏好、职责或知识背景的细节时</when_to_save>',
    `<how_to_use>
        当你的工作应当结合用户的身份画像或视角来进行时使用这类记忆。例如，如果用户让你解释一段代码，你应当根据这
        用户信息，用对方最能理解、最有价值的方式来回答，或者帮助他们把新知识和自己已有的领域知识联系起来。
      </how_to_use>`,
    `<examples>
     user: 我是一名正在研究当前日志体系的数据科学家,
     assistant: [保存 user 记忆：用户是一名数据科学家，当前关注可观测性 / 日志],
     user: 我写 JavaScript 已经十年了，但这是我第一次接触这个仓库里的 spring boot 部分,
     assistant: [保存 user 记忆：JavaScript 经验很深，但对 spring boot 和该项目的后端部分较陌生 ——
      之后解释后端内容时，可尽量类比前端概念],
   </examples>`,
    '</type>',
    '<type>',
    '<name>feedback</name>',
    `<description>
      用于保存用户告诉你的“应该怎样开展工作”的指导信息——既包括哪些做法要避免，也包括哪些做法应该继续保
      持。这类记忆非常重要，因为它能帮助你在工作协作中保持一致性，并对用户期望的工作方式持续作出正确响应。记录这类记忆时，
      要记录失败中得到的纠正，也要记录成功中得到的确认：如果你只保存纠错信息，那你虽然能避免重复犯错，却可能逐渐偏离那些用
      已经明确认可过的做法，甚至变得过度保守。
    </description>`,
    `<when_to_save>
      只要用户纠正了你的做法（例如 “不，不是这个”、“不要这样”、“别再做
      X”），或者确认某种不那么显然的方法是对的（例如 “对，就是这样”、“很好，继续这么做”、对一个不寻常的选择没有提出异议并接
      受了它），都应该保存。纠正通常比较明显，而确认往往更安静、更容易被忽略——要主动留意。无论是哪种情况，都应保存那些对未
      对话仍然适用的信息，尤其是那些让人意外的、或者无法从代码本身直接看出来的指导。并且要把 *为什么*
      一起记下来，这样以后遇到边界情况时才能做判断。
      </when_to_save>`,
    '<how_to_use>让这类记忆持续指导你的行为，这样用户就不需要把同样的要求重复说第二遍。</how_to_use>',
    `<body_structure>
      正文结构应先写规则本身，然后补一行
      **为什么:**（用户给出的原因——通常是某次过去的事故，或者一个很强的个人偏好），再补一行 
      **如何使用:**（这条指导应在什么情况下、什么位置生效）。
      知道 *为什么*  很重要，这样你在遇到边界情况时就能自己判断，而不是机械死板地照搬规则。
    </body_structure>`,
    `<examples>
      user: 这些测试里不要 mock 数据库——我们上个季度就吃过亏，mock 测试都通过了，但生产环境迁移却失败了,
      assistant: [保存 feedback 记忆：集成测试必须连接真实数据库，不能使用 mock。原因：之前发生过 mock 与生产环境不一致，掩盖了错误迁移的问题],
      user: 不要在每次回复结尾都总结你刚刚做了什么，我自己会看 diff,
      assistant: [保存 feedback 记忆：这个用户希望回复简洁，不要在结尾附带重复性的操作总结],
    </examples>`,
    '</type>',
    '<type>',
    '<name>reference</name>',
    `<description>
      用于保存“去哪里可以找到信息”的线索，尤其是外部系统中的信息位置。这类记忆可以帮助你记住：如果想获
      取项内容之外的最新信息，应该去哪里查找。
    </description>`,
    `<when_to_save>
      当你了解到某个外部系统中的资源及其用途时，就应该保存。例如，你知道某种框架时在什么网站中
    </when_to_save>`,
    '<how_to_use>当用户提到某个外部系统，或者用户要找的信息很可能存在于外部系统中时，使用这类记忆。</how_to_use>',
    `<examples>
     user: 如果你想了解这些 vue 框架，就去看 https://cn.vuejs.org/,
     assistant: [保存 reference 记忆：vue 相关文档记录 https://cn.vuejs.org/],
    </examples>`,
    '</type>',
    '</types>',
    '## 如何保存记忆',
    '保存一条 记忆 需要分两步：',
    '**步骤 1** —— 调用 saveUserGlobalMemories 工具保存记忆，其中 content 字段为带 frontmatter 的 markdown，格式如下：',
    '```markdown',
    '---',
    'name: {{记忆名称}}',
    'description: {{一行描述——用于在未来的对话中决定相关性，因此请具体说明}}',
    `type: {{${MEMORY_TYPES.join(', ')}}}`,
    '---',
    '',
    '{{记忆内容——对于反馈类型，结构如下：规则，然后是 **原因：** 和 **应用方法：** 行}}',
    '```',
    '**步骤 2** 根据步骤 1 返回的 ID，更新索引内容，调用 saveGlobalMemoryIndex 工具保存索引内容。这个工具用于管理全局记忆索引。禁止直接将记忆内容(正文)写入到索引文件中。每个条目只占一行，长度尽量控制在 150 个字符以内，索引内容的格式为：`- [{{id}}] {{Title}} — {{one-line hook}}`，每条记忆占一行，多条记忆之间用换行分隔，其中 Title 和 hook 都要尽量简洁具体，方便在未来的对话中进行相关性判断。不带 frontmatter。',
    `- 索引内容会始终加载到系统提示词中；超过 ${MAX_ENTRYPOINT_LINES} 行的内容会被截断，因此索引要尽量简洁`,
    '- 按主题来组织记忆，而不是按时间顺序组织',
    '- 如果某条记忆被发现有误或已经过时，应更新或删除',
    '- 不要写入重复的忆。写入新记忆之前，先检查是否已有可以直接更新的现有记忆。',
    '## 不应该保存到记忆中的内容',
    '- 过于琐碎的细节：例如用户在对话中提到的某个临时状态、某次特定的错误、或者某条消息的具体内容，这些通常不适合被保存为记忆，因为它们可能很快就会过时，或者在未来的对话中不再相关。',
    '- 短期任务细节：例如进行中的工作、临时状态、当前对话上下文。',
  ];
};

/**
 * 构建使用全局记忆的提示词
 * @param globalMemoryIndex 索引内容
 * @param getMemoriesToolNmae 获取完整内容的提示词
 * @returns
 */
export const buildUseGlobalMemoriesPrompt = (
  globalMemoryIndex: string,
  getMemoriesToolNmae: string
) => {
  const { content } = truncateEntrypointContent(globalMemoryIndex);
  const prompt = [
    '# 关于 记忆 的使用',
    `当用户的信息和记忆索引中的段落有一定关联的时候，你需要根据记忆索引进行回答，必要时通过 ${getMemoriesToolNmae} 工具获取到对应的完整内容信息`,
    `记忆索引每行格式为：\`- [id] Title — description\`，其中 id 是该条记忆在数据库中的唯一编号，调用 ${getMemoriesToolNmae} 工具时需要传入此 id 来获取完整内容。`,
    `## 关于记忆索引的类型：由以下 ${MEMORY_TYPES.length} 种，分别为：${MEMORY_TYPES.join(',')}`,
    `- ${AiGlobalChatMemoryCategory.USER}: 表示保存了 用户角色、目标、职责和知识背景的信息，可以在和用户对话的时候来调整自己的行为`,
    `- ${AiGlobalChatMemoryCategory.FEEDBACK}: 保存用户告诉你的“应该怎样开展工作”的指导信息——既包括哪些做法要避免，也包括哪些做法应该继续保持。`,
    `- ${AiGlobalChatMemoryCategory.REFERENCE}: 用于保存“去哪里可以找到信息”的线索，尤其是外部系统中的信息位置。这类记忆可以帮助你记住：如果想获 取项内容之外的最新信息，应该去哪里查找。`,
    `## 记忆索引内容`,
    content,
  ];

  return prompt.join('\n');
};

const buildSessionMemoriesPrompt = (currentMemories: string, updateToolName: string) => {
  const template = `
    # 会话标题
  _用 5 到 10 个词写一个简短且有辨识度的会话标题。信息密度要高，不要有废话。_

  # 当前状态
  _当前正在处理什么？下一步马上要做什么？_

  # 任务说明
  _用户要求干什么？有哪些设计决策，或其他需要说明的上下文？_

  # 错误与修正
  _遇到了哪些错误，以及这些错误是如何修复的？用户纠正了什么？哪些做法失败了，之后不应再尝试？_

  # 经验总结
  _哪些方法效果好？哪些不好？有哪些需要避免的点？不要和其他章节重复。_

  # 关键结果
  _如果用户要求产出某个特定结果，比如问题答案、表格或其他文档，请在这里重复记录最终结果。_

  # 工作日志
  _按步骤记录：尝试了什么、完成了什么？每一步都尽量简短概括。_
  `;

  const prompt = `
    ** 重要：以下的信息以及说明都不是实际用户对话的一部分。 **
    请记忆提供的用户对话内容，更新当前记忆。

    内容已经为你读取好了。它的内容如下：
    <current_notes_content>
      ${currentMemories || template}
    </current_notes_content>

    你唯一的任务就是使用 ${updateToolName} 工具更新这个内容。

    编辑是必须遵守以下关键规则：

    - 文件必须严格保存原有结构，索引 section、标题和斜体索引必须完整保留
    - 绝对不允许修改、删除或新增 section 标题（即那些以 '#' 看开头的行，例如 '# 任务规范'）
    - 绝对不要修改或删除斜体的 _section description_ 行（它们是每个标题后面紧跟着的斜体说明行，以下划线开头并以下划线结尾）
    - 这些斜体 _section descriptions_ 是模板说明，必须原封不动地保留——它们用于指导每个 section 应该写什么内容
    - 你只能更新每个现有 section 中、位于这些斜体说明行下面的实际内容
    - 不要在现有结构之外新增任何 section、总结或信息
    - 如果某个 section 没有实质性的新内容，可以不更新。不要添加像 “尚未有信息” 这样的凑数内容；如果合适，就让这些 section
   保持空白或不改动
    - 对于 “关键结果” 一栏，要包含用户要求的完整、精确输出（例如完整表格、完整答案等）
    - 每个 section 尽量控制在约 ${MAX_SECTION_LENGTH} 个字以内——如果某个 section  接近这个上限，就压缩精简掉不那么重要的细节，同时保留最关键的信息
    - 聚焦于可执行、具体的信息，这些信息应能帮助别人理解或复现对话中讨论过的工作
    - 一定要更新 “当前状态” 一栏，使其反映最近一次工作的最新状态——这对 上下文压缩 之后保持连续性至关重要

    结构保留提醒：
    每个 section 都有两个必须完全保留的部分，且必须与当前文件中的内容保持完全一致：
    1. section 标题（以 '#' 开头的那一行）
    2. 斜体说明行（紧跟在标题后面的那行 _斜体文本_ —— 这是模板说明）
    你只能更新这两行保留内容之后的实际正文内容。那些以下划线开头和结尾的斜体说明行属于模板结构的一部分，不是可以编辑或删的正文内容。
  `;
  const reminder = generateSectionReminders(currentMemories);

  return prompt + reminder;
};

/**
 * 获取全局记忆agent， 该agent会记录所有的消息
 * @param msgList 消息列表，包含消息ID、内容和角色等信息
 * @param threadId 线程id
 * @returns
 */
export const getGlobalMemoryAgent = async (
  msgList: MsgList[],
  threadId: string,
  userid: number
) => {
  globalMsgListMap.set(threadId, msgList); // 更新消息列表
  if (globalIsRunningMap.get(threadId)) {
    globalPendingMap.set(threadId, true); // 标记有新调用进来，等当前处理完后再跑一次
    return;
  }
  globalIsRunningMap.set(threadId, true);
  try {
    const newMessageList = globalMsgListMap.get(threadId)!;
    /**
   * 获取需要被记录的消息列表，并更新globalPreviousMessageIdMap中的消息ID映射关系
     1. 首先根据threadId从globalPreviousMessageIdMap中获取上一条已经被记录的消息ID previousMessageId
     2. 如果previousMessageId存在，在newMessageList中找到该消息ID对应的消息索引previousMsgIndex
   * @returns
   */
    function getrecordMsgList() {
      const previousMessageId = globalPreviousMessageIdMap.get(threadId);
      const recordMsgList: MsgList[] = [];

      const previousMsgIndex = previousMessageId
        ? newMessageList!.findIndex(msg => msg.messageId === previousMessageId)
        : -1;

      if (previousMessageId && previousMsgIndex === -1) {
        // 记录点在 newMessageList 中找不到（可能已超出传入范围），清除记录点降级为首次处理
        globalPreviousMessageIdMap.delete(threadId);
      }

      // 有效记录点：previousMessageId 存在且找到了对应索引
      const searchFrom = previousMessageId && previousMsgIndex !== -1 ? previousMsgIndex : -1;

      let newassistantMsgIndex = -1;
      for (let i = newMessageList!.length - 1; i > searchFrom; i--) {
        if (newMessageList![i].role === 'assistant') {
          newassistantMsgIndex = i;
          break;
        }
      }

      if (newassistantMsgIndex > searchFrom) {
        recordMsgList.push(...newMessageList!.slice(searchFrom + 1, newassistantMsgIndex + 1));
      }
      return recordMsgList;
    }

    async function getMemoryIndexContent() {
      return await fetchGlobalMemoryIndex(userid);
    }

    /**
     * 工具执行节点
     */
    async function toolExecutor(state: typeof globalMemoryAgentStateAnnotation.State) {
      const tools = [saveGlobalMemoryIndex, saveUserGlobalMemories];
      const toolNode = new ToolNode(tools);
      // 执行工具
      return await toolNode.invoke(state);
    }
    function shouldContinue(state: typeof globalMemoryAgentStateAnnotation.State) {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      if ((lastMessage.tool_calls?.length ?? 0) > 0) {
        return 'tool_executor';
      }
      return END;
    }

    function getModel(recordMsgList: MsgList[]) {
      // 防止重复查询数据库
      let prompt: string[];
      return async (state: typeof globalMemoryAgentStateAnnotation.State) => {
        const tools = [saveGlobalMemoryIndex, saveUserGlobalMemories];
        const llm = createOpenAiLLM({
          verbose: false,
        }).bindTools(tools);
        if (!prompt) {
          const memoryIndexContent = await getMemoryIndexContent();
          prompt = buildSaveGlobalMemoryPrompt(recordMsgList.length, memoryIndexContent);
        }
        const response = await llm.invoke([
          {
            role: 'system',
            content: prompt.join('\n'),
          },
          ...state.messages,
        ]);
        return {
          messages: [response],
        };
      };
    }

    const recordMsgList = getrecordMsgList();
    // 如果记录列表大于了4条，开始进行记忆提取
    if (recordMsgList.length > 4) {
      const newRecordPointId = recordMsgList[recordMsgList.length - 1].messageId;
      // 这里可以调用一个专门的记忆提取模型，来对recordMsgList进行提取，得到精简的记忆内容，最后存储到数据库
      const callModel = getModel(recordMsgList);
      const workflow = new StateGraph(globalMemoryAgentStateAnnotation)
        .addNode('callModel', callModel)
        .addNode('tool_executor', toolExecutor)
        .addEdge(START, 'callModel')
        .addConditionalEdges('callModel', shouldContinue, ['tool_executor', END])
        .addEdge('tool_executor', 'callModel'); // 执行完工具回到 callModel
      const agent = workflow.compile();
      await agent.invoke({
        threadId,
        userId: userid,
        messages: [
          ...recordMsgList.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: '请根据以上对话内容，提取关键信息形成记忆，并调用工具保存。',
          },
        ],
      });
      globalPreviousMessageIdMap.set(threadId, newRecordPointId); // 执行成功后再更新记录点
    }
    // 如果运行期间有新调用进来，取最新列表再跑一次
  } catch (error) {
    console.log('err', error);
  } finally {
    globalIsRunningMap.set(threadId, false);
    if (globalPendingMap.get(threadId)) {
      globalPendingMap.delete(threadId);
      // 检查是否真的有新消息需要处理，避免无意义的递归
      const latestList = globalMsgListMap.get(threadId)!;
      const lastProcessedId = globalPreviousMessageIdMap.get(threadId);
      const lastMsgId = latestList[latestList.length - 1]?.messageId;
      if (lastMsgId && lastMsgId !== lastProcessedId) {
        await getGlobalMemoryAgent(latestList, threadId, userid);
      }
    }
  }
};

export const getSessionMemoryAgent = async (
  msgList: MsgList[],
  threadId: string,
  userid: number
) => {
  if (sessionIsRunningMap.get(threadId)) {
    return; // 同一 threadId 正在处理中，跳过本次调用
  }
  sessionIsRunningMap.set(threadId, true);
  try {
  /**
   * 获取现有记忆和处理到的sessionId
   * @returns
   */
  async function getSessionMemory() {
    const sessionMemory = {
      content: '',
      lastMessageId: '',
    };
    if (sessionLastTimeMemory.has(threadId)) {
      const lastTimeMemory = sessionLastTimeMemory.get(threadId);
      sessionMemory.content = lastTimeMemory!.memoryContent;
      sessionMemory.lastMessageId = lastTimeMemory!.lastMessageId;
    } else {
      const res = await fetchSessionMemories(userid, threadId);
      sessionLastTimeMemory.set(threadId, {
        lastMessageId: res.lastMessageId,
        memoryContent: res.content,
      });
      sessionMemory.content = res.content;
      sessionMemory.lastMessageId = res.lastMessageId;
    }
    return sessionMemory;
  }
  /**
   * 获取指定messageId到最后的信息列表
   */
  async function getMessageList(startMessageId: string) {
    const extractMessageList: MsgList[] = [];
    if (!startMessageId) {
      // 新会话，没有记录点，返回全部消息
      return [...msgList];
    }
    const isExistence = msgList.some(item => item.messageId === startMessageId);
    if (isExistence) {
      // 如果存在则不需要前往数据库中查找
      const startIndex = msgList.findIndex(item => item.messageId === startMessageId);
      extractMessageList.push(...msgList.slice(startIndex));
    } else {
      // 如果不存在则需要前往数据库中查找
      const anchor = await AiChatMessages.findOne({
        where: { message_id: startMessageId, session_id: threadId },
        attributes: ['id', 'session_id'],
      });
      if (anchor) {
        const dbMessages = await AiChatMessages.findAll({
          where: {
            session_id: anchor.session_id,
            id: { [Op.gte]: anchor.id },
          },
          order: [['id', 'ASC']],
        });
        const dbMsgList = dbMessages.map(m => ({
          messageId: m.message_id,
          content: m.content,
          role: m.role,
        }));
        extractMessageList.push(...mergeMsgList(dbMsgList, msgList));
      }
    }

    return extractMessageList;
  }

  /**
   * 工具执行节点
   */
  async function toolExecutor(state: typeof sessionMemoryAgentStateAnnotation.State) {
    const tools = [saveSessionMemories];
    const toolNode = new ToolNode(tools);
    // 执行工具
    return await toolNode.invoke(state);
  }

  function shouldContinue(state: typeof sessionMemoryAgentStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if ((lastMessage.tool_calls?.length ?? 0) > 0) {
      return 'tool_executor';
    }
    return END;
  }

  function getModel(content: string) {
    const prompt = buildSessionMemoriesPrompt(content, 'saveSessionMemories');
    const tools = [saveSessionMemories];
    const llm = createOpenAiLLM({
      verbose: true,
    }).bindTools(tools);
    return async (state: typeof sessionMemoryAgentStateAnnotation.State) => {
      const response = await llm.invoke([
        {
          role: 'system',
          content: prompt,
        },
        ...state.messages,
      ]);
      return {
        messages: [response],
      };
    };
  }
  const { content, lastMessageId } = await getSessionMemory();
  const extractMessageList = await getMessageList(lastMessageId);
  const contentLength = extractMessageList
    .map(item => item.content.length)
    .reduce((a, b) => a + b, 0);
  if (contentLength < MAX_SESSION_MEMORY_LENGTH) {
    return; // 如果新增消息内容总字数没有超过限制，则不需要更新记忆
  }
  const newLastMessageId = extractMessageList[extractMessageList.length - 1]?.messageId ?? lastMessageId;
  const callModel = getModel(content);
  const workflow = new StateGraph(sessionMemoryAgentStateAnnotation)
    .addNode('callModel', callModel)
    .addNode('tool_executor', toolExecutor)
    .addEdge(START, 'callModel')
    .addConditionalEdges('callModel', shouldContinue, ['tool_executor', END])
    .addEdge('tool_executor', 'callModel'); // 执行完工具回到 callModel
  const agent = workflow.compile();
  await agent.invoke({
    threadId: threadId,
    userId: userid,
    lastMessageId: lastMessageId,
    messages: [
      ...extractMessageList.map(item => {
        return {
          role: item.role,
          content: item.content,
        };
      }),
      {
        role: 'user',
        content: '请根据以上对话内容，提取关键信息形成记忆，并调用工具保存。',
      },
    ],
  });
  // 执行成功后更新内存缓存中的记录点
  sessionLastTimeMemory.set(threadId, {
    lastMessageId: newLastMessageId,
    memoryContent: content,
  });
  } catch (error) {
    console.log('session memory agent err', error);
  } finally {
    sessionIsRunningMap.set(threadId, false);
  }
};

/**
 * 加载记忆节点，在主图中作为第一个节点执行，将记忆提示词写入 state.memoryPrompt
 * 所有后续 agent 可直接从 state.memoryPrompt 读取，无需各自查询数据库
 */
export async function loadMemoryNode(state: typeof AgentStateAnnotation.State) {
  const content = await fetchGlobalMemoryIndex(state.userId);
  const memoryPrompt = buildUseGlobalMemoriesPrompt(content, 'getUserGlobalMemories');
  return { memoryPrompt };
}
