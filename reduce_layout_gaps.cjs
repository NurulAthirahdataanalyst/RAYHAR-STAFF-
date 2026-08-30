const fs = require('fs');
const path = require('path');

// 1. Update AppLayout
let appLayoutPath = 'src/components/layout/AppLayout.tsx';
if (fs.existsSync(appLayoutPath)) {
    let content = fs.readFileSync(appLayoutPath, 'utf8');
    content = content.replace(
        /className="relative p-4 sm:p-6 lg:p-8 max-w-\[1500px\] mx-auto/g,
        'className="relative p-4 sm:p-4 lg:p-5 w-full mx-auto'
    );
    fs.writeFileSync(appLayoutPath, content);
    console.log("Updated AppLayout.tsx");
}

// 2. Remove max-w-7xl, mx-auto, and extra px- from all pages
function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            if (filePath.endsWith('.tsx')) {
                callback(filePath);
            }
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync('src/pages', (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remove max-w-7xl mx-auto
    content = content.replace(/max-w-7xl mx-auto /g, 'w-full ');
    content = content.replace(/max-w-7xl mx-auto/g, 'w-full');
    
    // Also remove the extra px-4 sm:px-6 lg:px-8 from the main container if it was with max-w-7xl
    // The safest way is to target the specific combinations we know exist.
    content = content.replace(/w-full px-4 sm:px-6 lg:px-8/g, 'w-full');
    content = content.replace(/w-full px-4/g, 'w-full');
    content = content.replace(/w-full px-2 sm:px-4/g, 'w-full');
    content = content.replace(/w-full px-1 sm:px-4/g, 'w-full');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
});
