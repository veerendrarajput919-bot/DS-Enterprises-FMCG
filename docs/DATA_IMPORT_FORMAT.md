# 📊 Data Import & Excel Format Specification — DS Enterprises

---

## 📌 Overview

DS Enterprises includes an intelligent client-side Excel parser that can ingest standard `.xlsx` / `.xls` spreadsheets exported from any Indian FMCG ERP/Billing software (such as **Tally ERP 9 / Tally Prime**, **Busy Accounting**, **Marg ERP 9+**, or **Vyapar**).

Data can be uploaded from the **`📥 Upload / Update`** tab in Admin mode.

---

## 📑 1. Sales Data Format (विक्री डेटा)

This sheet feeds into the **DS Sales Logic V7 Engine**, calculating Gross Sales, Net Sales, Returns, and Brand Margins.

### Required & Recognized Column Headers:
| Expected Column Name | Alternative Aliases Recognized by System | Data Type | Example Value |
| :--- | :--- | :---: | :--- |
| **Invoice No.** | `Bill No`, `Vch No`, `Invoice Number` | String | `INV-2026-0891` |
| **Date** | `Invoice Date`, `Bill Date`, `Vch Date` | Date / String | `2026-10-09` or `09/10/2026` |
| **Party Name** | `Customer Name`, `Account Name`, `Party` | String | `Aggarwal General Store` |
| **Item Name** | `Product Name`, `Item Description`, `SKU` | String | `Parle-G 100g Biscuit` |
| **Brand** | `Company`, `Brand Name`, `Manufacturer` | String | `Parle` |
| **Qty** | `Quantity`, `Billed Qty`, `Units` | Numeric | `24` *(Returns are negative e.g. -2)* |
| **Amount** | `Net Amount`, `Sales Value`, `Item Total` | Numeric | `1200.00` |
| **Route** | `Beat`, `Area`, `Market Route` | String | `Civil Lines` |
| **City_1** | `Tehsil`, `District`, `Zone` | String | `Ludhiana West` |
| **City** | `Town`, `Location`, `Place` | String | `Ludhiana` |

> [!NOTE]
> **Returns Calculation:** Items with negative quantities or negative amounts are automatically treated as Credit Notes / Sales Returns and subtracted from gross revenue.

---

## ⏳ 2. Outstanding / Unpaid Invoices Format (उधारी व बकाया)

This sheet generates the **Party-Wise and Brand-Wise Outstanding Tables** and powers the **Aging Buckets** (0-30, 31-60, 61-90, 90+ days).

### Required & Recognized Column Headers:
| Expected Column Name | Alternative Aliases | Data Type | Example Value |
| :--- | :--- | :---: | :--- |
| **Party Name** | `Account Name`, `Customer Name` | String | `Sharma Provision Store` |
| **Bill No.** | `Invoice No.`, `Voucher Ref` | String | `INV-2026-0742` |
| **Bill Date** | `Invoice Date`, `Date` | Date / String | `2026-08-15` |
| **Pending Amount** | `Balance Due`, `Outstanding`, `Net Due` | Numeric | `15400.00` |
| **Route** | `Beat Route`, `Area` | String | `Main Market` |
| **City_1** | `Zone`, `District` | String | `Central` |
| **City** | `City Name`, `Station` | String | `City Center` |

> [!TIP]
> **Aging Buckets:** The system automatically calculates overdue days based on the difference between today's date and the `Bill Date`.

---

## 📦 3. Stock / Inventory Format (स्टॉक व गोदाम इन्वेंटरी)

Feeds into the **Stock Valuation** and **Out-of-Stock Alert Matrix**.

### Required & Recognized Column Headers:
| Expected Column Name | Alternative Aliases | Data Type | Example Value |
| :--- | :--- | :---: | :--- |
| **Item Name** | `Description`, `Product Name`, `SKU` | String | `Maggi 2-Min Noodles 70g` |
| **Brand** | `Company Name`, `Brand` | String | `Nestle` |
| **Item Category Name** | `Category`, `Group`, `Sub-Category` | String | `Packaged Food` |
| **Firm Name** | `Firm`, `Division`, `Depot` | String | `DS Enterprises Unit 1` |
| **Closing Qty** | `Available Qty`, `In-Stock`, `Bal Qty` | Numeric | `140` |
| **Rate** | `Cost Rate`, `Purchase Rate`, `Unit Price` | Numeric | `12.50` |
| **Closing Value** | `Stock Value`, `Total Valuation` | Numeric | `1750.00` |

---

## 🏪 4. Party / Retailer Master Mapping (दुकानों की बीट मैपिंग)

Used to populate the **Sales Officer Beat Dashboard** and map store credit limits.

### Required & Recognized Column Headers:
| Expected Column Name | Alternative Aliases | Data Type | Example Value |
| :--- | :--- | :---: | :--- |
| **Party Name** | `Store Name`, `Retailer Name` | String | `Gupta Confectionery` |
| **Route** | `Beat`, `Assigned Route` | String | `Civil Lines` |
| **City_1** | `Zone`, `District` | String | `East Zone` |
| **City** | `City`, `Town` | String | `Model Town` |
| **Party Category** | `Store Type`, `Trade Class` | String | `General Store` |
| **Owner Name** | `Contact Person`, `Proprietor` | String | `Rajesh Gupta` |
| **Mob No.** | `Phone`, `Mobile`, `WhatsApp No` | String | `9876543210` |

---

## 🛡️ Data Validation Rules
1. **Empty Rows:** Blank lines in Excel are automatically stripped.
2. **Numeric Fields:** Strings with currency symbols (e.g. `₹ 1,200/-`) are cleaned and parsed into pure floats.
3. **Missing Routes:** Stores without assigned routes are automatically placed into `'Unmapped'` for audit.
