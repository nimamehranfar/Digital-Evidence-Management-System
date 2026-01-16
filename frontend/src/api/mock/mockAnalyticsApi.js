import { mockDelay } from "../config";
import { getCases } from "./mockCaseApi";
import { getEvidence } from "./mockEvidenceApi";
import { format, subDays, parseISO } from "date-fns";

export async function getStats(filters = {}) {
    await mockDelay(500);

    const cases = await getCases();
    const evidence = await getEvidence();

    const { fromDate, toDate } = filters;

    // Filter data by date range if provided
    let filteredEvidence = evidence;
    if (fromDate || toDate) {
        filteredEvidence = evidence.filter(e => {
            const date = new Date(e.uploadedAt);
            if (fromDate && date < new Date(fromDate)) return false;
            if (toDate && date > new Date(toDate)) return false;
            return true;
        });
    }

    // Calculate statistics
    const totalFiles = filteredEvidence.length;

    // Evidence by type
    const filesByType = filteredEvidence.reduce((acc, item) => {
        const type = item.fileType;
        const existing = acc.find(t => t.type === type);
        if (existing) {
            existing.count++;
        } else {
            acc.push({ type, count: 1 });
        }
        return acc;
    }, []);

    // Evidence per day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, "yyyy-MM-dd");
    });

    const filesPerDay = last7Days.map(date => {
        const count = filteredEvidence.filter(e => {
            const evidenceDate = format(parseISO(e.uploadedAt), "yyyy-MM-dd");
            return evidenceDate === date;
        }).length;

        return {
            date,
            count
        };
    });

    // Cases by status
    const casesByStatus = cases.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {});

    // Cases by priority
    const casesByPriority = cases.reduce((acc, c) => {
        acc[c.priority] = (acc[c.priority] || 0) + 1;
        return acc;
    }, {});

    // Cases by department
    const casesByDepartment = cases.reduce((acc, c) => {
        const dept = c.department;
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});

    // Total storage used
    const totalStorageBytes = filteredEvidence.reduce((sum, e) => sum + e.fileSize, 0);
    const totalStorageGB = totalStorageBytes / 1024 / 1024 / 1024;

    // Active cases
    const activeCases = cases.filter(c => c.status === "active").length;
    const pendingCases = cases.filter(c => c.status === "pending").length;
    const closedCases = cases.filter(c => c.status === "closed").length;

    // High priority cases
    const highPriorityCases = cases.filter(c => c.priority === "high").length;

    // Average evidence per case
    const avgEvidencePerCase = cases.length > 0
        ? (totalFiles / cases.length).toFixed(1)
        : "0";

    return {
        totalFiles,
        filesByType,
        filesPerDay,
        casesByStatus,
        casesByPriority,
        casesByDepartment,
        totalCases: cases.length,
        activeCases,
        pendingCases,
        closedCases,
        highPriorityCases,
        totalStorageGB: totalStorageGB.toFixed(2),
        avgEvidencePerCase
    };
}