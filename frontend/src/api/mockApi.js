function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

let EVIDENCE = [
    {
        id: "e1",
        fileName: "invoice_2025.pdf",
        fileType: "pdf",
        uploadedAt: "2026-01-10T12:20:00Z",
        tags: ["invoice", "legal"],
        status: "PROCESSED",
    },
    {
        id: "e2",
        fileName: "cctv_frame.png",
        fileType: "image",
        uploadedAt: "2026-01-11T09:10:00Z",
        tags: ["camera", "person"],
        status: "PROCESSED",
    },
    {
        id: "e3",
        fileName: "interview.wav",
        fileType: "audio",
        uploadedAt: "2026-01-12T18:02:00Z",
        tags: ["interview", "transcript"],
        status: "RECEIVED",
    },
];

export async function uploadEvidence(file) {
    await wait(600);

    const id = `e${Math.floor(Math.random() * 100000)}`;
    const ext = (file?.name?.split(".").pop() || "").toLowerCase();

    const fileType =
        ["png", "jpg", "jpeg"].includes(ext) ? "image" :
            ["wav", "mp3", "m4a"].includes(ext) ? "audio" :
                "pdf";

    const item = {
        id,
        fileName: file?.name || "unknown",
        fileType,
        uploadedAt: new Date().toISOString(),
        tags: [],
        status: "RECEIVED",
    };

    EVIDENCE = [item, ...EVIDENCE];

    return { evidenceId: id, status: "RECEIVED" };
}

export async function searchEvidence({ q, type }) {
    await wait(450);

    const query = (q || "").trim().toLowerCase();
    const t = (type || "").trim().toLowerCase();

    return EVIDENCE.filter((e) => {
        const matchesType = !t || e.fileType === t;
        const matchesQuery =
            !query ||
            e.fileName.toLowerCase().includes(query) ||
            e.tags.some((x) => x.toLowerCase().includes(query));

        return matchesType && matchesQuery;
    });
}

export async function getStats() {
    await wait(350);

    const totalFiles = EVIDENCE.length;

    const byDay = {};
    for (const e of EVIDENCE) {
        const day = e.uploadedAt.slice(0, 10); // YYYY-MM-DD
        byDay[day] = (byDay[day] || 0) + 1;
    }

    const filesPerDay = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

    const byType = {};
    for (const e of EVIDENCE) {
        byType[e.fileType] = (byType[e.fileType] || 0) + 1;
    }
    const filesByType = Object.entries(byType).map(([type, count]) => ({ type, count }));

    return { totalFiles, filesPerDay, filesByType };
}
