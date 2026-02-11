
export async function bundleFiles(files: Record<string, string>): Promise<string> {
    // Safer injection using Base64 to avoid escaping issues in script tags
    const filesJson = JSON.stringify(files);
    const filesBase64 = btoa(unescape(encodeURIComponent(filesJson)));

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { margin: 0; padding: 0; background: #fff; font-family: system-ui, -apple-system, sans-serif; }
        #root { width: 100vw; height: 100vh; overflow: hidden; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; color: #666; }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">Loading preview...</div>
    </div>
    
    <!-- Loader Script -->
    <script>
        window.process = { env: { NODE_ENV: 'development' } };
        
        // Decode files
        const filesBase64 = "${filesBase64}";
        const files = JSON.parse(decodeURIComponent(escape(atob(filesBase64))));
        
        // Simple module loader
        const modules = {};
        
        // We will transform code on the fly
    </script>

    <script type="module">
        const importMap = { 
            imports: { 
                "react": "https://esm.sh/react@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "lucide-react": "https://esm.sh/lucide-react@0.263.1",
                "recharts": "https://esm.sh/recharts@2.12.0"
            }
        };

        async function compileFile(path, content) {
            try {
                // Determine presets based on extension
                const isTs = path.endsWith('.ts') || path.endsWith('.tsx');
                const isReact = path.endsWith('.tsx') || path.endsWith('.jsx');
                
                const presets = ['env'];
                if (isReact) presets.push('react');
                if (isTs) presets.push('typescript');

                const { code } = Babel.transform(content, {
                    presets: presets,
                    filename: path,
                    retainLines: true
                });
                return code;
            } catch (e) {
                console.error('Babel compilation error in ' + path, e);
                throw e;
            }
        }

        async function init() {
            const fileBlobs = {};
            
            // 1. Compile all files to Blob URLs
            for (const [path, content] of Object.entries(files)) {
                if (path.endsWith('.css')) {
                    const style = document.createElement('style');
                    style.textContent = content;
                    document.head.appendChild(style);
                    continue;
                }

                if (path.endsWith('.json')) {
                    // JSON handling if needed
                    continue;
                }

                try {
                    const compiledCode = await compileFile(path, content);
                    const blob = new Blob([compiledCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    // Normalize path for import map
                    // ./App.tsx -> ./App
                    const key = path.replace(/^\\.\\//, '');
                    const keyNoExt = key.replace(/\\.(tsx|ts|js|jsx)$/, '');
                    
                    importMap.imports['./' + key] = url;
                    importMap.imports['./' + keyNoExt] = url;
                    importMap.imports['@/' + key] = url;
                    importMap.imports['@/' + keyNoExt] = url;
                    
                    fileBlobs[key] = url;
                } catch (e) {
                    console.error('Failed to compile ' + path);
                }
            }

            // 2. Inject Import Map
            const im = document.createElement('script');
            im.type = 'importmap';
            im.textContent = JSON.stringify(importMap);
            document.head.appendChild(im);

            // 3. Load Entry Point
            // Try standard entry points
            const entryPoints = ['index.tsx', 'main.tsx', 'index.js', 'main.js', 'App.tsx'];
            let entry = entryPoints.find(e => files[e]);
            
            if (entry) {
                const entryKey = entry.replace(/\\.(tsx|ts|js|jsx)$/, '');
                // We use the mapped URL
                const entryUrl = importMap.imports['./' + entryKey];
                if (entryUrl) {
                    import(entryUrl).catch(e => {
                        console.error('Runtime error:', e);
                        document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;">Runtime Error: ' + e.message + '</div>';
                    });
                }
            } else {
                document.getElementById('root').innerHTML = 'No entry point found (index.tsx/main.tsx)';
            }
        }

        init();
    </script>
</body>
</html>
    `;
}
