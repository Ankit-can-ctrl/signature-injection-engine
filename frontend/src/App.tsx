import { useState, useRef, useEffect } from "react";
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
  value?: string;
}

const PDF_PATH = "/sample.pdf";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [signatureModal, setSignatureModal] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load sample.pdf as base64 on mount
  useEffect(() => {
    fetch(PDF_PATH)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => setPdfData(reader.result as string);
        reader.readAsDataURL(blob);
      });
  }, []);

  // ==============add fields at center of the doc==============
  const addField = (type: string) => {
    const defaultValue = () => {
      switch (type) {
        case "text":
          return "Enter text";
        case "checkbox":
          return "checked";
        case "date":
          return new Date().toISOString().split("T")[0];
        default:
          return "";
      }
    };
    setFields((f) => [
      ...f,
      {
        id: crypto.randomUUID(),
        type,
        x: 0.3,
        y: 0.3,
        w: type === "signature" ? 0.25 : 0.2,
        h: type === "signature" ? 0.1 : 0.05,
        page: currentPage,
        value: defaultValue(),
      },
    ]);
  };

  // Update field value
  const updateFieldValue = (id: string, value: string) => {
    setFields((f) =>
      f.map((field) => (field.id === id ? { ...field, value } : field))
    );
  };

  // Signature drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureModal) return;
    const dataUrl = canvas.toDataURL("image/png");
    updateFieldValue(signatureModal, dataUrl);
    setSignatureModal(null);
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

  // Submit - send percentages to backend
  const submit = async () => {
    if (!pdfData) return;
    const res = await fetch(
      import.meta.env.VITE_BACKEND_URL + "/api/sign-pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfData, fields }),
      }
    );
    const { url } = await res.json();
    window.open(import.meta.env.VITE_BACKEND_URL + url);
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
        <button
          onClick={submit}
          className="px-4 py-2 bg-green-600 text-white rounded ml-auto"
        >
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
          file={PDF_PATH}
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
              flex items-center justify-center text-xs z-10"
              style={{
                left: `${f.x * 100}%`,
                top: `${f.y * 100}%`,
                width: `${f.w * 100}%`,
                height: `${f.h * 100}%`,
              }}
            >
              {f.type === "text" ? (
                <input
                  type="text"
                  value={f.value || ""}
                  onChange={(e) => updateFieldValue(f.id, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full h-full bg-transparent text-black text-center outline-none"
                  placeholder="Enter text"
                />
              ) : f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={f.value === "checked"}
                  onChange={(e) =>
                    updateFieldValue(f.id, e.target.checked ? "checked" : "")
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-blue-500 appearance-auto"
                />
              ) : f.type === "date" ? (
                <input
                  type="date"
                  value={f.value || ""}
                  onChange={(e) => updateFieldValue(f.id, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="bg-transparent text-black text-xs outline-none"
                />
              ) : f.type === "signature" ? (
                f.value ? (
                  <img
                    src={f.value}
                    alt="signature"
                    className="w-full h-full object-contain"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSignatureModal(f.id);
                    }}
                  />
                ) : (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setSignatureModal(f.id)}
                    className="text-blue-700 text-xs underline"
                  >
                    Click to sign
                  </button>
                )
              ) : (
                <span className="text-blue-700">{f.type}</span>
              )}

              {/* ============resize handle================== */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setResizing(f.id);
                }}
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
              />
            </div>
          ))}
      </div>

      {/* Signature Modal */}
      {signatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Draw your signature</h3>
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="border border-gray-300 cursor-crosshair"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={clearSignature}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Clear
              </button>
              <button
                onClick={saveSignature}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Save
              </button>
              <button
                onClick={() => setSignatureModal(null)}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
