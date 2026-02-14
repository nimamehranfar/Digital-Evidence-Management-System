import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import * as analyticsApi from "../api/analyticsApi";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp, FileText, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AnalyticsPage() {
    const { hasPermission } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        try {
            const data = await analyticsApi.getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // If the user doesn't have access, stop the loading spinner.
        if (!hasPermission(["detective", "prosecutor"])) {
            setLoading(false);
            return;
        }
        loadStats();
        // hasPermission comes from context; keep it in deps to satisfy exhaustive-deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasPermission]);

    if (!hasPermission(["detective", "prosecutor"])) {
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

    if (loading || !stats) {
        return (
            <div className="page-container">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    const COLORS = {
        pdf: "#ef4444",
        image: "#10b981",
        video: "#f59e0b",
        audio: "#8b5cf6",
        text: "#3b82f6"
    };

    // Prepare chart data
    const filesByType = Array.isArray(stats?.filesByType) ? stats.filesByType : [];
    const filesPerDay = Array.isArray(stats?.filesPerDay) ? stats.filesPerDay : [];
    const casesByStatus = stats?.casesByStatus && typeof stats.casesByStatus === "object" ? stats.casesByStatus : {};
    const casesByDepartment = stats?.casesByDepartment && typeof stats.casesByDepartment === "object" ? stats.casesByDepartment : {};
    const casesByPriority = stats?.casesByPriority && typeof stats.casesByPriority === "object" ? stats.casesByPriority : {};

    const typeChartData = filesByType.map(item => ({ name: item.type.toUpperCase(), value: item.count }));
    const statusChartData = Object.entries(casesByStatus).map(([status, count]) => ({ name: status.charAt(0).toUpperCase() + status.slice(1), value: count }));
    const timelineData = filesPerDay.map(item => ({ date: format(new Date(item.date), "MMM d"), count: item.count }));
    const deptChartData = Object.entries(casesByDepartment).map(([dept, count]) => ({ name: dept.replace("_", " "), cases: count }));

    const priorityChartData = [
        { name: "High", value: casesByPriority.high || 0 },
        { name: "Medium", value: casesByPriority.medium || 0 },
        { name: "Low", value: casesByPriority.low || 0 },
    ];

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
                        <div className="stat-value">{stats.totalCases}</div>
                        <div className="stat-label">Total Cases</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalFiles}</div>
                        <div className="stat-label">Evidence Items</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-orange">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.activeCases}</div>
                        <div className="stat-label">Active Cases</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalStorageGB}</div>
                        <div className="stat-label">Total GB</div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
                {/* Evidence by Type */}
                {typeChartData.length > 0 && (
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
                                                    fill={COLORS[entry.name.toLowerCase()] || "#999999"}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cases by Status */}
                {statusChartData.length > 0 && (
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
                )}

                {/* Evidence Timeline */}
                <div className="card card-span-2">
                    <div className="card-header">
                        <h2>Evidence Upload Trend (Last 7 Days)</h2>
                    </div>
                    <div className="card-content">
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={timelineData}>
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
                {priorityChartData.some(d => d.value > 0) && (
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
                )}

                {/* Cases by Department */}
                {deptChartData.length > 0 && (
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
                )}
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
                            <span className="stats-table-value">{stats.avgEvidencePerCase}</span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Active Cases</span>
                            <span className="stats-table-value">{stats.activeCases}</span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Pending Cases</span>
                            <span className="stats-table-value">{stats.pendingCases}</span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Closed Cases</span>
                            <span className="stats-table-value">{stats.closedCases}</span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">High Priority Cases</span>
                            <span className="stats-table-value">{stats.highPriorityCases}</span>
                        </div>
                        <div className="stats-table-row">
                            <span className="stats-table-label">Total Storage Used</span>
                            <span className="stats-table-value">{stats.totalStorageGB} GB</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}