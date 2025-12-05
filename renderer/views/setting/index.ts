import '../../styles/index.css';
import 'vfonts/Lato.css';

import errorHandler from '../../utils/errorHandler';
import i18n from '../../i18n';
import TitleBar from '../../components/TitleBar.vue';
import DragRegion from '../../components/DragRegion.vue';

import Setting from './Index.vue';

createApp(Setting)
  .use(i18n)
  .use(createPinia())   // 和dialog的唯一区别，需要调用本地数据
  .use(errorHandler)
  .component('TitleBar', TitleBar)
  .component('DragRegion', DragRegion)
  .mount('#app')