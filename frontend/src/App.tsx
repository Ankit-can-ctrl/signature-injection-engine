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
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

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
      },
    ]);
  };

  // ==============Handle dragging the fields ================
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFields((f) =>
      f.map((field) =>
        field.id === dragging
          ? {
              ...field,
              x: Math.max(0, Math.min(x, 1 - field.w)),
              y: Math.max(0, Math.min(y, 1 - field.h)),
            }
          : field
      )
    );
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

      <div
        onMouseMove={onMouseMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
        ref={containerRef}
        className="relative inline-block bg-white"
      >
        <Document file="/sample.pdf">
          <Page pageNumber={1} width={600} />
        </Document>

        {fields.map((f) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
