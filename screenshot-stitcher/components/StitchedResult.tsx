
import React from 'react';
import { DownloadIcon, BackIcon } from './Icons';

interface StitchedResultProps {
  imageUrl: string;
  onReset: () => void;
}

const StitchedResult: React.FC<StitchedResultProps> = ({ imageUrl, onReset }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'stitched-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      <h2 className="text-2xl font-bold text-green-400 mb-4">Stitching Complete!</h2>
      <div className="mb-6 w-full max-w-2xl max-h-[60vh] overflow-auto rounded-lg border-4 border-gray-700">
        <img src={imageUrl} alt="Stitched result" className="w-full h-auto" />
      </div>
      <div className="flex space-x-4">
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-500 transition-all duration-300 flex items-center space-x-2"
        >
          <BackIcon/>
          <span>Start Over</span>
        </button>
        <a
          href={imageUrl}
          download="stitched-image.png"
          onClick={handleDownload}
          className="px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-all duration-300 flex items-center space-x-2"
        >
          <DownloadIcon />
          <span>Download Image</span>
        </a>
      </div>
    </div>
  );
};

export default StitchedResult;
