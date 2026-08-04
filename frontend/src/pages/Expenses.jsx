import { useState, useEffect } from "react";
import api from "../api/axiosInstance";

const categories = ["Rent", "Food", "Shopping", "Entertainment", "Other"];

function Expenses() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenses, setExpenses] = useState([
    { amount: 0, category: "Shopping", notes: "" },
  ]);
  const [message, setMessage] = useState("");

  // Runs whenever `date` changes — fetches existing expenses for that day
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await api.get(`/expenses/${date}`);
        if (res.data.length > 0) {
          setExpenses(res.data);
        } else {
          setExpenses([{ amount: 0, category: "Shopping", notes: "" }]);
        }
      } catch (err) {
        setMessage("Failed to load expenses");
      }
    };
    fetchExpenses();
  }, [date]);

  const handleChange = (index, field, value) => {
    const updated = [...expenses];
    updated[index][field] = value;
    setExpenses(updated);
  };

  const addRow = () => {
    setExpenses([...expenses, { amount: 0, category: "Shopping", notes: "" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const filtered = expenses.filter((exp) => exp.amount > 0);
    try {
      await api.put(`/expenses/${date}`, filtered);
      setMessage("Expenses saved successfully");
    } catch (err) {
      setMessage("Failed to save expenses");
    }
  };

  return (
  <div className="page-container-wide">
    <h2 className="page-title">Add / Update Expenses</h2>
    <input
      type="date"
      className="date-picker"
      value={date}
      onChange={(e) => setDate(e.target.value)}
    />
    <form onSubmit={handleSubmit}>
      {expenses.map((exp, i) => (
        <div key={i} className="expense-row">
          <input
            type="number"
            value={exp.amount}
            onChange={(e) => handleChange(i, "amount", parseFloat(e.target.value) || 0)}
          />
          <select
            value={exp.category}
            onChange={(e) => handleChange(i, "category", e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Notes"
            value={exp.notes}
            onChange={(e) => handleChange(i, "notes", e.target.value)}
          />
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addRow}>+ Add Row</button>
      <br /><br />
      <button type="submit" className="btn-primary">Save Expenses</button>
    </form>
    {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
export default Expenses;