const Jimp = require('jimp');
const path = require('path');

async function fixLogo() {
    try {
        console.log('正在读取原始 Logo...');
        const logo = await Jimp.read('logo-64x64@2x.png');

        // Android 自适应图标标准：全图 108单位，安全区中间 66单位
        // 我们以 512px 为基准画布
        const CANVAS_SIZE = 512;
        // 核心 Logo 占比控制在 70% 左右（比标准的 61% 略大一点点，达到“不小”的效果，但避开剪裁）
        const LOGO_TARGET_SIZE = Math.floor(CANVAS_SIZE * 0.70);

        console.log(`正在调整 Logo 大小至 ${LOGO_TARGET_SIZE}px...`);
        logo.resize(LOGO_TARGET_SIZE, LOGO_TARGET_SIZE);

        // 创建透明画布
        const canvas = new Jimp(CANVAS_SIZE, CANVAS_SIZE, 0x00000000);

        // 居中合成
        const x = (CANVAS_SIZE - LOGO_TARGET_SIZE) / 2;
        const y = (CANVAS_SIZE - LOGO_TARGET_SIZE) / 2;
        canvas.composite(logo, x, y);

        // 保存处理后的结果
        const outputPath = 'android_foreground_fixed.png';
        await canvas.writeAsync(outputPath);
        console.log(`处理完成！已保存至: ${outputPath}`);

        // 自动分发到 Android 资源目录
        const resPath = path.join('android', 'app', 'src', 'main', 'res');
        const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

        for (const d of densities) {
            const dest = path.join(resPath, `mipmap-${d}`, 'ic_launcher_foreground.png');
            await canvas.clone().resize(
                d === 'mdpi' ? 108 : d === 'hdpi' ? 162 : d === 'xhdpi' ? 216 : d === 'xxhdpi' ? 324 : 432,
                Jimp.AUTO
            ).writeAsync(dest);
            console.log(`已更新: ${dest}`);
        }

    } catch (err) {
        console.error('处理失败:', err);
    }
}

fixLogo();
