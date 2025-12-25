# ipc 事件方法
 - ipc.invoke 是双向通信，发送消息后，返回一个 promise，可以通过 promise 状态来判断是否成功获取返回值，例如 `getConfig`。  
 - handle 则是接收 invoke 传来的消息，并处理，例如传递返回值。  
 - send 和 on 都是单向通信，发送消息后，通知主进程更新数据，且渲染层数据订阅了主进程数据，固然不需要返回值。例如 `onConfigChange` 则使渲染层订阅了本地配置文件，通过 send 发送修改值通知主进程修改 config，主进程再更新本地配置文件，渲染层也实时更新配置数据；  
 - on 则只负责监听数据。
 - 渲染层所有发送的消息，都会在主进程的服务端的 `_setupIpcEvents` 获取到再进行处理（如传递返回值）；

 ```md
UI 按钮点击 → 
useWinManager（渲染进程）调用方法 → 
发送 IPC 请求 → 
WindowService（主进程）接收请求 → 
执行底层窗口操作 → 
同步状态回渲染进程 → 
UI 更新
 ```