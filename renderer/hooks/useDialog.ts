export function useDialog() {
  const isDarkMode = usePreferredDark();

  const createDialog = (opts: CreateDialogProps) => {
    const overlay = document.createElement('div');
    const isModal = opts.isModal !== false;   // 默认展示遮罩层

    // 遮罩层样式
    overlay.classList.add('dialog-overlay');
    // 根据明暗，设置不同的bg-color
    watchEffect(() => overlay.style.backgroundColor = isDarkMode.value
      ? 'rgba(0, 0, 0, 0.6)'
      : 'rgba(255, 255, 255, 0.6)'
    );

    return new Promise<string>((resolve) => {

      // dialog交互后触发
      window.api.createDialog(opts).then(res => {
        resolve(res);
        if (!isModal) return;    // 没有遮罩层直接返回
        document.body.removeChild(overlay);   // 移除dom元素
        overlay?.classList?.remove('show');
      });

      // dialog创建后触发
      if (!isModal) return;
      document.body.appendChild(overlay);
      setTimeout(() => overlay.classList.add('show'), 10);
    });
  }
  return { createDialog }
}

export default useDialog;