import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react'; import {fileURLToPath} from 'node:url'; import path from 'node:path';
const clientRoot=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({root:clientRoot,plugins:[react()],server:{port:5173,proxy:{'/api':'http://localhost:4000','/art':'http://localhost:4000'}},build:{outDir:path.join(clientRoot,'dist'),emptyOutDir:true}});
