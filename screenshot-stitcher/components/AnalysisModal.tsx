import React from 'react';
import { type AnalysisIssue, type UploadedFile } from '../types';
import { WarningIcon } from './Icons';

interface AnalysisModalProps {
  issue: AnalysisIssue;
  files: UploadedFile[];
  onResolve: (resolution: { action: string; payload?: any }) => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ issue, files, onResolve }) => {
  const { type, indices, reason } = issue;
  const [index1, index2] = indices;
  const file1 = files[index1];
  const file2 = files[index2];

  const renderGapContent = () => (
    <>
      <h3 className="text-xl font-bold text-yellow-300">Potential Gap Detected</h3>
      <p className="mt-2 text-gray-300">There might be missing content between these two images. How would you like to proceed?</p>
      <p className="mt-2 text-sm text-gray-400 italic">AI Reason: "{reason}"</p>
      <div className="mt-6 flex justify-center gap-4">
        <button onClick={() => onResolve({ action: 'add-photo' })} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors">Add Missing Image</button>
        <button onClick={() => onResolve({ action: 'continue' })} className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-500 transition-colors">Stitch Anyway</button>
        <button onClick={() => onResolve({ action: 'cancel' })} className="px-4 py-2 rounded-lg font-semibold text-white bg-red-700 hover:bg-red-600 transition-colors">Cancel</button>
      </div>
    </>
  );

  const renderSimilarityContent = () => (
    <>
      <h3 className="text-xl font-bold text-yellow-300">Similar Images Detected</h3>
      <p className="mt-2 text-gray-300">These two images look very similar. Please choose which one to use.</p>
      <p className="mt-2 text-sm text-gray-400 italic">AI Reason: "{reason}"</p>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <button onClick={() => onResolve({ action: 'remove', payload: { id: file2.id } })} className="px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors">Use Image #{index1 + 1}</button>
        <button onClick={() => onResolve({ action: 'remove', payload: { id: file1.id } })} className="px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors">Use Image #{index2 + 1}</button>
        <button onClick={() => onResolve({ action: 'keep-both' })} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors">Keep Both</button>
        <button onClick={() => onResolve({ action: 'cancel' })} className="px-4 py-2 rounded-lg font-semibold text-white bg-red-700 hover:bg-red-600 transition-colors">Cancel</button>
      </div>
    </>
  );

  if (!file1 || !file2) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-full max-w-2xl p-6 text-center">
        <div className="flex justify-center mb-4">
           <WarningIcon className="w-12 h-12 text-yellow-400"/>
        </div>

        <div className="flex justify-center items-start gap-4 mb-6">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg mb-2">Image #{index1 + 1}</span>
            <img src={file1.previewUrl} alt={`Preview ${index1 + 1}`} className="w-32 h-auto rounded-md border-2 border-gray-600" />
          </div>
          <div className="flex flex-col items-center">
             <span className="font-bold text-lg mb-2">Image #{index2 + 1}</span>
            <img src={file2.previewUrl} alt={`Preview ${index2 + 1}`} className="w-32 h-auto rounded-md border-2 border-gray-600" />
          </div>
        </div>

        {type === 'GAP' ? renderGapContent() : renderSimilarityContent()}

      </div>
    </div>
  );
};

export default AnalysisModal;
