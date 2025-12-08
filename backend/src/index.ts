import express from "express";
import { Response, Request } from "express";
import { PDFDocument, rgb } from "pdf-lib";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "50mb" }));

app.post("/api/sign-pdf", async (req: Request, res: Response) => {
  const { pdfData, fields, signatureImage } = req.body;

  if (!pdfData) {
    res.status(400).json({ error: "No PDF data provided" });
    return;
  }

  // 1. Load PDF from base64 data
  const base64Data = pdfData.split(",")[1] || pdfData;
  const pdfBytes = Buffer.from(base64Data, "base64");
  const originalHash = crypto
    .createHash("sha256")
    .update(pdfBytes)
    .digest("hex");

  // 2. Modify PDF
  const pdf = await PDFDocument.load(pdfBytes);

  for (const f of fields) {
    // Get the correct page (frontend uses 1-based, pdf-lib uses 0-based)
    const pageIndex = (f.page || 1) - 1;
    const page = pdf.getPage(pageIndex);
    const { width: W, height: H } = page.getSize();

    const x = f.x * W;
    const w = f.w * W;
    const h = f.h * H;
    const y = H - f.y * H - h;

    if (f.type === "signature" && f.value) {
      const img = await pdf.embedPng(
        Buffer.from(f.value.split(",")[1], "base64")
      );
      const scale = Math.min(w / img.width, h / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      page.drawImage(img, {
        x: x + (w - drawW) / 2,
        y: y + (h - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } else if (f.type === "text" && f.value) {
      page.drawText(f.value, { x, y: y + h * 0.3, size: h * 0.6 });
    } else if (f.type === "date") {
      const dateStr = f.value
        ? new Date(f.value).toLocaleDateString()
        : new Date().toLocaleDateString();
      page.drawText(dateStr, {
        x,
        y: y + h * 0.3,
        size: h * 0.6,
      });
    } else if (f.type === "checkbox" && f.value === "checked") {
      // Draw checkbox outline only (no fill)
      page.drawRectangle({
        x,
        y,
        width: h,
        height: h,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0),
      });
      // Draw a checkmark using two lines
      const padding = h * 0.2;
      // First line: bottom-left to middle-bottom
      page.drawLine({
        start: { x: x + padding, y: y + h * 0.5 },
        end: { x: x + h * 0.4, y: y + padding },
        thickness: 2,
        color: rgb(0, 0, 0),
      });
      // Second line: middle-bottom to top-right
      page.drawLine({
        start: { x: x + h * 0.4, y: y + padding },
        end: { x: x + h - padding, y: y + h - padding },
        thickness: 2,
        color: rgb(0, 0, 0),
      });
    }
  }

  // 3. Save & hash
  const signedBytes = await pdf.save();
  const signedHash = crypto
    .createHash("sha256")
    .update(signedBytes)
    .digest("hex");

  const filename = `signed_${Date.now()}.pdf`;
  fs.writeFileSync(`./uploads/${filename}`, signedBytes);

  // 4. Store audit
  console.log({ originalHash, signedHash, timestamp: new Date() });

  res.json({ url: `/uploads/${filename}` });
});

app.use("/uploads", express.static("uploads"));

app.listen(PORT, () => console.log(`Server running on PORT :${PORT}`));
