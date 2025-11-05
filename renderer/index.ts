import './styles/index.css';
import 'vfonts/Lato.css';

import { createApp, type Plugin } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia } from 'pinia';
import i18n from './i18n';
import errorHandler from './utils/errorHandler';
import App from '../renderer/App.vue';

import TitleBar from './components/TitleBar.vue';
import DragRegion from './components/DragRegion.vue';


// 直接注册到vue实例上，不需要在script语块引入这俩组件
const components: Plugin = function (app: any) {
  app.component('TitleBar', TitleBar);
  app.component('DragRegion', DragRegion);
}

// 注册vue-router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/Index.vue'),
      children: [
        {
          path: '/',
          redirect: 'conversation'
        },
        {
          name: 'conversation',
          path: 'conversation/:id?',   // url传对话项id
          component: () => import('./views/conversation.vue')
        }
      ]
    },
  ],
})

// 注册pinia
const pinia = createPinia();


createApp(App).use(pinia).use(router).use(components).use(i18n).use(errorHandler).mount('#app');
