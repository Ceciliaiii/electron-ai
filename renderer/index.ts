/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './styles/index.css';
import 'vfonts/Lato.css'

import { createApp, type Plugin } from 'vue';
import i18n from './i18n';
import App from './App.vue';
import errorHandler from './utils/errorHandler';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia } from 'pinia';

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
            component: () => import ('./views/Index.vue')
        }
    ]
})

// 注册pinia
const pinia = createPinia();


createApp(App).use(pinia).use(router).use(components).use(i18n).use(errorHandler).mount('#app');
