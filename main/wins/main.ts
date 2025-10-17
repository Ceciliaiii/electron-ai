import type { BrowserWindow } from 'electron';
import { WINDOW_NAMES, MAIN_WIN_SIZE, IPC_EVENTS, MENU_IDS, CONVERSATION_ITEM_MENU_IDS, CONVERSATION_LIST_MENU_IDS } from '../../common/constants';
import { windowManager } from '../service/WindowService';
import { menuManager } from '../service/MenuService';
import { logManager } from '../service/LogService';


// 注册菜单
const registerMenus = (window: BrowserWindow) => {

  const conversationItemMenuItemClick = (id: string) => {
    logManager.logUserOperation(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.CONVERSATION_ITEM}-${id}`)
    // ipc事件传递cb，清楚具体点击了哪个item
    window.webContents.send(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.CONVERSATION_ITEM}`, id);
  }

  // 对话列表选项上注册菜单
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
}

export function setupMainWindow() {
  windowManager.onWindowCreate(WINDOW_NAMES.MAIN, (mainWindow: any) => {
    registerMenus(mainWindow);
  });
  windowManager.create(WINDOW_NAMES.MAIN, MAIN_WIN_SIZE);
}