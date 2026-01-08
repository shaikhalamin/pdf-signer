import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  Pen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Check,
  FileText,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import fontkit from "@pdf-lib/fontkit";

// Vite worker setup
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/sacramento/Sacramento-Regular.ttf";

interface Signature {
  id: number;
  text: string;
  canvasX: number;
  canvasY: number;
  pdfX: number;
  pdfY: number;
  size: number;
  width: number;
  height: number;
}

const PdfSigner = () => {
  const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [signatures, setSignatures] = useState<Record<number, Signature[]>>({});
  const [signatureText, setSignatureText] = useState<string>("");
  const [scale] = useState<number>(1.5);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Sacramento&family=Inter:wght@400;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfFile(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setSignatures({});
      setCurrentPage(1);
    } catch (error) {
      console.error("Error loading PDF:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const drawSignatures = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageSignatures = signatures[currentPage] || [];

    pageSignatures.forEach((sig) => {
      ctx.font = `${sig.size}px "Sacramento", cursive`;
      ctx.textBaseline = "bottom";
      const metrics = ctx.measureText(sig.text);
      sig.width = metrics.width;
      sig.height = sig.size;

      if (sig.id === selectedId) {
        ctx.strokeStyle = "#4F46E5";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          sig.canvasX - 5,
          sig.canvasY - sig.size + 5,
          sig.width + 10,
          sig.size
        );
        ctx.setLineDash([]);
        ctx.fillStyle = "#4F46E5";
        ctx.fillRect(sig.canvasX + sig.width, sig.canvasY, 10, 10); // Resize handle
        ctx.fillStyle = "#EF4444";
        ctx.fillRect(sig.canvasX + sig.width, sig.canvasY - sig.size, 10, 10); // Delete handle
      }
      ctx.fillStyle = "#000000";
      ctx.fillText(sig.text, sig.canvasX, sig.canvasY);
    });
  }, [currentPage, signatures, selectedId]);

  useEffect(() => {
    const render = async () => {
      if (!pdfDocument || !canvasRef.current || !overlayCanvasRef.current)
        return;
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        overlayCanvasRef.current.height = viewport.height;
        overlayCanvasRef.current.width = viewport.width;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          canvas: null,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        drawSignatures();
      } catch (error) {
        console.error("Render error:", error);
      }
    };
    render();
  }, [pdfDocument, currentPage, scale, drawSignatures]);

  const onMouseDown = (e: React.MouseEvent) => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pageSigs = signatures[currentPage] || [];

    const clickedSig = [...pageSigs]
      .reverse()
      .find(
        (sig) =>
          x >= sig.canvasX - 10 &&
          x <= sig.canvasX + sig.width + 20 &&
          y >= sig.canvasY - sig.size &&
          y <= sig.canvasY + 20
      );

    if (clickedSig) {
      setSelectedId(clickedSig.id);
      if (
        x >= clickedSig.canvasX + clickedSig.width &&
        y <= clickedSig.canvasY - clickedSig.size + 20
      ) {
        setSignatures((prev) => ({
          ...prev,
          [currentPage]: prev[currentPage].filter(
            (s) => s.id !== clickedSig.id
          ),
        }));
        setSelectedId(null);
        return;
      }
      if (
        x > clickedSig.canvasX + clickedSig.width - 5 &&
        y > clickedSig.canvasY - 5
      ) {
        setIsResizing(true);
      } else {
        setIsDragging(true);
        dragOffset.current = {
          x: x - clickedSig.canvasX,
          y: y - clickedSig.canvasY,
        };
      }
      return;
    }
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    if (signatureText) {
      const newSig: Signature = {
        id: Date.now(),
        text: signatureText,
        canvasX: x,
        canvasY: y,
        pdfX: x / scale,
        pdfY: (overlayCanvasRef.current!.height - y) / scale,
        size: 40,
        width: 0,
        height: 0,
      };
      setSignatures((prev) => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), newSig],
      }));
      setSelectedId(newSig.id);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if ((!isDragging && !isResizing) || !selectedId) return;
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSignatures((prev) => ({
      ...prev,
      [currentPage]: prev[currentPage].map((sig) => {
        if (sig.id !== selectedId) return sig;
        if (isResizing)
          return { ...sig, size: Math.max(20, (x - sig.canvasX) / 2) };
        return {
          ...sig,
          canvasX: x - dragOffset.current.x,
          canvasY: y - dragOffset.current.y,
          pdfX: (x - dragOffset.current.x) / scale,
          pdfY:
            (overlayCanvasRef.current!.height - (y - dragOffset.current.y)) /
            scale,
        };
      }),
    }));
  };

  //   const downloadSignedPDF = async () => {
  //     if (!pdfFile) return;
  //     setIsLoading(true);
  //     try {
  //       const pdfDoc = await PDFDocument.load(pdfFile.slice(0));
  //       pdfDoc.registerFontkit(fontkit);

  //       let customFont;
  //       try {
  //         // Attempt to fetch the custom font
  //         const fontBytes = await fetch(FONT_URL).then((res) => {
  //           if (!res.ok) throw new Error("Font fetch failed");
  //           return res.arrayBuffer();
  //         });
  //         customFont = await pdfDoc.embedFont(fontBytes);
  //       } catch (e) {
  //         console.warn(
  //           "Could not load custom font, falling back to standard font.",
  //           e
  //         );
  //         // Fallback to standard italic font if fetch fails
  //         customFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  //       }

  //       const pages = pdfDoc.getPages();

  //       Object.entries(signatures).forEach(([pageNumStr, pageSigs]) => {
  //         const pageIdx = parseInt(pageNumStr) - 1;
  //         if (pageIdx >= 0 && pageIdx < pages.length) {
  //           const page = pages[pageIdx];
  //           const { x: ox, y: oy } = page.getCropBox();

  //           pageSigs.forEach((sig) => {
  //             page.drawText(sig.text, {
  //               x: sig.pdfX + ox,
  //               y: sig.pdfY + oy,
  //               size: sig.size,
  //               font: customFont,
  //               color: rgb(0, 0, 0),
  //             });
  //           });
  //         }
  //       });

  //       const pdfBytes = await pdfDoc.save();
  //       const blob = new Blob([new Uint8Array(pdfBytes)], {
  //         type: "application/pdf",
  //       });
  //       const link = document.createElement("a");
  //       link.href = URL.createObjectURL(blob);
  //       link.download = `signed_${Date.now()}.pdf`;
  //       link.click();
  //     } catch (err) {
  //       console.error("Export Error:", err);
  //       alert("Failed to save PDF.");
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  const downloadSignedPDF = async () => {
    if (!pdfFile) return;
    setIsLoading(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfFile.slice(0));
      pdfDoc.registerFontkit(fontkit);

      let customFont;
      try {
        const fontBytes = await fetch(FONT_URL).then((res) => {
          if (!res.ok) throw new Error("Font fetch failed");
          return res.arrayBuffer();
        });
        customFont = await pdfDoc.embedFont(fontBytes);
      } catch (e) {
        console.log("error: ", e);
        customFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      }

      const pages = pdfDoc.getPages();

      Object.entries(signatures).forEach(([pageNumStr, pageSigs]) => {
        const pageIdx = parseInt(pageNumStr) - 1;
        if (pageIdx >= 0 && pageIdx < pages.length) {
          const page = pages[pageIdx];

          // PDF-lib uses the page size in points
          // const { width: pageWidth, height: pageHeight } = page.getSize();

          // // pdfjs rendering scale factors
          // // We need to find the ratio between the canvas size and the actual PDF size
          // const pdfViewport = page.getSize(); // Standard points

          pageSigs.forEach((sig) => {
            // 1. Normalize the font size.
            // Since the canvas was scaled by 'scale' (1.5), we divide by it.
            const normalizedFontSize = sig.size / scale;

            // 2. Normalize coordinates.
            // PDF (0,0) is bottom-left. Canvas (0,0) is top-left.
            // sig.pdfX and sig.pdfY were already divided by scale in onMouseDown,
            // but we ensure the alignment is perfect here.

            page.drawText(sig.text, {
              x: sig.pdfX,
              y: sig.pdfY,
              size: normalizedFontSize,
              font: customFont,
              color: rgb(0, 0, 0),
            });
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `signed_${Date.now()}.pdf`;
      link.click();
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to save PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 flex flex-col items-center font-['Inter']">
      {/* --- HEADER SECTION --- */}
      <div className="w-full max-w-5xl mb-8 text-center">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          PDF Signature Tool
        </h2>
        <h6 className="text-lg text-slate-500 font-medium">
          Professional PDF signing with PDF.js rendering
        </h6>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 bg-white flex items-center gap-4 flex-wrap">
          {!pdfDocument ? (
            <div className="w-full flex justify-center py-12">
              <label className="group flex flex-col items-center gap-4 px-10 py-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="text-indigo-600" size={32} />
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-slate-700">
                    Click to upload document
                  </span>
                  <span className="text-sm text-slate-500 font-medium">
                    PDF files up to 10MB
                  </span>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <>
              <div className="flex bg-slate-100 rounded-xl p-1.5 border border-slate-200 items-center shadow-inner">
                <div className="bg-white text-indigo-600 p-2.5 rounded-lg shadow-sm">
                  <Pen size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Signer Name"
                  className="bg-transparent px-4 py-1.5 outline-none text-slate-700 w-48 md:w-64 font-semibold placeholder:text-slate-400 placeholder:font-normal"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                />
              </div>

              <div className="hidden md:flex flex-col">
                {selectedId ? (
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                    <Check size={12} /> Editing Mode
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {signatureText ? "Ready to Place" : "Type Name"}
                  </span>
                )}
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => {
                    setSignatures({});
                    setSelectedId(null);
                  }}
                  className="flex items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all font-semibold text-sm"
                >
                  <Trash2 size={18} /> Clear
                </button>
                <button
                  onClick={downloadSignedPDF}
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-600 disabled:bg-slate-300 transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  <span className="font-bold tracking-tight text-sm">
                    Download PDF
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* PDF Viewer Area */}
        {pdfDocument && (
          <div className="bg-slate-200/50 p-6 md:p-12 flex flex-col items-center overflow-auto max-h-[75vh] scrollbar-hide">
            {/* Pagination Controls */}
            <div className="flex items-center gap-8 mb-8 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 z-20 sticky top-0">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((p) => p - 1);
                  setSelectedId(null);
                }}
                className="p-2 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-20 transition-all rounded-lg"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-2 text-slate-800">
                <FileText size={18} className="text-slate-400" />
                <span className="text-sm font-bold tracking-widest">
                  PAGE {currentPage}{" "}
                  <span className="text-slate-300 mx-1">/</span> {totalPages}
                </span>
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((p) => p + 1);
                  setSelectedId(null);
                }}
                className="p-2 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-20 transition-all rounded-lg"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Document Canvas */}
            <div className="relative group">
              {/* Decorative border for the paper */}
              <div className="absolute -inset-1 bg-gradient-to-b from-slate-200 to-slate-300 rounded-sm blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-slate-300 rounded-sm">
                <canvas ref={canvasRef} className="block" />
                <canvas
                  ref={overlayCanvasRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={() => {
                    setIsDragging(false);
                    setIsResizing(false);
                  }}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    setIsResizing(false);
                  }}
                  className={`absolute top-0 left-0 transition-opacity duration-200 ${
                    selectedId
                      ? "cursor-move"
                      : signatureText
                      ? "cursor-crosshair"
                      : "cursor-default"
                  }`}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              <span className="flex items-center gap-1">
                <Pen size={10} /> Click to Place
              </span>
              <span className="flex items-center gap-1">
                <Check size={10} /> Click Outside to Save
              </span>
              <span className="flex items-center gap-1">
                <Trash2 size={10} /> Top-Right to Delete
              </span>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 text-slate-400 text-xs font-medium">
        Secure client-side rendering &bull; No files uploaded to server
      </footer>
    </div>
  );
};

export default PdfSigner;
