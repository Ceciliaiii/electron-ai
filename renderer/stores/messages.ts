import type { Message, MessageStatus } from '../../common/types';
import { cloneDeep, uniqueByKey } from '../../common/utils';
import { defineStore } from 'pinia';
import { dataBase } from '../dataBase';
import { useConversationsStore } from './conversations';
import { useProvidersStore } from './providers';
import { listenDialogueBack } from '../utils/dialogue';
import i18n from '../i18n';

const msgContentMap = new Map<number, string>();
// 根据id获取停止该对话的method
export const stopMethods = new Map<number, () => void>();


export const useMessagesStore = defineStore('messages', () => {
  const conversationsStore = useConversationsStore();
  const providersStore = useProvidersStore();



  // States
  const messages = ref<Message[]>([]);

  // 存储 <conversationId, inputValue>
  const messagesInputValue = ref(new Map())




  // Getters
  const allMessages = computed(() => messages.value);

  // 用id获取input值
  const messageInputValueById = computed(() => (conversationId: number) => messagesInputValue.value.get(conversationId) ?? '');

  // 用id获取loading、streaming的message id
  const loadingMsgIdsByConversationId = computed(() => (conversationId: number) => 
    messagesByConversationId.value(conversationId).filter(message => message.status === 'loading' || message.status === 'streaming').map(message => message.id));


  // 通过对话id获取对应对话的message
  const messagesByConversationId = computed(() => (conversationId: number) => 
    messages.value.filter(message => message.conversationId === conversationId)
  .sort((a, b) => a.createdAt - b.createdAt));



  // Actions  

  // 初始化
  async function initialize(conversationId: number) {
    if (!conversationId) return;

    // store中若已经存在当前对话项的message（即已经初始化过），则直接返回
    // 也可理解为创建过对话项
    const isConversationLoaded = messages.value.some(message => message.conversationId === conversationId);
    if (isConversationLoaded) return;

    // 从数据库找对应id的message
    const saved = await dataBase.messages.where({ conversationId }).toArray();
    // 若重复查询一条msg (store & dataBase)，只返回store中的msg
    messages.value = uniqueByKey([...messages.value, ...saved], 'id');
  }


  // 修改input草稿值
  function setMessageInputValue(conversationId: number, value: string) {
    messagesInputValue.value.set(conversationId, value);
  }


  const _updateConversation = async (conversationId: number) => {
    const conversation = await dataBase.conversations.get(conversationId);
    // 取到值，更新到store的对话列表中
    conversation && conversationsStore.updateConversation(conversation);
  }


  // 增
  async function addMessage(message: Omit<Message, 'id' | 'createdAt'>) {
    // 自动补充创建时间和自增id
    const newMessage = {
      ...message,
      createdAt: Date.now(),
    };
    const id = await dataBase.messages.add(newMessage);
    // 同步更新对话项的元信息（如updateAt，非message）
    _updateConversation(newMessage.conversationId);
    messages.value.push({ ...newMessage, id });
    return id
  }


  // 发送消息方法
  async function sendMessage(message: Omit<Message, 'id' | 'createdAt'>) {
    await addMessage(message);

    const loadingMsgId = await addMessage({
      conversationId: message.conversationId,
      type: 'answer',
      content: '...',
      status: 'loading',
    });
    
    // 获取当前对话
    const conversation = conversationsStore.getConversationById(message.conversationId);
    if(!conversation) return loadingMsgId;

    // 获取当前provider
    const provider = providersStore.allProviders.find(item => item.id === conversation.providerId);
    if (!provider) return loadingMsgId;

    // 防止串线
    msgContentMap.set(loadingMsgId, '')

    // 拿到返回值，调用cb
    let streamCallback: ((stream: DialogueBackStream) => Promise<void>) | void 
    = async (stream) => {
      const {data, messageId} = stream

      const getStatus = (data: DialogueBackStream['data']): MessageStatus => {
        if(data.isError) return 'error'

        if(data.isEnd) return 'success'

        return 'streaming'
      }

      msgContentMap.set(messageId, msgContentMap.get(messageId) + data.result)

      const _update = {
        content: msgContentMap.get(messageId) || '',
        status: getStatus(data),
        updateAt: Date.now(),
      } as unknown as Message


      await nextTick()

      updateMessage(messageId, _update)
      if(data.isEnd) {
        msgContentMap.delete(messageId)
        streamCallback = void 0
      }
    }

    stopMethods.set(loadingMsgId, listenDialogueBack(streamCallback, loadingMsgId))
    const messages = messagesByConversationId.value(message.conversationId)
    .filter(item => item.status !== 'loading').map(item => ({
      role: item.type === 'question' ? 'user' : 'assistant' as DialogueMessageRole,
      content: item.content,
    }))

    await window.api.startADialogue({
      messageId: loadingMsgId,
      providerName: provider.name,
      selectedModel: conversation.selectedModel,
      conversationId: message.conversationId,
      messages,
    });

    return loadingMsgId;
  }



  async function stopMessage(id: number, update: boolean = true) {
    const stop = stopMethods.get(id)
    stop && stop?.()
    if(update) {
      const msgContent = messages.value.find(message => message.id === id)?.content || ''
      await updateMessage(id, {
        status: 'success',
        updatedAt: Date.now(),
        content: msgContent ? msgContent + i18n.global.t('main.message.stopGeneration') : void 0,
      })
    }
  }


  // 改  传入当前message的唯一id和更新内容
  async function updateMessage(id: number, updates: Partial<Message>) {
    // 获取当前message，更新到数据库、响应式数组中
    let currentMsg = cloneDeep(messages.value.find(message => message.id === id));
    await dataBase.messages.update(id, { ...currentMsg, ...updates });
    messages.value = messages.value.map(message => message.id === id ? { ...message, ...updates } : message);
  }


  // 删  传入当前message的唯一id
  async function deleteMessage(id: number) {
    let currentMsg = cloneDeep(messages.value.find(item => item.id === id));

    //TODO: 停止消息的生成
    
    await dataBase.messages.delete(id);
    // 取到当前msg，更新对话项的元信息（如updateAt，非message）
    currentMsg && _updateConversation(currentMsg.conversationId);
    // 从响应式数组中移除
    messages.value = messages.value.filter(message => message.id !== id);
    currentMsg = void 0;   // 回收内存
  }



  return {
    messages,
    allMessages,
    messagesByConversationId,
    messageInputValueById,
    loadingMsgIdsByConversationId,
    initialize,
    addMessage,
    sendMessage,
    updateMessage,
    deleteMessage,
    setMessageInputValue,
    stopMessage
  }
});