const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

function downloadZip() {
    const folderToZip = path.join(__dirname, 'output');
    const zipFilePath = path.join(__dirname, 'output.zip');
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    console.log(`✅ Zip ${archive.pointer()} bytes`);

    output.on('close', () => {
        console.log(`✅ Zipped ${archive.pointer()} bytes`);
        console.log(`📦 Zip file created: ${zipFilePath}`);
    });

    archive.on('error', err => {
        throw err;
    });

    archive.pipe(output);
    archive.directory(folderToZip, false); // Set to 'output' to include folder name in zip
    archive.finalize();
}

// Run the function
downloadZip();
