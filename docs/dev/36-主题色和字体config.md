# 主题色 & 字体配置
本章则是做了 setting 窗口的主题色和字体的全局联动；都是通过钩子来联动 useConfig 完成。

## 字体
```ts
// hooks/useFontSize.ts

// 和useConfig联动fontsize
export function useFontSize() {
  const fontSize = ref(14);  // 提供读取getter
  const config = useConfig();

  const setFontSize = (size: number) => {
    // 同步到全局浏览器
    document.body.style.fontSize = `${size}px`;
    if (size !== config[CONFIG_KEYS.FONT_SIZE])
      config[CONFIG_KEYS.FONT_SIZE] = size;
    if (size !== fontSize.value)
      fontSize.value = size;
  }

  watch(() => config[CONFIG_KEYS.FONT_SIZE], size => setFontSize(size), { immediate: true });

  return {
    fontSize,   // getter
    setFontSize,  // setter
  }
}

export default useFontSize;
```

## 主题色
 - 首先定义了色板和基础色的转换方法（hsl <==> hex），然后也是联动 `useConfig` 封装获取和修改主题色方法；通过 `generateColorPalette` 生成同色系的浅、深、悬停、激活、柔和等 6 种衍生色；
 - 然后在 `usePrimaryColor` 使用该转换方法，获取和修改主题色。
 - 最后，在主题钩子中，获取了主题色和悬停色的同时，也统一了气泡色和 switch 轨道色，一起联动 config。
```ts
import { CONFIG_KEYS } from "../../common/constants";


// HEX: #BB5BE7    HSL(色板): 色相 h、饱和度 s、亮度 l
// 算法生成
const generateColorPalette = (baseColor: string) => {
  const hsl = hexToHsl(baseColor);

  // 锁定色相，确保所有衍生色在同一色系
  const fixedHue = hsl.h;

  // 动态亮度调整因子，根据基础亮度自动调整
  const lightnessStep = hsl.l > 0.7 ? 0.1 : hsl.l < 0.3 ? 0.2 : 0.15;

  return {
    DEFAULT: baseColor,
    // 浅色变体：提高亮度，保持饱和度
    light: hslToHex(fixedHue, hsl.s, Math.min(hsl.l + lightnessStep, 0.95)),
    // 深色变体：降低亮度，保持饱和度
    dark: hslToHex(fixedHue, hsl.s, Math.max(hsl.l - lightnessStep, 0.05)),
    // 悬停变体：略微提高饱和度和亮度
    hover: hslToHex(fixedHue, Math.min(hsl.s + 0.05, 0.95), Math.min(hsl.l + 0.03, 0.95)),
    // 激活变体：提高饱和度，降低亮度
    active: hslToHex(fixedHue, Math.min(hsl.s + 0.1, 0.95), Math.max(hsl.l - 0.05, 0.05)),
    // 柔和变体：降低饱和度，提高亮度
    subtle: hslToHex(fixedHue, Math.max(hsl.s - 0.3, 0.1), Math.min(hsl.l + 0.2, 0.95))
  }
}


const hexToHsl = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error('Invalid HEX color');

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s as number, l };
}

// HSL转HEX格式 (h: 0-360, s: 0-1, l: 0-1)
const hslToHex = (h: number, s: number, l: number) => {
  // 将色相转换为0-1范围
  const normalizedHue = h / 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l; // 灰度
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, normalizedHue + 1 / 3);
    g = hue2rgb(p, q, normalizedHue);
    b = hue2rgb(p, q, normalizedHue - 1 / 3);
  }

  // 将0-1范围转换为0-255并格式化为HEX
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


// 修改主题色
export const setPrimaryColor = (color: string) => {
    const colors = generateColorPalette(color);
    ['DEFAULT', 'light', 'dark', 'hover', 'active', 'subtle'].forEach(key => {
        if (key === 'DEFAULT')
        return document.documentElement.style.setProperty('--primary-color', colors[key]);
        document.documentElement.style.setProperty(`--primary-color-${key}`, colors[key as keyof typeof colors]);
    });
    window.api.setConfig(CONFIG_KEYS.PRIMARY_COLOR, colors.DEFAULT);
    return colors
}


// 获取主题色
export const getPrimaryColor = async () => {
    const baseColor = await window.api.getConfig(CONFIG_KEYS.PRIMARY_COLOR);
    const colors = generateColorPalette(baseColor);
    return colors;    
}

export const getCSSVariable = (name: string) => {
    // 浏览器环境
    if(typeof window !== 'undefined') {
        // 原生获取根元素的计算样式
        const rootStyle = window.getComputedStyle(document.documentElement)
        // 获取css属性值
        return rootStyle.getPropertyValue(name).trim()
    }

    return ''
}
```
```ts
// hooks/usePrimaryColor.ts

import { CONFIG_KEYS } from '../../common/constants';
import { setPrimaryColor } from '../utils/theme';
import { useConfig } from './useConfig';

interface PrimaryColors {
  DEFAULT: string;  // 基础色
  light: string;
  dark: string;
  hover: string;
  active: string;
  subtle: string;
}
export function usePrimaryColor() {
  const primaryColor = ref<string | void>();  // 基础色 #BB5BE7
    // getter
  const primaryColors = ref<PrimaryColors | void>(); // 色板 hsl
  const config = useConfig();

  const _setPrimaryColor = (color: string) => {
    const colors = setPrimaryColor(color);
    primaryColor.value = colors.DEFAULT;
    primaryColors.value = colors;
    return colors;
  }

  // setter入口
  const update = () => _setPrimaryColor(config[CONFIG_KEYS.PRIMARY_COLOR]);

  watch(
    () => config[CONFIG_KEYS.PRIMARY_COLOR],
    (color) => (color !== primaryColor.value) && update()
  );

  onMounted(async () => {
    await nextTick();
    _setPrimaryColor(config[CONFIG_KEYS.PRIMARY_COLOR]);
  });

  return {
    primaryColors,
    setPrimaryColor: (color: string) => {
      if (color === primaryColor.value) return;
      config[CONFIG_KEYS.PRIMARY_COLOR] = color;
    }
  }
}

export default usePrimaryColor;
```
```ts
// hooks/useNaiveTheme.ts

import type { Ref, ComputedRef } from 'vue';
import { darkTheme, lightTheme, type GlobalTheme, type GlobalThemeOverrides } from 'naive-ui';
import { getCSSVariable } from '../utils/theme';
import { useThemeMode } from './useThemeMode';
import { usePrimaryColor } from './usePrimaryColor';

function _usePrimaryColor() {
  const { primaryColors } = usePrimaryColor();
  const primaryColor = computed(() => primaryColors.value?.DEFAULT ?? '#BB5BE7');
  const primaryColorHover = computed(() => primaryColors.value?.hover ?? '#BB5BE7');

  return {
    primaryColor,  // 基础色
    primaryColorHover  // 悬停色
  }
}

export function useNaiveTheme(): {
  theme: Ref<GlobalTheme | null>,
  themeOverrides: ComputedRef<GlobalThemeOverrides>,
} {
  const theme = ref<GlobalTheme | null>(null);
  const { onThemeChange, isDark } = useThemeMode();
  const { primaryColor, primaryColorHover } = _usePrimaryColor();
  const popoverColor = computed(() => isDark.value ? getCSSVariable('--bubble-others') : getCSSVariable('--bubble-others'));
  const themeOverrides: ComputedRef<GlobalThemeOverrides> = computed(() => ({
    common: {
      primaryColor: primaryColor.value,
      primaryColorHover: primaryColorHover.value,
      popoverColor: popoverColor.value,   // 气泡背景色
    },
    Switch: {
      railColorActive: primaryColor.value,  // switch激活态的轨道色，和主题色做统一
    }
  }));

//   初始化
  window.api.isDarkTheme().then(res=> theme.value = res ? darkTheme : lightTheme);
// 切换主题
  onThemeChange(()=> theme.value = isDark.value ? darkTheme : lightTheme);

  return {
    theme,
    themeOverrides,
  }
}

export default useNaiveTheme;
```

## native-ui 国际化语言
写了一个钩子，适配全局的 native-ui 语言：
```ts
// hooks/useNaiveLocale.ts

import { zhCN, enUS, dateZhCN, dateEnUS } from 'naive-ui';
import i18n from '../i18n';

export function useNaiveLocale() {
  const locale = computed(() => i18n.global.locale === 'zh' ? zhCN : enUS);
  const dateLocale = computed(() => i18n.global.locale === 'zh' ? dateZhCN : dateEnUS);

  return {
    locale,
    dateLocale,
  }
}

export default useNaiveLocale;
```

## 全局联动
 - 在 app、setting、dialog 中，都使 n-config-provider 适配 config 的所有钩子。
 - 在 navbar 中，设置了对话图标的 active 状态。
```html
<script>
// 联动useConfig
useFontSize();
const { locale, dateLocale } = useNaiveLocale();
const { theme, themeOverrides } = useNaiveTheme();

</script>

<n-config-provider 
  :locale="locale" :date-locale="dateLocale"
  :theme="theme" :theme-overrides="themeOverrides">
```
```html
<!-- navbar.vue -->

<li :class="{'active':route.name === 'conversation'}">
    <native-tooltip :content="t('main.sidebar.conversations')">
        <iconify-icon icon="material-symbols:chat-outline" width="24"height="24">
    </native-tooltip>
</li>


<style scoped>

nav li.active {
  color: var(--primary-color);
}
</style>
```