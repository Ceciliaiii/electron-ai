import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "electron-ai",
  description: "AI聊天工具开发文档",
  base: '/electron-ai/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: '开始', link: '/1-项目初始化' },
      // { text: '使用示例', link: '/项目初始化' }
    ],

    sidebar: [
      {
        text: 'elctron-ai开发文档',
        items: [
          { text: '1. 项目初始化', link: '/1-项目初始化' },
          { text: '2. 目录扁平化', link: '/2-目录扁平化' },
          { text: '3. 国际化', link: '/3-国际化' },
          { text: '4. 自定义标题栏', link: '/4-自定义标题栏' },
          { text: '5. 日志管理', link: '/5-日志管理' },
          { text: '6. css主题 & 首页布局', link: '/6-css主题&首页布局' },
          { text: '7. 主题切换', link: '/7-主题切换' },
          { text: '8. 优化与提示框', link: '/8-优化与提示框' },
          { text: '9. 对话列表', link: '/9-对话列表' },
          { text: '10. 对话标题溢出', link: '/10-对话标题溢出' },
          { text: '11. 菜单服务', link: '/11-菜单服务' },
          { text: '12. 菜单功能', link: '/12-菜单功能' },
          { text: '13. 对话列表操作', link: '/13-对话list操作' },
          { text: '14. Message初始化', link: '/14-message初始化' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ceciliaiii/electron-ai' }
    ]
  }
})
