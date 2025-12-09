# 消息：时间戳格式化 & 自动滚动底部

## 时间戳格式化
参考过 vueuse 的 `useTimeAgo`，但是时间久了就不够具体，因此手写一个钩子，可复用，减少定时器冗余；  
对外暴露 `formatTimeAgo`，接收时间戳 `timestamp`，传给格式化核心方法，并返回规定格式的时间；  
也支持国际化：
```ts
// renderer/hooks/useTimeAgo.ts

// 判断两个日期是否在同一自然周（周一为一周起始，周日归为上周）
function isSameCalenderWeek(date1: Date, date2: Date): boolean {
    // 一周的开始
    const getStartOfWeek = (date: Date): Date => {
        const start = new Date(date)
        const day = start.getDay()  // js: 0-6, 0代表周日

        // 在一周内（0-6），若是周日，减去6天，start回调到上周一
        // 否则减去1，start回调到本周一
        const diff = start.getDate() - (day === 0 ? 6 : day - 1)
        return new Date(start.setDate(diff))
    }

    const getStartOfWeek1 = getStartOfWeek(date1)
    const getStartOfWeek2 = getStartOfWeek(date2)

    return getStartOfWeek1.toDateString() === getStartOfWeek2.toDateString()
}

// 时分补零格式化
function formatTimeOnly(date: Date): string {
    // 三点05分 => 03：05
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
}


function getWeekDay(date: Date, t: any):string {
    const weekDays = [
        t('timeAgo.weekday.sun'),
        t('timeAgo.weekday.mon'),
        t('timeAgo.weekday.tue'),
        t('timeAgo.weekday.wed'),
        t('timeAgo.weekday.thu'),
        t('timeAgo.weekday.fri'),
        t('timeAgo.weekday.sat'),
    ]

    return weekDays[date.getDay()]
}


// 按语言切换日期格式
function formatMonthDay(date: Date, locale: string): string {
    const month = date.getMonth() + 1
    const day = date.getDate()

    // 中英切换格式
    if(locale === 'en') {
        return `${month}/${day}`
    } 
    else {
        return `${month}月${day}日`
    }
}

function formatFullDateTime(date: Date, locale: string): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    // 中英切换格式
    if(locale === 'en') {
        return `${month}/${day}/${year} ${hours}:${minutes}`
    } 
    else {
        return `${year}年${month}月${day}日 ${hours}:${minutes}`
    }
}


// 核心格式化  
function formatTimeAgoCore(targetDate: Date, nowDate: Date, t: any, locale: string): string {
    const diff = nowDate.getTime() - targetDate.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)

    // 目标时间与现实时间相同
    const isSameDay = targetDate.toDateString() === nowDate.toDateString()
    const isSameWeek = isSameCalenderWeek(targetDate, nowDate)
    const isSameYear = targetDate.getFullYear() === nowDate.getFullYear()


    // 1h以内
    if(hours < 1) {
        if(minutes < 5) {
            return t('timeAgo.justNow')
        }
        return t('timeAgo.minutes', { count: minutes })
    }

    // 1h ~ 1天（同一天）
    else if(isSameDay) {
        return formatTimeOnly(targetDate)
    }

    // 1天 ~ 1周（同一周）
    else if(!isSameDay && isSameWeek) {
        return `${getWeekDay(targetDate, t)} ${formatTimeOnly(targetDate)}`
    }

    // 1周 ~ 1年（同一年）
    else if(!isSameDay && !isSameWeek && isSameYear) {
        return `${formatMonthDay(targetDate, locale)} ${formatTimeOnly(targetDate)}`
    }

    // 1年以上
    else {
        return formatFullDateTime(targetDate, locale)
    }
    
}

export function useBatchTimeAgo() {
    const { t, locale } = useI18n();
    const now = ref(new Date())   // 当前时间
    const timer = ref<number | null>(null)
    const updateInterval = 1000 * 60  // 每分钟更新一次

    // 启动计时
    const setupTimer = () => {
        // 每一分钟更新 当下时间now
        if(!timer.value) {
            timer.value = window.setInterval(() => {
                now.value = new Date()
            }, updateInterval)
        }
    }


    // 清除计时
    const clearTimer = () => {
        if(timer.value) {
            window.clearInterval(timer.value)
            timer.value = null
        }
    }

    // timestamp 时间戳格式化
    const formatTimeAgo = (timestamp: number | Date): string => {
        const targetDate = timestamp instanceof Date ? timestamp : new Date(timestamp)

        // 格式化核心
        return formatTimeAgoCore(targetDate, now.value, t, locale.value)
    }


    setupTimer()

    onUnmounted(() => {
        clearTimer()
    })


    return {
        formatTimeAgo,
        clearTimer,
    }

}
```
在消息列表使用：
```ts
// renderer/components/MessageList.vue

const { formatTimeAgo } = useBatchTimeAgo();
```
```html
<!-- timeAgo -->
<div>
    {{ formatTimeAgo(message.createdAt) }}
</div>
```

## 自动滚动底部
监听关键触发事件 + 原生 DOM 操作 + 滚动状态防抖；  
使用 mdn 原生操作DOM的方法 `scrollIntoView`，详情见：  
https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollIntoView
```ts
// renderer/components/MessageList.vue

const route = useRoute();

const { formatTimeAgo } = useBatchTimeAgo();


// 容器与滚动内容的class
const MESSAGE_LIST_CLASS_NAME = 'message-list'
const SCROLLBAR_CONTENT_CLASS_NAME ='n-scrollbar-content'

// 获取滚动内容DOM
function _getScrollDOM() {
  const msgListDOM = document.getElementsByClassName(MESSAGE_LIST_CLASS_NAME)[0]

  if(!msgListDOM) return

  return msgListDOM.getElementsByClassName(SCROLLBAR_CONTENT_CLASS_NAME)[0]
}

// 原生操作DOM，自动滚动到底部，默认平滑滚动
async function scrollToBottom(behavior: ScrollIntoViewOptions['behavior'] = 'smooth') {
  await nextTick()  // 等待 DOM 更新完成（新消息渲染）
  const scrollDOM = _getScrollDOM()
  if(!scrollDOM) return

  scrollDOM.scrollIntoView({ 
    behavior,
    block: 'end',  // 滚到底
   })
}

// 监听对话切换、消息总数变化，瞬间滚底
let currentHeight = 0
watch([() => route.params.id, () => props.messages.length], () => {
  scrollToBottom('instant')
  // 重置滚动高度记录，避免后续防抖逻辑异常
  currentHeight = 0
})


// 监听最后一条消息内容变化，适配ai流式回复
watch(
  () => props.messages[props.messages.length - 1]?.content.length, 
  () => {
    const scrollDOM = _getScrollDOM()
    if(!scrollDOM) return

    // 防抖滚动，避免因流式回复 频繁触发滚动
    const height = scrollDOM.scrollHeight
    // 新高度 > 旧高度（消息内容真正增加，而非重复触发）
    if(height > currentHeight) {
      currentHeight = height 
      scrollToBottom()
    }
  },
  { immediate: true, deep: true }  // 初始化时执行一次，deep每新增一个字符都触发滚动
)

// 组件挂载 瞬间滚动到最底部，看到最新消息
onMounted(() => {
  scrollToBottom('instant')
})
```