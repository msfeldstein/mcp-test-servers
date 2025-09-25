import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Copy, FileImage, Code, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function DataUrlConverter() {
  const [inputContent, setInputContent] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [contentType, setContentType] = useState<'svg' | 'image' | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Auto-detect content type and convert
  const processContent = (content: string, type: 'svg' | 'image', name = '') => {
    try {
      if (type === 'svg') {
        // Clean up SVG and convert to data URL
        const cleanSvg = content.trim();
        const base64 = btoa(unescape(encodeURIComponent(cleanSvg)));
        const url = `data:image/svg+xml;base64,${base64}`;
        setDataUrl(url);
        setContentType('svg');
        toast.success('SVG converted to data URL!');
      } else if (type === 'image') {
        // Already a data URL from file
        setDataUrl(content);
        setContentType('image');
        setFileName(name);
        toast.success('Image converted to data URL!');
      }
    } catch (error) {
      toast.error('Failed to convert content. Please check the format.');
      console.error('Conversion error:', error);
    }
  };

  // Detect if content is SVG
  const isSvgContent = (content: string): boolean => {
    const trimmed = content.trim();
    return trimmed.includes('<svg') && trimmed.includes('</svg>');
  };

  // Handle paste events globally
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Check if we're pasting into a specific input field
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        return; // Let the textarea handle the paste naturally
      }

      e.preventDefault();
      const clipboardData = e.clipboardData;
      
      if (!clipboardData) return;

      // Check for files first
      const files = Array.from(clipboardData.files);
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            processContent(result, 'image', file.name);
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // Check for text content
      const text = clipboardData.getData('text/plain');
      if (text && isSvgContent(text)) {
        setInputContent(text);
        processContent(text, 'svg');
      } else if (text) {
        setInputContent(text);
        toast.info('Paste SVG content or drag & drop an image file');
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Handle manual textarea input
  const handleTextareaChange = (value: string) => {
    setInputContent(value);
    if (value.trim() && isSvgContent(value)) {
      processContent(value, 'svg');
    } else if (dataUrl && contentType === 'svg') {
      // Clear data URL if SVG content is removed
      setDataUrl('');
      setContentType(null);
    }
  };

  // Handle drag and drop
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            processContent(result, 'image', file.name);
          };
          reader.readAsDataURL(file);
        } else {
          toast.error('Please drop an image file');
        }
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dataUrl).then(() => {
      toast.success('Data URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const clear = () => {
    setInputContent('');
    setDataUrl('');
    setContentType(null);
    setFileName('');
  };

  return (
    <div 
      ref={dropZoneRef}
      className={`min-h-screen w-full p-6 transition-colors ${
        isDragging ? 'bg-accent/50' : ''
      }`}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="mb-2">Paste Anywhere Data URL Converter</h1>
          <p className="text-muted-foreground">
            Paste SVG content anywhere or drag & drop image files to instantly convert to data URLs
          </p>
        </div>

        <Card className={`transition-all ${isDragging ? 'border-primary border-2 bg-accent/20' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Paste or Drop Content Here
            </CardTitle>
            <CardDescription>
              {isDragging 
                ? 'Drop your image file here...' 
                : 'Paste SVG content anywhere on the page, paste images from clipboard, or drag & drop image files'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="You can also paste SVG content directly here, or it will appear when you paste anywhere on the page..."
              value={inputContent}
              onChange={(e) => handleTextareaChange(e.target.value)}
              className="min-h-32 font-mono"
            />

            {dataUrl && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {contentType === 'svg' ? (
                      <Code className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FileImage className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                      {contentType === 'svg' ? 'SVG' : 'Image'} Data URL
                      {fileName && ` (${fileName})`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={clear}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                    <Button size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Data URL
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={dataUrl}
                  readOnly
                  className="font-mono text-sm"
                  rows={3}
                />
                
                <div>
                  <p className="text-sm font-medium mb-2">Preview</p>
                  <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                    <img 
                      src={dataUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-64"
                      onError={() => toast.error('Invalid format')}
                    />
                  </div>
                </div>
              </div>
            )}

            {!dataUrl && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    <span>Paste SVG anywhere</span>
                  </div>
                  <div className="text-muted-foreground">or</div>
                  <div className="flex items-center gap-2">
                    <FileImage className="w-5 h-5" />
                    <span>Drag & drop images</span>
                  </div>
                </div>
                <p className="text-sm">
                  Try: Ctrl+V (Cmd+V) with SVG content or image in clipboard
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}