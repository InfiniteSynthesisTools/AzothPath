/**
 * Emoji 字体加载监控工具
 * 用于检测 Noto Color Emoji 字体是否成功从 CDN 加载
 */

export class EmojiFontMonitor {
  private fontName = 'Noto Color Emoji';
  private fallbackFonts = ['Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'];
  
  /**
   * 检查字体是否已加载
   */
  async checkFontLoaded(): Promise<boolean> {
    if (!document.fonts) {
      console.warn('⚠️ 浏览器不支持 Font Loading API');
      return false;
    }

    try {
      // 等待字体加载完成（最多 3 秒）
      await document.fonts.ready;
      
      // 检查 Noto Color Emoji 是否在已加载字体列表中
      const fontFaces = Array.from(document.fonts.values());
      const notoEmoji = fontFaces.find(font => 
        font.family.includes(this.fontName) && font.status === 'loaded'
      );

      if (notoEmoji) {
        console.log('✅ Noto Color Emoji 字体加载成功（来自 CDN）');
        return true;
      } else {
        console.warn('⚠️ Noto Color Emoji 字体未加载，使用系统字体回退');
        this.detectSystemFont();
        return false;
      }
    } catch (error) {
      console.error('❌ 字体加载检测失败:', error);
      return false;
    }
  }

  /**
   * 检测当前使用的系统字体
   */
  private detectSystemFont() {
    const testElement = document.createElement('span');
    testElement.textContent = '🔥';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    document.body.appendChild(testElement);

    const computedStyle = window.getComputedStyle(testElement);
    const fontFamily = computedStyle.fontFamily;

    // 清理测试元素
    document.body.removeChild(testElement);

    // 分析使用的字体
    for (const fallback of this.fallbackFonts) {
      if (fontFamily.includes(fallback)) {
        console.log(`🔄 当前使用系统字体: ${fallback}`);
        return fallback;
      }
    }

    console.log(`🔄 当前使用字体: ${fontFamily}`);
    return fontFamily;
  }

  /**
   * 监控字体加载性能
   */
  async monitorPerformance() {
    if (!('fonts' in document)) return;

    const startTime = performance.now();

    try {
      await document.fonts.ready;
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);

      console.log(`⏱️ 字体加载耗时: ${loadTime}ms`);

      // 如果加载时间超过 2 秒，提示可能的网络问题
      if (loadTime > 2000) {
        console.warn('⚠️ 字体加载较慢，可能 CDN 访问受限');
      }
    } catch (error) {
      console.error('❌ 字体加载性能监控失败:', error);
    }
  }

  /**
   * 获取字体加载状态报告
   */
  async getReport(): Promise<{
    cdnLoaded: boolean;
    currentFont: string;
    loadTime: number;
  }> {
    const startTime = performance.now();
    const cdnLoaded = await this.checkFontLoaded();
    const endTime = performance.now();

    return {
      cdnLoaded,
      currentFont: this.detectSystemFont(),
      loadTime: Math.round(endTime - startTime)
    };
  }
}

// 导出单例实例
export const emojiFontMonitor = new EmojiFontMonitor();

// 在开发环境下自动运行监控
if (process.env.NODE_ENV === 'development') {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 开始检测 Emoji 字体加载状态...');
    await emojiFontMonitor.checkFontLoaded();
    await emojiFontMonitor.monitorPerformance();
  });
}
