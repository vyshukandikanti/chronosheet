"""
Tiny helper script that creates a sample Excel file for testing the upload endpoint.
Run this once to generate test_spreadsheet.xlsx in the backend folder.
"""

from openpyxl import Workbook

# Create a new workbook with one sheet
workbook = Workbook()
sheet = workbook.active
sheet.title = "Sales Report"

# Add some realistic-looking data
data = [
    ["#", "Item", "Amount", "Date", "Category"],
    [1, "Office Rent", 40000, "May 01", "Expense"],
    [2, "Supplies", 12500, "May 03", "Expense"],
    [3, "Vendor X Payment", 75000, "May 15", "Expense"],
    [4, "Marketing Campaign", 20000, "May 20", "Expense"],
    [5, "Client Invoice A", 85000, "May 22", "Revenue"],
    [6, "Client Invoice B", 60000, "May 25", "Revenue"],
    [7, "Software License", 15000, "May 28", "Expense"],
    [8, "Bonus Payment", 30000, "May 30", "Expense"],
]

# Write the data into the sheet
for row in data:
    sheet.append(row)

# Save the file
filename = "test_spreadsheet.xlsx"
workbook.save(filename)
print(f"Created {filename} with {len(data)} rows.")
