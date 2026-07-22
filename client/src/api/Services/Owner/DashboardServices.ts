import api from "../../api";

export const getWeeklyStatsService = async () => {
    const req=await api.get('/dashboard/weekly-stats')
    console.log(
        req
    )
    return req.data.data
}