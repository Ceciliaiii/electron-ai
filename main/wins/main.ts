import { ipcMain, type BrowserWindow } from 'electron';
import { WINDOW_NAMES, MAIN_WIN_SIZE, IPC_EVENTS, MENU_IDS, CONVERSATION_ITEM_MENU_IDS, CONVERSATION_LIST_MENU_IDS, MESSAGE_ITEM_MENU_IDS } from '../../common/constants';
import { windowManager } from '../service/WindowService';
import { menuManager } from '../service/MenuService';
import { logManager } from '../service/LogService';
import { createProvider } from '../providers';


// 注册菜单
const registerMenus = (window: BrowserWindow) => {

  const conversationItemMenuItemClick = (id: string) => {
    logManager.logUserOperation(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.CONVERSATION_ITEM}-${id}`)
    // ipc事件传递cb，清楚具体点击了哪个item
    window.webContents.send(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.CONVERSATION_ITEM}`, id);
  }

  // 对话选项上注册菜单
  menuManager.register(MENU_IDS.CONVERSATION_ITEM, [
    {
      id: CONVERSATION_ITEM_MENU_IDS.PIN,
      label: 'menu.conversation.pinConversation',
      click: () => conversationItemMenuItemClick(CONVERSATION_ITEM_MENU_IDS.PIN)
    },
    {
      id: CONVERSATION_ITEM_MENU_IDS.RENAME,
      label: 'menu.conversation.renameConversation',
      click: () => conversationItemMenuItemClick(CONVERSATION_ITEM_MENU_IDS.RENAME)
    },
    {
      id: CONVERSATION_ITEM_MENU_IDS.DEL,
      label: 'menu.conversation.delConversation',
      click: () => conversationItemMenuItemClick(CONVERSATION_ITEM_MENU_IDS.DEL)
    },
  ])

  const conversationListMenuItemClick = (id: string) => {
    logManager.logUserOperation(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.CONVERSATION_LIST}-${id}`)
    window.webContents.send(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.CONVERSATION_LIST}`, id);
  }


  // 对话列表中注册菜单,注意区分对话列表和对话选项
  menuManager.register(MENU_IDS.CONVERSATION_LIST, [
    {
      id: CONVERSATION_LIST_MENU_IDS.NEW_CONVERSATION,
      label: 'menu.conversation.newConversation',
      click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.NEW_CONVERSATION)
    },
    { type: 'separator' },
    {
      id: CONVERSATION_LIST_MENU_IDS.SORT_BY, label: 'menu.conversation.sortBy', submenu: [
        { id: CONVERSATION_LIST_MENU_IDS.SORT_BY_CREATE_TIME, label: 'menu.conversation.sortByCreateTime', type: 'radio', checked: false, click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.SORT_BY_CREATE_TIME) },
        { id: CONVERSATION_LIST_MENU_IDS.SORT_BY_UPDATE_TIME, label: 'menu.conversation.sortByUpdateTime', type: 'radio', checked: false, click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.SORT_BY_UPDATE_TIME) },
        { id: CONVERSATION_LIST_MENU_IDS.SORT_BY_NAME, label: 'menu.conversation.sortByName', type: 'radio', checked: false, click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.SORT_BY_NAME) },
        { id: CONVERSATION_LIST_MENU_IDS.SORT_BY_MODEL, label: 'menu.conversation.sortByModel', type: 'radio', checked: false, click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.SORT_BY_MODEL) },
        { type: 'separator' },
        { id: CONVERSATION_LIST_MENU_IDS.SORT_ASCENDING, label: 'menu.conversation.sortAscending', type: 'radio', checked: false, click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.SORT_ASCENDING) },
        { id: CONVERSATION_LIST_MENU_IDS.SORT_DESCENDING, label: 'menu.conversation.sortDescending', type: 'radio', checked: false, click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.SORT_DESCENDING) },
      ]
    },
    {
      id: CONVERSATION_LIST_MENU_IDS.BATCH_OPERATIONS,
      label: 'menu.conversation.batchOperations',
      click: () => conversationListMenuItemClick(CONVERSATION_LIST_MENU_IDS.BATCH_OPERATIONS)
    }
  ])


  // 消息选项上注册菜单
  const messageItemMenuItemClick = (id: string) => {
    logManager.logUserOperation(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.MESSAGE_ITEM}-${id}`)
    window.webContents.send(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.MESSAGE_ITEM}`, id);
  }
  
  menuManager.register(MENU_IDS.MESSAGE_ITEM, [
    {
      id: MESSAGE_ITEM_MENU_IDS.COPY,
      label: 'menu.message.copyMessage',
      click: () => messageItemMenuItemClick(MESSAGE_ITEM_MENU_IDS.COPY)
    },
    {
      id: MESSAGE_ITEM_MENU_IDS.SELECT,
      label: 'menu.message.selectMessage',
      click: () => messageItemMenuItemClick(MESSAGE_ITEM_MENU_IDS.SELECT)
    },
    { type: 'separator' },
    {
      id: MESSAGE_ITEM_MENU_IDS.DELETE,
      label: 'menu.message.deleteMessage',
      click: () => messageItemMenuItemClick(MESSAGE_ITEM_MENU_IDS.DELETE)
    },
  ])
}

export function setupMainWindow() {
  windowManager.onWindowCreate(WINDOW_NAMES.MAIN, (mainWindow: any) => {
    registerMenus(mainWindow);
  });

  windowManager.create(WINDOW_NAMES.MAIN, MAIN_WIN_SIZE);

  // 监听start-a-dialogue事件，接收render进程发起的ai对话请求
  ipcMain.on(IPC_EVENTS.START_A_DIALOGUE, async (_event, props: CreateDialogueProps) => {
    const { providerName, messages, messageId, selectedModel } = props;
    const mainWindow = windowManager.get(WINDOW_NAMES.MAIN);

    if (!mainWindow) {
      throw new Error('mainWindow not found');
    }

    try {

      // 调用 chat，返回一个可迭代对象 chunks，用于分块返回结果
      const provider = createProvider(providerName);
      const chunks = await provider?.chat(messages, selectedModel);

      if(!chunks){
        throw new Error('chunks or stream not found');
      }

      for await (const chunk of chunks) {
        // 分块
        const chunkContent = {
          messageId,
          data: chunk
        }

        // 向main窗口render进程返回分块结果
        mainWindow.webContents.send(IPC_EVENTS.START_A_DIALOGUE + 'back' + messageId, chunkContent);
      }

    } catch (error) {
      const errorContent = {
        messageId,
        data: {
          isEnd: true,
          isError: true,
          result: error instanceof Error ? error.message : String(error),
        }
      }

      // 同理，返回errorContent
      mainWindow.webContents.send(IPC_EVENTS.START_A_DIALOGUE + 'back' + messageId, errorContent);
    }
  })
}