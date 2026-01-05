/**
 * rem 适配工具
 * 支持 PC 和移动端自适应
 */

// 设计稿宽度
const DESIGN_WIDTH = 1920; // PC 设计稿宽度
const MOBILE_DESIGN_WIDTH = 375; // 移动端设计稿宽度
const MOBILE_BREAKPOINT = 768; // 移动端断点

// 基准字体大小
const BASE_FONT_SIZE = 16;

/**
 * 设置 rem 基准值
 */
export const setRemUnit = (): void => {
  const docEl = document.documentElement;
  const clientWidth = docEl.clientWidth;
  
  let fontSize: number;
  
  if (clientWidth <= MOBILE_BREAKPOINT) {
    // 移动端适配
    fontSize = (clientWidth / MOBILE_DESIGN_WIDTH) * BASE_FONT_SIZE;
    // 限制最小和最大字体
    fontSize = Math.max(12, Math.min(fontSize, 20));
  } else {
    // PC 端适配
    fontSize = (clientWidth / DESIGN_WIDTH) * BASE_FONT_SIZE;
    // 限制最小和最大字体
    fontSize = Math.max(12, Math.min(fontSize, 18));
  }
  
  docEl.style.fontSize = `${fontSize}px`;
};

/**
 * px 转 rem
 */
export const pxToRem = (px: number): string => {
  return `${px / BASE_FONT_SIZE}rem`;
};

/**
 * 初始化 rem 适配
 */
export const initRemAdapter = (): void => {
  setRemUnit();
  
  // 监听窗口变化
  window.addEventListener('resize', setRemUnit);
  window.addEventListener('orientationchange', setRemUnit);
};

/**
 * 判断是否为移动端
 */
export const isMobile = (): boolean => {
  return document.documentElement.clientWidth <= MOBILE_BREAKPOINT;
};
