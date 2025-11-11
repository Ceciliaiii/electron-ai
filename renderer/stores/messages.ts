import type { Message, MessageStatus } from '../../common/types';
import { cloneDeep, uniqueByKey } from '../../common/utils';
import { defineStore } from 'pinia';

import { dataBase } from '../dataBase';

import { useConversationsStore } from './conversations';


export const useMessagesStore = defineStore('messages', () => {
  const conversationsStore = useConversationsStore();

  // States
  const messages = ref<Message[]>([]);

  // Getters
  const allMessages = computed(() => messages.value);
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

    // const loadingMsgId = await addMessage({
    //   conversationId: message.conversationId,
    //   type: 'answer',
    //   content: '',
    //   status: 'loading',
    // });
    // TODO: 调用 大模型
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
    initialize,
    addMessage,
    sendMessage,
    updateMessage,
    deleteMessage,
  }
});