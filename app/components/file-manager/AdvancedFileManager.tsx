import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  CodeBracketIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: Date;
  path: string;
  parent?: string;
  children?: FileSystemItem[];
  content?: string;
}

interface AdvancedFileManagerProps {
  className?: string;
  onFileSelect?: (file: FileSystemItem) => void;
  onFileCreate?: (file: FileSystemItem) => void;
  onFileDelete?: (fileId: string) => void;
  onFileUpload?: (files: File[]) => void;
}

export const AdvancedFileManager: React.FC<AdvancedFileManagerProps> = ({
  className = '',
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileUpload
}) => {
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPath, setCurrentPath] = useState('/');
  const [dragOver, setDragOver] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Initialize with sample data
  useEffect(() => {
    const sampleData: FileSystemItem[] = [
      {
        id: '1',
        name: 'src',
        type: 'folder',
        modified: new Date(),
        path: '/src',
        children: [
          {
            id: '2',
            name: 'App.tsx',
            type: 'file',
            size: 2048,
            modified: new Date(),
            path: '/src/App.tsx',
            parent: '1'
          },
          {
            id: '3',
            name: 'components',
            type: 'folder',
            modified: new Date(),
            path: '/src/components',
            parent: '1',
            children: []
          }
        ]
      },
      {
        id: '4',
        name: 'package.json',
        type: 'file',
        size: 1024,
        modified: new Date(),
        path: '/package.json'
      },
      {
        id: '5',
        name: 'README.md',
        type: 'file',
        size: 512,
        modified: new Date(),
        path: '/README.md'
      }
    ];
    setItems(sampleData);
  }, []);

  const getFileIcon = (item: FileSystemItem) => {
    if (item.type === 'folder') {
      return <FolderIcon className="w-5 h-5 text-violet-400" />;
    }
    
    const extension = item.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'tsx':
      case 'jsx':
      case 'ts':
      case 'js':
      case 'vue':
      case 'svelte':
        return <CodeBracketIcon className="w-5 h-5 text-blue-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
        return <PhotoIcon className="w-5 h-5 text-green-400" />;
      case 'mp4':
      case 'webm':
      case 'avi':
        return <VideoCameraIcon className="w-5 h-5 text-red-400" />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <MusicalNoteIcon className="w-5 h-5 text-purple-400" />;
      case 'zip':
      case 'tar':
      case 'gz':
        return <ArchiveBoxIcon className="w-5 h-5 text-orange-400" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-text-secondary" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleFileUpload = useCallback((files: File[]) => {
    const newItems: FileSystemItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36),
      name: file.name,
      type: 'file',
      size: file.size,
      modified: new Date(file.lastModified),
      path: `${currentPath}${file.name}`
    }));
    
    setItems(prev => [...prev, ...newItems]);
    onFileUpload?.(files);
  }, [currentPath, onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((item: FileSystemItem) => {
    if (item.type === 'file') {
      onFileSelect?.(item);
    } else {
      // Navigate into folder
      setCurrentPath(item.path);
    }
  }, [onFileSelect]);

  const handleCreateItem = (name: string, type: 'file' | 'folder') => {
    const newItem: FileSystemItem = {
      id: Math.random().toString(36),
      name,
      type,
      modified: new Date(),
      path: `${currentPath}${name}`,
      ...(type === 'folder' && { children: [] })
    };
    
    setItems(prev => [...prev, newItem]);
    onFileCreate?.(newItem);
    setShowCreateModal(false);
  };

  const handleDelete = useCallback((itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(prev => prev.filter(item => item.id !== itemId));
      onFileDelete?.(itemId);
    }
  }, [onFileDelete]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`bg-background-primary min-h-screen ${className}`}>
      <div className="night-card max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-text-main">File Manager</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                className="violet-input pl-9 w-64"
              />
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="violet-btn flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Upload
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="violet-btn flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-text-secondary mb-4">
          <button 
            onClick={() => setCurrentPath('/')}
            className="hover:text-violet-400 transition-colors"
          >
            Home
          </button>
          {currentPath.split('/').filter(Boolean).map((segment, index, array) => (
            <span key={index} className="flex items-center">
              <span className="mx-2">/</span>
              <button 
                onClick={() => setCurrentPath('/' + array.slice(0, index + 1).join('/'))}
                className="hover:text-violet-400 transition-colors"
              >
                {segment}
              </button>
            </span>
          ))}
        </nav>

        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-all ${
            dragOver 
              ? 'border-violet-400 bg-violet-500/10 violet-glow' 
              : 'border-background-border'
          }`}
        >
          <div className="text-center">
            <DocumentArrowDownIcon className="w-12 h-12 mx-auto text-text-secondary mb-4" />
            <p className="text-text-main font-medium">Drop files here to upload</p>
            <p className="text-text-secondary text-sm">or click the Upload button</p>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-2">
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`night-card hover:violet-glow transition-all cursor-pointer ${
                  selectedItems.has(item.id) ? 'border-violet-500' : ''
                }`}
                onClick={() => handleFileSelect(item)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(item)}
                    <div className="flex-1">
                      <h3 className="font-medium text-text-main">{item.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span>{item.type}</span>
                        <span>{formatFileSize(item.size)}</span>
                        <span>{item.modified.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-2 rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 mx-auto text-text-secondary mb-4" />
            <p className="text-text-secondary">No files found</p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFileUpload(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />

        {/* Create Modal */}
        {showCreateModal && (
          <CreateFileModal
            type={createType}
            onSubmit={handleCreateItem}
            onCancel={() => setShowCreateModal(false)}
            onTypeChange={setCreateType}
          />
        )}
      </div>
    </div>
  );
};

interface CreateFileModalProps {
  type: 'file' | 'folder';
  onSubmit: (name: string, type: 'file' | 'folder') => void;
  onCancel: () => void;
  onTypeChange: (type: 'file' | 'folder') => void;
}

const CreateFileModal: React.FC<CreateFileModalProps> = ({
  type,
  onSubmit,
  onCancel,
  onTypeChange
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), type);
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="night-card violet-glow max-w-md w-full mx-4"
      >
        <h3 className="text-lg font-semibold text-text-main mb-4">
          Create New {type === 'file' ? 'File' : 'Folder'}
        </h3>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => onTypeChange('file')}
            className={`px-4 py-2 rounded-md transition-colors ${
              type === 'file' 
                ? 'bg-violet-600 text-white' 
                : 'bg-background-border text-text-secondary hover:bg-background-input'
            }`}
          >
            File
          </button>
          <button
            onClick={() => onTypeChange('folder')}
            className={`px-4 py-2 rounded-md transition-colors ${
              type === 'folder' 
                ? 'bg-violet-600 text-white' 
                : 'bg-background-border text-text-secondary hover:bg-background-input'
            }`}
          >
            Folder
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              {type === 'file' ? 'File' : 'Folder'} Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="violet-input"
              placeholder={`Enter ${type} name...`}
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="violet-btn">
              Create {type === 'file' ? 'File' : 'Folder'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-background-border text-text-secondary hover:bg-background-input transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};