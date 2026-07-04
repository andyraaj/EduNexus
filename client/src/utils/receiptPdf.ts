/**
 * receiptPdf.ts
 * Client-side receipt PDF generator using the browser's print API.
 * No external dependencies required.
 */

export interface ReceiptData {
    transactionId: string;
    amount: number;
    paymentDate: string;
    method: string;
    studentName?: string;
    invoiceType?: string;
    invoiceDescription?: string;
}

export const generateReceiptPDF = (payment: ReceiptData): void => {
    const dateStr = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const methodDisplay = payment.method
        .replace(/_/g, ' ')
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Payment Receipt - ${payment.transactionId}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 40px 20px;
        }
        .receipt {
            background: #ffffff;
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.12);
        }
        .receipt-header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 32px;
            text-align: center;
        }
        .receipt-header .logo {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -1px;
            margin-bottom: 4px;
        }
        .receipt-header .tagline {
            font-size: 13px;
            opacity: 0.85;
            margin-bottom: 20px;
        }
        .receipt-header .check-circle {
            width: 64px;
            height: 64px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
        }
        .receipt-header h2 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 2px;
        }
        .receipt-header .paid-on {
            font-size: 13px;
            opacity: 0.8;
        }
        .amount-section {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 28px 32px;
            text-align: center;
        }
        .amount-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .amount-value {
            font-size: 44px;
            font-weight: 900;
            color: #10b981;
            letter-spacing: -2px;
        }
        .amount-status {
            display: inline-block;
            margin-top: 8px;
            background: #dcfce7;
            color: #15803d;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .details-section {
            padding: 28px 32px;
        }
        .section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #94a3b8;
            font-weight: 700;
            margin-bottom: 16px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-label {
            font-size: 13px;
            color: #64748b;
            font-weight: 500;
        }
        .detail-value {
            font-size: 13px;
            color: #0f172a;
            font-weight: 700;
            text-align: right;
            max-width: 280px;
        }
        .txn-badge {
            background: #f3f4f6;
            color: #374151;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 600;
        }
        .receipt-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 20px 32px;
            text-align: center;
        }
        .receipt-footer p {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.6;
        }
        .receipt-footer .institution {
            font-weight: 800;
            color: #4f46e5;
            font-size: 13px;
            margin-bottom: 4px;
        }
        .divider {
            border: none;
            border-top: 2px dashed #e2e8f0;
            margin: 4px 0 20px;
        }
        @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="receipt-header">
            <div class="logo">🎓 EduNexus ERP</div>
            <div class="tagline">Integrated College Management System</div>
            <div class="check-circle">✓</div>
            <h2>Payment Successful</h2>
            <p class="paid-on">Paid on ${dateStr}</p>
        </div>

        <div class="amount-section">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">₹${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span class="amount-status">Confirmed</span>
        </div>

        <div class="details-section">
            <div class="section-title">Transaction Details</div>

            <div class="detail-row">
                <span class="detail-label">Transaction ID</span>
                <span class="detail-value"><span class="txn-badge">${payment.transactionId}</span></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${methodDisplay}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Date</span>
                <span class="detail-value">${dateStr}</span>
            </div>
            ${payment.invoiceType ? `
            <div class="detail-row">
                <span class="detail-label">Fee Category</span>
                <span class="detail-value">${payment.invoiceType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
            </div>` : ''}
            ${payment.invoiceDescription ? `
            <div class="detail-row">
                <span class="detail-label">Description</span>
                <span class="detail-value">${payment.invoiceDescription}</span>
            </div>` : ''}
            ${payment.studentName ? `
            <div class="detail-row">
                <span class="detail-label">Student</span>
                <span class="detail-value">${payment.studentName}</span>
            </div>` : ''}
        </div>

        <div class="receipt-footer">
            <p class="institution">EduNexus ERP — Finance Department</p>
            <hr class="divider" />
            <p>This is a computer-generated receipt and does not require a physical signature.<br/>
            Please retain this document for your records and present it when required.<br/>
            For queries: <strong>finance@EduNexus.edu</strong></p>
        </div>
    </div>
    <script>
        window.onload = () => {
            setTimeout(() => window.print(), 300);
        };
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=640,height=800,scrollbars=yes');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
};
