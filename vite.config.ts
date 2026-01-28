import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    plugins: [react()],
    build: isLib ? {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'GitHubWebOctokit',
        fileName: (format) => `github-web-octokit.${format}.js`,
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'octokit', 'lucide-react', 'framer-motion'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            octokit: 'Octokit',
            'lucide-react': 'LucideReact',
            'framer-motion': 'FramerMotion',
          },
        },
      },
      outDir: 'dist/lib'
    } : {
      outDir: 'dist'
    }
  }
})
