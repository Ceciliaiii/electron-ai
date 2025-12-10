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