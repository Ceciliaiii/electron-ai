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
      { text: '开始', link: '/项目初始化' },
      // { text: '使用示例', link: '/项目初始化' }
    ],

    sidebar: [
      {
        text: 'elctron-ai开发文档',
        items: [
          { text: '1. 项目初始化', link: '/1-项目初始化' },
          { text: '2. 目录扁平化', link: '/2-目录扁平化' },
          { text: '3. 国际化', link: '/3-国际化' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ceciliaiii/electron-ai' }
    ]
  }
})
