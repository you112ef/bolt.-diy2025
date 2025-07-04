import JSZip from 'jszip';
import { createScopedLogger } from '~/utils/logger';
import { generateId } from '~/utils/fileUtils';

const logger = createScopedLogger('ProjectManager');

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'react' | 'nextjs' | 'vue' | 'svelte' | 'vanilla' | 'node' | 'python';
  files: ProjectFile[];
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  preview?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file' | 'folder';
  size?: number;
}

export interface GitHubRepository {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

export interface ProjectImportResult {
  success: boolean;
  projectId: string;
  files: ProjectFile[];
  errors?: string[];
  message?: string;
}

export interface ProjectExportOptions {
  format: 'zip' | 'github' | 'netlify' | 'vercel';
  includeNodeModules?: boolean;
  includeGitHistory?: boolean;
  minify?: boolean;
}

export class ProjectManager {
  private static _instance: ProjectManager;
  private _projects: Map<string, ProjectTemplate> = new Map();

  private constructor() {
    this._initializeTemplates();
  }

  static getInstance(): ProjectManager {
    if (!ProjectManager._instance) {
      ProjectManager._instance = new ProjectManager();
    }
    return ProjectManager._instance;
  }

  // Project Templates
  private _initializeTemplates(): void {
    const templates: ProjectTemplate[] = [
      {
        id: 'react-typescript',
        name: 'React + TypeScript',
        description: 'Modern React application with TypeScript, Vite, and Tailwind CSS',
        category: 'react',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'react-typescript-app',
              version: '0.1.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview'
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0'
              },
              devDependencies: {
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                '@vitejs/plugin-react': '^4.0.0',
                typescript: '^5.0.0',
                vite: '^4.4.0',
                tailwindcss: '^3.3.0',
                autoprefixer: '^10.4.0',
                postcss: '^8.4.0'
              }
            }, null, 2)
          },
          {
            path: 'src/App.tsx',
            type: 'file',
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to React + TypeScript
        </h1>
        <p className="text-violet-200 text-lg">
          Built with Vite and Tailwind CSS
        </p>
        <div className="mt-8">
          <button className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-lg transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;`
          },
          {
            path: 'src/main.tsx',
            type: 'file',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`
          },
          {
            path: 'src/index.css',
            type: 'file',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`
          },
          {
            path: 'index.html',
            type: 'file',
            content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + TypeScript App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
          },
          {
            path: 'vite.config.ts',
            type: 'file',
            content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`
          },
          {
            path: 'tailwind.config.js',
            type: 'file',
            content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`
          }
        ]
      },
      {
        id: 'nextjs-app',
        name: 'Next.js App Router',
        description: 'Next.js 14 with App Router, TypeScript, and Tailwind CSS',
        category: 'nextjs',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'nextjs-app',
              version: '0.1.0',
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint'
              },
              dependencies: {
                next: '^14.0.0',
                react: '^18.2.0',
                'react-dom': '^18.2.0'
              },
              devDependencies: {
                '@types/node': '^20.0.0',
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                eslint: '^8.0.0',
                'eslint-config-next': '^14.0.0',
                typescript: '^5.0.0',
                tailwindcss: '^3.3.0',
                autoprefixer: '^10.4.0',
                postcss: '^8.4.0'
              }
            }, null, 2)
          },
          {
            path: 'app/page.tsx',
            type: 'file',
            content: `export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Next.js 14
        </h1>
        <p className="text-violet-200 text-lg mb-8">
          Built with App Router and Tailwind CSS
        </p>
        <button className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-lg transition-colors">
          Get Started
        </button>
      </div>
    </main>
  );
}`
          },
          {
            path: 'app/layout.tsx',
            type: 'file',
            content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Generated by Bolt SH',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`
          }
        ]
      }
    ];

    templates.forEach(template => {
      this._projects.set(template.id, template);
    });

    logger.info(`Initialized ${templates.length} project templates`);
  }

  // Template Management
  getTemplates(): ProjectTemplate[] {
    return Array.from(this._projects.values());
  }

  getTemplate(id: string): ProjectTemplate | undefined {
    return this._projects.get(id);
  }

  getTemplatesByCategory(category: string): ProjectTemplate[] {
    return Array.from(this._projects.values()).filter(t => t.category === category);
  }

  // Project Creation from Template
  createProjectFromTemplate(templateId: string, projectName: string): ProjectImportResult {
    const template = this._projects.get(templateId);
    if (!template) {
      return {
        success: false,
        projectId: '',
        files: [],
        errors: [`Template ${templateId} not found`]
      };
    }

    try {
      const projectId = generateId();
      const files = template.files.map(file => ({
        ...file,
        content: file.content.replace(/react-typescript-app|nextjs-app/g, projectName)
      }));

      logger.info(`Created project ${projectName} from template ${templateId}`);

      return {
        success: true,
        projectId,
        files,
        message: `Project ${projectName} created successfully`
      };
    } catch (error: any) {
      logger.error('Error creating project from template:', error);
      return {
        success: false,
        projectId: '',
        files: [],
        errors: [error.message]
      };
    }
  }

  // GitHub Repository Import
  async importFromGitHub(repo: GitHubRepository): Promise<ProjectImportResult> {
    try {
      const { owner, repo: repoName, branch = 'main', path = '' } = repo;
      const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`;

      logger.info(`Importing from GitHub: ${owner}/${repoName}${path ? `/${path}` : ''}`);

      const files = await this._fetchGitHubContents(apiUrl, '');
      const projectId = generateId();

      return {
        success: true,
        projectId,
        files,
        message: `Successfully imported from ${owner}/${repoName}`
      };
    } catch (error: any) {
      logger.error('Error importing from GitHub:', error);
      return {
        success: false,
        projectId: '',
        files: [],
        errors: [error.message]
      };
    }
  }

  private async _fetchGitHubContents(url: string, basePath: string): Promise<ProjectFile[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const contents = await response.json();
    const files: ProjectFile[] = [];

    for (const item of contents) {
      const fullPath = basePath ? `${basePath}/${item.name}` : item.name;

      if (item.type === 'file') {
        // Fetch file content
        const contentResponse = await fetch(item.download_url);
        const content = await contentResponse.text();

        files.push({
          path: fullPath,
          content,
          type: 'file',
          size: item.size
        });
      } else if (item.type === 'dir') {
        // Recursively fetch directory contents
        const subFiles = await this._fetchGitHubContents(item.url, fullPath);
        files.push(...subFiles);
      }
    }

    return files;
  }

  // ZIP File Import
  async importFromZip(zipFile: File): Promise<ProjectImportResult> {
    try {
      logger.info(`Importing ZIP file: ${zipFile.name}`);

      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      const files: ProjectFile[] = [];

      for (const [path, zipEntry] of Object.entries(zipData.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('text');
          files.push({
            path: path.startsWith('/') ? path.slice(1) : path,
            content,
            type: 'file'
          });
        }
      }

      const projectId = generateId();

      return {
        success: true,
        projectId,
        files,
        message: `Successfully imported ${files.length} files from ZIP`
      };
    } catch (error: any) {
      logger.error('Error importing ZIP file:', error);
      return {
        success: false,
        projectId: '',
        files: [],
        errors: [error.message]
      };
    }
  }

  // Website Clone (Convert to React/Next.js)
  async cloneWebsite(url: string, framework: 'react' | 'nextjs' = 'react'): Promise<ProjectImportResult> {
    try {
      logger.info(`Cloning website: ${url} to ${framework}`);

      // In a real implementation, you would:
      // 1. Fetch the HTML content
      // 2. Parse CSS and JavaScript
      // 3. Convert to React/Next.js components
      // 4. Generate appropriate file structure

      // For now, return a basic template
      const template = framework === 'nextjs' ? 'nextjs-app' : 'react-typescript';
      return this.createProjectFromTemplate(template, 'cloned-website');
    } catch (error: any) {
      logger.error('Error cloning website:', error);
      return {
        success: false,
        projectId: '',
        files: [],
        errors: [error.message]
      };
    }
  }

  // Project Export
  async exportProject(files: ProjectFile[], options: ProjectExportOptions): Promise<Blob> {
    const { format, includeNodeModules = false, minify = false } = options;

    if (format === 'zip') {
      return this._exportAsZip(files, includeNodeModules, minify);
    }

    throw new Error(`Export format ${format} not implemented yet`);
  }

  private async _exportAsZip(files: ProjectFile[], includeNodeModules: boolean, minify: boolean): Promise<Blob> {
    const zip = new JSZip();

    for (const file of files) {
      if (!includeNodeModules && file.path.includes('node_modules/')) {
        continue;
      }

      let content = file.content;
      
      // Basic minification for JS/CSS files
      if (minify && (file.path.endsWith('.js') || file.path.endsWith('.css'))) {
        content = content.replace(/\s+/g, ' ').trim();
      }

      zip.file(file.path, content);
    }

    return zip.generateAsync({ type: 'blob' });
  }

  // Deployment helpers
  async deployToNetlify(files: ProjectFile[], siteId?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    // Implementation would integrate with Netlify API
    logger.info('Netlify deployment not implemented yet');
    return { success: false, error: 'Netlify deployment not implemented' };
  }

  async deployToVercel(files: ProjectFile[], projectId?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    // Implementation would integrate with Vercel API
    logger.info('Vercel deployment not implemented yet');
    return { success: false, error: 'Vercel deployment not implemented' };
  }

  // File Analysis
  analyzeProject(files: ProjectFile[]): {
    framework: string;
    dependencies: string[];
    fileTypes: Record<string, number>;
    totalSize: number;
  } {
    const analysis = {
      framework: 'unknown',
      dependencies: [] as string[],
      fileTypes: {} as Record<string, number>,
      totalSize: 0
    };

    for (const file of files) {
      // Count file types
      const extension = file.path.split('.').pop()?.toLowerCase() || 'unknown';
      analysis.fileTypes[extension] = (analysis.fileTypes[extension] || 0) + 1;
      analysis.totalSize += file.size || file.content.length;

      // Detect framework
      if (file.path === 'package.json') {
        try {
          const packageJson = JSON.parse(file.content);
          if (packageJson.dependencies?.next) {
            analysis.framework = 'Next.js';
          } else if (packageJson.dependencies?.react) {
            analysis.framework = 'React';
          } else if (packageJson.dependencies?.vue) {
            analysis.framework = 'Vue.js';
          } else if (packageJson.dependencies?.svelte) {
            analysis.framework = 'Svelte';
          }
          
          analysis.dependencies = Object.keys(packageJson.dependencies || {});
        } catch (e) {
          // Invalid package.json
        }
      }
    }

    return analysis;
  }
}

// Export singleton instance
export const projectManager = ProjectManager.getInstance();