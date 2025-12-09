# title 重命名 & 对话列表批量操作

## 重命名标题

### ItemTitle
新增了一个 `n-input`，可以对标题进行重命名，并将修改值传给 `ListItem`：
```vue
<!-- conversationList/ItemTitle.vue -->

<script setup lang="ts">

interface ItemTitleProps {
  title: string;
  isEditable: boolean;   // 是否可编辑
}

// 组件外部将title传回来
const props = defineProps<ItemTitleProps>();
const emit = defineEmits(['updateTitle'])

const titleRef = useTemplateRef<HTMLElement>('titleRef');
const _title = ref(props.title)

// 将title值传出去
function updateTitle() {
  emit('updateTitle', _title.value);
}

</script>

<template>
<!-- title编辑框 -->
  <n-input v-if="isEditable" v-model:value="_title" @keydown.enter="updateTitle" />
  <h2 v-else ref="titleRef">
    <template v-if="isTitleOverflow">
      <native-tooltip :content="title">
        {{ title }}
      </native-tooltip>
    </template>
    <template v-else>
      {{ title }}
    </template>
  </h2>
</template>
```


### ListItem
接受 ItemTitle 的修改值，并将其传给 Index：
```vue
<!-- conversationList/ListItem.vue -->

<script setup lang="ts">
const _CHECKBOX_STYLE_FIX = {
  translate: '-5px -1px',
  marginLeft: '5px'
}
const _PIN_ICON_SIZE = 16 as const


// 接收外面传进来的对话属性，例如title、selectedModel
const props = defineProps<Conversation>();
// 向父组件传递新title，可以重命名对话标题
const emit = defineEmits(['updateTitle']);
// 接收外面传进来的批量操作状态
const ctx = inject(CTX_KEY, void 0);
const checked = ref(false);

// 批量操作状态，当前id是否为编辑id
const isTitleEditable = computed(() => ctx?.editId.value === props.id);

function updateTitle(val: string) {
  emit('updateTitle', props.id, val);
}

</script>

<template>
  <div class="conversation-desc text-tx-secondary flex justify-between items-center text-sm loading-5">
    <span>
      {{ selectedModel }}
      <iconify-icon class="inline-block" v-if="pinned" icon="material-symbols:keep-rounded" :width="_PIN_ICON_SIZE"
        :height="_PIN_ICON_SIZE" />
    </span>
  </div>
  <!-- 子组件ItemTitle（是否批量操作） -->
  <div class="w-full flex items-center" v-if="isBatchOperate">
    <n-checkbox :style="_CHECKBOX_STYLE_FIX" v-model:checked="checked" @click.stop />
    <div class="flex-auto">

      <item-title :title="title" :is-editable="isTitleEditable" @update-title="updateTitle" />
    </div>
  </div>
  <item-title v-else :title="title" :is-editable="isTitleEditable" @update-title="updateTitle" />
</template>
```

### Index
接收 `update-title` 事件，找到仓库中对应 `id` 的对话项，调用 `conversationsStore.updateConversation` 更新标题，并重置 `editId` 结束编辑状态。
```vue
<!-- conversationList/Index.vue -->

<script setup lang="ts">
const conversationsStore = useConversationsStore();


defineOptions({ name: 'ConversationList' });

const props = defineProps<{ width: number }>();
const editId = ref<number|void>(); 
const checkedIds = ref<number[]>([]);

const { conversations } = useFilter();
const { handle: handleListContextMenu, isBatchOperate } = useContextMenu();

const conversationItemActionPolicy = new Map([
  [CONVERSATION_ITEM_MENU_IDS.DEL, async() => {
    console.log('删除');
  }],
  [CONVERSATION_ITEM_MENU_IDS.RENAME, async (item: Conversation) => {
    editId.value = item.id;
  }],
  [CONVERSATION_ITEM_MENU_IDS.PIN, async (item: Conversation) => {
    // 若目前是置顶状态，再次点击则取消置顶
     if (item.pinned) {
      await conversationsStore.unpinConversation(item.id);
      return;
    }
    await conversationsStore.pinConversation(item.id);
  }],
])

// 对单个item的右键菜单操作
async function handleItemContextMenu(item: Conversation) {
  const clickItem = await createContextMenu(MENU_IDS.CONVERSATION_ITEM, void 0) as CONVERSATION_ITEM_MENU_IDS;
  const action = conversationItemActionPolicy.get(clickItem);
  action && await action?.(item);
}

// 更新title
function updateTitle(id: number, title: string) {
  const target = conversationsStore.conversations.find(item => item.id === id);
  if (!target) return
  conversationsStore.updateConversation({
    ...target,
    title
  });
  editId.value = void 0;
}

provide(CTX_KEY, {
  width: computed(() => props.width),
  editId: computed(() => editId.value),    // 注入当前编辑的id
  checkedIds: checkedIds,                  // 注入选中的id列表
});
</script>

<template>
  <div class="conversation-list px-2 pt-3 h-[100vh] flex flex-col" :style="{ width: 'calc(100% - 57px)' }"
    @contextmenu.prevent.stop="handleListContextMenu">
    <search-bar class="mt-3" />
    <ul class="flex-auto overflow-auto">
      <template v-for="item in conversations" :key="item.id">
        <li v-if="item.type !== 'divider'"
          class="cursor-pointer p-2 mt-2 rounded-md hover:bg-input flex flex-col items-start gap-2"
          @contextmenu.prevent.stop="handleItemContextMenu(item)">
          <list-item v-bind="item" @update-title="updateTitle" />
        </li>
        <li v-else class="divider my-2 h-px bg-input"></li>
      </template>
    </ul>
    <operations-bar v-show="isBatchOperate" @select-all="handleAllSelectChange" @cancel="isBatchOperate = false"
      @op="handleBatchOperate" />
  </div>
</template>
```


## 批量操作

### ListItem 
**双监听**，做到了双向同步：
 - 点击“全选”，`checkedIds` 存全部对话项，每个对话项都会因 `checked = true` 而被勾选；
 - 取消某个对话项，则取消全选。
```vue
<script setup lang="ts">

const _CHECKBOX_STYLE_FIX = {
  translate: '-5px -1px',
  marginLeft: '5px'
}
const _PIN_ICON_SIZE = 16 as const


// 接收外面传进来的对话属性，例如title、selectedModel
const props = defineProps<Conversation>();

const ctx = inject(CTX_KEY, void 0);
const checked = ref(false);
// 是否为批量操作
const { isBatchOperate } = useContextMenu();

// 监听checked状态，同步checkedIds数组
watch(checked, (val) => {
  if (val) {
    // 将勾选的对话项id加入checkedIds数组
    !ctx?.checkedIds.value.includes(props.id) && ctx?.checkedIds.value.push(props.id);
    return
  }
  const idx = ctx?.checkedIds.value.indexOf(props.id);
  if (idx !== -1 && idx != null) {
    // 取消勾选，将对应id移除数组
    ctx?.checkedIds.value.splice(idx, 1);
  }
});

// 监听checkedIds数组变化，同步checked状态（勾选or移除）
watch(() => ctx?.checkedIds.value, (val) => {
  if(!val) return
  checked.value = val.includes(props.id)
})
</script>

<template>
  <div class="conversation-desc text-tx-secondary flex justify-between items-center text-sm loading-5">
    <span>
      {{ selectedModel }}
      <iconify-icon class="inline-block" v-if="pinned" icon="material-symbols:keep-rounded" :width="_PIN_ICON_SIZE"
        :height="_PIN_ICON_SIZE" />
    </span>
  </div>
  <div class="w-full flex items-center" v-if="isBatchOperate">
    <n-checkbox :style="_CHECKBOX_STYLE_FIX" v-model:checked="checked" @click.stop />
    <div class="flex-auto">
      <item-title :title="title" :is-editable="isTitleEditable" @update-title="updateTitle" />
    </div>
  </div>
  <item-title v-else :title="title" :is-editable="isTitleEditable" @update-title="updateTitle" />
</template>
```

### 操作栏组件 OperationBar
在对话列表底部设置了操作栏，“全选”变化时，向父组件 Index 传递全选状态。  
点击 “置顶”“删除” 按钮时，通过 `emit('op', 操作ID)` 向 Index 传递操作类型。
```vue
<!-- conversationList/OperationBar.vue -->

<script setup lang="ts">
import { CONVERSATION_ITEM_MENU_IDS } from '../../../common/constants';
import { CTX_KEY } from './constants';
import { useContextMenu } from './useContextMenu';
import { useFilter } from './useFilter';

import { NButton, NCheckbox } from 'naive-ui';

defineOptions({ name: 'OperationsBar' });
const emits = defineEmits(['cancel', 'selectAll', 'op']);
const ctx = inject(CTX_KEY, void 0);

const { isBatchOperate } = useContextMenu();
const { conversations } = useFilter();

const isAllSelected = ref(false);

function handleSelectChange(checked: boolean) {
    // 
  isAllSelected.value = checked;
  emits('selectAll', checked);
}

watch(() => isBatchOperate.value, () => {
  handleSelectChange(false);
});

watch([
  () => ctx?.checkedIds.value.length,
  () => conversations.value.length,
], ([checkIdsSize, conversationsSize]) => {
    // 对话item的checkboxes的数量和conversation的数量相等时，所有对话item都被选中
  isAllSelected.value = checkIdsSize === conversationsSize
});
</script>

<template>
  <div @click.stop>

    <p class="divider my-2 h-px bg-input"></p>
    <div class="flex justify-between items-center pt-1">
      <n-checkbox v-model:checked="isAllSelected" @update:checked="handleSelectChange">
        {{ $t('main.conversation.operations.selectAll') }}
      </n-checkbox>
      <n-button quaternary @click="emits('cancel')">
        {{ $t('main.conversation.operations.cancel') }}
      </n-button>
    </div>
    <div class="flex items-center py-4">
      <n-button class="flex-1" style="margin-right:2px;" @click="emits('op', CONVERSATION_ITEM_MENU_IDS.PIN)">
        {{ $t('main.conversation.operations.pin') }}
      </n-button>
      <n-button class="flex-1" @click="emits('op', CONVERSATION_ITEM_MENU_IDS.DEL)">
        {{ $t('main.conversation.operations.del') }}
      </n-button>
    </div>
  </div>
</template>
```


### Index
接收 `selectAll` 事件，根据 `checked` 状态批量设置 `checkedIds`。  
接收 `op` 事件，根据 `操作ID` 从批量操作政策中匹配逻辑，完成后关闭批量模式 `isBatchOperate`。
```vue
<!-- conversationList/Index.vue -->

<script setup lang="ts">

const conversationsStore = useConversationsStore();

const props = defineProps<{ width: number }>();
const editId = ref<number|void>(); 
const checkedIds = ref<number[]>([]);

const { conversations } = useFilter();
const { handle: handleListContextMenu, isBatchOperate } = useContextMenu();


// 批量操作政策（批量删除、批量置顶）
const batchActionPolicy = new Map([
  [CONVERSATION_ITEM_MENU_IDS.DEL, async () => {
    // TODO
  }],
  [CONVERSATION_ITEM_MENU_IDS.PIN, async () => {
    checkedIds.value.forEach(id => {
      if (conversationsStore.allConversations.find(item => item.id === id)?.pinned) {
        conversationsStore.unpinConversation(id);
        return
      }
      conversationsStore.pinConversation(id);
    })
    isBatchOperate.value = false;
  }]
])


// 根据 `操作ID` 从批量操作政策中匹配逻辑，并执行
function handleBatchOperate(opId: CONVERSATION_ITEM_MENU_IDS) {
  const action = batchActionPolicy.get(opId);
  action && action();
}

// 对单个item的右键菜单操作
async function handleItemContextMenu(item: Conversation) {
  const clickItem = await createContextMenu(MENU_IDS.CONVERSATION_ITEM, void 0) as CONVERSATION_ITEM_MENU_IDS;
  const action = conversationItemActionPolicy.get(clickItem);
  action && await action?.(item);
}


// 若全选了，则选中所有聊天项
function handleAllSelectChange(checked: boolean) {
  checkedIds.value = checked ? conversations.value.map(item => item.id) : [];
}


provide(CTX_KEY, {
  width: computed(() => props.width),
  editId: computed(() => editId.value),    // 注入当前编辑的id
  checkedIds: checkedIds,                  // 注入选中的id列表
});
</script>

<template>
  <div class="conversation-list px-2 pt-3 h-[100vh] flex flex-col" :style="{ width: 'calc(100% - 57px)' }"
    @contextmenu.prevent.stop="handleListContextMenu">
    <search-bar class="mt-3" />
    <ul class="flex-auto overflow-auto">
      <template v-for="item in conversations" :key="item.id">
        <li v-if="item.type !== 'divider'"
          class="cursor-pointer p-2 mt-2 rounded-md hover:bg-input flex flex-col items-start gap-2"
          @contextmenu.prevent.stop="handleItemContextMenu(item)">
          <list-item v-bind="item" @update-title="updateTitle" />
        </li>
        <li v-else class="divider my-2 h-px bg-input"></li>
      </template>
    </ul>
    <operations-bar v-show="isBatchOperate" @select-all="handleAllSelectChange" @cancel="isBatchOperate = false"
      @op="handleBatchOperate" />
  </div>
</template>
```


## 批量模式控制操作栏
设置批量模式（状态），并且将模式状态传给 Index，通过模式控制操作栏的显示与隐藏：
```ts
// conversationList/useContextMenu.ts

// 设置批量操作状态（模式）
const isBatchOperate = ref(false);

const actionPolicy = new Map([
    // 批量操作
    [CONVERSATION_LIST_MENU_IDS.BATCH_OPERATIONS, () => {
      isBatchOperate.value = !isBatchOperate.value;
    }],
    // ...
  ])
```