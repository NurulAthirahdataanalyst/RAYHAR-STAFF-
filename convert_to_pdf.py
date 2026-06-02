import sys
import os
import subprocess

def install_and_import(package_name, import_name=None):
    if import_name is None:
        import_name = package_name
    try:
        __import__(import_name)
    except ImportError:
        print(f"Installing {package_name}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])

# We need pywin32 to use Word COM automation on Windows
install_and_import("pywin32", "win32com")

import win32com.client

def convert_docx_to_pdf(docx_path, pdf_path):
    print(f"Opening Word to convert {docx_path} to {pdf_path}...")
    word = None
    doc = None
    try:
        # Resolve absolute paths
        docx_abs = os.path.abspath(docx_path)
        pdf_abs = os.path.abspath(pdf_path)
        
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        
        doc = word.Documents.Open(docx_abs)
        # 17 is the constant for PDF format (wdFormatPDF)
        doc.SaveAs(pdf_abs, FileFormat=17)
        print("Conversion completed successfully!")
    except Exception as e:
        print(f"Error during conversion: {e}")
        sys.exit(1)
    finally:
        if doc is not None:
            doc.Close()
        if word is not None:
            word.Quit()

if __name__ == "__main__":
    docx_file = r"C:\Users\HP\ATTENDANCE_SYSTEM\Proposal_Report_AW230109.docx"
    pdf_file = r"C:\Users\HP\ATTENDANCE_SYSTEM\Proposal_Report_AW230109.pdf"
    convert_docx_to_pdf(docx_file, pdf_file)
