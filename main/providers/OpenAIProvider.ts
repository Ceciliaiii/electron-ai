import { BaseProvider } from "./BaseProvider";

import OpenAI from "openai";
import logManager from "../service/LogService";


// 翻译返回的数据块，转化成统一的格式块
function _transformChunk(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): UniversalChunk {
  const choice = chunk.choices[0];
  return {
    isEnd: choice?.finish_reason === 'stop',
    result: choice?.delta?.content ?? '',
  }
}

// 用法参照npm/openai/usage
export class OpenAIProvider extends BaseProvider {

  private client: OpenAI;

//   index传openAISetting参数
  constructor(apiKey: string, baseURL: string) {
    super();
    // 实例化
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat(messages: DialogueMessageProps[], model: string): Promise<AsyncIterable<UniversalChunk>> {
    const startTime = Date.now();

    const lastMessage = messages[messages.length - 1];

    logManager.logApiRequest('chat.completions.create', {
      model,
      lastMessage: lastMessage?.content?.substring(0, 100) + (lastMessage?.content?.length > 100 ? '...' : ''),
      messageCount: messages.length,
    }, 'POST');

    // 响应成功or失败
    try {
        // 调用openai的create接口，请求数据块
      const chunks = await this.client.chat.completions.create({
        model,
        messages, // 传所有的对话信息，ai才有上下文理解能力
        stream: true,
      });

      const responseTime = Date.now() - startTime;
      logManager.logApiResponse('chat.completions.create', { success: true }, 200, responseTime);
      // return chunk;
      return {
        async *[Symbol.asyncIterator]() {
          for await (const chunk of chunks) {
            // 翻译数据块
            yield _transformChunk(chunk);
          }
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logManager.logApiResponse('chat.completions.create', { error: error instanceof Error ? error.message : String(error) }, 500, responseTime);
      throw error;
    }
  }
}
