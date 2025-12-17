import DefaultTheme from 'vitepress/theme-without-fonts'
import ThemeLayout from '../components/Layout.vue'

import './custom.css'
import './myFont.css'

export default {
  extends: DefaultTheme,
  // 使用注入插槽的包装组件覆盖 Layout
  Layout: ThemeLayout
}