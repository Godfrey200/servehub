import { useState, useEffect, useRef } from 'react';
import { getCases, getDonations } from '../lib/api';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CaseItem {
  caseId: string;
  beneficiaryName: string;
  status: string;
  priority: string;
  summary: string;
  createdAt: string;
}

interface DonationItem {
  donationId: string;
  donorName: string;
  type: string;
  amount?: number;
  description: string;
  status: string;
  receivedAt: string;
}

const TYPE_COLORS = ['#0F172A', '#164E63'];

function CaseTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded px-3 py-2 shadow-sm text-sm">
        <p className="font-medium text-primary mb-1">{label}</p>
        <p className="text-text-muted">
          Cases: <span className="font-semibold text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
}

function DonationTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded px-3 py-2 shadow-sm text-sm">
        <p className="font-medium text-primary mb-1">{payload[0].name}</p>
        <p className="text-text-muted">
          Count: <span className="font-semibold text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const casesChartRef = useRef<HTMLDivElement>(null);
  const donationsChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [casesData, donationsData] = await Promise.all([
          getCases(),
          getDonations(),
        ]);
        setCases(casesData);
        setDonations(donationsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const caseStats = {
    total: cases.length,
    new: cases.filter((c) => c.status === 'New').length,
    active: cases.filter((c) => c.status === 'Active').length,
    underReview: cases.filter((c) => c.status === 'Under Review').length,
    closed: cases.filter((c) => c.status === 'Closed').length,
  };

  const donationStats = {
    total: donations.length,
    financial: donations.filter((d) => d.type === 'Financial').length,
    inKind: donations.filter((d) => d.type === 'In-Kind').length,
    totalAmount: donations
      .filter((d) => d.type === 'Financial' && d.amount)
      .reduce((sum, d) => sum + (d.amount || 0), 0),
  };

  const caseChartData = [
    { name: 'New', value: caseStats.new },
    { name: 'Active', value: caseStats.active },
    { name: 'Under Review', value: caseStats.underReview },
    { name: 'Closed', value: caseStats.closed },
  ];

  const donationTypeData = [
    { name: 'Financial', value: donationStats.financial },
    { name: 'In-Kind', value: donationStats.inKind },
  ];

  const recentCases = [...cases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentDonations = [...donations]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5);

  async function exportChartPng(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed', err);
    }
  }

  function exportPdfReport() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('ServeHub Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Summary section
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Summary', 14, 40);

    doc.setFontSize(10);
    doc.text(`Total Cases: ${caseStats.total}`, 14, 48);
    doc.text(`Active Cases: ${caseStats.active}`, 14, 54);
    doc.text(`Total Donations: ${donationStats.total}`, 14, 60);
    doc.text(`Financial Total: $${donationStats.totalAmount.toLocaleString()}`, 14, 66);

    // Cases table
    autoTable(doc, {
      startY: 76,
      head: [['Beneficiary', 'Status', 'Priority', 'Created']],
      body: cases.slice(0, 15).map((c) => [
        c.beneficiaryName,
        c.status,
        c.priority,
        new Date(c.createdAt).toLocaleDateString(),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    // Donations table
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.text('Recent Donations', 14, finalY);

    autoTable(doc, {
      startY: finalY + 6,
      head: [['Donor', 'Type', 'Amount / Description', 'Status']],
      body: donations.slice(0, 15).map((d) => [
        d.donorName,
        d.type,
        d.type === 'Financial' && d.amount ? `$${d.amount}` : d.description,
        d.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`servehub-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-text-muted text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">Dashboard</h2>
        <button
          onClick={exportPdfReport}
          className="bg-primary text-white text-sm font-medium px-4 py-2 rounded hover:bg-secondary"
        >
          Export PDF Report
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-danger border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="border border-border bg-surface rounded p-5">
          <p className="text-sm text-text-muted mb-1">Total Cases</p>
          <p className="text-2xl font-semibold text-primary">{caseStats.total}</p>
        </div>
        <div className="border border-border bg-surface rounded p-5">
          <p className="text-sm text-text-muted mb-1">Active Cases</p>
          <p className="text-2xl font-semibold text-primary">{caseStats.active}</p>
        </div>
        <div className="border border-border bg-surface rounded p-5">
          <p className="text-sm text-text-muted mb-1">Total Donations</p>
          <p className="text-2xl font-semibold text-primary">{donationStats.total}</p>
        </div>
        <div className="border border-border bg-surface rounded p-5">
          <p className="text-sm text-text-muted mb-1">Financial Total</p>
          <p className="text-2xl font-semibold text-primary">
            ${donationStats.totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-border bg-surface rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary">Cases by Status</h3>
            <button
              onClick={() => exportChartPng(casesChartRef, 'cases-by-status.png')}
              className="text-xs border border-border px-3 py-1 rounded hover:bg-background"
            >
              Export PNG
            </button>
          </div>
          <div className="h-64" ref={casesChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caseChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<CaseTooltip />} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="value" fill="#1E293B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border bg-surface rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary">Donations by Type</h3>
            <button
              onClick={() => exportChartPng(donationsChartRef, 'donations-by-type.png')}
              className="text-xs border border-border px-3 py-1 rounded hover:bg-background"
            >
              Export PNG
            </button>
          </div>
          <div className="h-64" ref={donationsChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donationTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {donationTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonationTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border bg-surface rounded overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-base font-semibold text-primary">Recent Cases</h3>
          </div>
          {recentCases.length === 0 ? (
            <div className="p-5 text-sm text-text-muted">No cases yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Beneficiary</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCases.map((c) => (
                  <tr key={c.caseId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{c.beneficiaryName}</td>
                    <td className="px-4 py-2">{c.status}</td>
                    <td className="px-4 py-2 text-text-muted">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-border bg-surface rounded overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-base font-semibold text-primary">Recent Donations</h3>
          </div>
          {recentDonations.length === 0 ? (
            <div className="p-5 text-sm text-text-muted">No donations yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Donor</th>
                  <th className="text-left px-4 py-2 font-medium">Type / Amount</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDonations.map((d) => (
                  <tr key={d.donationId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{d.donorName}</td>
                    <td className="px-4 py-2">
                      {d.type === 'Financial' && d.amount
                        ? `$${d.amount.toLocaleString()}`
                        : d.type}
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      {new Date(d.receivedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
