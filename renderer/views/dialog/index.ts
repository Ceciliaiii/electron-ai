import '../../styles/index.css'
import 'vfonts/Lato.css'

import errorHandler from '../../utils/errorHandler'

import i18n from '../../i18n'
import TitleBar from '../../components/TitleBar.vue'
import DragRegion from '../../components/DragRegion.vue'
import Dialog from './Index.vue'

createApp(Dialog)
    .use(i18n)
    .use(errorHandler)
    .component('TitleBar', TitleBar)
    .component('DragRegion', DragRegion)
    .mount('#app')