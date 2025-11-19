/** 
  @attention：手写useTimeAgo，vueuse的useTimeAgo时间久了不具体
 * */


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


// 核心
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
    const now = ref(new Date())
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


    const formatTimeAgo = (timestamp: number | Date): string => {
        const targetDate = timestamp instanceof Date ? timestamp : new Date(timestamp)

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