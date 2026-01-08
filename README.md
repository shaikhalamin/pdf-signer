# PDF Signature Tool

A professional, client-side PDF signing application built with **React**, **Vite**, and **PDF.js**. This tool allows users to upload PDF documents, place customizable signatures with a realistic cursive font, and download the signed version without ever uploading the file to a server.

---

## 📄 Project Description

The **PDF Signature Tool** provides a seamless "What You See Is What You Get" (WYSIWYG) experience for document signing. By leveraging `pdf-lib` for document manipulation and `pdfjs-dist` for high-fidelity rendering, the application handles complex PDF structures entirely within the browser.



This project solves the common coordinate-mapping problem between the browser's HTML5 Canvas (which is pixel-based and top-down) and the PDF coordinate system (which is point-based and bottom-up).

### Key Features

* **Secure & Private:** No files are uploaded to a server; all processing happens in the user's browser.
* **Dynamic Signing:** Type your name and click anywhere on the document to place a signature.
* **Intuitive Controls:** Drag to reposition and use the handles to resize signatures on the fly.
* **High Fidelity Rendering:** Uses the **Sacramento** cursive font for a realistic handwritten feel, both in the UI and the exported PDF.
* **Multi-page Support:** Navigate through documents and add signatures to any page.
* **Coordinate Normalization:** Automatically handles scale and DPI differences for precise placement.

---

## 🛠 Tech Stack

* **Framework:** React 18 (TypeScript)
* **Build Tool:** Vite
* **PDF Engines:** * `pdfjs-dist` (for rendering)
    * `pdf-lib` (for editing and saving)
* **Icons:** Lucide React
* **Styling:** Tailwind CSS

---

## 🚀 Local Development Instructions

Follow these steps to get the project running on your local machine.

### Prerequisites

* **Node.js** (v18.0.0 or higher)
* **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone [https://github.com/your-username/pdf-signer-tool.git](https://github.com/your-username/pdf-signer-tool.git)
cd pdf-signer-tool

npm install
# or
yarn install

npm run dev
# or
yarn dev
```
