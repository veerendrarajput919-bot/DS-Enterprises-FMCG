/**
 * ==========================================================================
 * DS ENTERPRISES — TEXT FORMAT & WHATSAPP COPY SERVICE
 * File: assets/js/whatsapp.js
 * Architecture: Formats orders, payment receipts, reminders & dispatch slips
 *               into clean text and copies directly to clipboard for pasting
 *               into WhatsApp (zero external redirects).
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const COMPANY_NAME = 'DS Enterprises';
  const COMPANY_CITY = 'Kanpur';
  const COMPANY_UPI = 'dsenterprises@upi';
  const HELPLINE = '+91 98390 12345';

  const DS_WhatsApp = {
    /**
     * Copy text to clipboard across all browser environments (HTTPS & file:// protocol)
     * @param {string} text
     * @param {string} successToast
     */
    copyToClipboard: function (text, successToast = '📋 Copied to clipboard! Paste directly into WhatsApp.') {
      if (!text) return;

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          if (window.DS_App) DS_App.toast(successToast, 'success');
        }).catch(() => {
          this.fallbackCopy(text, successToast);
        });
      } else {
        this.fallbackCopy(text, successToast);
      }
    },

    fallbackCopy: function (text, successToast) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful && window.DS_App) {
          DS_App.toast(successToast, 'success');
        }
      } catch (err) {
        if (window.DS_App) DS_App.toast('Could not auto-copy. Please use the Copy button in the dialog.', 'warning');
      }
      textArea.remove();
    },

    /**
     * Display a clean dialog with the formatted text and a prominent Copy button
     * @param {string} title
     * @param {string} text
     * @param {string} subtitle
     */
    showTextModal: function (title, text, subtitle = 'Text has been copied to your clipboard! Paste directly into WhatsApp message (Ctrl+V).') {
      // 1. Auto-copy immediately
      this.copyToClipboard(text, '📋 Text copied to clipboard! Ready to paste into WhatsApp.');

      // 2. Open or create modal
      let modal = document.getElementById('dsTextCopyModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dsTextCopyModal';
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-card" style="width:min(520px, 95%);">
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
              <span>📋</span> <span>${window.DS_App ? DS_App.escapeHtml(title) : title}</span>
            </h3>
            <button type="button" class="modal-close" aria-label="Close dialog" onclick="DS_App.closeModal('dsTextCopyModal')">×</button>
          </div>
          <div class="modal-body">
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; padding:10px 12px; border-radius:8px; font-size:12px; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">✓</span> <span>${window.DS_App ? DS_App.escapeHtml(subtitle) : subtitle}</span>
            </div>
            <textarea id="dsCopyModalTextarea" readonly class="form-control" 
              style="width:100%; height:230px; font-family:'Courier New', monospace; font-size:12px; line-height:1.45; white-space:pre-wrap; background:#f8fafc; resize:vertical; padding:10px; border:1px solid #cbd5e1;"
            >${window.DS_App ? DS_App.escapeHtml(text) : text}</textarea>
            <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-lg" style="flex:1; min-width:180px;" onclick="DS_WhatsApp.copyFromModalTextarea()">
                📋 Copy Text Again
              </button>
              <button type="button" class="btn btn-secondary btn-lg" onclick="DS_App.closeModal('dsTextCopyModal')">
                Close
              </button>
            </div>
          </div>
        </div>
      `;

      if (window.DS_App) {
        DS_App.openModal('dsTextCopyModal');
      } else {
        modal.classList.add('active');
      }
    },

    copyFromModalTextarea: function () {
      const ta = document.getElementById('dsCopyModalTextarea');
      if (ta) {
        this.copyToClipboard(ta.value, '📋 Copied to clipboard! Ready to paste into WhatsApp.');
      }
    },

    // ========================================================================
    // 1. ORDER CONFIRMATION TEXT GENERATOR & COPY
    // ========================================================================
    getOrderText: function (order) {
      if (!order) return '';
      const party = order.storeName || order.party || 'Valued Retailer';
      const items = order.items || [];
      const totalAmount = order.total || 0;
      const totalQty = order.qty || items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
      const bookedBy = order.salesPerson || 'Sales Officer';
      const orderDate = order.date ? (window.DS_App ? DS_App.formatDate(order.date) : order.date) : new Date().toLocaleDateString('en-IN');

      let itemsSummary = '';
      if (items.length > 0) {
        itemsSummary = items.map((it, idx) => 
          `${idx + 1}. *${it.name || it.item}*\n   Qty: ${it.qty} ${it.unit || 'Pcs'} × ₹ ${(Number(it.price || it.rate || 0)).toLocaleString('en-IN')} = *₹ ${(Number(it.total || 0)).toLocaleString('en-IN')}*`
        ).join('\n');
      } else {
        itemsSummary = `• Total Items: ${items.length} (${totalQty} Units)`;
      }

      return (
`*🏢 ${COMPANY_NAME.toUpperCase()} — ORDER CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━━
🏪 *Retailer / Store:* ${party}
🆔 *Order No:* #${order.id}
🧾 *Invoice / Bill No:* ${order.invoice_no || order.bill_no || 'Pending'}
📅 *Date:* ${orderDate}
📍 *Beat / Route:* ${order.route || 'General Route'}
👤 *Booked By:* ${bookedBy} (Sales Executive)

📦 *BOOKED PRODUCTS:*
${itemsSummary}

━━━━━━━━━━━━━━━━━━━━━
📊 *Total Quantity:* ${totalQty} Units
💰 *NET PAYABLE:* *₹ ${(Number(totalAmount)).toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━
🚚 *Status:* ${order.status || 'Submitted'}
📦 *Dispatch:* Scheduled for next beat delivery vehicle

_Thank you for your valuable order! For any changes, please contact your Sales Officer or Helpline._
📞 *Helpline:* ${HELPLINE}
✨ *${COMPANY_NAME} — ${COMPANY_CITY}*`
      );
    },

    copyOrderText: function (order) {
      if (!order) return;
      const text = this.getOrderText(order);
      this.showTextModal(`Order #${order.id} Text`, text, 'Order text copied! You can now paste (Ctrl+V) it into your WhatsApp message.');
    },

    // Backward compatibility: alias to copyOrderText
    sendOrderConfirmation: function (order) {
      this.copyOrderText(order);
    },

    // ========================================================================
    // 2. PAYMENT RECEIPT TEXT GENERATOR & COPY
    // ========================================================================
    getPaymentReceiptText: function (receipt) {
      if (!receipt) return '';
      const party = receipt.party || 'Valued Retailer';
      const receiptId = receipt.id || `REC-${Date.now()}`;
      const amount = Number(receipt.amount || 0);
      const mode = receipt.paymentMode || receipt.mode || 'Cash';
      const refNo = receipt.referenceNo || receipt.ref || (mode === 'Cash' ? 'Hand Cash' : 'UPI-Ref');
      const dateStr = receipt.date ? (window.DS_App ? DS_App.formatDate(receipt.date) : receipt.date) : new Date().toLocaleDateString('en-IN');
      const timeStr = receipt.time || '';
      const collector = receipt.collectedBy || 'Field Officer';

      let currentBal = '0.00';
      if (window.DS_Storage) {
        const db = window.DS_Storage.getDB();
        const p = (db.party || []).find(x => (x.name || x['Party Name']) === party);
        if (p) currentBal = Number(p.outstanding || 0).toLocaleString('en-IN');
      }

      return (
`*🏢 ${COMPANY_NAME.toUpperCase()} — PAYMENT ACKNOWLEDGMENT*
━━━━━━━━━━━━━━━━━━━━━
🧾 *Official Receipt No:* #${receiptId}
📅 *Date & Time:* ${dateStr} ${timeStr}
🏪 *Received From:* *${party}*
💵 *AMOUNT RECEIVED:* *₹ ${amount.toLocaleString('en-IN')}*
💳 *Payment Mode:* ${mode} (${refNo})
👤 *Collected By:* ${collector}
━━━━━━━━━━━━━━━━━━━━━
⏳ *Remaining Store Balance:* *₹ ${currentBal}*
━━━━━━━━━━━━━━━━━━━━━
_This is an authorized payment confirmation issued by ${COMPANY_NAME}._

_Thank you for your timely payment!_
📞 *Accounts & Billing:* ${HELPLINE}
✨ *${COMPANY_NAME} — ${COMPANY_CITY}*`
      );
    },

    copyPaymentReceipt: function (receipt) {
      if (!receipt) return;
      const text = this.getPaymentReceiptText(receipt);
      this.showTextModal(`Payment Receipt #${receipt.id || ''}`, text, 'Payment receipt text copied! Paste it into WhatsApp message.');
    },

    // Backward compatibility alias
    sendPaymentReceipt: function (receipt) {
      this.copyPaymentReceipt(receipt);
    },

    // ========================================================================
    // 3. OUTSTANDING DUES REMINDER TEXT GENERATOR & COPY
    // ========================================================================
    getOutstandingReminderText: function (unpaidRecord) {
      if (!unpaidRecord) return '';
      const party = unpaidRecord.party || 'Valued Retailer';
      const billNo = unpaidRecord.billNo || unpaidRecord['Invoice No.'] || 'INV-DUE';
      const billDate = unpaidRecord.date ? (window.DS_App ? DS_App.formatDate(unpaidRecord.date) : unpaidRecord.date) : 'Recent';
      const totalAmt = Number(unpaidRecord.totalAmount || unpaidRecord.AmountNum || 0);
      const dueAmt = Number(unpaidRecord.balanceAmount || unpaidRecord.AmountNum || totalAmt);
      const dueDays = unpaidRecord.dueDays || 0;
      const bucket = unpaidRecord.ageBucket || (dueDays > 30 ? 'Overdue 30+ Days' : 'Current Dues');

      return (
`*🏢 ${COMPANY_NAME.toUpperCase()} — PAYMENT REMINDER*
━━━━━━━━━━━━━━━━━━━━━
Dear *${party}*,
Warm greetings from *${COMPANY_NAME}*!

This is a gentle update regarding your outstanding FMCG supply invoices:

📄 *Invoice / Bill No:* #${billNo}
📅 *Bill Date:* ${billDate}
⏳ *Aging Status:* ${bucket} (${dueDays} Days overdue)
💰 *Bill Total:* ₹ ${totalAmt.toLocaleString('en-IN')}
⚠️ *BALANCE DUE:* *₹ ${dueAmt.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━
Kindly arrange for payment clearance during the next delivery visit or transfer via UPI:

💳 *Direct UPI ID:* \`${COMPANY_UPI}\`
🏦 *Beneficiary:* ${COMPANY_NAME}

_If already paid today, please ignore this reminder._

Thank you for your valued partnership!
📞 *Accounts Desk:* ${HELPLINE}`
      );
    },

    copyOutstandingReminder: function (unpaidRecord) {
      if (!unpaidRecord) return;
      const text = this.getOutstandingReminderText(unpaidRecord);
      this.showTextModal(`Payment Reminder — ${unpaidRecord.party || ''}`, text, 'Payment reminder text copied! Paste it into WhatsApp message.');
    },

    // Backward compatibility alias
    sendOutstandingReminder: function (unpaidRecord) {
      this.copyOutstandingReminder(unpaidRecord);
    },

    // ========================================================================
    // 4. DISPATCH CHALLAN & DELIVERY ALERT
    // ========================================================================
    getDispatchText: function (order, deliveryMeta) {
      if (!order) return '';
      const party = order.storeName || order.party || 'Valued Retailer';
      const vehicle = (deliveryMeta && deliveryMeta.vehicle) || 'UP78-BT-4921 (Tempo / Bolero Maxi)';
      const driver = (deliveryMeta && deliveryMeta.driver) || 'Ram Kishore (Mob: 9839011223)';
      const totalAmt = Number(order.total || 0).toLocaleString('en-IN');
      const itemsCount = (order.items || []).length;
      const totalQty = order.qty || (order.items || []).reduce((acc, i) => acc + (Number(i.qty) || 0), 0);

      return (
`*🏢 ${COMPANY_NAME.toUpperCase()} — DELIVERY DISPATCH ALERT*
━━━━━━━━━━━━━━━━━━━━━
Dear *${party}*,
Great news! Your FMCG order *#${order.id}* has been verified, packed and dispatched for delivery!

🚚 *Delivery Vehicle:* ${vehicle}
👤 *Delivery Executive:* ${driver}
📦 *Dispatched Consignment:* ${itemsCount} items (${totalQty} Units)
💵 *AMOUNT TO COLLECT / VERIFY:* *₹ ${totalAmt}*
━━━━━━━━━━━━━━━━━━━━━
⚠️ *Delivery Instructions:*
• Please inspect parcel seals and verify physical quantity with our delivery staff.
• Keep payment ready via Cash or UPI (\`${COMPANY_UPI}\`).

_Thank you for doing business with ${COMPANY_NAME}!_
📞 *Logistics Dispatch Helpline:* ${HELPLINE}`
      );
    },

    copyDispatchText: function (order, deliveryMeta) {
      if (!order) return;
      const text = this.getDispatchText(order, deliveryMeta);
      this.showTextModal(`Dispatch Alert #${order.id}`, text, 'Dispatch alert text copied! Paste it into WhatsApp message.');
    },

    // Backward compatibility alias
    sendDispatchAlert: function (order, deliveryMeta) {
      this.copyDispatchText(order, deliveryMeta);
    }
  };

  // Expose globally
  window.DS_WhatsApp = DS_WhatsApp;
  window.WhatsAppService = {
    copyOrder: function (order) { return DS_WhatsApp.copyOrderText(order); },
    copyReceipt: function (receipt) { return DS_WhatsApp.copyPaymentReceipt(receipt); },
    copyReminder: function (unpaid) { return DS_WhatsApp.copyOutstandingReminder(unpaid); },
    copyDispatch: function (order, meta) { return DS_WhatsApp.copyDispatchText(order, meta); },
    // Backward compatibility methods:
    sendOrder: function (order) { return DS_WhatsApp.copyOrderText(order); },
    sendReceipt: function (receipt) { return DS_WhatsApp.copyPaymentReceipt(receipt); },
    sendReminder: function (unpaid) { return DS_WhatsApp.copyOutstandingReminder(unpaid); },
    sendDispatch: function (order, meta) { return DS_WhatsApp.copyDispatchText(order, meta); }
  };

})(window);
