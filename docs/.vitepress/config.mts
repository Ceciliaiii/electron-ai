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
      { text: '应用下载', link: 'https://vitepress.dev/reference/default-theme-home-page' }
    ],
    search: {
      provider: 'local',
    },
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
          { text: '15. sort & search', link: '/15-实现排序与搜索' },
          { text: '16. title重命名 & list批量操作', link: '/16-reTitle&listOperation' },
          { text: '17. 多窗口 Service', link: '/17-多窗口逻辑' },
          { text: '18. Dialog 窗口', link: '/18-dialog窗口' },
          { text: '19. 遮罩层 & 动态置顶', link: '/19-遮罩层&动态置顶' },
          { text: '20. 对话详情布局', link: '/20-main-layout' },
          { text: '21. message列表搭建', link: '/21-messageList' },
          { text: '22. message存储与更新', link: '/22-messageStore' },
          { text: '23. 主进程接入大模型', link: '/23-接入大模型' },
          { text: '24. 渲染进程接入大模型', link: '/24-第一次对话' },
          { text: '25. 输入框草稿 & 按钮状态', link: '/25-messageInput' },
          { text: '26. 时间格式化 & 自动滚底', link: '/26-timeFormate & scrollBottom' },
          { text: '27. MessageRender完善', link: '/27-messageRender完善' },
          { text: '28. markdown排版 & 代码高亮', link: '/28-md排版&代码高亮' },
          { text: '29. （遗漏）同步对话列表数据', link: '/29-对话列表初始化' },
          { text: '30. 消息项的菜单实现', link: '/30-msgMenu' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ceciliaiii/electron-ai' }
    ]
  }
})
