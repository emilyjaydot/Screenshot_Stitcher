import React from 'react';
import { type UploadedFile } from '../types';
import { DeleteIcon, GripVerticalIcon } from './Icons';

interface ImagePreviewProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  dragItem: React.MutableRefObject<number | null>;
  dragOverItem: React.MutableRefObject<number | null>;
  onDragSort: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ files, onRemove, dragItem, dragOverItem, onDragSort }) => {
  return (
    <div className="w-full">
      <div className="text-left w-full mb-4">
        <h3 className="text-lg font-semibold text-gray-300">Arrange Screenshots: Top to Bottom</h3>
        <p className="text-sm text-gray-400">Drag to reorder. Image #1 will be at the top of the final picture.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="group relative aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={() => (dragItem.current = index)}
            onDragEnter={() => (dragOverItem.current = index)}
            onDragEnd={onDragSort}
            onDragOver={(e) => e.preventDefault()}
          >
            <img src={file.previewUrl} alt={file.file.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
               <span className="absolute top-2 left-2 text-white bg-black/50 rounded-full h-8 w-8 flex items-center justify-center font-bold text-lg">
                {index + 1}
              </span>
              <button
                onClick={() => onRemove(file.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                aria-label="Remove image"
              >
                <DeleteIcon />
              </button>
              <GripVerticalIcon className="text-white h-8 w-8 opacity-70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagePreview;