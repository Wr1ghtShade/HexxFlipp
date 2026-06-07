import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

// Plugin pour convertir type="module" en classique script pour compatibilité double-clic (file:///)
const noAttrPlugin = () => {
  return {
    name: 'remove-module-attribute',
    transformIndexHtml(html: string) {
      return html.replace(/<script type="module" crossorigin>/g, '<script>');
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    noAttrPlugin()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
})
