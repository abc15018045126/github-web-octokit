import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

async function generateImages() {
    try {
        const logoPath = 'logo-64x64@2x.png';
        const targetDir = 'fastlane/metadata/android/en-US/images/';

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        console.log('Reading source logo...');
        const logo = await Jimp.read(logoPath);

        // 1. Generate icon.png (512x512)
        console.log('Generating 512x512 icon.png...');
        const icon = new Jimp({ width: 512, height: 512, color: 0x00000000 });
        const iconLogoSize = Math.floor(512 * 0.8);
        const resizedLogoForIcon = logo.clone().resize({ w: iconLogoSize, h: iconLogoSize });
        icon.composite(resizedLogoForIcon, (512 - iconLogoSize) / 2, (512 - iconLogoSize) / 2);
        await icon.write(path.join(targetDir, 'icon.png'));

        // 2. Generate featureGraphic.png (1024x500)
        console.log('Generating 1024x500 featureGraphic.png...');
        // Using a dark background #0d1117 (GitHub dark)
        const featureGraphic = new Jimp({ width: 1024, height: 500, color: 0x0d1117ff });
        const featureLogoSize = 250;
        const resizedLogoForFeature = logo.clone().resize({ w: featureLogoSize, h: featureLogoSize });
        featureGraphic.composite(resizedLogoForFeature, (1024 - featureLogoSize) / 2, (500 - featureLogoSize) / 2);
        await featureGraphic.write(path.join(targetDir, 'featureGraphic.png'));

        console.log('Success! Images generated in ' + targetDir);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

generateImages();
