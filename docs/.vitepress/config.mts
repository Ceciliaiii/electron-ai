import { defineConfig } from 'vitepress'
import sideBar from '../sideBar'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "electron-ai",
  description: "AI聊天工具开发文档",
  base: '/electron-ai/',
  themeConfig: {
    logo: '/galigoyPress.png',
    siteTitle: 'Cecilia',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '开始', link: '/dev/1-项目初始化' },
      { text: '开发心得', link: '/learn/1-手搓的方法' },
      { text: '应用下载', link: 'https://github.com/Ceciliaiii/electron-ai/releases/' }
    ],
    search: {
      provider: 'local',
    },
    sidebar: sideBar,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ceciliaiii/electron-ai' }
    ]
  }
})
