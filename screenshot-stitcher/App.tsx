import React, { useState, useCallback, useRef } from 'react';
import { type UploadedFile, type AnalysisIssue, type CropArea } from './types';
import { stitchImages } from './services/stitchingService';
import { analyzeImageSet } from './services/analysisService';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import StitchedResult from './components/StitchedResult';
import AnalysisModal from './components/AnalysisModal';
import SelectionTool from './components/SelectionTool';
import { DownloadIcon, LoaderIcon, SparklesIcon, BackIcon, CropIcon } from './components/Icons';

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [stitchedImageUrl, setStitchedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'stitching'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [addSeparator, setAddSeparator] = useState(false);
  const [userDeclaresHeader, setUserDeclaresHeader] = useState(false);
  const [analysisIssues, setAnalysisIssues] = useState<AnalysisIssue[]>([]);
  const [currentIssueIndex, setCurrentIssueIndex] = useState<number | null>(null);
  const [commonHeaderHeight, setCommonHeaderHeight] = useState(0);
  const [isSelectingArea, setIsSelectingArea] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const insertIndexRef = useRef<number | null>(null);
  
  const isLoading = status === 'analyzing' || status === 'stitching';
  const currentIssue = currentIssueIndex !== null ? analysisIssues[currentIssueIndex] : null;

  const handleFilesSelected = useCallback((files: FileList, index: number | null = null) => {
    setError(null);
    setStitchedImageUrl(null);
    const newFiles: UploadedFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: self.crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
      }));

    setUploadedFiles(prevFiles => {
      let combinedFiles;
      if (index !== null) {
        combinedFiles = [...prevFiles];
        combinedFiles.splice(index, 0, ...newFiles);
      } else {
        combinedFiles = [...prevFiles, ...newFiles];
      }
      
      combinedFiles.sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      return combinedFiles;
    });
  }, []);

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newFiles = [...uploadedFiles];
    const draggedItemContent = newFiles.splice(dragItem.current, 1)[0];
    newFiles.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setUploadedFiles(newFiles);
  };

  const handleRemoveFile = (idToRemove: string) => {
    setUploadedFiles(prevFiles => {
      const fileToRemove = prevFiles.find(f => f.id === idToRemove);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prevFiles.filter(file => file.id !== idToRemove);
    });
  };
  
  const runStitchProcess = async (headerHeight: number) => {
    if (uploadedFiles.length === 0) return;
    setStatus('stitching');
    try {
      const filesToStitch = uploadedFiles.map(f => f.file);
      const dataUrl = await stitchImages(filesToStitch, {
        separatorHeight: addSeparator ? 3 : 0,
        separatorColor: '#4B5563',
        commonHeaderHeight: headerHeight
      });
      setStitchedImageUrl(dataUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during stitching.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setStatus('idle');
    }
  };
  
  const continueWithAnalysis = async (manualHeight: number) => {
    setStatus('analyzing');
    try {
      const filesToAnalyze = uploadedFiles.map(f => f.file);
      const { issues, commonHeaderHeight: aiHeaderHeight } = await analyzeImageSet(filesToAnalyze);
      
      const finalHeight = manualHeight > 0 ? manualHeight : aiHeaderHeight;
      setCommonHeaderHeight(finalHeight);

      if (issues && issues.length > 0) {
        setAnalysisIssues(issues);
        setCurrentIssueIndex(0);
      } else {
        await runStitchProcess(finalHeight);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An AI analysis error occurred.";
       setError(errorMessage);
      console.error(err);
    } finally {
      if (!analysisIssues.length) {
        setStatus('idle');
      }
    }
  };

  const handleStartAnalysis = async () => {
    if (uploadedFiles.length < 2) {
      setError("Please upload at least two images to analyze.");
      return;
    }
    setError(null);
    
    if (userDeclaresHeader) {
      setIsSelectingArea(true);
    } else {
      await continueWithAnalysis(0);
    }
  };

  const handleReset = () => {
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setUploadedFiles([]);
    setStitchedImageUrl(null);
    setError(null);
    setStatus('idle');
    setAddSeparator(false);
    setUserDeclaresHeader(false);
    setAnalysisIssues([]);
    setCurrentIssueIndex(null);
    setCommonHeaderHeight(0);
    setIsSelectingArea(false);
  };
  
  const handleResolveIssue = (resolution: { action: string; payload?: any }) => {
    if (!currentIssue) return;

    switch (resolution.action) {
      case 'remove':
        handleRemoveFile(resolution.payload.id);
        break;
      case 'add-photo':
        insertIndexRef.current = currentIssue.indices[1];
        hiddenFileInputRef.current?.click();
        return; 
      case 'keep-both':
      case 'continue':
        break;
      case 'cancel':
        setAnalysisIssues([]);
        setCurrentIssueIndex(null);
        return;
    }

    if (currentIssueIndex !== null && currentIssueIndex < analysisIssues.length - 1) {
      setCurrentIssueIndex(currentIssueIndex + 1);
    } else {
      setAnalysisIssues([]);
      setCurrentIssueIndex(null);
      // After resolving all issues, stitch with the already determined header height.
      runStitchProcess(commonHeaderHeight);
    }
  };

  const handleAddedFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFilesSelected(event.target.files, insertIndexRef.current);
      setAnalysisIssues([]);
      setCurrentIssueIndex(null);
      // Re-run the analysis after adding a photo to fix a gap
      setTimeout(() => continueWithAnalysis(commonHeaderHeight), 100);
    }
    event.target.value = '';
  };
  
  const handleCropSelectionComplete = (area: CropArea | null) => {
    setIsSelectingArea(false);
    const cropHeight = area?.height ?? 0;
    continueWithAnalysis(cropHeight);
  };

  const renderContent = () => {
    if (stitchedImageUrl) {
      return <StitchedResult imageUrl={stitchedImageUrl} onReset={handleReset} />;
    }

    if (uploadedFiles.length > 0) {
      const buttonText = status === 'analyzing' ? 'Analyzing...' : status === 'stitching' ? 'Stitching...' : 'Analyze & Stitch';
      return (
        <div className="w-full flex flex-col items-center">
          <ImagePreview
            files={uploadedFiles}
            onRemove={handleRemoveFile}
            dragItem={dragItem}
            dragOverItem={dragOverItem}
            onDragSort={handleDragSort}
          />
          {error && <p className="mt-4 text-red-400">{error}</p>}

          <div className="w-full max-w-lg mt-6 mb-2 text-left px-2 space-y-3">
            <label htmlFor="crop-checkbox" className="flex items-center cursor-pointer text-gray-300 select-none">
              <input
                id="crop-checkbox"
                type="checkbox"
                checked={userDeclaresHeader}
                onChange={(e) => setUserDeclaresHeader(e.target.checked)}
                className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-900"
              />
              <span className="ml-3">Crop a repeating banner/sidebar</span>
            </label>
            <label htmlFor="separator-checkbox" className="flex items-center cursor-pointer text-gray-300 select-none">
              <input
                id="separator-checkbox"
                type="checkbox"
                checked={addSeparator}
                onChange={(e) => setAddSeparator(e.target.checked)}
                className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-900"
              />
              <span className="ml-3">Add a thin separator between images</span>
            </label>
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-500 transition-all duration-300 flex items-center space-x-2"
            >
              <BackIcon />
              <span>Start Over</span>
            </button>
            <button
              onClick={handleStartAnalysis}
              disabled={isLoading}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2"
            >
              {isLoading ? <LoaderIcon /> : <SparklesIcon />}
              <span>{buttonText}</span>
            </button>
          </div>
        </div>
      );
    }

    return <ImageUploader onFilesSelected={handleFilesSelected} />;
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        <div className="flex items-center space-x-3 mb-4">
          <SparklesIcon className="h-10 w-10 text-blue-400" />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
            Smart Screenshot Stitcher
          </h1>
        </div>
        <p className="mt-2 mb-8 text-lg text-gray-400 max-w-2xl">
          Please name your screenshots numerically in order from top to bottom (e.g., <code className="bg-gray-700/50 text-gray-300 px-1.5 py-0.5 rounded-md font-mono text-base">1.png</code>, <code className="bg-gray-700/50 text-gray-300 px-1.5 py-0.5 rounded-md font-mono text-base">2.png</code>). The app will sort them and check for issues.
        </p>

        <div className="w-full min-h-[300px] flex items-center justify-center p-4 rounded-xl bg-gray-800/50 border border-dashed border-gray-600">
          {renderContent()}
        </div>
        <footer className="mt-8 text-sm text-gray-500">
          AI Analysis by Gemini. Created with React & Tailwind CSS.
        </footer>
      </div>
      {currentIssue && (
         <AnalysisModal
          issue={currentIssue}
          files={uploadedFiles}
          onResolve={handleResolveIssue}
        />
      )}
      {isSelectingArea && uploadedFiles.length > 0 && (
        <SelectionTool imageUrl={uploadedFiles[0].previewUrl} onComplete={handleCropSelectionComplete} />
      )}
      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={handleAddedFile}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        multiple
      />
    </main>
  );
}