import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Customer, CustomerPolicy as Policy, Lead, Claim, Renewal } from '../types';

export const exportAnalyticsToPDF = (
    data: { 
        customers: Customer[];
        policies: Policy[];
        leads: Lead[];
        claims: Claim[];
        renewals: Renewal[];
    },
    month: string
) => {
    const doc = new jsPDF() as any;

    doc.setFontSize(18);
    doc.text(`UV Insurance Analytics Report (${month})`, 14, 22);

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Summary Section
    const activePolicies = data.policies.filter(p => p.status === 'active').length;
    const pendingClaims = data.claims.filter(c => c.status === 'Filed' || c.status === 'Review').length;
    const totalRevenue = data.policies.reduce((acc, p) => acc + (p.premium_amount || 0), 0);

    doc.autoTable({
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
            ['Total Customers', data.customers.length.toString()],
            ['Active Policies', activePolicies.toString()],
            ['Total Premium Revenue', `INR ${totalRevenue.toLocaleString()}`],
            ['Pending Claims', pendingClaims.toString()],
            ['Total Leads', data.leads.length.toString()],
        ],
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY || 40;

    // Policies AutoTable
    doc.text('Recent Policies', 14, finalY + 15);
    doc.autoTable({
        startY: finalY + 20,
        head: [['Policy Number', 'Type', 'Status', 'Premium']],
        body: data.policies.slice(0, 10).map(p => [
            p.policy_number,
            p.policy_type,
            p.status,
            `INR ${(p.premium_amount || 0).toLocaleString()}`
        ]),
        theme: 'striped'
    });

    doc.save(`Analytics_Report_${month}.pdf`);
};

export const exportAnalyticsToExcel = (
    data: { 
        customers: Customer[];
        policies: Policy[];
        leads: Lead[];
        claims: Claim[];
        renewals: Renewal[];
    },
    month: string
) => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
        ['Metric', 'Value'],
        ['Total Customers', data.customers.length],
        ['Active Policies', data.policies.filter(p => p.status === 'active').length],
        ['Total Premium Revenue', data.policies.reduce((acc, p) => acc + (p.premium_amount || 0), 0)],
        ['Pending Claims', data.claims.filter(c => c.status === 'Filed' || c.status === 'Review').length],
        ['Total Leads', data.leads.length]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Policies Sheet
    const policiesData = data.policies.map(p => ({
        'Policy Number': p.policy_number,
        'Type': p.policy_type,
        'Status': p.status,
        'Premium (INR)': p.premium_amount || 0,
        'Carrier': p.insurer,
        'Effective Date': p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'
    }));
    const wsPolicies = XLSX.utils.json_to_sheet(policiesData);
    XLSX.utils.book_append_sheet(wb, wsPolicies, 'Policies');

    // Customers Sheet
    const customersData = data.customers.map(c => ({
        'Name': c.full_name,
        'Email': c.email,
        'Phone': c.phone,
        'Status': c.status,
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customersData);
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

    XLSX.writeFile(wb, `Analytics_Report_${month}.xlsx`);
};
