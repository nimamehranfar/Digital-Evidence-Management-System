import { USE_MOCK } from "./config";
import * as mockAnalyticsApi from "./mock/mockAnalyticsApi";
import * as realAnalyticsApi from "./real/realAnalyticsApi";

const api = USE_MOCK ? mockAnalyticsApi : realAnalyticsApi;

export const getStats = api.getStats;