export const generateCertificate = (userName, courseName, completionDate) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Background color
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 297, 210, 'F');

    // Border
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(5);
    doc.rect(10, 10, 277, 190);

    // Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF COMPLETION', 148.5, 50, { align: 'center' });

    // Subtitle
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('This is to certify that', 148.5, 75, { align: 'center' });

    // User Name
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(userName, 148.5, 95, { align: 'center' });

    // Text
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('has successfully completed the course', 148.5, 115, { align: 'center' });

    // Course Name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(courseName, 148.5, 135, { align: 'center' });

    // Date
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Completed on: ${completionDate}`, 148.5, 160, { align: 'center' });

    // Footer
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text('Kokostream LMS - Verified Certificate', 148.5, 185, { align: 'center' });

    // Save PDF
    doc.save(`Certificate_${courseName.replace(/\s+/g, '_')}.pdf`);
};
