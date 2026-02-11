import Jimp from 'jimp';
import path from 'path';

async function fixLogo() {
    try {
        console.log('正在读取原始 Logo...');
        const logo = await Jimp.read('logo-64x64@2x.png');

        const CANVAS_SIZE = 512;
        const LOGO_TARGET_SIZE = Math.floor(CANVAS_SIZE * 0.70);

        console.log(`正在调整 Logo 大小至 ${LOGO_TARGET_SIZE}px...`);
        logo.resize(LOGO_TARGET_SIZE, LOGO_TARGET_SIZE);

        const canvas = new Jimp(CANVAS_SIZE, CANVAS_SIZE, 0x00000000);
        const x = (CANVAS_SIZE - LOGO_TARGET_SIZE) / 2;
        const y = (CANVAS_SIZE - LOGO_TARGET_SIZE) / 2;
        canvas.composite(logo, x, y);

        const outputPath = 'android_foreground_fixed.png';
        await canvas.writeAsync(outputPath);
        console.log(`处理完成！已保存至: ${outputPath}`);

        const resPath = path.join('android', 'app', 'src', 'main', 'res');
        const densities = {
            'mdpi': 108,
            'hdpi': 162,
            'xhdpi': 216,
            'xxhdpi': 324,
            'xxxhdpi': 432
        };

        for (const [d, size] of Object.entries(densities)) {
            const dest = path.join(resPath, `mipmap-${d}`, 'ic_launcher_foreground.png');
            await canvas.clone().resize(size, size).writeAsync(dest);
            console.log(`已更新: ${dest}`);
        }

    } catch (err) {
        console.error('处理失败:', err);
    }
}

fixLogo();
