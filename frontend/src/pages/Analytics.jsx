import { useState } from "react";
import api from "../api/axiosInstance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function Analytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    setError("");
    try {
      const res = await api.post("/analytics/", {
        start_date: startDate,
        end_date: endDate,
      });
      const formatted = Object.entries(res.data).map(([category, values]) => ({
        category,
        total: values.total,
        percentage: parseFloat(values.percentage.toFixed(2)),
      }));
      formatted.sort((a, b) => b.percentage - a.percentage);
      setData(formatted);
    } catch (err) {
      setError("Failed to fetch analytics");
    }
  };

  return (
  <div className="page-container-wide">
    <h2 className="page-title">Expense Analytics</h2>
    <div className="analytics-controls">
      <input type="date" className="date-picker" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <input type="date" className="date-picker" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      <button className="btn-primary" onClick={fetchAnalytics}>Get Analytics</button>
    </div>
    {error && <p className="error-text">{error}</p>}

    {data.length > 0 && (
      <>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="percentage" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>

        <table className="analytics-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.total.toFixed(2)}</td>
                <td>{row.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}
    </div>
  );
}

export default Analytics;