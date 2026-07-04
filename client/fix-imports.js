import fs from 'fs';
import path from 'path';

function replaceImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceImports(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let orig = content;
            
            // Replaces ['"]../../components/Foo['"] with ['"]@/components/Foo['"]
            // Matches any combination of ../ or ./ preceding specific root folders
            content = content.replace(/(['"])(\.\.\/|\.\/)+(contexts|services|components|pages)(\/.*?)(['"])/g, "$1@/$3$4$5");
            
            if (content !== orig) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

replaceImports(path.join(process.cwd(), 'src'));
console.log('Done!');
