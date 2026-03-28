import React, { useRef, useState, useEffect } from "react";
import { Invoice, Language, InvoiceSettings } from "../types";
import {
  fetchInvoiceSettings,
  getDefaultSettings,
} from "../services/invoiceSettingsService";

// Declare html2pdf
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface InvoiceTemplateProps {
  invoice: Invoice;
  lang: Language;
  onPrint?: () => void;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  invoice,
  lang,
  onPrint,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(
    getDefaultSettings()
  );

  useEffect(() => {
    const loadSettings = async () => {
      const data = await fetchInvoiceSettings();
      if (data) setSettings(data);
    };
    loadSettings();
  }, []);

  // Create COMPANY_DETAILS from settings
  const COMPANY_DETAILS = {
    name: settings.companyName,
    street: settings.companyStreet,
    houseNumber: settings.companyHouseNumber,
    postalCode: settings.companyPostalCode,
    city: settings.companyCity,
    country: settings.companyCountry,
    phone: settings.companyPhone,
    email: settings.companyEmail,
    website: settings.companyWebsite,
    kvk: settings.companyKvk,
    btw: settings.companyBtw,
    iban: settings.companyIban,
    bic: settings.companyBic,
  };

  const labels = {
    invoice: { nl: "Factuur", en: "Invoice", pl: "Faktura" },
    invoiceNumber: {
      nl: "Factuurnummer",
      en: "Invoice Number",
      pl: "Numer faktury",
    },
    invoiceDate: { nl: "Factuurdatum", en: "Invoice Date", pl: "Data faktury" },
    dueDate: { nl: "Vervaldatum", en: "Due Date", pl: "Termin płatności" },
    billTo: { nl: "Factuuradres", en: "Bill To", pl: "Nabywca" },
    from: { nl: "Van", en: "From", pl: "Sprzedawca" },
    description: { nl: "Omschrijving", en: "Description", pl: "Opis" },
    product: { nl: "Product", en: "Product", pl: "Produkt" },
    quantity: { nl: "Aantal", en: "Quantity", pl: "Ilość" },
    unitPrice: { nl: "Prijs per stuk", en: "Unit Price", pl: "Cena jedn." },
    total: { nl: "Totaal", en: "Total", pl: "Wartość" },
    subtotal: { nl: "Subtotaal", en: "Subtotal", pl: "Suma netto" },
    btw: { nl: "BTW", en: "VAT", pl: "VAT" },
    totalDue: { nl: "Te betalen", en: "Total Due", pl: "Do zapłaty" },
    paymentDetails: {
      nl: "Betalingsgegevens",
      en: "Payment Details",
      pl: "Dane do płatności",
    },
    iban: { nl: "IBAN", en: "IBAN", pl: "IBAN" },
    bic: { nl: "BIC", en: "BIC", pl: "BIC" },
    reference: { nl: "Referentie", en: "Reference", pl: "Tytuł przelewu" },
    thankYou: {
      nl: "Bedankt voor uw bestelling!",
      en: "Thank you for your order!",
      pl: "Dziękujemy za zamówienie!",
    },
    status: { nl: "Status", en: "Status", pl: "Status" },
    paid: { nl: "BETAALD", en: "PAID", pl: "OPŁACONE" },
    unpaid: { nl: "ONBETAALD", en: "UNPAID", pl: "NIEOPŁACONE" },
    kvk: { nl: "KVK", en: "CoC", pl: "KRS" },
    btwnr: { nl: "BTW-nr", en: "VAT No.", pl: "NIP" },
    print: { nl: "Afdrukken", en: "Print", pl: "Drukuj" },
    download: { nl: "Download PDF", en: "Download PDF", pl: "Pobierz PDF" },
  };

  const L = (key: keyof typeof labels) => labels[key][lang];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      lang === "pl" ? "pl-PL" : lang === "nl" ? "nl-NL" : "en-GB",
      { year: "numeric", month: "long", day: "numeric" }
    );
  };

  const getInvoiceStyles = () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: white; 
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .invoice-container { padding: 40px; position: relative; }
    .watermark { 
      position: absolute; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%) rotate(-30deg); 
      opacity: 0.08; 
      pointer-events: none;
      max-width: 400px;
      max-height: 400px;
    }
    .invoice-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 4px solid ${settings.primaryColor};
    }
    .company-logo { max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 12px; }
    .company-info { }
    .company-name { font-size: 24px; font-weight: 900; color: ${settings.primaryColor}; margin-bottom: 8px; }
    .company-details { font-size: 13px; color: #666; line-height: 1.6; }
    .invoice-title-section { text-align: right; }
    .invoice-title { font-size: 36px; font-weight: 900; color: ${settings.secondaryColor}; }
    .invoice-number { font-size: 14px; color: #666; margin-top: 8px; }
    .status-badge { 
      display: inline-block; 
      padding: 8px 20px; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 700; 
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 12px;
    }
    .status-paid { background: #d1fae5; color: ${settings.accentColor}; }
    .status-unpaid { background: #fee2e2; color: #dc2626; }
    .addresses { display: flex; gap: 60px; margin-bottom: 40px; }
    .address-block { flex: 1; }
    .address-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
    .address-content { font-size: 13px; line-height: 1.7; }
    .address-company { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
    .address-name { font-weight: 600; }
    .address-line { color: #555; }
    .address-meta { font-size: 11px; color: #888; margin-top: 8px; }
    .meta-row { display: flex; gap: 60px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .meta-item { }
    .meta-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .meta-value { font-size: 15px; font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { 
      background: #f8f8f8; 
      padding: 14px 12px; 
      text-align: left; 
      font-size: 10px; 
      font-weight: 700; 
      text-transform: uppercase; 
      letter-spacing: 1px;
      color: #666;
      border-bottom: 2px solid #eee;
    }
    .items-table th.right { text-align: right; }
    .items-table td { padding: 16px 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
    .items-table td.right { text-align: right; }
    .item-row { }
    .item-image { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; }
    .item-info { }
    .item-name { font-weight: 700; font-size: 14px; color: ${settings.secondaryColor}; margin-bottom: 6px; }
    .item-desc { font-size: 12px; color: #666; line-height: 1.5; max-width: 400px; white-space: pre-wrap; }
    .item-qty { font-weight: 600; text-align: right; }
    .item-price { font-weight: 500; text-align: right; }
    .item-total { font-weight: 700; text-align: right; color: ${settings.secondaryColor}; }
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals { width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
    .total-label { color: #666; }
    .total-value { font-weight: 500; }
    .total-row.main { border-top: 3px solid ${settings.secondaryColor}; padding-top: 16px; margin-top: 10px; }
    .total-row.main .total-label { font-weight: 900; font-size: 16px; color: ${settings.secondaryColor}; }
    .total-row.main .total-value { font-weight: 900; font-size: 22px; color: ${settings.primaryColor}; }
    .payment-section { background: #f8f8f8; padding: 28px; border-radius: 16px; margin-bottom: 40px; }
    .payment-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 16px; }
    .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .payment-row { display: flex; gap: 16px; font-size: 13px; }
    .payment-row.full { grid-column: span 2; }
    .payment-label { width: 80px; color: #666; }
    .payment-value { font-weight: 600; font-family: 'Consolas', monospace; }
    .footer { text-align: center; padding-top: 30px; border-top: 1px solid #eee; }
    .footer-thanks { font-size: 14px; color: #666; margin-bottom: 8px; }
    .footer-website { font-size: 12px; color: #999; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  `;

  // Helper to get full image URL
  const getFullImageUrl = (imagePath: string | undefined): string => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    // For local images, use the current origin
    return `${window.location.origin}${imagePath}`;
  };

  const getThankYouMessage = () => {
    if (lang === "nl")
      return settings.thankYouMessageNl || "Bedankt voor uw bestelling!";
    if (lang === "en")
      return settings.thankYouMessageEn || "Thank you for your order!";
    return settings.thankYouMessagePl || "Dziękujemy za zamówienie!";
  };

  const generateInvoiceHTML = () => {
    return `
      <div class="invoice-container">
        ${
          settings.showWatermark && settings.watermarkUrl
            ? `<img src="${getFullImageUrl(
                settings.watermarkUrl
              )}" class="watermark" />`
            : ""
        }
        <div class="invoice-header">
          <div class="company-info">
            ${
              settings.showLogo && settings.logoUrl
                ? `<img src="${getFullImageUrl(
                    settings.logoUrl
                  )}" class="company-logo" />`
                : ""
            }
            <div class="company-name">${COMPANY_DETAILS.name}</div>
            <div class="company-details">
              ${COMPANY_DETAILS.street} ${COMPANY_DETAILS.houseNumber}<br>
              ${COMPANY_DETAILS.postalCode} ${COMPANY_DETAILS.city}<br>
              ${COMPANY_DETAILS.phone}<br>
              ${COMPANY_DETAILS.email}
            </div>
          </div>
          <div class="invoice-title-section">
            <div class="invoice-title">${L("invoice")}</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <div class="status-badge ${
              invoice.status === "paid" ? "status-paid" : "status-unpaid"
            }">
              ${invoice.status === "paid" ? L("paid") : L("unpaid")}
            </div>
          </div>
        </div>

        <div class="addresses">
          <div class="address-block">
            <div class="address-label">${L("billTo")}</div>
            <div class="address-content">
              ${
                invoice.billingAddress?.company
                  ? `<div class="address-company">${invoice.billingAddress.company}</div>`
                  : ""
              }
              <div class="address-name">${invoice.customerName}</div>
              ${
                invoice.billingAddress
                  ? `
                <div class="address-line">${invoice.billingAddress.street} ${invoice.billingAddress.houseNumber}</div>
                <div class="address-line">${invoice.billingAddress.postalCode} ${invoice.billingAddress.city}</div>
                <div class="address-line">${invoice.billingAddress.country}</div>
              `
                  : ""
              }
              ${
                invoice.customerEmail
                  ? `<div class="address-meta">${invoice.customerEmail}</div>`
                  : ""
              }
              ${
                invoice.customerPhone
                  ? `<div class="address-meta">${invoice.customerPhone}</div>`
                  : ""
              }
              ${
                settings.showKvkBtw && invoice.billingAddress?.kvk
                  ? `<div class="address-meta">${L("kvk")}: ${
                      invoice.billingAddress.kvk
                    }</div>`
                  : ""
              }
              ${
                settings.showKvkBtw && invoice.billingAddress?.btw
                  ? `<div class="address-meta">${L("btwnr")}: ${
                      invoice.billingAddress.btw
                    }</div>`
                  : ""
              }
            </div>
          </div>
          <div class="address-block">
            <div class="address-label">${L("from")}</div>
            <div class="address-content">
              <div class="address-company">${COMPANY_DETAILS.name}</div>
              <div class="address-line">${COMPANY_DETAILS.street} ${
      COMPANY_DETAILS.houseNumber
    }</div>
              <div class="address-line">${COMPANY_DETAILS.postalCode} ${
      COMPANY_DETAILS.city
    }</div>
              <div class="address-line">${COMPANY_DETAILS.country}</div>
              ${
                settings.showKvkBtw
                  ? `<div class="address-meta">${L("kvk")}: ${
                      COMPANY_DETAILS.kvk
                    }</div>`
                  : ""
              }
              ${
                settings.showKvkBtw
                  ? `<div class="address-meta">${L("btwnr")}: ${
                      COMPANY_DETAILS.btw
                    }</div>`
                  : ""
              }
            </div>
          </div>
        </div>

        <div class="meta-row">
          <div class="meta-item">
            <div class="meta-label">${L("invoiceDate")}</div>
            <div class="meta-value">${formatDate(invoice.date)}</div>
          </div>
          ${
            invoice.dueDate
              ? `
            <div class="meta-item">
              <div class="meta-label">${L("dueDate")}</div>
              <div class="meta-value">${formatDate(invoice.dueDate)}</div>
            </div>
          `
              : ""
          }
        </div>

        <table class="items-table">
          <thead>
            <tr>
              ${
                settings.showProductImages
                  ? '<th style="width: 70px;"></th>'
                  : ""
              }
              <th>${L("product")} / ${L("description")}</th>
              <th class="right" style="width: 80px;">${L("quantity")}</th>
              <th class="right" style="width: 100px;">${L("unitPrice")}</th>
              <th class="right" style="width: 100px;">${L("total")}</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item) => `
              <tr class="item-row">
                ${
                  settings.showProductImages
                    ? `
                <td>
                  ${
                    item.productImage
                      ? `<img src="${getFullImageUrl(
                          item.productImage
                        )}" class="item-image" />`
                      : ""
                  }
                </td>
                `
                    : ""
                }
                <td class="item-info">
                  <div class="item-name">${item.productName}</div>
                  ${
                    settings.showProductDescriptions && item.productDescription
                      ? `<div class="item-desc">${item.productDescription}</div>`
                      : ""
                  }
                </td>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-price">€${item.unitPrice.toFixed(2)}</td>
                <td class="item-total">€${item.lineTotal.toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals">
            <div class="total-row">
              <span class="total-label">${L("subtotal")}</span>
              <span class="total-value">€${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span class="total-label">${L("btw")} (${
      invoice.btwPercentage
    }%)</span>
              <span class="total-value">€${invoice.btwAmount.toFixed(2)}</span>
            </div>
            <div class="total-row main">
              <span class="total-label">${L("totalDue")}</span>
              <span class="total-value">€${invoice.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${
          settings.showPaymentSection
            ? `
        <div class="payment-section">
          <div class="payment-title">${L("paymentDetails")}</div>
          <div class="payment-grid">
            <div class="payment-row">
              <span class="payment-label">${L("iban")}:</span>
              <span class="payment-value">${COMPANY_DETAILS.iban}</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">${L("bic")}:</span>
              <span class="payment-value">${COMPANY_DETAILS.bic}</span>
            </div>
            <div class="payment-row full">
              <span class="payment-label">${L("reference")}:</span>
              <span class="payment-value">${invoice.invoiceNumber}</span>
            </div>
          </div>
        </div>
        `
            : ""
        }

        <div class="footer">
          <div class="footer-thanks">${getThankYouMessage()}</div>
          ${
            settings.showWebsite && COMPANY_DETAILS.website
              ? `<div class="footer-website">${COMPANY_DETAILS.website}</div>`
              : ""
          }
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${L("invoice")} ${invoice.invoiceNumber}</title>
        <style>${getInvoiceStyles()}</style>
      </head>
      <body>
        ${generateInvoiceHTML()}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    // Dynamically load html2pdf.js if not loaded
    if (!window.html2pdf) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      document.head.appendChild(script);
      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    // Create a temporary container with the invoice HTML
    const container = document.createElement("div");
    container.innerHTML = `
      <style>${getInvoiceStyles()}</style>
      ${generateInvoiceHTML()}
    `;
    document.body.appendChild(container);

    const opt = {
      margin: 10,
      filename: `${invoice.invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    try {
      await window.html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error("PDF generation error:", error);
      // Fallback to print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${L("invoice")} ${invoice.invoiceNumber}</title>
            <style>${getInvoiceStyles()}</style>
          </head>
          <body>
            ${generateInvoiceHTML()}
            <script>
              window.onload = function() {
                document.title = "${L("invoice")} ${invoice.invoiceNumber}";
                setTimeout(function() { window.print(); }, 300);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } finally {
      document.body.removeChild(container);
    }
  };
  return (
    <div className="bg-white text-gray-900 rounded-3xl overflow-hidden">
      {/* Action buttons */}
      <div className="p-4 bg-gray-100 flex justify-end gap-3 no-print">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-900 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          {L("print")}
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-3 bg-pink-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-pink-600 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {L("download")}
        </button>
      </div>

      {/* Invoice content - preview */}
      <div ref={printRef} className="p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-10 pb-8 border-b-4 border-pink-500">
          <div>
            <h1 className="text-2xl font-black text-pink-500">
              {COMPANY_DETAILS.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {COMPANY_DETAILS.street} {COMPANY_DETAILS.houseNumber}
            </p>
            <p className="text-sm text-gray-500">
              {COMPANY_DETAILS.postalCode} {COMPANY_DETAILS.city}
            </p>
            <p className="text-sm text-gray-500">{COMPANY_DETAILS.phone}</p>
            <p className="text-sm text-gray-500">{COMPANY_DETAILS.email}</p>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-gray-900">
              {L("invoice")}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {invoice.invoiceNumber}
            </p>
            <div
              className={`mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                invoice.status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {invoice.status === "paid" ? L("paid") : L("unpaid")}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-10 mb-10">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {L("billTo")}
            </p>
            <div className="text-sm">
              {invoice.billingAddress?.company && (
                <p className="font-bold text-base">
                  {invoice.billingAddress.company}
                </p>
              )}
              <p className="font-semibold">{invoice.customerName}</p>
              {invoice.billingAddress && (
                <>
                  <p className="text-gray-600">
                    {invoice.billingAddress.street}{" "}
                    {invoice.billingAddress.houseNumber}
                  </p>
                  <p className="text-gray-600">
                    {invoice.billingAddress.postalCode}{" "}
                    {invoice.billingAddress.city}
                  </p>
                  <p className="text-gray-600">
                    {invoice.billingAddress.country}
                  </p>
                </>
              )}
              {invoice.customerEmail && (
                <p className="text-gray-500 mt-2">{invoice.customerEmail}</p>
              )}
              {invoice.customerPhone && (
                <p className="text-gray-500">{invoice.customerPhone}</p>
              )}
              {invoice.billingAddress?.kvk && (
                <p className="text-gray-500 text-xs mt-2">
                  {L("kvk")}: {invoice.billingAddress.kvk}
                </p>
              )}
              {invoice.billingAddress?.btw && (
                <p className="text-gray-500 text-xs">
                  {L("btwnr")}: {invoice.billingAddress.btw}
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {L("from")}
            </p>
            <div className="text-sm">
              <p className="font-bold text-base">{COMPANY_DETAILS.name}</p>
              <p className="text-gray-600">
                {COMPANY_DETAILS.street} {COMPANY_DETAILS.houseNumber}
              </p>
              <p className="text-gray-600">
                {COMPANY_DETAILS.postalCode} {COMPANY_DETAILS.city}
              </p>
              <p className="text-gray-600">{COMPANY_DETAILS.country}</p>
              <p className="text-gray-500 text-xs mt-2">
                {L("kvk")}: {COMPANY_DETAILS.kvk}
              </p>
              <p className="text-gray-500 text-xs">
                {L("btwnr")}: {COMPANY_DETAILS.btw}
              </p>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex gap-10 mb-10 pb-6 border-b border-gray-200">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {L("invoiceDate")}
            </p>
            <p className="font-semibold">{formatDate(invoice.date)}</p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {L("dueDate")}
              </p>
              <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="bg-gray-100">
              {settings.showProductImages && (
                <th
                  className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500"
                  style={{ width: "70px" }}
                ></th>
              )}
              <th className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {L("product")} / {L("description")}
              </th>
              <th
                className="p-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-500"
                style={{ width: "80px" }}
              >
                {L("quantity")}
              </th>
              <th
                className="p-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-500"
                style={{ width: "100px" }}
              >
                {L("unitPrice")}
              </th>
              <th
                className="p-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-500"
                style={{ width: "100px" }}
              >
                {L("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                {settings.showProductImages && (
                  <td className="p-3">
                    {item.productImage && (
                      <img
                        src={getFullImageUrl(item.productImage)}
                        alt=""
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                  </td>
                )}
                <td className="p-3">
                  <p className="font-bold text-sm">{item.productName}</p>
                  {settings.showProductDescriptions &&
                    item.productDescription && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-sm">
                        {item.productDescription}
                      </p>
                    )}
                </td>
                <td className="p-3 text-right font-semibold">
                  {item.quantity}x
                </td>
                <td className="p-3 text-right font-medium">
                  €{item.unitPrice.toFixed(2)}
                </td>
                <td className="p-3 text-right font-bold text-gray-900">
                  €{item.lineTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-500">{L("subtotal")}</span>
              <span className="font-medium">
                €{invoice.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-500">
                {L("btw")} ({invoice.btwPercentage}%)
              </span>
              <span className="font-medium">
                €{invoice.btwAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-4 border-t-2 border-gray-900 mt-2">
              <span className="font-black text-lg">{L("totalDue")}</span>
              <span className="font-black text-2xl text-pink-500">
                €{invoice.amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div className="bg-gray-50 p-6 rounded-2xl mt-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            {L("paymentDetails")}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex gap-4">
              <span className="text-gray-500 w-24">{L("iban")}:</span>
              <span className="font-mono font-semibold">
                {COMPANY_DETAILS.iban}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-500 w-24">{L("bic")}:</span>
              <span className="font-mono font-semibold">
                {COMPANY_DETAILS.bic}
              </span>
            </div>
            <div className="flex gap-4 col-span-2">
              <span className="text-gray-500 w-24">{L("reference")}:</span>
              <span className="font-mono font-semibold">
                {invoice.invoiceNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">{L("thankYou")}</p>
          <p className="text-xs text-gray-400 mt-2">
            {COMPANY_DETAILS.website}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
