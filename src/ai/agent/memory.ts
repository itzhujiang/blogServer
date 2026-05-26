// 记忆agent，本记忆agent，不会有用户进行发起调用，并且不会出现在index.ts中的agent图中，而是作为一个工具被其他agent调用
import { createOpenAiLLM } from '@/ai/utils/llm';
// import { AgentStateAnnotation } from '../utils/utils';
import { Role } from '@ag-ui/core';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import { saveGlobalMemoryIndex, saveUserGlobalMemories, getGlobalMemoryIndex } from '@/ai/tools';
import { AiGlobalChatMemoryCategory } from '@/models';
import { AIMessage } from '@langchain/core/messages';

export type GlobalMsgList = {
  /** 消息ID */
  messageId: string;
  /** 内容 */
  content: string;
  /**  角色 */
  role: Role;
};

const MEMORY_TYPES = Object.values(AiGlobalChatMemoryCategory);

export const MAX_ENTRYPOINT_LINES = 200;

const AgentStateAnnotation = Annotation.Root({
  threadId: Annotation<string>,
  userId: Annotation<number>,
  ...MessagesAnnotation.spec,
});

const previousMessageIdMap = new Map<string, string>(); // 用于存储消息ID与上一条已经被记录的消息ID的映射关系
const isRunningMap = new Map<string, boolean>(); // 按 threadId 隔离运行状态，避免同一线程重复调用
const msgListMap = new Map<string, GlobalMsgList[]>(); // 按 threadId 存储消息列表，供记忆提取使用
const pendingMap = new Map<string, boolean>(); // 运行期间是否有新调用进来

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
        能帮助你在未来根据用户的偏好和视角来调整自己的行为。你在读取和写入这类记忆时，目标是逐步建立对“用户是谁”以及“怎样才能
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
      取项目目录之外的最新信息，应该去哪里查找。
    </description>`,
    `<when_to_save>
      当你了解到某个外部系统中的资源及其用途时，就应该保存。例如，你知道某类 bug 是在 Linear
    的某个特定项目里跟踪的，或者某类反馈会出现在某个特定的 Slack 频道中。
    </when_to_save>`,
    '<how_to_use>当用户提到某个外部系统，或者用户要找的信息很可能存在于外部系统中时，使用这类记忆。</how_to_use>',
    `<examples>
     user: 如果你想了解这些 ticket 的背景，就去看 Linear 里的 "INGEST" 项目，我们所有的 pipeline bug
      都是在那里面跟踪的,
     assistant: [保存 reference 记忆：pipeline 相关 bug 记录在 Linear 项目 "INGEST" 中],
     user: grafana.internal/d/api-latency 这个 Grafana 面板是 oncall 在盯的 ——
      如果你改的是请求处理链路，这就是那个会触发告警的面板,
     assistant: [保存 reference 记忆：grafana.internal/d/api-latency 是 oncall 关注的延迟监控面板 ——
      修改请求路径相关代码时应查看它],
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
    '**步骤 2** 根据步骤 1 返回的 ID，更新索引内容，调用 saveGlobalMemoryIndex 工具保存索引内容。这个工具用于管理全局记忆索引。禁止直接将记忆内容(正文)写入到索引文件中。每个条目只占一行，长度尽量控制在 150 个字符以内，索引内容的格式为：`- [{{id}}] {{Title}} — {{one-line hook}}`，其中 Title 和 hook 都要尽量简洁具体，方便在未来的对话中进行相关性判断。不带 frontmatter。',
    '- 索引内容会始终加载到系统提示词中；超过 200 行的内容会被截断，因此索引要尽量简洁',
    '- 按主题来组织记忆，而不是按时间顺序组织',
    '- 如果某条记忆被发现有误或已经过时，应更新或删除',
    '- 不要写入重复的忆。写入新记忆之前，先检查是否已有可以直接更新的现有记忆。',
    '## 不应该保存到记忆中的内容',
    '- 过于琐碎的细节：例如用户在对话中提到的某个临时状态、某次特定的错误、或者某条消息的具体内容，这些通常不适合被保存为记忆，因为它们可能很快就会过时，或者在未来的对话中不再相关。',
    '- 短期任务细节：例如进行中的工作、临时状态、当前对话上下文。',
  ];
};

// // const buildUseGlobalMemoriesPrompt = () => {

// };

/**
 * 获取全局记忆agent， 该agent会记录所有的消息
 * @param msgList 消息列表，包含消息ID、内容和角色等信息
 * @param threadId 线程id
 * @returns
 */
export const getGlobalMemoryAgent = async (
  msgList: GlobalMsgList[],
  threadId: string,
  userid: number
) => {
  msgListMap.set(threadId, msgList); // 更新消息列表
  if (isRunningMap.get(threadId)) {
    pendingMap.set(threadId, true); // 标记有新调用进来，等当前处理完后再跑一次
    return;
  }
  isRunningMap.set(threadId, true);
  try {
    console.log('isRunningMap.get(threadId)', isRunningMap);

    const newMessageList = msgListMap.get(threadId)!;
    /**
   * 获取需要被记录的消息列表，并更新previousMessageIdMap中的消息ID映射关系
     1. 首先根据threadId从previousMessageIdMap中获取上一条已经被记录的消息ID previousMessageId
     2. 如果previousMessageId存在，在newMessageList中找到该消息ID对应的消息索引previousMsgIndex
   * @returns
   */
    function getrecordMsgList() {
      const previousMessageId = previousMessageIdMap.get(threadId);
      const recordMsgList: GlobalMsgList[] = [];

      const previousMsgIndex = previousMessageId
        ? newMessageList!.findIndex(msg => msg.messageId === previousMessageId)
        : -1;

      if (previousMessageId && previousMsgIndex === -1) {
        // 记录点在 newMessageList 中找不到（可能已超出传入范围），清除记录点降级为首次处理
        previousMessageIdMap.delete(threadId);
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
      return await getGlobalMemoryIndex.invoke({
        userId: userid,
      });
    }

    /**
     * 工具执行节点
     * 需要动态创建，因为要包含前端传入的工具
     */
    async function toolExecutor(state: typeof AgentStateAnnotation.State) {
      const tools = [saveGlobalMemoryIndex, saveUserGlobalMemories];
      const toolNode = new ToolNode(tools);
      // 执行工具
      return await toolNode.invoke(state);
    }
    function shouldContinue(state: typeof AgentStateAnnotation.State) {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      if ((lastMessage.tool_calls?.length ?? 0) > 0) {
        return 'tool_executor';
      }
      return END;
    }

    function getModel(recordMsgList: GlobalMsgList[]) {
      // 防止重复查询数据库
      let prompt: string[];
      return async (state: typeof AgentStateAnnotation.State) => {
        const tools = [saveGlobalMemoryIndex, saveUserGlobalMemories];
        const llm = createOpenAiLLM({
          verbose: true,
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
    // console.log('recordMsgList', recordMsgList);
    // 如果记录列表大于了4条，开始进行记忆提取
    if (recordMsgList.length > 4) {
      previousMessageIdMap.set(threadId, recordMsgList[recordMsgList.length - 1].messageId); // 更新记录点
      // 这里可以调用一个专门的记忆提取模型，来对recordMsgList进行提取，得到精简的记忆内容，最后存储到数据库
      const callModel = getModel(recordMsgList);
      const workflow = new StateGraph(AgentStateAnnotation)
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
      console.log('执行完毕');
    }
    // 如果运行期间有新调用进来，取最新列表再跑一次
  } catch (error) {
    console.log('err', error);
  } finally {
    isRunningMap.set(threadId, false);
    if (pendingMap.get(threadId)) {
      pendingMap.delete(threadId);
      // 检查是否真的有新消息需要处理，避免无意义的递归
      const latestList = msgListMap.get(threadId)!;
      const lastProcessedId = previousMessageIdMap.get(threadId);
      const lastMsgId = latestList[latestList.length - 1]?.messageId;
      if (lastMsgId && lastMsgId !== lastProcessedId) {
        await getGlobalMemoryAgent(latestList, threadId, userid);
      }
    }
  }
};
