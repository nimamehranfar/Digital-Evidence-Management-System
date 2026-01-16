import { useCase } from "../context/CaseContext";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp, FileText, Activity } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

export default function AnalyticsPage() {
    const { hasPermission } = useAuth();
    const { getAccessibleCases, evidence } = useCase();

    if (!hasPermission(["investigator", "higher_rank"])) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <BarChart3 size={64} />
                    <h2>Access Denied</h2>
                    <p>You don't have permission to view analytics.</p>
                </div>
            </div>
        );
    }

    const cases = getAccessibleCases();
    const accessibleCaseIds = cases.map(c => c.id);
    const userEvidence = evidence.filter(e =>
        accessibleCaseIds.includes(e.caseId)
    );

    // Evidence by type
    const evidenceByType = userEvidence.reduce((acc, item) => {
        acc[item.fileType] = (acc[item.fileType] || 0) + 1;
        return acc;
    }, {});

    const typeChartData = Object.entries(evidenceByType).map(([type, count]) => ({
        name: type.toUpperCase(),
        value: count
    }));

    const COLORS = {
        PDF: "#0088FE",
        IMAGE: "#00C49F",
        VIDEO: "#FFBB28",
        AUDIO: "#FF8042",
        TEXT: "#8884d8"
    };

    // Cases by status
    const casesByStatus = cases.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {});

    const statusChartData = Object.entries(casesByStatus).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count
    }));

    // Cases by priority
    const casesByPriority = cases.reduce((acc, c) => {
        acc[c.priority] = (acc[c.priority] || 0) + 1;
        return acc;
    }, {});

    const priorityChartData = [
        { name: "High", value: casesByPriority.high || 0 },
        { name: "Medium", value: casesByPriority.medium || 0 },
        { name: "Low", value: casesByPriority.low || 0 }
    ];

    // Evidence over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, "yyyy-MM-dd");
    });

    const evidenceByDay = last7Days.map(date => {
        const count = userEvidence.filter(e => {
            const evidenceDate = format(parseISO(e.uploadedAt), "yyyy-MM-dd");
            return evidenceDate === date;
        }).length;

        return {
            date: format(parseISO(date), "MMM d"),
            count
        };
    });

    // Department statistics
    const casesByDept = cases.reduce((acc, c) => {
        const dept = c.department.replace('_', ' ');
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});

    const deptChartData = Object.entries(casesByDept).map(([dept, count]) => ({
        name: dept,
        cases: count
    }));

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Analytics Dashboard</h1>
                    <p>Insights and statistics across all cases and evidence</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                        <Activity size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{cases.length}</div>
                        <div className="stat-label">Total Cases</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{userEvidence.length}</div>
                        <div className="stat-label">Evidence Items</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-orange">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {cases.filter(c => c.status === "active").length}
                        </div>
                        <div className="stat-label">Active Cases</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {(userEvidence.reduce((sum, e) => sum + e.fileSize, 0) / 1024 / 1024 / 1024).toFixed(2)}
                        </div>
                        <div className="stat-label">Total GB</div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
                {/* Evidence by Type */}
                <div className="card">
                    <div className="card-header">
                        <h2>Evidence by Type</h2>
                    </div>
                    <div className="card-content">
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={typeChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(0)}%`
                                        }
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {typeChartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[entry.name] || "#999999"}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Cases by Status */}
                <div className="card">
                    <div className="card-header">
                        <h2>Cases by Status</h2>
                    </div>
                    <div className="card-content">
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={statusChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#0088FE" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Evidence Timeline */}
                <div className="card card-span-2">
                    <div className="card-header">
                        <h2>Evidence Upload Trend (Last 7 Days)</h2>
                    </div>
                    <div className="card-content">
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={evidenceByDay}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        name="Evidence Uploaded"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Cases by Priority */}
                <div className="card">
                    <div className="card-header">
                        <h2>Cases by Priority</h2>
                    </div>
                    <div className="card-content">
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={priorityChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#FF8042" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Cases by Department */}
                <div className="card">
                    <div className="card-header">
                        <h2>Cases by Department</h2>
                    </div>
                    <div className="card-content">
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={deptChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="cases" fill="#00C49F" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Stats Table */}
            <div className="card">
                <div className="card-header">
                    <h2>Detailed Statistics</h2>
                </div>
                <div className="card-content">
                    <div className="stats-table">
                        <div className="stats-table-row">
                            <span className="stats-table-label">Average Evidence per Case</span>
                            <span className="stats-table-value">
                {cases.length > 0
                    ? (userEvidence.length / cases.length).toFixed(1)
                    : "0"
                }
              </span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Active Cases</span>
                            <span className="stats-table-value">
                {cases.filter(c => c.status === "active").length}
              </span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Pending Cases</span>
                            <span className="stats-table-value">
                {cases.filter(c => c.status === "pending").length}
              </span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Closed Cases</span>
                            <span className="stats-table-value">
                {cases.filter(c => c.status === "closed").length}
              </span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">High Priority Cases</span>
                            <span className="stats-table-value">
                {cases.filter(c => c.priority === "high").length}
              </span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Total Storage Used</span>
                            <span className="stats-table-value">
                {(userEvidence.reduce((sum, e) => sum + e.fileSize, 0) / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}