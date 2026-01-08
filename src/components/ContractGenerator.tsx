import React, { useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Building2,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";

// Sample JSON Data Structure for the Contract
const sampleContractData = {
  companyName: "TechNova Solutions Inc.",
  companyAddress: "123 Innovation Drive, Silicon Valley, CA 94025",
  employeeName: "Jane Smith",
  employeeRole: "Senior Frontend Engineer",
  startDate: "October 25, 2023",
  salary: "$145,000 per annum",
  sections: [
    {
      title: "1. Employment and Duties",
      content:
        "The Employee agrees to perform faithfully, industriously, and to the best of their ability, the duties described in Exhibit A attached hereto and such other duties as may be assigned to them from time to time by the Company. The Employee agrees to comply with all reasonable policies and procedures of the Company.",
    },
    {
      title: "2. Compensation",
      content:
        "As full compensation for all services rendered by the Employee, the Company shall pay the Employee a base salary at the rate specified above, payable in accordance with the Company’s standard payroll practices. The Employee is also eligible for performance bonuses and equity grants as determined by the Company.",
    },
    {
      title: "3. Benefits",
      content:
        "The Employee shall be entitled to participate in all benefit programs that the Company establishes and makes available to its employees, including group health insurance, dental and vision plans, life insurance, and a 401(k) retirement plan, subject to the terms and conditions of those plans.",
    },
    {
      title: "4. Confidentiality",
      content:
        "The Employee acknowledges that they will have access to Confidential Information. The Employee agrees to hold all Confidential Information in strict confidence and not to use it, except as necessary to perform their duties, or to disclose it to any third party without the prior written consent of the Company. This obligation survives the termination of employment.",
    },
    {
      title: "5. Termination",
      content:
        "Either party may terminate this agreement at any time, with or without cause, by providing 30 days' written notice to the other party. Upon termination, the Employee shall return all property belonging to the Company.",
    },
  ],
};

const ContractGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to wrap text for PDF
//   const wrapText = (
//     text: string,
//     font: any,
//     fontSize: number,
//     maxWidth: number
//   ) => {
//     const words = text.split(" ");
//     const lines = [];
//     let currentLine = words[0];

//     for (let i = 1; i < words.length; i++) {
//       const word = words[i];
//       const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
//       if (width < maxWidth) {
//         currentLine += " " + word;
//       } else {
//         lines.push(currentLine);
//         currentLine = word;
//       }
//     }
//     lines.push(currentLine);
//     return lines;
//   };

 const wrapText = (
    text: string,
    font: PDFFont, 
    fontSize: number,
    maxWidth: number
  ) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { height, width } = page.getSize();

      // Embed Fonts
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      // Layout Constants
      const margin = 50;
      let y = height - margin;
      const lineHeight = 14;
      const titleFontSize = 24;
      const headerFontSize = 16;
      const bodyFontSize = 12;

      // --- 1. Header Section ---
      page.drawText("EMPLOYMENT AGREEMENT", {
        x: width / 2 - 150,
        y,
        size: titleFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= 40;

      // --- 2. Intro Details ---
      const introText = `This Employment Agreement ("Agreement") is entered into as of the Effective Date between ${sampleContractData.companyName} ("Company") and ${sampleContractData.employeeName} ("Employee").`;
      const introLines = wrapText(
        introText,
        font,
        bodyFontSize,
        width - 2 * margin
      );

      introLines.forEach((line) => {
        page.drawText(line, {
          x: margin,
          y,
          size: bodyFontSize,
          font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
      });

      y -= 20; // Spacing

      // --- 3. Key Info Box (Simple Visual Block) ---
      const keyInfo = [
        `Role: ${sampleContractData.employeeRole}`,
        `Start Date: ${sampleContractData.startDate}`,
        `Salary: ${sampleContractData.salary}`,
      ];

      keyInfo.forEach((info) => {
        page.drawText(info, {
          x: margin + 20,
          y,
          size: bodyFontSize,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.3),
        });
        y -= lineHeight;
      });
      y -= 30; // Extra spacing before sections

      // --- 4. Iterate JSON Sections ---
      for (const section of sampleContractData.sections) {
        // Check if we need a new page for the header
        if (y < margin + 40) {
          const newPage = pdfDoc.addPage();
          y = newPage.getHeight() - margin;
        }

        // Draw Section Title
        page.drawText(section.title, {
          x: margin,
          y,
          size: headerFontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight + 5; // Gap after header

        // Draw Section Content (with wrapping)
        const contentLines = wrapText(
          section.content,
          font,
          bodyFontSize,
          width - 2 * margin
        );

        for (const line of contentLines) {
          // Check if we need a new page for the body text
          if (y < margin + 20) {
            const newPage = pdfDoc.addPage();
            y = newPage.getHeight() - margin;
          }
          page.drawText(line, {
            x: margin,
            y,
            size: bodyFontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= lineHeight;
        }

        y -= 20; // Gap between sections
      }

      // --- 5. Footer / Signatures Area ---
      y -= 20;
      if (y < margin + 100) {
        const newPage = pdfDoc.addPage();
        y = newPage.getHeight() - margin;
      }

      const signLineY = y - 40;
      page.drawLine({
        start: { x: margin, y: signLineY },
        end: { x: margin + 200, y: signLineY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      page.drawText("Employer Signature", {
        x: margin,
        y: signLineY - 15,
        size: 10,
        font,
      });

      page.drawLine({
        start: { x: width - margin - 200, y: signLineY },
        end: { x: width - margin, y: signLineY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      page.drawText("Employee Signature", {
        x: width - margin - 200,
        y: signLineY - 15,
        size: 10,
        font,
      });

      // --- 6. Save ---
      const pdfBytes = await pdfDoc.save();
      //const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${sampleContractData.employeeName.replace(
        /\s+/g,
        "_"
      )}_Contract.pdf`;
      link.click();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate contract PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 flex flex-col items-center font-['Inter']">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Contract Generator
        </h2>
        <p className="text-slate-500 font-medium">
          Generate professional employment agreements from JSON data
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Data Preview Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Contract Data (JSON)
            </span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="p-6 overflow-auto max-h-[500px] bg-slate-50">
            <pre className="text-xs font-mono text-slate-600 leading-relaxed">
              {JSON.stringify(sampleContractData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-indigo-50 p-6 rounded-full mb-6">
            <Building2 className="text-indigo-600" size={48} />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            Ready to Generate?
          </h3>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">
            This will create a formatted PDF document including policies,
            benefits, and salary details for the employee.
          </p>

          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="w-full max-w-xs flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl hover:bg-indigo-600 disabled:bg-slate-300 transition-all shadow-lg shadow-indigo-200 active:scale-95 group"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Download
                size={20}
                className="group-hover:translate-y-0.5 transition-transform"
              />
            )}
            <span className="font-bold tracking-tight">
              {isGenerating ? "Generating PDF..." : "Download Contract"}
            </span>
          </button>

          <div className="mt-8 w-full grid grid-cols-1 gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="bg-slate-100 p-2 rounded-lg mt-1">
                <User size={16} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Employee
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {sampleContractData.employeeName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-slate-100 p-2 rounded-lg mt-1">
                <DollarSign size={16} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Salary
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {sampleContractData.salary}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-slate-100 p-2 rounded-lg mt-1">
                <Calendar size={16} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Start Date
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {sampleContractData.startDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-slate-400 text-xs font-medium">
        Client-side PDF generation &bull; Data stays in browser
      </footer>
    </div>
  );
};

export default ContractGenerator;
