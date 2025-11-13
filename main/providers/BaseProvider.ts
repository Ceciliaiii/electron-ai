
// 基类  abstract抽象类 只能被继承
export abstract class BaseProvider {

    // 抽象方法chat 所有子类必须实现 参数定义role和大模型name
    // 返回promise（模型调用是网络请求，需要异步），适配流式响应（逐字逐句生成回复）
  abstract chat(messages: DialogueMessageProps[], modelName: string): 
  Promise<AsyncIterable<UniversalChunk>>
}