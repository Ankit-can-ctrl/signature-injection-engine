import { useState, useRef } from "react";
import { pdfjs } from "react-pdf";
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

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      {/* Toolbar */}
      <div className="flex gap-2 mb-4">
        {["text", "signature", "date", "checkbox"].map((type) => (
          <button
            key={type}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
          >
            + {type}
          </button>
        ))}
        <button className="px-4 py-2 bg-green-600 text-white rounded ml-auto">
          Sign PDF
        </button>
      </div>
    </div>
  );
}
