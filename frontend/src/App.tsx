import { useState, useRef } from "react";
import { pdfjs, Page, Document } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Field {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // ==============add fields at center of the doc==============
  const addField = (type: string) => {
    setFields((f) => [
      ...f,
      {
        id: crypto.randomUUID(),
        type,
        x: 0.3,
        y: 0.3,
        w: 0.2,
        h: 0.05,
        page: currentPage,
      },
    ]);
  };

  // ==============Handle dragging the fields ================
  const onMouseMove = (e: React.MouseEvent) => {
    if ((!dragging && !resizing) || !containerRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) throw new Error("Cant define the position of the element.");
    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;

    if (dragging) {
      setFields((f) =>
        f.map((field) =>
          field.id === dragging
            ? {
                ...field,
                x: Math.max(0, Math.min(mouseX - field.w / 2, 1 - field.w)),
                y: Math.max(0, Math.min(mouseY - field.h / 2, 1 - field.h)),
              }
            : field
        )
      );
    }

    if (resizing) {
      setFields((f) =>
        f.map((field) =>
          field.id === resizing
            ? {
                ...field,
                w: Math.max(0.05, Math.min(mouseX - field.x, 1 - field.x)),
                h: Math.max(0.02, Math.min(mouseY - field.y, 1 - field.y)),
              }
            : field
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      {/*=================== Toolbar==================== */}
      <div className="flex gap-2 mb-4">
        {["text", "signature", "date", "checkbox"].map((type) => (
          <button
            key={type}
            onClick={() => addField(type)}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
          >
            + {type}
          </button>
        ))}
        <button className="px-4 py-2 bg-green-600 text-white rounded ml-auto">
          Sign PDF
        </button>
      </div>

      {/*=================== Pagination Controls ==================== */}
      {numPages > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-white">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      <div
        onMouseMove={onMouseMove}
        onMouseUp={() => {
          setDragging(null);
          setResizing(null);
        }}
        onMouseLeave={() => {
          setDragging(null);
          setResizing(null);
        }}
        ref={containerRef}
        className="relative inline-block"
      >
        <Document
          file="/sample.pdf"
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          <div className="bg-white">
            <Page pageNumber={currentPage} width={600} />
          </div>
        </Document>

        {fields
          .filter((f) => f.page === currentPage)
          .map((f) => (
            <div
              key={f.id}
              onMouseDown={() => setDragging(f.id)}
              className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move
              flex items-center justify-center text-xs text-blue-700 z-10"
              style={{
                left: `${f.x * 100}%`,
                top: `${f.y * 100}%`,
                width: `${f.w * 100}%`,
                height: `${f.h * 100}%`,
              }}
            >
              {f.type}

              {/* ============resize handle================== */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation(); // Prevent triggering drag
                  setResizing(f.id);
                }}
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
              />
            </div>
          ))}
      </div>
    </div>
  );
}
