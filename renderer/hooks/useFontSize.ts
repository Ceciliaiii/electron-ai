import { CONFIG_KEYS } from '../../common/constants';
import { useConfig } from './useConfig';

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