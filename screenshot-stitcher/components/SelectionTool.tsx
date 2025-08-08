import React, { useState, useRef, useEffect } from 'react';
import { type CropArea } from '../types';
import { CropIcon } from './Icons';

interface SelectionToolProps {
  imageUrl: string;
  onComplete: (selection: CropArea | null) => void;
}

const SelectionTool: React.FC<SelectionToolProps> = ({ imageUrl, onComplete }) => {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<CropArea | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageScale, setImageScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        const { naturalWidth, width } = imageRef.current;
        if(width > 0) {
            setImageScale(naturalWidth / width);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, width } = imageRef.current;
      if(width > 0) {
        setImageScale(naturalWidth / width);
      }
    }
  };

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getMousePos(e);
    setStartPoint(pos);
    setEndPoint(pos);
    setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    const pos = getMousePos(e);
    setEndPoint(pos);
  };

  const handleMouseUp = () => {
    if (!startPoint || !endPoint) return;
    setIsDrawing(false);
    
    const rect: CropArea = {
      x: Math.min(startPoint.x, endPoint.x) * imageScale,
      y: Math.min(startPoint.y, endPoint.y) * imageScale,
      width: Math.abs(startPoint.x - endPoint.x) * imageScale,
      height: Math.abs(startPoint.y - endPoint.y) * imageScale,
    };
    
    if (rect.width > 5 && rect.height > 5) {
        setSelection(rect);
    } else {
        setSelection(null);
    }

    setStartPoint(null);
    setEndPoint(null);
  };

  const selectionStyle = (): React.CSSProperties => {
    if (!isDrawing || !startPoint || !endPoint) return { display: 'none' };
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(startPoint.x - endPoint.x);
    const height = Math.abs(startPoint.y - endPoint.y);
    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      border: '2px dashed #38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
    };
  };
  
  const confirmedSelectionStyle = (): React.CSSProperties => {
    if(!selection) return { display: 'none' };
    return {
       position: 'absolute',
       left: selection.x / imageScale,
       top: selection.y / imageScale,
       width: selection.width / imageScale,
       height: selection.height / imageScale,
       border: '3px solid #34d399',
       backgroundColor: 'rgba(52, 211, 153, 0.3)',
       boxShadow: '0 0 15px rgba(0,0,0,0.5)'
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4" aria-modal="true">
      <div className="text-center mb-4 text-white">
        <div className="flex items-center justify-center space-x-3">
          <CropIcon className="h-8 w-8 text-blue-400" />
          <h2 className="text-2xl font-bold">Select Area to Remove</h2>
        </div>
        <p className="text-gray-300">Click and drag on the image to select the repeating header to crop out.</p>
      </div>
      <div
        ref={containerRef}
        className="relative max-w-full max-h-[70vh] flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: 'crosshair' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Selection preview"
          onLoad={handleImageLoad}
          className="max-w-full max-h-full object-contain select-none"
        />
        <div style={selectionStyle()} />
        <div style={confirmedSelectionStyle()} />
      </div>

      <div className="mt-4 flex items-center space-x-4">
        <button onClick={() => onComplete(null)} className="px-5 py-2.5 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-500 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onComplete(selection)}
          disabled={!selection}
          className="px-5 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          Confirm Selection & Stitch
        </button>
      </div>
    </div>
  );
};

export default SelectionTool;