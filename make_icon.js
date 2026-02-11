import Jimp from 'jimp';
import path from 'path';

/**
 * Android 适配设置
 * ADAPTIVE_SIZE: Android 要求的 108dp 标准对应的像素基准
 * TARGET_PERCENT: Logo 在 108dp 中占据的比例。
 * 经测试：0.61 是安全区，0.72 是视觉最饱满且不被切的平衡点。
 */
const CONFIG = {
    canvasSize: 512,
    logoRatio: 0.72
};

async function createAndroidIcon() {
    try {
        console.log('读取原始图片...');
        const logo = await Jimp.read('logo-64x64@2x.png');

        console.log('创建透明适配层...');
        const canvas = new Jimp(CONFIG.canvasSize, CONFIG.canvasSize, 0x00000000);

        const targetSize = Math.floor(CONFIG.canvasSize * CONFIG.logoRatio);
        logo.resize(targetSize, targetSize);

        const offset = (CONFIG.canvasSize - targetSize) / 2;
        canvas.composite(logo, offset, offset);

        // 分发到 Android 目录
        const resPath = 'android/app/src/main/res';
        const densityMap = {
            'mdpi': 108,
            'hdpi': 162,
            'xhdpi': 216,
            'xxhdpi': 324,
            'xxxhdpi': 432
        };

        for (const [name, size] of Object.entries(densityMap)) {
            const outPath = path.join(resPath, `mipmap-${name}`, 'ic_launcher_foreground.png');
            await canvas.clone().resize(size, size).writeAsync(outPath);
            console.log(`已成功生成: ${outPath}`);
        }

    } catch (err) {
        console.error('执行失败:', err);
    }
}

createAndroidIcon();
