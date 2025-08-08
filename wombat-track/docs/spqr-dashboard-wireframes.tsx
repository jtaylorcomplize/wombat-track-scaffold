import React, { useState } from 'react';

// Shared Filter Bar Component
const FilterBar = () => {
  const [financialYear, setFinancialYear] = useState('2024');
  const [month, setMonth] = useState('All');
  const [matterType, setMatterType] = useState('All');
  const [responsibleLawyer, setResponsibleLawyer] = useState('All');

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="2024">FY 2024</option>
            <option value="2023">FY 2023</option>
            <option value="2022">FY 2022</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Months</option>
            <option value="Jan">January</option>
            <option value="Feb">February</option>
            <option value="Mar">March</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Matter Type</label>
          <select
            value={matterType}
            onChange={(e) => setMatterType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Types</option>
            <option value="Litigation">Litigation</option>
            <option value="Corporate">Corporate</option>
            <option value="Property">Property</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Lawyer</label>
          <select
            value={responsibleLawyer}
            onChange={(e) => setResponsibleLawyer(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Lawyers</option>
            <option value="Smith">J. Smith</option>
            <option value="Johnson">M. Johnson</option>
            <option value="Williams">S. Williams</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Reusable Dashboard Card Component
const DashboardCard = ({ title, subtitle, type, placeholderValue, size = 'sm:col-span-1' }) => {
  const getCardContent = () => {
    switch (type) {
      case 'KPI':
        return (
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {placeholderValue}
            </div>
            {subtitle && (
              <div className="text-sm text-gray-500">
                {subtitle}
              </div>
            )}
          </div>
        );
      case 'Table':
        return (
          <div>
            <div className="text-sm text-gray-600 mb-3">
              Table Headers: Matter | Client | Responsible | Status | Date
            </div>
            <div className="border-2 border-dashed border-gray-300 p-4 text-center min-h-[120px] flex items-center justify-center rounded">
              <span className="text-gray-500">{placeholderValue}</span>
            </div>
          </div>
        );
      case 'Chart':
        return (
          <div className="border-2 border-dashed border-gray-300 p-6 text-center min-h-[200px] flex items-center justify-center rounded">
            <span className="text-gray-500">{placeholderValue}</span>
          </div>
        );
      default:
        return (
          <div className="text-gray-700">
            {placeholderValue}
          </div>
        );
    }
  };

  return (
    <div className={`${size} col-span-2`}>
      <div className="bg-white rounded-lg shadow-sm border p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {title}
        </h3>
        <div className="flex-grow">
          {getCardContent()}
        </div>
      </div>
    </div>
  );
};

// Dashboard Components
const ExecutiveOverview = () => {
  const cards = [
    { title: "MTD Fees", type: "KPI", placeholderValue: "$123,456", subtitle: "vs $98,765 last month" },
    { title: "YTD Fees", type: "KPI", placeholderValue: "$987,654", subtitle: "vs $765,432 last year" },
    { title: "Active Matters", type: "KPI", placeholderValue: "142", subtitle: "8 new this month" },
    { title: "Collection Rate", type: "KPI", placeholderValue: "94.2%", subtitle: "Target: 95%" },
    { title: "Top 20 Clients by Fees", type: "Table", placeholderValue: "Client ranking table with YTD fees", size: "sm:col-span-3" },
    { title: "Fees by Matter Type", type: "Chart", placeholderValue: "Pie Chart: Litigation 45%, Corporate 30%, Property 25%", size: "sm:col-span-3" },
    { title: "Monthly Fee Trend", type: "Chart", placeholderValue: "Line Chart: Jan-Dec fee progression", size: "sm:col-span-6" }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Executive Overview Dashboard</h1>
      <FilterBar />
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
        {cards.map((card, i) => (
          <DashboardCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};

const FeesBilled = () => {
  const cards = [
    { title: "Total Billed MTD", type: "KPI", placeholderValue: "$156,789", subtitle: "Across all matters" },
    { title: "Average Bill Size", type: "KPI", placeholderValue: "$2,847", subtitle: "55 bills this month" },
    { title: "Billing Efficiency", type: "KPI", placeholderValue: "87%", subtitle: "Time to bill ratio" },
    { title: "Outstanding Bills", type: "KPI", placeholderValue: "23", subtitle: "Awaiting approval" },
    { title: "Fees by Matter", type: "Table", placeholderValue: "Matter-wise billing breakdown with dates", size: "sm:col-span-4" },
    { title: "Bill Status", type: "Chart", placeholderValue: "Donut Chart: Draft, Sent, Paid", size: "sm:col-span-2" },
    { title: "Top Billing Lawyers", type: "Table", placeholderValue: "Lawyer billing performance table", size: "sm:col-span-3" },
    { title: "Client Billing Summary", type: "Table", placeholderValue: "Client-wise billing summary", size: "sm:col-span-3" }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Fees Billed Dashboard</h1>
      <FilterBar />
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
        {cards.map((card, i) => (
          <DashboardCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};

const WIPFees = () => {
  const cards = [
    { title: "Total WIP", type: "KPI", placeholderValue: "$234,567", subtitle: "Unbilled work" },
    { title: "Aged WIP (>90 days)", type: "KPI", placeholderValue: "$45,234", subtitle: "Requires attention" },
    { title: "WIP Growth Rate", type: "KPI", placeholderValue: "+12.3%", subtitle: "Month over month" },
    { title: "Average WIP Age", type: "KPI", placeholderValue: "47 days", subtitle: "Target: <30 days" },
    { title: "WIP by Matter", type: "Table", placeholderValue: "Matter | Client | WIP Amount | Days | Responsible", size: "sm:col-span-4" },
    { title: "WIP Aging", type: "Chart", placeholderValue: "Bar Chart: 0-30, 31-60, 61-90, 90+ days", size: "sm:col-span-2" },
    { title: "WIP Trend", type: "Chart", placeholderValue: "Line Chart: 6-month WIP progression", size: "sm:col-span-6" }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">WIP (Work in Progress) Dashboard</h1>
      <FilterBar />
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
        {cards.map((card, i) => (
          <DashboardCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};

const NewMatters = () => {
  const cards = [
    { title: "New Matters MTD", type: "KPI", placeholderValue: "18", subtitle: "vs 14 last month" },
    { title: "Estimated Value", type: "KPI", placeholderValue: "$487,650", subtitle: "From new matters" },
    { title: "Conversion Rate", type: "KPI", placeholderValue: "73%", subtitle: "Prospects to matters" },
    { title: "Average Matter Value", type: "KPI", placeholderValue: "$27,092", subtitle: "Estimated" },
    { title: "New Matters List", type: "Table", placeholderValue: "Matter | Client | Type | Responsible | Date Opened | Est. Value", size: "sm:col-span-4" },
    { title: "Matters by Type", type: "Chart", placeholderValue: "Pie Chart: Matter type distribution", size: "sm:col-span-2" },
    { title: "Monthly New Matters", type: "Chart", placeholderValue: "Column Chart: 12-month trend", size: "sm:col-span-3" },
    { title: "Source Analysis", type: "Chart", placeholderValue: "Bar Chart: Referral sources", size: "sm:col-span-3" }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">New Matters Dashboard</h1>
      <FilterBar />
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
        {cards.map((card, i) => (
          <DashboardCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};

const WriteOffs = () => {
  const cards = [
    { title: "Total Write-offs MTD", type: "KPI", placeholderValue: "$12,456", subtitle: "0.8% of billings" },
    { title: "YTD Write-offs", type: "KPI", placeholderValue: "$89,234", subtitle: "1.2% of YTD billings" },
    { title: "Write-off Rate", type: "KPI", placeholderValue: "1.2%", subtitle: "Target: <2%" },
    { title: "Approved Pending", type: "KPI", placeholderValue: "5", subtitle: "Awaiting approval" },
    { title: "Write-offs by Matter", type: "Table", placeholderValue: "Matter | Client | Amount | Reason | Approved By | Date", size: "sm:col-span-4" },
    { title: "Write-off Reasons", type: "Chart", placeholderValue: "Pie Chart: Discount, Bad debt, Time limit", size: "sm:col-span-2" },
    { title: "Monthly Write-offs", type: "Chart", placeholderValue: "Line Chart: 12-month write-off trend", size: "sm:col-span-3" },
    { title: "Write-offs by Lawyer", type: "Table", placeholderValue: "Lawyer performance analysis", size: "sm:col-span-3" }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Write-Offs Dashboard</h1>
      <FilterBar />
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
        {cards.map((card, i) => (
          <DashboardCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};

// Main App Component
const SPQRDashboards = () => {
  const [activeTab, setActiveTab] = useState(0);

  const dashboards = [
    { label: "Executive Overview", component: <ExecutiveOverview /> },
    { label: "Fees Billed", component: <FeesBilled /> },
    { label: "WIP Fees", component: <WIPFees /> },
    { label: "New Matters", component: <NewMatters /> },
    { label: "Write-Offs", component: <WriteOffs /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-blue-800 mb-8">
          SPQR Reporting Dashboards - Wireframes
        </h1>
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="flex flex-wrap border-b">
            {dashboards.map((dashboard, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === index
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {dashboard.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Dashboard */}
        <div>
          {dashboards[activeTab].component}
        </div>
      </div>
    </div>
  );
};

export default SPQRDashboards;