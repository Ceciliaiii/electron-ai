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